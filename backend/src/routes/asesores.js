const router = require('express').Router();
const { pool } = require('../db');
const { requireAuth, requireBroker } = require('../middleware/auth');

/* GCI y lados se calculan desde "cierres", no se guardan como columna.
   Solo cuentan cierres con estado "Confirmado" (las ventas autoadjudicadas
   por un asesor quedan en "Pendiente" hasta que el Broker las valida).
   Regla de reparto cuando captador y colocador son personas distintas:
   el gross se divide 50/50 entre ambos. Si la misma persona captó y
   colocó, se le acredita el 100%. Ajustar acá si la oficina reparte
   distinto. */
const AGGREGATE_SELECT = `
  SELECT
    a.id, a.nombre, a.estado, to_char(a.ingreso_fecha, 'YYYY-MM-DD') AS ingreso_fecha, a.meta_anual,
    COALESCE(SUM(
      CASE
        WHEN c.captador_id = a.id AND c.colocador_id = a.id THEN c.gross_usd
        WHEN c.captador_id = a.id AND c.colocador_id IS NOT NULL THEN c.gross_usd / 2
        WHEN c.captador_id = a.id THEN c.gross_usd
        WHEN c.colocador_id = a.id AND c.captador_id IS NOT NULL THEN c.gross_usd / 2
        WHEN c.colocador_id = a.id THEN c.gross_usd
        ELSE 0
      END
    ), 0) AS gci_acumulado,
    COUNT(DISTINCT c.id) FILTER (WHERE c.captador_id = a.id OR c.colocador_id = a.id) AS lados,
    COUNT(DISTINCT c.id) FILTER (WHERE c.captador_id = a.id) AS captaciones
  FROM asesores a
  LEFT JOIN cierres c ON (c.captador_id = a.id OR c.colocador_id = a.id) AND c.estado = 'Confirmado'
  GROUP BY a.id
`;

function nivelPorLados(lados) {
  if (lados >= 25) return { key: 'gold-lvl', label: 'Gold' };
  if (lados >= 11) return { key: 'silver', label: 'Silver' };
  return { key: 'bronze', label: 'Bronze' };
}

/* Un asesor solo ve su propia ficha. Gerente/Administración no tienen
   alcance acá (su acceso es Finanzas) — solo el Broker ve el listado
   completo con los números de todos. */
router.get('/', requireAuth, async (req, res) => {
  if (req.user.rol === 'asesor') {
    const { rows } = await pool.query(AGGREGATE_SELECT + ' HAVING a.id = $1', [req.user.asesorId]);
    return res.json(rows.map((a) => ({ ...a, nivel: nivelPorLados(Number(a.lados)) })));
  }
  if (req.user.rol !== 'broker') return res.status(403).json({ error: 'No autorizado' });
  const { rows } = await pool.query(AGGREGATE_SELECT + ' ORDER BY gci_acumulado DESC');
  res.json(rows.map((a) => ({ ...a, nivel: nivelPorLados(Number(a.lados)) })));
});

router.get('/:id', requireAuth, async (req, res) => {
  if (req.user.rol === 'asesor' && req.user.asesorId !== req.params.id) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  if (req.user.rol !== 'asesor' && req.user.rol !== 'broker') {
    return res.status(403).json({ error: 'No autorizado' });
  }
  const { rows } = await pool.query(AGGREGATE_SELECT + ' HAVING a.id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Asesor no encontrado' });
  res.json({ ...rows[0], nivel: nivelPorLados(Number(rows[0].lados)) });
});

router.post('/', requireAuth, requireBroker, async (req, res) => {
  const { nombre, ingresoFecha, metaAnual, estado } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Falta nombre' });
  const { rows } = await pool.query(
    `INSERT INTO asesores (nombre, ingreso_fecha, meta_anual, estado)
     VALUES ($1, $2, $3, COALESCE($4, 'Activo')) RETURNING *`,
    [nombre, ingresoFecha || null, metaAnual || 0, estado]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', requireAuth, requireBroker, async (req, res) => {
  const { nombre, ingresoFecha, metaAnual, estado } = req.body;
  const { rows } = await pool.query(
    `UPDATE asesores SET
       nombre = COALESCE($1, nombre),
       ingreso_fecha = COALESCE($2, ingreso_fecha),
       meta_anual = COALESCE($3, meta_anual),
       estado = COALESCE($4, estado),
       updated_at = now()
     WHERE id = $5 RETURNING *`,
    [nombre, ingresoFecha, metaAnual, estado, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Asesor no encontrado' });
  res.json(rows[0]);
});

router.delete('/:id', requireAuth, requireBroker, async (req, res) => {
  await pool.query('DELETE FROM asesores WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
