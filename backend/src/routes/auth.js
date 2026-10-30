const router = require('express').Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { enviarEmail } = require('../lib/brevo');

const TOKEN_TTL_MIN = 15;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function firmarSesion(user) {
  return jwt.sign(
    { sub: user.id, rol: user.rol, asesorId: user.asesor_id },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
}

function nombreUsuario(user) {
  return user.rol === 'asesor' ? user.asesor_nombre : (user.nombre || user.email);
}

/* Login clásico con contraseña — queda vivo por si hace falta un acceso de
   emergencia, pero el frontend ya no lo usa (ver /solicitar-acceso). */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Faltan email o password' });

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.rol, u.nombre, u.asesor_id, a.nombre AS asesor_nombre
     FROM usuarios u LEFT JOIN asesores a ON a.id = u.asesor_id
     WHERE u.email = $1 AND u.activo = true`,
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  res.json({
    token: firmarSesion(user),
    usuario: { id: user.id, email: user.email, rol: user.rol, asesorId: user.asesor_id, nombre: nombreUsuario(user) },
  });
});

/* Paso 1 del login sin contraseña: pide el link de acceso por email.
   Responde {ok:true} exista o no la cuenta, para no filtrar qué emails
   están dados de alta. */
router.post('/solicitar-acceso', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Falta el email' });

  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.rol, u.nombre, a.nombre AS asesor_nombre
     FROM usuarios u LEFT JOIN asesores a ON a.id = u.asesor_id
     WHERE lower(u.email) = $1 AND u.activo = true`,
    [email]
  );
  const user = rows[0];

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
    await pool.query(
      `INSERT INTO login_tokens (usuario_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
      [user.id, hashToken(token), expiresAt]
    );

    const base = process.env.FRONTEND_URL || 'https://mynovagency.com';
    const link = `${base}/?acceso=${token}`;
    const nombre = nombreUsuario(user);

    await enviarEmail({
      to: user.email,
      nombre,
      subject: 'Tu acceso a Century 21 Nova',
      html: `
        <p>Hola ${nombre},</p>
        <p>Entrá a la plataforma de Century 21 Nova con este link, válido por ${TOKEN_TTL_MIN} minutos y de un solo uso:</p>
        <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#d4af37;color:#1a1a1a;text-decoration:none;border-radius:8px;font-weight:bold">Entrar a la plataforma</a></p>
        <p>Si no pediste este acceso, ignorá este email.</p>
      `,
    });
  }

  res.json({ ok: true });
});

/* Paso 2: canjea el token del link por una sesión real. */
router.post('/verificar-acceso', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Falta el token' });

  const { rows } = await pool.query(
    `SELECT lt.id AS token_id, u.id, u.email, u.rol, u.nombre, u.asesor_id, a.nombre AS asesor_nombre
     FROM login_tokens lt
     JOIN usuarios u ON u.id = lt.usuario_id
     LEFT JOIN asesores a ON a.id = u.asesor_id
     WHERE lt.token_hash = $1 AND lt.used_at IS NULL AND lt.expires_at > now() AND u.activo = true`,
    [hashToken(token)]
  );
  const row = rows[0];
  if (!row) return res.status(401).json({ error: 'Link inválido o vencido. Pedí uno nuevo.' });

  await pool.query(`UPDATE login_tokens SET used_at = now() WHERE id = $1`, [row.token_id]);

  res.json({
    token: firmarSesion(row),
    usuario: { id: row.id, email: row.email, rol: row.rol, asesorId: row.asesor_id, nombre: nombreUsuario(row) },
  });
});

module.exports = router;
