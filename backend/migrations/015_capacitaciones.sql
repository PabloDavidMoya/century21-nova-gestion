-- Migración incremental (NO borra nada) — capacitaciones/entrenamientos
-- internos, con convocados vs. asistentes, para medir participación del
-- equipo.
CREATE TABLE IF NOT EXISTS capacitaciones (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha              DATE NOT NULL,
  tema               TEXT NOT NULL,
  responsable_id     UUID REFERENCES usuarios(id),
  convocados_count   INT,
  asistentes_count   INT,
  observaciones      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_capacitaciones_fecha ON capacitaciones (fecha);
