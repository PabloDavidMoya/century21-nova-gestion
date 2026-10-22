-- Migración incremental (NO borra nada) — agrega la tabla de facturas/boletas
-- de proveedores para que Administración pueda cargarlas desde el panel.
-- A diferencia de schema.sql (que es el "instalar de cero" y borra todo),
-- esto es seguro de correr contra la base real con datos ya cargados.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS facturas_proveedores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               DATE NOT NULL,
  proveedor           TEXT NOT NULL,
  categoria           TEXT,
  concepto            TEXT,
  monto_usd           NUMERIC(12,2) NOT NULL,
  moneda_original     TEXT NOT NULL DEFAULT 'USD',
  monto_original      NUMERIC(12,2),
  numero_comprobante  TEXT,
  estado              TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Pagada')),
  fecha_pago          DATE,
  cargado_por         UUID REFERENCES usuarios(id),
  observaciones       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha ON facturas_proveedores (fecha);
