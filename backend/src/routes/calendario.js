const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireBroker } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM calendario_eventos ORDER BY fecha ASC');
  res.json(rows);
});

router.post('/', requireAuth, requireBroker, async (req, res) => {
  const { fecha, hora, tipo, titulo } = req.body;
  if (!fecha || !titulo) return res.status(400).json({ error: 'Faltan fecha o titulo' });
  const { rows } = await pool.query(
    'INSERT INTO calendario_eventos (fecha, hora, tipo, titulo) VALUES ($1,$2,$3,$4) RETURNING *',
    [fecha, hora || null, tipo, titulo]
  );
  res.status(201).json(rows[0]);
});

router.delete('/:id', requireAuth, requireBroker, async (req, res) => {
  await pool.query('DELETE FROM calendario_eventos WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
