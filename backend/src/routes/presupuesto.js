const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin, requireFullAccess } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { anio, mes } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (anio) { cond.push(`anio = $${i++}`); vals.push(anio); }
  if (mes) { cond.push(`mes = $${i++}`); vals.push(mes); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT * FROM presupuesto ${where} ORDER BY anio DESC, mes DESC, categoria`,
    vals
  );
  res.json(rows);
});

// Upsert: cargar la misma categoría/mes dos veces actualiza en vez de duplicar.
router.post('/', requireAuth, requireFullAccess, async (req, res) => {
  const { anio, mes, categoria, presupuestoIngresosUsd, presupuestoGastosUsd } = req.body;
  if (!anio || !mes || !categoria) return res.status(400).json({ error: 'Faltan anio, mes o categoria' });
  const { rows } = await pool.query(
    `INSERT INTO presupuesto (anio, mes, categoria, presupuesto_ingresos_usd, presupuesto_gastos_usd)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (anio, mes, categoria) DO UPDATE SET
       presupuesto_ingresos_usd = EXCLUDED.presupuesto_ingresos_usd,
       presupuesto_gastos_usd = EXCLUDED.presupuesto_gastos_usd
     RETURNING *`,
    [anio, mes, categoria, presupuestoIngresosUsd || null, presupuestoGastosUsd || null]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, requireFullAccess, async (req, res) => {
  await pool.query('DELETE FROM presupuesto WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
