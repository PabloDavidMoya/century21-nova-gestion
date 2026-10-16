const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');

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

  const token = jwt.sign(
    { sub: user.id, rol: user.rol, asesorId: user.asesor_id },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({
    token,
    usuario: {
      id: user.id,
      email: user.email,
      rol: user.rol,
      asesorId: user.asesor_id,
      nombre: user.rol === 'asesor' ? user.asesor_nombre : (user.nombre || user.email),
    },
  });
});

module.exports = router;
