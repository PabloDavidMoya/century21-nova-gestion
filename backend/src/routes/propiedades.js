const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin, STAFF_ROLES } = require('../middleware/auth');

/* Un asesor solo ve las propiedades que captó él mismo. Staff (broker,
   gerente, administración) ve todas. */
router.get('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (!STAFF_ROLES.includes(rol) && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const { estado } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (rol === 'asesor') { cond.push(`asesor_captador_id = $${i++}`); vals.push(req.user.asesorId); }
  if (estado) { cond.push(`estado = $${i++}`); vals.push(estado); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT * FROM propiedades ${where} ORDER BY fecha_captacion DESC`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  const {
    tipoInmueble, direccion, barrio, ciudad, operacion, precioUsd, monedaOriginal,
    precioOriginal, exclusiva, fechaCaptacion, fechaVencimientoExclusiva, estado, observaciones,
  } = req.body;
  // Un asesor solo puede cargar propiedades a su propio nombre como captador.
  const asesorCaptadorId = rol === 'asesor' ? req.user.asesorId : (req.body.asesorCaptadorId || null);
  if (!direccion) return res.status(400).json({ error: 'Falta dirección' });
  const { rows } = await pool.query(
    `INSERT INTO propiedades
       (asesor_captador_id, tipo_inmueble, direccion, barrio, ciudad, operacion, precio_usd,
        moneda_original, precio_original, exclusiva, fecha_captacion, fecha_vencimiento_exclusiva,
        estado, observaciones, cargado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'Disponible'),$14,$15) RETURNING *`,
    [
      asesorCaptadorId, tipoInmueble || null, direccion, barrio || null, ciudad || null,
      operacion || null, precioUsd || null, monedaOriginal || 'USD', precioOriginal || null,
      exclusiva || false, fechaCaptacion || null, fechaVencimientoExclusiva || null,
      estado || null, observaciones || null, req.user.sub,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const {
    tipoInmueble, direccion, barrio, ciudad, operacion, precioUsd, monedaOriginal,
    precioOriginal, exclusiva, fechaCaptacion, fechaVencimientoExclusiva, estado, observaciones,
  } = req.body;
  const { rows } = await pool.query(
    `UPDATE propiedades SET
       tipo_inmueble = COALESCE($1, tipo_inmueble),
       direccion = COALESCE($2, direccion),
       barrio = COALESCE($3, barrio),
       ciudad = COALESCE($4, ciudad),
       operacion = COALESCE($5, operacion),
       precio_usd = COALESCE($6, precio_usd),
       moneda_original = COALESCE($7, moneda_original),
       precio_original = COALESCE($8, precio_original),
       exclusiva = COALESCE($9, exclusiva),
       fecha_captacion = COALESCE($10, fecha_captacion),
       fecha_vencimiento_exclusiva = COALESCE($11, fecha_vencimiento_exclusiva),
       estado = COALESCE($12, estado),
       observaciones = COALESCE($13, observaciones)
     WHERE id = $14 RETURNING *`,
    [
      tipoInmueble, direccion, barrio, ciudad, operacion, precioUsd, monedaOriginal,
      precioOriginal, exclusiva, fechaCaptacion, fechaVencimientoExclusiva, estado,
      observaciones, req.params.id,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM propiedades WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
