const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT d.*, a.nombre AS asignado_nombre FROM desafios d
     LEFT JOIN asesores a ON a.id = d.asignado_a
     ORDER BY d.created_at DESC`
  );
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const { titulo, descripcion, tipo, asignadoA, meta, unidad, vence } = req.body;
  if (!titulo || !meta) return res.status(400).json({ error: 'Faltan titulo o meta' });
  const { rows } = await pool.query(
    `INSERT INTO desafios (titulo, descripcion, tipo, asignado_a, meta, unidad, vence)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [titulo, descripcion, tipo, asignadoA || null, meta, unidad, vence || null]
  );
  res.status(201).json(rows[0]);
});

const STAFF_ROLES = ['broker', 'gerente', 'administracion'];

router.patch('/:id', requireAuth, async (req, res) => {
  // Un asesor solo puede tocar su propio progreso (y solo en desafíos propios
  // o de "Todos"); marcar Cumplido/editar estado es cosa de administración.
  const { progreso, estado } = req.body;
  const esStaff = STAFF_ROLES.includes(req.user.rol);

  if (!esStaff) {
    const { rows: actual } = await pool.query('SELECT asignado_a FROM desafios WHERE id = $1', [req.params.id]);
    if (!actual[0]) return res.status(404).json({ error: 'Desafío no encontrado' });
    const esPropio = actual[0].asignado_a === null || actual[0].asignado_a === req.user.asesorId;
    if (!esPropio || estado !== undefined) {
      return res.status(403).json({ error: 'Solo podés actualizar tu propio progreso' });
    }
  }

  const { rows } = await pool.query(
    `UPDATE desafios SET progreso = COALESCE($1, progreso), estado = COALESCE($2, estado)
     WHERE id = $3 RETURNING *`,
    [progreso, esStaff ? estado : undefined, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Desafío no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM desafios WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
