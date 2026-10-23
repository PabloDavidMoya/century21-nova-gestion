-- Documento de identidad del comprador/inquilino (Cédula, RUC, DNI o
-- Pasaporte), pedido para identificar a la contraparte en la proforma.
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS comprador_doc_tipo TEXT;
ALTER TABLE proformas ADD COLUMN IF NOT EXISTS comprador_doc_numero TEXT;

DO $$ BEGIN
  ALTER TABLE proformas ADD CONSTRAINT proformas_comprador_doc_tipo_check CHECK (comprador_doc_tipo IN ('Cédula', 'RUC', 'DNI', 'Pasaporte'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
