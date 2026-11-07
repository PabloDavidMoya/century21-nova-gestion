-- Migración incremental (NO borra nada) — presupuesto mensual por categoría
-- (ingresos/gastos previstos), para poder comparar contra lo real que ya
-- se registra en cierres/facturas_proveedores.
CREATE TABLE IF NOT EXISTS presupuesto (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio                      INT NOT NULL,
  mes                       INT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria                 TEXT NOT NULL,
  presupuesto_ingresos_usd  NUMERIC(14,2) NOT NULL DEFAULT 0,
  presupuesto_gastos_usd    NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (anio, mes, categoria)
);
