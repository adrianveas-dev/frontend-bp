const { loadEnvironment, readConfig } = require('./config.cjs');

const names = [
  'Tarjeta Clásica BP',
  'Cuenta Digital BP',
  'Fondo de Inversión BP',
  'Tarjeta Oro BP',
  'Cuenta de Ahorros BP',
  'Depósito a Plazo BP',
  'Tarjeta Platinum BP',
  'Cuenta Nómina BP',
  'Fondo de Ahorro BP',
  'Tarjeta de Débito BP',
  'Cuenta Joven BP',
  'Inversión Programada BP',
  'Tarjeta Empresarial BP',
  'Cuenta Familiar BP',
  'Ahorro a Plazo BP',
  'Tarjeta Internacional BP',
  'Cuenta de Negocios BP',
  'Fondo Educativo BP',
  'Tarjeta de Viajes BP',
  'Cuenta de Emprendimiento BP',
  'Fondo de Retiro BP',
  'Tarjeta de Compras BP',
  'Cuenta de Ahorro Infantil BP',
  'Inversión Flexible BP',
  'Tarjeta Preferente BP',
];

function demoProduct(index, today) {
  const release = new Date(today + 'T00:00:00Z');
  release.setUTCDate(release.getUTCDate() + index);
  const revision = new Date(release);
  const month = revision.getUTCMonth();
  revision.setUTCFullYear(revision.getUTCFullYear() + 1);
  if (revision.getUTCMonth() !== month) revision.setUTCDate(0);
  const logo = ['tarjeta', 'ahorro', 'inversion'][(index - 1) % 3];
  return {
    id: 'bp-demo-' + String(index).padStart(2, '0'),
    name: names[(index - 1) % names.length],
    description: 'Producto de demostración para consultar el catálogo y comprobar la paginación.',
    logo: `https://raw.githubusercontent.com/adrianveas-dev/frontend-bp/main/frontend-bp/public/logos/${logo}.svg`,
    date_release: release.toISOString().slice(0, 10),
    date_revision: revision.toISOString().slice(0, 10),
  };
}

async function seedDemo({ origin, now = new Date(), request = fetch }) {
  const send = async (route, options) => {
    const response = await request(origin + route, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error(
        `La API devolvió HTTP ${response.status}. Comprueba que ambos servidores estén iniciados.`,
      );
    return response.json();
  };
  const { data } = await send('/bp/products');
  if (!Array.isArray(data)) throw new Error('La respuesta del listado no es válida.');
  const existing = new Set(data.map((product) => product.id));
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  let added = 0;
  for (let index = 1; data.length + added < 25 && index <= 99; index++) {
    const product = demoProduct(index, today);
    if (existing.has(product.id)) continue;
    await send('/bp/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    existing.add(product.id);
    added++;
  }
  return { total: data.length + added, added };
}

if (require.main === module) {
  try {
    loadEnvironment();
    const { frontendPort } = readConfig();
    seedDemo({ origin: `http://127.0.0.1:${frontendPort}` })
      .then((result) =>
        console.log(`Productos disponibles: ${result.total}. Agregados: ${result.added}.`),
      )
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { seedDemo };
