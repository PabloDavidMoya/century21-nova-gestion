# API — Century 21 Nova

Backend Node.js + Express + PostgreSQL. Expone los datos que hoy lee el
frontend desde `assets/js/real-data.js` (generado del Excel), pero desde una
base de datos real en Render, para que admin/asesores puedan editar en vivo.

## Primeros pasos

1. `cd backend && npm install`
2. Copiá `.env.example` a `.env` y completá `DATABASE_URL` con la que te da
   Render (nova-db → **Connect** → *Internal Database URL* si el backend
   también corre en Render, o *External Database URL* si corrés local).
3. Generá el esquema: `npm run migrate`
4. Cargá los datos reales del Excel:
   - Primero `python ../scripts/build_real_data.py` (desde la raíz del
     proyecto) — además de `real-data.js` ahora también genera
     `backend/seed-data.json`.
   - Después `npm run seed` (crea los asesores, los cierres, y un usuario
     admin — mirá la consola para ver el email/clave, o definí
     `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` antes de correrlo).
5. `npm run dev` — levanta la API en `http://localhost:3000`.

## Qué hay armado

- `POST /api/auth/login` — devuelve un JWT.
- `GET /api/asesores` — lista con GCI, lados y captaciones **calculados al
  vuelo** desde la tabla `cierres` (no son columnas sueltas que se puedan
  desincronizar).
- `POST/PUT /api/asesores` — alta/edición (solo admin).
- `GET/POST/PATCH/DELETE /api/desafios`
- `GET/POST/DELETE /api/calendario`

## Lo que falta para que el frontend lo use

Hoy `admin/*.html` y `asesor/panel.html` leen `window.C21` que arma
`mock-data.js` / `real-data.js` en el navegador. El siguiente paso es
reemplazar esos `<script>` por llamadas `fetch()` a esta API (guardando el
JWT del login en `sessionStorage`). Es un cambio acotado página por página,
no hace falta rehacer el diseño.

## Deploy en Render

Como Web Service (Node), con:
- Build command: `npm install`
- Start command: `npm start`
- Variables de entorno: `DATABASE_URL` (Internal Database URL de nova-db,
  mismo proyecto → se conectan por red privada, gratis), `JWT_SECRET`,
  `CORS_ORIGIN` (el dominio de Hostinger una vez que esté).
