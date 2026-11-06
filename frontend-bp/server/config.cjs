const fs = require('node:fs');
const path = require('node:path');

function loadEnvironment() {
  const file = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

function readConfig(env = process.env) {
  let backendUrl;
  try {
    backendUrl = new URL(env.BP_BACKEND_URL);
  } catch {
    throw new Error('Configura BP_BACKEND_URL en el entorno privado del servidor.');
  }
  if (
    !['http:', 'https:'].includes(backendUrl.protocol) ||
    backendUrl.username ||
    backendUrl.password ||
    backendUrl.pathname !== '/' ||
    backendUrl.search ||
    backendUrl.hash
  ) {
    throw new Error(
      'BP_BACKEND_URL debe ser un origen HTTP o HTTPS, sin credenciales, ruta ni parámetros.',
    );
  }
  if (!env.BP_API_KEY || env.BP_API_KEY.length < 32 || env.BP_API_KEY.startsWith('replace_')) {
    throw new Error('Configura BP_API_KEY con una clave privada de al menos 32 caracteres.');
  }
  const port = (value, fallback) => {
    const result = Number(value || fallback);
    if (!Number.isInteger(result) || result < 1 || result > 65535)
      throw new Error('Puerto de servidor inválido.');
    return result;
  };
  return {
    backendUrl: backendUrl.origin,
    apiKey: env.BP_API_KEY,
    middlewarePort: port(env.BP_MIDDLEWARE_PORT, 4201),
    frontendPort: port(env.BP_FRONTEND_PORT, 4200),
  };
}
module.exports = { loadEnvironment, readConfig };
