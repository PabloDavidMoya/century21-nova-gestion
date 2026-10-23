const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireBroker } = require('../middleware/auth');

router.get('/', requireAuth, requireBroker, async (req, res) => {
  const { estado } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (estado) { cond.push(`p.estado = $${i++}`); vals.push(estado); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT p.*, a.nombre AS asesor_nombre_real FROM proformas p
     LEFT JOIN asesores a ON a.id = p.asesor_id
     ${where} ORDER BY p.created_at DESC`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, requireBroker, async (req, res) => {
  const {
    asesorId, asesorNombre, tipoInmueble, direccion, barrio, ciudad, lado,
    propietarioNombre, propietarioTelefono, propietarioFuente,
    compradorNombre, compradorTelefono, compradorFuente,
    tipoTransaccion, fechaCierre, monedaOriginal, tipoCambio,
    precioCierreUsd, precioCierreOriginal,
    comisionMontoUsd, comisionMontoOriginal,
    comisionAgenteUsd, comisionAgenteOriginal,
    comisionOficinaUsd, comisionOficinaOriginal,
    observaciones,
  } = req.body;

  if (!direccion) return res.status(400).json({ error: 'Falta la dirección del inmueble' });

  const { rows } = await pool.query(
    `INSERT INTO proformas
       (asesor_id, asesor_nombre, tipo_inmueble, direccion, barrio, ciudad, lado,
        propietario_nombre, propietario_telefono, propietario_fuente,
        comprador_nombre, comprador_telefono, comprador_fuente,
        tipo_transaccion, fecha_cierre, moneda_original, tipo_cambio,
        precio_cierre_usd, precio_cierre_original,
        comision_monto_usd, comision_monto_original,
        comision_agente_usd, comision_agente_original,
        comision_oficina_usd, comision_oficina_original,
        observaciones, cargado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,COALESCE($16,'USD'),$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) RETURNING *`,
    [
      asesorId || null, asesorNombre || null, tipoInmueble || null, direccion, barrio || null, ciudad || null, lado || null,
      propietarioNombre || null, propietarioTelefono || null, propietarioFuente || null,
      compradorNombre || null, compradorTelefono || null, compradorFuente || null,
      tipoTransaccion || null, fechaCierre || null, monedaOriginal || null, tipoCambio || null,
      precioCierreUsd || null, precioCierreOriginal || null,
      comisionMontoUsd || null, comisionMontoOriginal || null,
      comisionAgenteUsd || null, comisionAgenteOriginal || null,
      comisionOficinaUsd || null, comisionOficinaOriginal || null,
      observaciones || null, req.user.sub,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireBroker, async (req, res) => {
  const { estado, observaciones } = req.body;
  if (estado && !['Pendiente', 'Cerrada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const { rows } = await pool.query(
    `UPDATE proformas SET
       estado = COALESCE($1, estado),
       observaciones = COALESCE($2, observaciones)
     WHERE id = $3 RETURNING *`,
    [estado, observaciones, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Proforma no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireBroker, async (req, res) => {
  await pool.query('DELETE FROM proformas WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
