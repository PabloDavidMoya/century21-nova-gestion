-- Proforma para cierre: formulario interno con los datos de propietario,
-- comprador/inquilino, precio y comisión, pensado para imprimir/compartir
-- y para quedar como historial. No reemplaza a "Cargar cierre".
CREATE TABLE IF NOT EXISTS proformas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id            UUID REFERENCES asesores(id),
  asesor_nombre        TEXT,
  tipo_inmueble        TEXT,
  direccion            TEXT,
  barrio               TEXT,
  ciudad               TEXT,
  lado                 TEXT CHECK (lado IN ('Ambas puntas', 'Captación', 'Colocación', 'Capta/Coloca')),
  propietario_nombre   TEXT,
  propietario_telefono TEXT,
  propietario_fuente   TEXT,
  comprador_nombre     TEXT,
  comprador_telefono   TEXT,
  comprador_fuente     TEXT,
  tipo_transaccion     TEXT CHECK (tipo_transaccion IN ('Venta', 'Alquiler')),
  fecha_cierre         DATE,
  precio_cierre_usd    NUMERIC(14,2),
  comision_monto_usd   NUMERIC(14,2),
  comision_agente_usd  NUMERIC(14,2),
  comision_oficina_usd NUMERIC(14,2),
  estado               TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Cerrada')),
  observaciones        TEXT,
  cargado_por          UUID REFERENCES usuarios(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proformas_fecha ON proformas (fecha_cierre);
