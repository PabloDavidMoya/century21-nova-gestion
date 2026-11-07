-- Migración incremental (NO borra nada) — registro de actividad diaria de
-- cada asesor (llamadas, reuniones, visitas, prospección, farming), para
-- medir el esfuerzo que hay detrás de los cierres, no solo el resultado.
CREATE TABLE IF NOT EXISTS actividad_asesores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asesor_id   UUID NOT NULL REFERENCES asesores(id),
  fecha       DATE NOT NULL,
  tipo        TEXT CHECK (tipo IN ('Llamada', 'Reunión', 'Visita', 'Prospección', 'Farming')),
  cantidad    INT NOT NULL DEFAULT 1,
  notas       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_actividad_asesores_fecha ON actividad_asesores (fecha);
CREATE INDEX IF NOT EXISTS idx_actividad_asesores_asesor_id ON actividad_asesores (asesor_id);
