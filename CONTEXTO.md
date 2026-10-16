# Contexto del proyecto — Century 21 Nova · Plataforma de gestión

Última actualización: 2026-10-16 (sesión nocturna con Pablo).

## Qué es esto

Web de gestión interna para Century 21 Nova: tareas administrativas,
informes y proyecciones de asesores, panel propio por asesor con sus
desafíos y números. Hermano del proyecto `reporte-cierres` (el reporte de
cierres jul-oct ya publicado en GitHub Pages), pero mucho más grande:
login real, roles, base de datos.

Repo: https://github.com/PabloDavidMoya/century21-nova-gestion (**público**,
decisión explícita de Pablo — ver sección "Decisiones de privacidad").

## Estado actual

- **Frontend** (`index.html`, `admin/*.html`, `asesor/panel.html`): hecho,
  con tema claro/oscuro, identidad dorado/petróleo. Login de demo en
  `index.html` sigue sin conectar a la API real (es solo para elegir qué
  panel mirar).
- **Datos reales cargados**: 32 asesores + 47 cierres (jul-oct 2026),
  extraídos de los Excel de `../reporte-cierres` con
  `scripts/build_real_data.py`. Genera `assets/js/real-data.js` (lo lee el
  frontend estático) y `backend/seed-data.json` (lo usa `backend/src/seed.js`
  para cargar la base real). **Ambos archivos SÍ están en git** (antes
  estaban en `.gitignore`, Pablo pidió explícitamente subirlos — ver abajo).
- **Backend real** (`backend/`): Node/Express + PostgreSQL, funcionando.
  - Base de datos: `nova-db` en Render, plan **Free** (¡OJO: expira el
    **14 de noviembre de 2026**! hay que pasarla a plan pago antes de esa
    fecha o se borra todo — ver sección Render).
  - Esquema: `asesores`, `usuarios`, `cierres`, `desafios`,
    `calendario_eventos`, `mensualidades`. GCI/lados/captaciones de cada
    asesor se calculan al vuelo desde `cierres` (no son columnas sueltas).
  - Rutas: `/api/auth`, `/api/asesores`, `/api/cierres`, `/api/desafios`,
    `/api/calendario`, `/api/usuarios`.
  - Corre local en `http://localhost:3000` (`cd backend && npm run dev`).
- **Páginas conectadas a la API real** (login propio, no el de demo):
  - `admin/cierres.html` — carga de cierres (reemplaza anotar a mano en
    Excel cuando llega un cierre por WhatsApp). Convierte Gs→USD solo.
  - `admin/asesores.html` — tiene botón "Conectar con base real": trae
    datos en vivo, permite editar meta/estado y dar de alta asesores. Si no
    te conectás, sigue mostrando `real-data.js` (modo demo/offline).
  - `admin/usuarios.html` — alta de accesos por rol.
- **Todavía en modo demo (localStorage, no backend)**: `admin/desafios.html`
  y `admin/calendario.html`. Están listos para conectar siguiendo el mismo
  patrón que `cierres.html` (login real + fetch a `/api/desafios` y
  `/api/calendario`, que ya existen en el backend).
- **`admin/finanzas.html`**: sigue 100% con datos de ejemplo. No hay fuente
  real de mensualidades pagadas/flujo de caja todavía (no hay planilla de
  eso). No inventar datos de pago reales sobre gente real.

## Roles y usuarios reales

4 roles en `usuarios.rol`: `broker`, `gerente`, `administracion`, `asesor`.
Hoy los tres primeros tienen el mismo nivel de acceso (placeholder) —
**Pablo va a decir qué tarea/permiso tiene cada uno, todavía no lo definió**.
Cuando lo haga, ajustar `backend/src/middleware/auth.js` (hoy
`requireAdmin` acepta cualquiera de los 3 por igual) y los routes.

Cuentas reales creadas (2026-10-16):
- **Broker**: Alexandra Villamayor — alexandra.villamayor@century21nova.com
  (ella también tiene su propia ficha en `asesores`, como vendedora — son
  dos cosas separadas: su login de Broker y su fila de producción).
- **Gerente**: Patricia Villamayor — patricia.villamayor@century21nova.com
- **Administración**: Magalí — magali@century21nova.com

Las contraseñas temporales se las pasé a Pablo por chat, no están guardadas
en ningún archivo (ni acá). Falta: pantalla de "cambiar mi contraseña"
(Pablo la pidió, no se hizo todavía).

Reglas de permisos ya implementadas (server-side, no solo visual):
- Solo un **Broker** puede crear otro login de Broker/Gerente/Administración.
  Gerente/Administración sí pueden dar de alta Asesores.
- Nadie puede desactivarse ni eliminarse a sí mismo.
- No se puede eliminar al último Broker activo.

⚠️ **Cuidado con el botón "Eliminar" en `usuarios.html`**: en esta sesión me
autoeliminé el usuario Broker por error (el botón aparecía en la propia
fila). Ya está arreglado (la propia fila muestra "Tu cuenta", sin botones;
y el servidor rechaza auto-eliminación), pero si se nota algo raro con
cuentas que desaparecen, repasar `backend/src/routes/usuarios.js`.

## Render (infraestructura)

Cuenta de Pablo, workspace **KeyVox** (plan Hobby). Dos proyectos:
- `My project` (prj-d9uuhpm417fc7396ket0): tiene `amy-agent` (otro
  proyecto de Pablo, no relacionado).
- `nova` (prj-db8oa2ei0phs738e2eh0): acá va todo lo de Century 21 Nova.
  Hoy adentro: **nova-db** (Postgres, Free, región **Frankfurt**).

**Pendiente de decidir**: la región. Pablo preguntó por qué Frankfurt (lejos
de Paraguay) y se iba a cambiar a Virginia, pero a último momento dijo
"dejala así" — quedó en Frankfurt. Si en el futuro hay quejas de latencia,
ahí está la conversación de por qué no se cambió.

**Falta crear**: el Web Service de Node para el backend (hoy `backend/`
solo corre local). Cuando se despliegue, usar la misma región que la base
(Frankfurt) para que se hablen por red privada gratis, variables de entorno
`DATABASE_URL` (Internal Database URL de nova-db), `JWT_SECRET` (generar
nuevo, no reusar el de local), `CORS_ORIGIN` (el dominio de Hostinger).

**Antes del 14/11/2026**: pasar `nova-db` a un plan pago (desde ~$6-10/mes)
o se borra la base entera. Recordarle a Pablo con tiempo.

## Decisiones de privacidad (importante, ya conversadas — no re-litigar)

- El repo es **público** y por pedido explícito de Pablo contiene datos
  reales (nombres y comisiones de los 32 asesores) — se le explicó el
  riesgo (queda expuesto para siempre en el historial de git, cualquiera
  que encuentre el repo ve sueldos por nombre) y confirmó que quiere
  subirlo igual. No volver a preguntar esto salvo que él lo traiga de nuevo.
- Lo que **nunca** va a git, bajo ninguna instrucción, por ser un riesgo de
  seguridad real (no de privacidad): `backend/.env` (contraseña de conexión
  a la base de datos real) y cualquier `JWT_SECRET`. Si se filtra, cualquiera
  puede borrar/robar la base en producción. Esto no es negociable como lo
  del punto anterior.

## Cómo levantar todo en local

```
# Backend (puerto 3000)
cd backend
npm install   # si no se hizo
npm run dev

# Frontend estático (puerto 8731), desde la raíz del proyecto
python -m http.server 8731
```

Para tener datos reales actualizados: `python scripts/build_real_data.py`
desde la raíz (lee los Excel de `../reporte-cierres`), después si hay
cambios de asesores/cierres nuevos en la base real, correr
`cd backend && npm run migrate && npm run seed` — **ojo que `migrate` borra
y recrea todas las tablas** (ver el comentario en `backend/schema.sql`), así
que si ya hay datos cargados a mano desde el panel (desafíos, usuarios
nuevos, cierres cargados por `cierres.html`), eso se pierde. Antes de volver
a correr `migrate` en una base con datos reales de uso diario, cambiar esa
estrategia por migraciones incrementales.

## Próximos pasos (en orden sugerido)

1. Pantalla para cambiar la propia contraseña (lo pidió Pablo).
2. Conectar `desafios.html` y `calendario.html` a la API real (mismo patrón
   que `cierres.html` / `asesores.html`).
3. Que Pablo defina permisos diferenciados Broker/Gerente/Administración.
4. Desplegar el backend como Web Service en Render (proyecto `nova`,
   Frankfurt) y apuntar el frontend ahí en vez de `localhost:3000`
   (cambiar `API_BASE` en `assets/js/api.js`).
5. Subir el frontend a Hostinger.
6. Antes del 14/11/2026: pasar `nova-db` a plan pago.
7. Brevo para emails transaccionales (invitación de acceso, recuperar
   contraseña) — todavía no arrancado.
