-- Proformas: permitir cargar los montos en Guaraníes además de USD, con
-- tipo de cambio ajustable (mismo patrón que Reservas/Cargar cierre).
-- Se guarda el monto original + moneda + TC usado, además del USD
-- calculado, para que el documento impreso sea fiel a lo que se tipeó.
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS moneda_original TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS tipo_cambio NUMERIC(10,2);
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS precio_cierre_original NUMERIC(14,2);
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS comision_monto_original NUMERIC(14,2);
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS comision_agente_original NUMERIC(14,2);
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS comision_oficina_original NUMERIC(14,2);

DO $$ BEGIN
  ALTER TABLE proformas ADD CONSTRAINT proformas_moneda_check CHECK (moneda_original IN ('USD', 'Gs'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
