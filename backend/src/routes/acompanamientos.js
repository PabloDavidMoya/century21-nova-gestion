const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireFullAccess } = require('../middleware/auth');

// Notas sensibles de coaching/desempeño: solo broker/gerente, ni el asesor
// ni administración las ven.
router.get('/', requireAuth, requireFullAccess, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM acompanamientos ORDER BY fecha DESC');
  res.json(rows);
});

router.post('/', requireAuth, requireFullAccess, async (req, res) => {
  const { asesorId, fecha, tipo, responsableId, planMejora, observaciones } = req.body;
  if (!asesorId || !fecha) return res.status(400).json({ error: 'Faltan asesorId o fecha' });
  const { rows } = await pool.query(
    `INSERT INTO acompanamientos (asesor_id, fecha, tipo, responsable_id, plan_mejora, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [asesorId, fecha, tipo || null, responsableId || null, planMejora || null, observaciones || null]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireFullAccess, async (req, res) => {
  const { fecha, tipo, responsableId, planMejora, observaciones } = req.body;
  const { rows } = await pool.query(
    `UPDATE acompanamientos SET
       fecha = COALESCE($1, fecha),
       tipo = COALESCE($2, tipo),
       responsable_id = COALESCE($3, responsable_id),
       plan_mejora = COALESCE($4, plan_mejora),
       observaciones = COALESCE($5, observaciones)
     WHERE id = $6 RETURNING *`,
    [fecha, tipo, responsableId, planMejora, observaciones, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireFullAccess, async (req, res) => {
  await pool.query('DELETE FROM acompanamientos WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
