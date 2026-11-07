-- Migración incremental (NO borra nada) — pipeline de reclutamiento de
-- nuevos asesores (contacto → entrevista → sesión de carrera → incorporado),
-- para que el broker/gerente le dé seguimiento desde el panel.
CREATE TABLE IF NOT EXISTS reclutamiento (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          TEXT NOT NULL,
  contacto        TEXT,
  fecha_contacto  DATE,
  etapa           TEXT NOT NULL DEFAULT 'Contacto' CHECK (etapa IN ('Contacto', 'Entrevista', 'Sesión de carrera', 'Incorporado', 'Descartado')),
  responsable_id  UUID REFERENCES usuarios(id),
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
