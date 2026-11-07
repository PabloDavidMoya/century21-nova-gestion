const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin, STAFF_ROLES } = require('../middleware/auth');

/* Un asesor solo ve los leads que tiene asignados. Staff ve todos. */
router.get('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (!STAFF_ROLES.includes(rol) && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const { estado } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (rol === 'asesor') { cond.push(`asesor_asignado_id = $${i++}`); vals.push(req.user.asesorId); }
  if (estado) { cond.push(`estado = $${i++}`); vals.push(estado); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT * FROM leads ${where} ORDER BY fecha_primer_contacto DESC`,
    vals
  );
  res.json(rows);
});

// Cualquier logueado puede crear un lead (lo suele cargar staff, pero un
// asesor también puede registrar uno propio).
router.post('/', requireAuth, async (req, res) => {
  const {
    nombreInteresado, contacto, fuente, propiedadId, asesorAsignadoId,
    fechaPrimerContacto, estado, observaciones,
  } = req.body;
  if (!nombreInteresado) return res.status(400).json({ error: 'Falta nombre del interesado' });
  const { rows } = await pool.query(
    `INSERT INTO leads
       (nombre_interesado, contacto, fuente, propiedad_id, asesor_asignado_id,
        fecha_primer_contacto, estado, observaciones, cargado_por)
     VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'Nuevo'),$8,$9) RETURNING *`,
    [
      nombreInteresado, contacto || null, fuente || null, propiedadId || null,
      asesorAsignadoId || null, fechaPrimerContacto || null, estado || null,
      observaciones || null, req.user.sub,
    ]
  );
  res.status(201).json(rows[0]);
});

// Un asesor solo puede actualizar estado/observaciones de sus propios leads.
// Staff puede editar cualquiera y además reasignar asesorAsignadoId.
router.patch('/:id', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  const { estado, observaciones, asesorAsignadoId } = req.body;

  if (rol === 'asesor') {
    const { rows: existentes } = await pool.query(
      'SELECT asesor_asignado_id FROM leads WHERE id = $1',
      [req.params.id]
    );
    if (!existentes[0]) return res.status(404).json({ error: 'Lead no encontrado' });
    if (existentes[0].asesor_asignado_id !== req.user.asesorId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    const { rows } = await pool.query(
      `UPDATE leads SET estado = COALESCE($1, estado), observaciones = COALESCE($2, observaciones)
       WHERE id = $3 RETURNING *`,
      [estado, observaciones, req.params.id]
    );
    return res.json(rows[0]);
  }

  if (!STAFF_ROLES.includes(rol)) return res.status(403).json({ error: 'No autorizado' });
  const { rows } = await pool.query(
    `UPDATE leads SET
       estado = COALESCE($1, estado),
       observaciones = COALESCE($2, observaciones),
       asesor_asignado_id = COALESCE($3, asesor_asignado_id)
     WHERE id = $4 RETURNING *`,
    [estado, observaciones, asesorAsignadoId, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Lead no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
