/* Corre backend/schema.sql contra la base de DATABASE_URL.
   Uso: npm run migrate */
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Esquema aplicado correctamente.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Error aplicando el esquema:', err.message);
  process.exit(1);
});
