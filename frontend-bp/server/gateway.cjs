const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function reply(res, status, message) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify({ message }));
}

function createGateway({ backendUrl, apiKey, staticRoot, timeoutMs = 10000 }) {
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (/^\/bp(?:\/|$)/.test(url.pathname)) {
        if (!/^\/bp\/products(?:\/verification\/[^/]+|\/[^/]+)?\/?$/.test(url.pathname))
          return reply(res, 404, 'Ruta no disponible.');
        if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method))
          return reply(res, 405, 'Método no permitido.');
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 100 * 1024) {
            reply(res, 413, 'El cuerpo de la solicitud es demasiado grande.');
            req.resume();
            return;
          }
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        const upstream = await fetch(new URL(url.pathname + url.search, backendUrl), {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-BP-API-Key': apiKey,
          },
          body: ['POST', 'PUT'].includes(req.method) ? body : undefined,
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (
          (upstream.status >= 300 && upstream.status < 400) ||
          [401, 403].includes(upstream.status) ||
          !upstream.headers.get('content-type')?.includes('application/json')
        ) {
          await upstream.body?.cancel();
          return reply(res, 502, 'No se pudo establecer la conexión con el servicio de productos.');
        }
        const payload = await upstream.text();
        res.writeHead(upstream.status, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
        });
        res.end(payload);
        return;
      }
      if (!staticRoot || !['GET', 'HEAD'].includes(req.method))
        return reply(res, 404, 'Ruta no disponible.');
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes('\\') || pathname.split('/').some((part) => part.startsWith('.')))
        return reply(res, 404, 'Ruta no disponible.');
      const root = path.resolve(staticRoot);
      let file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep) && file !== root)
        return reply(res, 404, 'Ruta no disponible.');
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
        if (path.extname(pathname)) return reply(res, 404, 'Archivo no disponible.');
        file = path.join(root, 'index.html');
      }
      const types = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
      };
      const content = await fs.promises.readFile(file);
      res.writeHead(200, {
        'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch {
      if (!res.headersSent)
        reply(res, 502, 'El servicio de productos no está disponible. Inténtalo de nuevo.');
      else res.end();
    }
  });
}
module.exports = { createGateway };
