const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { randomInt } = require('node:crypto');
const { createGateway } = require('./gateway.cjs');
const { readConfig, loadEnvironment } = require('./config.cjs');

const KEY = 'test-only-private-key-at-least-32-characters';
// Evitar puertos reservados por Fetch cuando el entorno remapea listen(0).
const listen = (server) =>
  new Promise((resolve, reject) => {
    const attempt = () => {
      const failed = (error) => (error.code === 'EADDRINUSE' ? attempt() : reject(error));
      server.once('error', failed);
      server.listen(randomInt(20000, 60000), '127.0.0.1', () => {
        server.removeListener('error', failed);
        resolve(`http://127.0.0.1:${server.address().port}`);
      });
    };
    attempt();
  });
const stop = (server) =>
  new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  });

describe('Private gateway configuration', () => {
  it('validates origins, keys and ports without returning secret values in errors', () => {
    const base = { BP_BACKEND_URL: 'http://127.0.0.1:3002', BP_API_KEY: KEY };
    expect(readConfig(base)).toEqual({
      backendUrl: base.BP_BACKEND_URL,
      apiKey: KEY,
      middlewarePort: 4201,
      frontendPort: 4200,
    });
    expect(
      readConfig({ ...base, BP_MIDDLEWARE_PORT: '5001', BP_FRONTEND_PORT: '5000' }).frontendPort,
    ).toBe(5000);
    for (const url of [
      undefined,
      'invalid',
      'ftp://host',
      'http://user:password@host',
      'http://host/private',
      'http://host/?key=value',
      'http://host/#secret',
    ]) {
      expect(() => readConfig({ ...base, BP_BACKEND_URL: url })).toThrow('BP_BACKEND_URL');
    }
    for (const key of [undefined, 'short', 'replace_with_a_long_placeholder_of_32_characters'])
      expect(() => readConfig({ ...base, BP_API_KEY: key })).toThrow('BP_API_KEY');
    for (const port of ['0', '65536', 'abc', '1.2'])
      expect(() => readConfig({ ...base, BP_FRONTEND_PORT: port })).toThrow('Puerto');
  });
  it('loads .env only in the Node process when present', () => {
    const exists = jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    const load = jest.spyOn(process, 'loadEnvFile').mockImplementation(() => undefined);
    loadEnvironment();
    expect(load).toHaveBeenCalledWith(expect.stringContaining('.env'));
    load.mockClear();
    exists.mockReturnValue(false);
    loadEnvironment();
    expect(load).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

describe('Private gateway', () => {
  let upstream;
  let gateway;
  let upstreamUrl;
  let gatewayUrl;
  let received;
  beforeEach(async () => {
    received = [];
    upstream = http.createServer(async (req, res) => {
      let body = '';
      for await (const chunk of req) body += chunk;
      received.push({ method: req.method, url: req.url, headers: req.headers, body });
      if (req.url.includes('timeout')) return;
      if (req.url.includes('redirect')) {
        res.writeHead(302, { Location: 'http://untrusted.invalid' }).end();
        return;
      }
      if (req.url.includes('unauthorized')) {
        res.writeHead(401, { 'Content-Type': 'application/json' }).end('{}');
        return;
      }
      if (req.url.includes('html')) {
        res.writeHead(200, { 'Content-Type': 'text/html' }).end('<html>private details</html>');
        return;
      }
      res.writeHead(req.url.includes('missing') ? 404 : 200, {
        'Content-Type': 'application/json',
        'X-BP-API-Key': 'do-not-forward',
        Location: upstreamUrl,
      });
      res.end(
        JSON.stringify(
          req.url.includes('missing')
            ? { name: 'NotFoundError', message: 'Not product found with that identifier' }
            : { data: [] },
        ),
      );
    });
    upstreamUrl = await listen(upstream);
    gateway = createGateway({ backendUrl: upstreamUrl, apiKey: KEY, timeoutMs: 100 });
    gatewayUrl = await listen(gateway);
  });
  afterEach(async () => {
    await stop(gateway);
    await stop(upstream);
  });
  it('injects the configured key, ignores browser credentials and strips private headers', async () => {
    const response = await fetch(gatewayUrl + '/bp/products?filter=one', {
      headers: {
        'X-BP-API-Key': 'browser-key',
        Cookie: 'private-cookie',
        Authorization: 'Bearer browser-token',
      },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [] });
    expect(received[0].headers['x-bp-api-key']).toBe(KEY);
    expect(received[0].headers.cookie).toBeUndefined();
    expect(received[0].headers.authorization).toBeUndefined();
    expect(received[0].url).toBe('/bp/products?filter=one');
    expect(response.headers.get('x-bp-api-key')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });
  it('forwards writes and preserves domain errors', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await fetch(gatewayUrl + '/bp/products/abc', {
        method,
        body: method === 'DELETE' ? undefined : JSON.stringify({ name: 'Producto' }),
      });
      expect(response.status).toBe(200);
    }
    expect(received.map((item) => item.method)).toEqual(['POST', 'PUT', 'DELETE']);
    expect(JSON.parse(received[0].body)).toEqual({ name: 'Producto' });
    const missing = await fetch(gatewayUrl + '/bp/products/missing');
    expect(missing.status).toBe(404);
    expect((await missing.json()).name).toBe('NotFoundError');
  });
  it('limits routes, methods and request body size', async () => {
    expect((await fetch(gatewayUrl + '/bp/admin')).status).toBe(404);
    expect((await fetch(gatewayUrl + '/bp/products', { method: 'PATCH' })).status).toBe(405);
    expect((await fetch(gatewayUrl + '/.env')).status).toBe(404);
    const large = await fetch(gatewayUrl + '/bp/products', {
      method: 'POST',
      body: 'x'.repeat(110000),
    });
    expect(large.status).toBe(413);
    expect(received).toHaveLength(0);
  });
  it.each(['redirect', 'unauthorized', 'html', 'timeout'])(
    'does not reveal upstream details for %s',
    async (mode) => {
      const response = await fetch(gatewayUrl + '/bp/products/' + mode);
      expect(response.status).toBe(502);
      const text = await response.text();
      expect(text).not.toContain(KEY);
      expect(text).not.toContain(upstreamUrl);
      expect(text).not.toContain('private details');
    },
  );
  it('handles an unavailable backend with a generic response', async () => {
    await stop(upstream);
    const response = await fetch(gatewayUrl + '/bp/products');
    expect(response.status).toBe(502);
  });
  it('serves only production assets and SPA routes from the build directory', async () => {
    await stop(gateway);
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bp-gateway-test-'));
    fs.writeFileSync(path.join(root, 'index.html'), '<html>Angular app</html>');
    fs.writeFileSync(path.join(root, 'main.js'), 'console.log("app")');
    gateway = createGateway({ backendUrl: upstreamUrl, apiKey: KEY, staticRoot: root });
    gatewayUrl = await listen(gateway);
    try {
      expect(await (await fetch(gatewayUrl + '/products/new')).text()).toContain('Angular app');
      const script = await fetch(gatewayUrl + '/main.js');
      expect(script.headers.get('content-type')).toBe('text/javascript');
      expect((await fetch(gatewayUrl + '/missing.js')).status).toBe(404);
      expect((await fetch(gatewayUrl + '/%2eenv')).status).toBe(404);
      expect((await fetch(gatewayUrl + '/%5csecret')).status).toBe(404);
      expect((await fetch(gatewayUrl + '/products', { method: 'POST' })).status).toBe(404);
      expect(await (await fetch(gatewayUrl + '/', { method: 'HEAD' })).text()).toBe('');
      fs.writeFileSync(path.join(root, 'asset.bin'), 'binary');
      expect((await fetch(gatewayUrl + '/asset.bin')).status).toBe(200);
    } finally {
      const resolvedRoot = path.resolve(root);
      if (
        path.dirname(resolvedRoot) !== path.resolve(os.tmpdir()) ||
        !path.basename(resolvedRoot).startsWith('bp-gateway-test-')
      )
        throw new Error('Directorio temporal inesperado.');
      fs.rmSync(resolvedRoot, { recursive: true, force: true });
    }
  });
});
