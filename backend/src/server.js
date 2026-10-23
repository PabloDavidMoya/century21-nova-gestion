require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/asesores', require('./routes/asesores'));
app.use('/api/cierres', require('./routes/cierres'));
app.use('/api/usuarios', require('./routes/usuarios'));
app.use('/api/desafios', require('./routes/desafios'));
app.use('/api/calendario', require('./routes/calendario'));
app.use('/api/mensualidades', require('./routes/mensualidades'));
app.use('/api/facturas', require('./routes/facturas'));
app.use('/api/reservas', require('./routes/reservas'));
app.use('/api/proformas', require('./routes/proformas'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`API de Century 21 Nova escuchando en :${port}`));
