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
    compradorNombre, compradorDocTipo, compradorDocNumero, compradorTelefono, compradorFuente,
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
        comprador_nombre, comprador_doc_tipo, comprador_doc_numero, comprador_telefono, comprador_fuente,
        tipo_transaccion, fecha_cierre, moneda_original, tipo_cambio,
        precio_cierre_usd, precio_cierre_original,
        comision_monto_usd, comision_monto_original,
        comision_agente_usd, comision_agente_original,
        comision_oficina_usd, comision_oficina_original,
        observaciones, cargado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,COALESCE($18,'USD'),$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29) RETURNING *`,
    [
      asesorId || null, asesorNombre || null, tipoInmueble || null, direccion, barrio || null, ciudad || null, lado || null,
      propietarioNombre || null, propietarioTelefono || null, propietarioFuente || null,
      compradorNombre || null, compradorDocTipo || null, compradorDocNumero || null, compradorTelefono || null, compradorFuente || null,
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

// Acepta tanto la actualización rápida de estado ("Marcar cerrada", que
// manda solo { estado }) como la edición completa del formulario (manda
// todos los campos) — lo que no venga en el body queda como estaba, vía
// COALESCE.
router.patch('/:id', requireAuth, requireBroker, async (req, res) => {
  const {
    estado, asesorId, asesorNombre, tipoInmueble, direccion, barrio, ciudad, lado,
    propietarioNombre, propietarioTelefono, propietarioFuente,
    compradorNombre, compradorDocTipo, compradorDocNumero, compradorTelefono, compradorFuente,
    tipoTransaccion, fechaCierre, monedaOriginal, tipoCambio,
    precioCierreUsd, precioCierreOriginal,
    comisionMontoUsd, comisionMontoOriginal,
    comisionAgenteUsd, comisionAgenteOriginal,
    comisionOficinaUsd, comisionOficinaOriginal,
    observaciones,
  } = req.body;
  if (estado && !['Pendiente', 'Cerrada'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const { rows } = await pool.query(
    `UPDATE proformas SET
       estado = COALESCE($1, estado),
       asesor_id = COALESCE($2, asesor_id),
       asesor_nombre = COALESCE($3, asesor_nombre),
       tipo_inmueble = COALESCE($4, tipo_inmueble),
       direccion = COALESCE($5, direccion),
       barrio = COALESCE($6, barrio),
       ciudad = COALESCE($7, ciudad),
       lado = COALESCE($8, lado),
       propietario_nombre = COALESCE($9, propietario_nombre),
       propietario_telefono = COALESCE($10, propietario_telefono),
       propietario_fuente = COALESCE($11, propietario_fuente),
       comprador_nombre = COALESCE($12, comprador_nombre),
       comprador_doc_tipo = COALESCE($13, comprador_doc_tipo),
       comprador_doc_numero = COALESCE($14, comprador_doc_numero),
       comprador_telefono = COALESCE($15, comprador_telefono),
       comprador_fuente = COALESCE($16, comprador_fuente),
       tipo_transaccion = COALESCE($17, tipo_transaccion),
       fecha_cierre = COALESCE($18, fecha_cierre),
       moneda_original = COALESCE($19, moneda_original),
       tipo_cambio = COALESCE($20, tipo_cambio),
       precio_cierre_usd = COALESCE($21, precio_cierre_usd),
       precio_cierre_original = COALESCE($22, precio_cierre_original),
       comision_monto_usd = COALESCE($23, comision_monto_usd),
       comision_monto_original = COALESCE($24, comision_monto_original),
       comision_agente_usd = COALESCE($25, comision_agente_usd),
       comision_agente_original = COALESCE($26, comision_agente_original),
       comision_oficina_usd = COALESCE($27, comision_oficina_usd),
       comision_oficina_original = COALESCE($28, comision_oficina_original),
       observaciones = COALESCE($29, observaciones)
     WHERE id = $30 RETURNING *`,
    [
      estado || null, asesorId || null, asesorNombre || null, tipoInmueble || null, direccion || null, barrio || null, ciudad || null, lado || null,
      propietarioNombre || null, propietarioTelefono || null, propietarioFuente || null,
      compradorNombre || null, compradorDocTipo || null, compradorDocNumero || null, compradorTelefono || null, compradorFuente || null,
      tipoTransaccion || null, fechaCierre || null, monedaOriginal || null, tipoCambio || null,
      precioCierreUsd || null, precioCierreOriginal || null,
      comisionMontoUsd || null, comisionMontoOriginal || null,
      comisionAgenteUsd || null, comisionAgenteOriginal || null,
      comisionOficinaUsd || null, comisionOficinaOriginal || null,
      observaciones || null, req.params.id,
    ]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Proforma no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireBroker, async (req, res) => {
  await pool.query('DELETE FROM proformas WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
