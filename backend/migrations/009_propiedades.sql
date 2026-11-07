-- Migración incremental (NO borra nada) — cartera de inmuebles/captaciones
-- (propiedades que el equipo tiene para vender o alquilar), para dejar de
-- llevarla en planillas sueltas y poder cruzarla con leads y cierres.
CREATE TABLE IF NOT EXISTS propiedades (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_captador_id          UUID REFERENCES asesores(id),
  tipo_inmueble               TEXT,
  direccion                   TEXT,
  barrio                      TEXT,
  ciudad                      TEXT,
  operacion                   TEXT CHECK (operacion IN ('Venta', 'Alquiler')),
  precio_usd                  NUMERIC(14,2),
  moneda_original              TEXT NOT NULL DEFAULT 'USD',
  precio_original              NUMERIC(14,2),
  exclusiva                   BOOLEAN NOT NULL DEFAULT false,
  fecha_captacion              DATE,
  fecha_vencimiento_exclusiva  DATE,
  estado                       TEXT NOT NULL DEFAULT 'Activa' CHECK (estado IN ('Activa', 'Vendida', 'Alquilada', 'Retirada')),
  observaciones                TEXT,
  cargado_por                  UUID REFERENCES usuarios(id),
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_propiedades_fecha_captacion ON propiedades (fecha_captacion);
