/* Corre las migraciones incrementales de backend/migrations/ (en orden,
   solo las que todavía no se aplicaron) contra DATABASE_URL. A diferencia
   de "npm run migrate" (que borra y recrea todo desde schema.sql), esto
   NUNCA borra datos — es lo que hay que usar en la base real una vez que
   ya hay información cargada a mano desde el panel.
   Uso: npm run migrate:add */
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const DIR = path.join(__dirname, '..', 'migrations');

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((r) => r.filename));

  const files = fs.existsSync(DIR)
    ? fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
    : [];

  let corridas = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    console.log(`Aplicando ${file}...`);
    const sql = fs.readFileSync(path.join(DIR, file), 'utf8');
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
    corridas++;
  }

  console.log(corridas ? `${corridas} migración(es) aplicada(s).` : 'Ya estaba todo al día — nada para aplicar.');
  await pool.end();
}

run().catch((err) => {
  console.error('Error aplicando migraciones:', err.message);
  process.exit(1);
});
