-- Migración incremental (NO borra nada) — movimientos bancarios (ingresos y
-- egresos reales de cuenta), para poder conciliarlos contra cierres y
-- facturas_proveedores.
CREATE TABLE IF NOT EXISTS movimientos_bancarios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha             DATE NOT NULL,
  cuenta            TEXT,
  tipo              TEXT CHECK (tipo IN ('Ingreso', 'Egreso')),
  monto_usd         NUMERIC(14,2),
  moneda_original   TEXT NOT NULL DEFAULT 'USD',
  monto_original    NUMERIC(14,2),
  concepto          TEXT,
  conciliado        BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_movimientos_bancarios_fecha ON movimientos_bancarios (fecha);
