-- Migración incremental (NO borra nada) — tareas internas asignadas a
-- usuarios (staff o asesores), con fecha límite, para no perder pendientes
-- sueltos entre chats/planillas.
CREATE TABLE IF NOT EXISTS tareas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion        TEXT NOT NULL,
  responsable_id     UUID REFERENCES usuarios(id),
  fecha_asignacion   DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_limite       DATE,
  estado             TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente', 'Hecha', 'Vencida')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tareas_fecha_limite ON tareas (fecha_limite);
