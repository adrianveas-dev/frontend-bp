const path = require('node:path');
const { spawn } = require('node:child_process');
const { loadEnvironment, readConfig } = require('./config.cjs');
const { createGateway } = require('./gateway.cjs');
try {
  loadEnvironment();
  const config = readConfig();
  const gateway = createGateway(config);
  gateway.on('error', () => {
    console.error('No se pudo iniciar el middleware. Comprueba BP_MIDDLEWARE_PORT.');
    process.exitCode = 1;
  });
  gateway.listen(config.middlewarePort, '127.0.0.1', () => {
    console.log(`Frontend - BP | Ing. Adrian Veas | Middleware en el puerto ${config.middlewarePort}`);
    const childEnv = { ...process.env, NG_CLI_ANALYTICS: 'false' };
    delete childEnv.BP_API_KEY;
    delete childEnv.BP_BACKEND_URL;
    childEnv.BP_MIDDLEWARE_PORT = String(config.middlewarePort);
    const cli = path.resolve(__dirname, '../node_modules/@angular/cli/bin/ng.js');
    const angular = spawn(
      process.execPath,
      [
        cli,
        'serve',
        '--proxy-config',
        'proxy.conf.cjs',
        '--host',
        '127.0.0.1',
        '--port',
        String(config.frontendPort),
        ...process.argv.slice(2),
      ],
      { cwd: path.resolve(__dirname, '..'), env: childEnv, stdio: 'inherit' },
    );
    const shutdown = () => {
      angular.kill();
      gateway.close();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    angular.once('error', () => {
      console.error('No se pudo iniciar Angular.');
      gateway.close();
      process.exitCode = 1;
    });
    angular.once('exit', (code) => {
      gateway.close();
      process.exitCode = code ?? 0;
    });
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
