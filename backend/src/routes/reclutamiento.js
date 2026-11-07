const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM reclutamiento ORDER BY fecha_contacto DESC');
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, contacto, fechaContacto, etapa, responsableId, observaciones } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Falta nombre' });
  const { rows } = await pool.query(
    `INSERT INTO reclutamiento (nombre, contacto, fecha_contacto, etapa, responsable_id, observaciones)
     VALUES ($1,$2,$3,COALESCE($4,'Contactado'),$5,$6) RETURNING *`,
    [nombre, contacto || null, fechaContacto || null, etapa || null, responsableId || null, observaciones || null]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { nombre, contacto, fechaContacto, etapa, responsableId, observaciones } = req.body;
  const { rows } = await pool.query(
    `UPDATE reclutamiento SET
       nombre = COALESCE($1, nombre),
       contacto = COALESCE($2, contacto),
       fecha_contacto = COALESCE($3, fecha_contacto),
       etapa = COALESCE($4, etapa),
       responsable_id = COALESCE($5, responsable_id),
       observaciones = COALESCE($6, observaciones)
     WHERE id = $7 RETURNING *`,
    [nombre, contacto, fechaContacto, etapa, responsableId, observaciones, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM reclutamiento WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
