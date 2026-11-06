const path = require('node:path');
const fs = require('node:fs');
const { loadEnvironment, readConfig } = require('./config.cjs');
const { createGateway } = require('./gateway.cjs');
try {
  loadEnvironment();
  const config = readConfig();
  const production = process.argv.includes('--production');
  if (
    production &&
    !fs.existsSync(path.resolve(__dirname, '../dist/frontend-bp/browser/index.html'))
  ) {
    throw new Error('Ejecuta npm run build antes de iniciar producción.');
  }
  const server = createGateway({
    ...config,
    staticRoot: production ? path.resolve(__dirname, '../dist/frontend-bp/browser') : undefined,
  });
  const port = production ? config.frontendPort : config.middlewarePort;
  server.on('error', () => {
    console.error('No se pudo iniciar el servidor frontend. Comprueba el puerto configurado.');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () =>
    console.log(
      `Frontend - BP ${production ? 'producción' : 'middleware'} en http://127.0.0.1:${port}`,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
