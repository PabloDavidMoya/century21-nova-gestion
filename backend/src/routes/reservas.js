const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireFullAccess, FULL_ACCESS_ROLES } = require('../middleware/auth');

/* Un asesor solo ve sus propias reservas. Administración no tiene alcance
   acá (su acceso es Finanzas) — Broker y Gerente ven todo. */
router.get('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (!FULL_ACCESS_ROLES.includes(rol) && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const { estado } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (rol === 'asesor') { cond.push(`r.asesor_id = $${i++}`); vals.push(req.user.asesorId); }
  if (estado) { cond.push(`r.estado = $${i++}`); vals.push(estado); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT r.*, a.nombre AS asesor_nombre_real FROM reservas r
     LEFT JOIN asesores a ON a.id = r.asesor_id
     ${where} ORDER BY r.fecha DESC, r.created_at DESC`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (!FULL_ACCESS_ROLES.includes(rol) && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const {
    fecha, asesorNombre, ciudad, tipoTransaccion, formaPago, oficinaCaptadora,
    precioUsd, monedaOriginal, precioOriginal, senaUsd, comisionUsd, estado, observaciones,
  } = req.body;
  // Un asesor solo puede cargar reservas a su propio nombre.
  const asesorId = rol === 'asesor' ? req.user.asesorId : (req.body.asesorId || null);
  if (!fecha || (!asesorId && !asesorNombre)) {
    return res.status(400).json({ error: 'Faltan fecha o asesor' });
  }
  const { rows } = await pool.query(
    `INSERT INTO reservas
       (fecha, asesor_id, asesor_nombre, ciudad, tipo_transaccion, forma_pago, oficina_captadora,
        precio_usd, moneda_original, precio_original, sena_usd, comision_usd, estado, observaciones, cargado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'Activa'),$14,$15) RETURNING *`,
    [
      fecha, asesorId || null, asesorNombre || null, ciudad || null, tipoTransaccion || null,
      formaPago || null, oficinaCaptadora || null, precioUsd || null, monedaOriginal || 'USD',
      precioOriginal || null, senaUsd || null, comisionUsd || null, estado || null,
      observaciones || null, req.user.sub,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireFullAccess, async (req, res) => {
  const { estado, comisionUsd, observaciones } = req.body;
  const { rows } = await pool.query(
    `UPDATE reservas SET
       estado = COALESCE($1, estado),
       comision_usd = COALESCE($2, comision_usd),
       observaciones = COALESCE($3, observaciones)
     WHERE id = $4 RETURNING *`,
    [estado, comisionUsd, observaciones, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Reserva no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireFullAccess, async (req, res) => {
  await pool.query('DELETE FROM reservas WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
