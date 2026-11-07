const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Cualquier logueado puede ver el historial de capacitaciones.
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM capacitaciones ORDER BY fecha DESC');
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { fecha, tema, responsableId, convocadosCount, asistentesCount, observaciones } = req.body;
  if (!fecha || !tema) return res.status(400).json({ error: 'Faltan fecha o tema' });
  const { rows } = await pool.query(
    `INSERT INTO capacitaciones (fecha, tema, responsable_id, convocados_count, asistentes_count, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [fecha, tema, responsableId || null, convocadosCount || null, asistentesCount || null, observaciones || null]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { fecha, tema, responsableId, convocadosCount, asistentesCount, observaciones } = req.body;
  const { rows } = await pool.query(
    `UPDATE capacitaciones SET
       fecha = COALESCE($1, fecha),
       tema = COALESCE($2, tema),
       responsable_id = COALESCE($3, responsable_id),
       convocados_count = COALESCE($4, convocados_count),
       asistentes_count = COALESCE($5, asistentes_count),
       observaciones = COALESCE($6, observaciones)
     WHERE id = $7 RETURNING *`,
    [fecha, tema, responsableId, convocadosCount, asistentesCount, observaciones, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Capacitación no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM capacitaciones WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
