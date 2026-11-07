const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Función administrativa — no la ve el asesor.
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM tareas ORDER BY fecha_limite ASC');
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { descripcion, responsableId, fechaAsignacion, fechaLimite, estado } = req.body;
  if (!descripcion) return res.status(400).json({ error: 'Falta descripción' });
  const { rows } = await pool.query(
    `INSERT INTO tareas (descripcion, responsable_id, fecha_asignacion, fecha_limite, estado)
     VALUES ($1,$2,$3,$4,COALESCE($5,'Pendiente')) RETURNING *`,
    [descripcion, responsableId || null, fechaAsignacion || null, fechaLimite || null, estado || null]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { descripcion, responsableId, fechaAsignacion, fechaLimite, estado } = req.body;
  const { rows } = await pool.query(
    `UPDATE tareas SET
       descripcion = COALESCE($1, descripcion),
       responsable_id = COALESCE($2, responsable_id),
       fecha_asignacion = COALESCE($3, fecha_asignacion),
       fecha_limite = COALESCE($4, fecha_limite),
       estado = COALESCE($5, estado)
     WHERE id = $6 RETURNING *`,
    [descripcion, responsableId, fechaAsignacion, fechaLimite, estado, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Tarea no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM tareas WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
