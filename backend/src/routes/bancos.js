const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin, requireFullAccess } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { conciliado } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (conciliado !== undefined) { cond.push(`conciliado = $${i++}`); vals.push(conciliado === 'true'); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT * FROM movimientos_bancarios ${where} ORDER BY fecha DESC`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { fecha, cuenta, tipo, montoUsd, monedaOriginal, montoOriginal, concepto, conciliado } = req.body;
  if (!fecha || !cuenta) return res.status(400).json({ error: 'Faltan fecha o cuenta' });
  const { rows } = await pool.query(
    `INSERT INTO movimientos_bancarios
       (fecha, cuenta, tipo, monto_usd, moneda_original, monto_original, concepto, conciliado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,false)) RETURNING *`,
    [
      fecha, cuenta, tipo || null, montoUsd || null, monedaOriginal || 'USD',
      montoOriginal || null, concepto || null, conciliado,
    ]
  );
  res.status(201).json(rows[0]);
});

// Usado principalmente para marcar `conciliado`, pero también permite
// corregir concepto/tipo.
router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { conciliado, concepto, tipo } = req.body;
  const { rows } = await pool.query(
    `UPDATE movimientos_bancarios SET
       conciliado = COALESCE($1, conciliado),
       concepto = COALESCE($2, concepto),
       tipo = COALESCE($3, tipo)
     WHERE id = $4 RETURNING *`,
    [conciliado, concepto, tipo, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Movimiento no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireFullAccess, async (req, res) => {
  await pool.query('DELETE FROM movimientos_bancarios WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
