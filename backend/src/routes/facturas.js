const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, async (req, res) => {
  const { desde, hasta, estado } = req.query;
  const cond = [];
  const vals = [];
  let i = 1;
  if (desde) { cond.push(`fecha >= $${i++}`); vals.push(desde); }
  if (hasta) { cond.push(`fecha <= $${i++}`); vals.push(hasta); }
  if (estado) { cond.push(`estado = $${i++}`); vals.push(estado); }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const { rows } = await pool.query(
    `SELECT f.*, u.email AS cargado_por_email FROM facturas_proveedores f
     LEFT JOIN usuarios u ON u.id = f.cargado_por
     ${where} ORDER BY f.fecha DESC, f.created_at DESC`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const {
    fecha, proveedor, categoria, concepto, montoUsd,
    monedaOriginal, montoOriginal, numeroComprobante, estado, fechaPago, observaciones,
  } = req.body;
  if (!fecha || !proveedor || montoUsd == null) {
    return res.status(400).json({ error: 'Faltan fecha, proveedor o monto' });
  }
  const { rows } = await pool.query(
    `INSERT INTO facturas_proveedores
       (fecha, proveedor, categoria, concepto, monto_usd, moneda_original, monto_original,
        numero_comprobante, estado, fecha_pago, cargado_por, observaciones)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'Pendiente'),$10,$11,$12) RETURNING *`,
    [
      fecha, proveedor, categoria || null, concepto || null, montoUsd,
      monedaOriginal || 'USD', montoOriginal || null, numeroComprobante || null,
      estado || null, fechaPago || null, req.user.sub, observaciones || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id', requireAuth, requireAdmin, async (req, res) => {
  const { estado, fechaPago, montoUsd, observaciones } = req.body;
  const { rows } = await pool.query(
    `UPDATE facturas_proveedores SET
       estado = COALESCE($1, estado),
       fecha_pago = COALESCE($2, fecha_pago),
       monto_usd = COALESCE($3, monto_usd),
       observaciones = COALESCE($4, observaciones)
     WHERE id = $5 RETURNING *`,
    [estado, fechaPago, montoUsd, observaciones, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Factura no encontrada' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await pool.query('DELETE FROM facturas_proveedores WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
