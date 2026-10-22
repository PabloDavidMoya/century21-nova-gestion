-- Migración incremental (NO borra nada) — agrega la tabla de reservas activas
-- (operaciones en curso, antes de convertirse en cierre), para que el equipo
-- pueda cargarlas y darles seguimiento desde el panel.
CREATE TABLE IF NOT EXISTS reservas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha              DATE NOT NULL,
  asesor_id          UUID REFERENCES asesores(id),
  asesor_nombre      TEXT,
  ciudad             TEXT,
  tipo_transaccion   TEXT CHECK (tipo_transaccion IN ('Venta', 'Alquiler')),
  forma_pago         TEXT,
  oficina_captadora  TEXT,
  precio_usd         NUMERIC(14,2),
  moneda_original    TEXT NOT NULL DEFAULT 'USD',
  precio_original    NUMERIC(14,2),
  sena_usd           NUMERIC(14,2),
  comision_usd       NUMERIC(14,2),
  estado             TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Cerrada', 'Caida')),
  observaciones      TEXT,
  cargado_por        UUID REFERENCES usuarios(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas (fecha);
