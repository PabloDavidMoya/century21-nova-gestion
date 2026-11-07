-- Migración incremental (NO borra nada) — acompañamientos a asesores
-- (salida de campo o coaching), con plan de mejora, para dejar trazabilidad
-- del seguimiento que hace el broker/gerente.
CREATE TABLE IF NOT EXISTS acompanamientos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id       UUID NOT NULL REFERENCES asesores(id),
  fecha           DATE NOT NULL,
  tipo            TEXT CHECK (tipo IN ('Salida de campo', 'Coaching')),
  responsable_id  UUID REFERENCES usuarios(id),
  plan_mejora     TEXT,
  observaciones   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_acompanamientos_asesor_id ON acompanamientos (asesor_id);
