-- Migración incremental (NO borra nada) — login sin contraseña: se guarda
-- el hash del token de acceso de un solo uso que se manda por email (Brevo),
-- nunca el token en texto plano, para que una fuga de la base no alcance
-- para loguearse como nadie.
CREATE TABLE IF NOT EXISTS login_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_tokens_usuario ON login_tokens (usuario_id);
