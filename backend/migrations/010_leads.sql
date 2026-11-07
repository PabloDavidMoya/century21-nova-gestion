-- Migración incremental (NO borra nada) — leads/interesados que llegan por
-- Marketplace, Messenger, WhatsApp, etc., para darles seguimiento y poder
-- atarlos a una propiedad puntual de la cartera.
-- Requiere que 009_propiedades.sql ya haya corrido (referencia "propiedades").
CREATE TABLE IF NOT EXISTS leads (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_interesado       TEXT NOT NULL,
  contacto                TEXT,
  fuente                  TEXT,
  propiedad_id            UUID REFERENCES propiedades(id),
  asesor_asignado_id      UUID REFERENCES asesores(id),
  fecha_primer_contacto   TIMESTAMPTZ,
  estado                  TEXT NOT NULL DEFAULT 'Nuevo' CHECK (estado IN ('Nuevo', 'En gestión', 'Visita agendada', 'Caído', 'Cerrado')),
  observaciones           TEXT,
  cargado_por             UUID REFERENCES usuarios(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at);
