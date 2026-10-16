/* Carga backend/seed-data.json (generado por scripts/build_real_data.py)
   a la base real. Corré primero "npm run migrate".
   Uso: npm run seed */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const SEED_PATH = path.join(__dirname, '..', 'seed-data.json');

async function seed() {
  if (!fs.existsSync(SEED_PATH)) {
    console.error('No existe backend/seed-data.json. Corré primero: python scripts/build_real_data.py (desde la carpeta del proyecto)');
    process.exit(1);
  }
  const { asesores, cierres } = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));

  const idByKey = {};
  for (const a of asesores) {
    const { rows } = await pool.query(
      `INSERT INTO asesores (nombre, estado, ingreso_fecha, meta_anual)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [a.nombre, a.estado, a.ingresoFecha, a.metaAnual]
    );
    idByKey[a.key] = rows[0].id;
  }
  console.log(`${asesores.length} asesores insertados.`);

  let insertados = 0;
  for (const c of cierres) {
    await pool.query(
      `INSERT INTO cierres (fecha_cobro, tipo_inmueble, tipo_transaccion, gross_usd, lados_tipo, captador_id, colocador_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        c.fecha, c.tipoInmueble, c.tipoTransaccion, c.grossUsd, c.ladosTipo,
        c.captadorKey ? idByKey[c.captadorKey] || null : null,
        c.colocadorKey ? idByKey[c.colocadorKey] || null : null,
      ]
    );
    insertados++;
  }
  console.log(`${insertados} cierres insertados.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@century21nova.com';
  const adminPass = process.env.SEED_ADMIN_PASSWORD || 'cambiar-esta-clave';
  const hash = await bcrypt.hash(adminPass, 10);
  await pool.query(
    `INSERT INTO usuarios (email, password_hash, rol, nombre) VALUES ($1, $2, 'broker', 'Broker')
     ON CONFLICT (email) DO NOTHING`,
    [adminEmail, hash]
  );
  console.log(`Usuario Broker: ${adminEmail} (clave: la de SEED_ADMIN_PASSWORD o "${adminPass}" si no se definió — cambiarla). Desde acá se crean los logins de Gerente/Administración/Asesores.`);

  await pool.end();
}

seed().catch((err) => {
  console.error('Error en el seed:', err.message);
  process.exit(1);
});
