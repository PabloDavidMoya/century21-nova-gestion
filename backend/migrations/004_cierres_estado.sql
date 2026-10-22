-- Estado de cada cierre: las ventas que un asesor carga él mismo entran
-- como "Pendiente" y no cuentan en GCI/metas hasta que el Broker las
-- aprueba. Los cierres que carga staff siguen entrando "Confirmado"
-- directo, como siempre.
ALTER TABLE cierres ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'Confirmado';

DO $$ BEGIN
  ALTER TABLE cierres ADD CONSTRAINT cierres_estado_check CHECK (estado IN ('Pendiente', 'Confirmado', 'Rechazado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
