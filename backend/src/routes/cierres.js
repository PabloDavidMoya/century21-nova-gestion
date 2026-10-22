const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireBroker } = require('../middleware/auth');

/* Un asesor solo ve sus propios cierres (cualquier estado, para seguir su
   aprobación). Gerente/Administración no tocan cierres — su alcance es
   Finanzas (facturas, mensualidades). Solo el Broker ve todo. */
router.get('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (rol !== 'broker' && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const where = rol === 'asesor' ? 'WHERE c.captador_id = $1 OR c.colocador_id = $1' : '';
  const vals = rol === 'asesor' ? [req.user.asesorId] : [];
  const { rows } = await pool.query(
    `SELECT c.*, ca.nombre AS captador_nombre, co.nombre AS colocador_nombre
     FROM cierres c
     LEFT JOIN asesores ca ON ca.id = c.captador_id
     LEFT JOIN asesores co ON co.id = c.colocador_id
     ${where}
     ORDER BY c.fecha_cobro DESC, c.created_at DESC
     LIMIT 2000`,
    vals
  );
  res.json(rows);
});

router.post('/', requireAuth, async (req, res) => {
  const rol = req.user.rol;
  if (rol !== 'broker' && rol !== 'asesor') return res.status(403).json({ error: 'No autorizado' });

  const { fechaCobro, tipoInmueble, tipoTransaccion, grossUsd, direccion, observaciones } = req.body;
  if (!fechaCobro || !grossUsd || !tipoTransaccion) {
    return res.status(400).json({ error: 'Faltan fechaCobro, grossUsd o tipoTransaccion' });
  }

  let captadorId, colocadorId, estado;
  if (rol === 'asesor') {
    // Autoadjudicada: siempre a su propio nombre y pendiente de validar.
    captadorId = req.user.asesorId;
    colocadorId = null;
    estado = 'Pendiente';
  } else {
    captadorId = req.body.captadorId || null;
    colocadorId = req.body.colocadorId || null;
    estado = 'Confirmado';
    if (!captadorId && !colocadorId) {
      return res.status(400).json({ error: 'Tenés que indicar al menos un asesor (captador o colocador)' });
    }
  }

  let ladosTipo;
  if (captadorId && colocadorId && captadorId === colocadorId) ladosTipo = 'Capta/Coloca';
  else if (captadorId && colocadorId) ladosTipo = 'Ambas puntas';
  else if (captadorId) ladosTipo = 'Captación';
  else ladosTipo = 'Colocación';

  const { rows } = await pool.query(
    `INSERT INTO cierres (fecha_cobro, tipo_inmueble, tipo_transaccion, gross_usd, lados_tipo, captador_id, colocador_id, direccion, observaciones, estado)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [fechaCobro, tipoInmueble || null, tipoTransaccion, grossUsd, ladosTipo, captadorId || null, colocadorId || null, direccion || null, observaciones || null, estado]
  );
  res.status(201).json(rows[0]);
});

// Aprobar/rechazar una venta autoadjudicada por un asesor — solo el Broker.
router.patch('/:id', requireAuth, requireBroker, async (req, res) => {
  const { estado } = req.body;
  if (!['Pendiente', 'Confirmado', 'Rechazado'].includes(estado)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }
  const { rows } = await pool.query(
    'UPDATE cierres SET estado = $1 WHERE id = $2 RETURNING *',
    [estado, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Cierre no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireBroker, async (req, res) => {
  await pool.query('DELETE FROM cierres WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
