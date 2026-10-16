const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, ca.nombre AS captador_nombre, co.nombre AS colocador_nombre
     FROM cierres c
     LEFT JOIN asesores ca ON ca.id = c.captador_id
     LEFT JOIN asesores co ON co.id = c.colocador_id
     ORDER BY c.fecha_cobro DESC, c.created_at DESC
     LIMIT 100`
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const {
    fechaCobro, tipoInmueble, tipoTransaccion, grossUsd,
    captadorId, colocadorId, direccion, observaciones,
  } = req.body;

  if (!fechaCobro || !grossUsd || !tipoTransaccion) {
    return res.status(400).json({ error: 'Faltan fechaCobro, grossUsd o tipoTransaccion' });
  }
  if (!captadorId && !colocadorId) {
    return res.status(400).json({ error: 'Tenés que indicar al menos un asesor (captador o colocador)' });
  }

  let ladosTipo;
  if (captadorId && colocadorId && captadorId === colocadorId) ladosTipo = 'Capta/Coloca';
  else if (captadorId && colocadorId) ladosTipo = 'Ambas puntas';
  else if (captadorId) ladosTipo = 'Captación';
  else ladosTipo = 'Colocación';

  const { rows } = await pool.query(
    `INSERT INTO cierres (fecha_cobro, tipo_inmueble, tipo_transaccion, gross_usd, lados_tipo, captador_id, colocador_id, direccion, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [fechaCobro, tipoInmueble || null, tipoTransaccion, grossUsd, ladosTipo, captadorId || null, colocadorId || null, direccion || null, observaciones || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM cierres WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
