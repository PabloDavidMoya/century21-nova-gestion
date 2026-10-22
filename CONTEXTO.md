# Contexto del proyecto — Century 21 Nova · Plataforma de gestión

Última actualización: 2026-10-21 (sesión nocturna con Pablo — login real,
roles y facturas de proveedores).

## Sesión 2026-10-21

Pablo pidió terminar la web esa misma noche: login real con 3 roles
(Broker ve todo, Administración a cargo de boletas/facturas de proveedores,
Asesor solo su info personal) y pasar los datos de dos Excel nuevos
("RESUMEN SEMANAL 2026.xlsx" y "Rendimiento 2026.xlsx", descargados por
Pablo a la raíz del repo — **no están en git**, `*.xlsx` sigue en
`.gitignore`) a la web.

Se decidió, con Pablo:
- Login por email+clave (no magic-link por correo todavía — eso necesita
  Brevo/Resend con API key, que no está configurado; queda para cuando
  Pablo tenga esa cuenta lista).
- Rol `gerente` (Patricia) queda con los mismos permisos que
  `administracion` (ambos ya compartían nivel de acceso con `broker`,
  salvo crear otros logins de staff, que sigue siendo solo de `broker`).
- Alcance de esta sesión: cierres+metas, mensualidades, facturas de
  proveedores (nuevo) y — reservas/ranking/categorías/tareas semanales
  quedan para una sesión siguiente (son más secundarios y calculables desde
  `cierres`/`asesores`, no urgen).

Hecho esta noche:
- **Login real unificado**: `index.html` ya no es demo — es el único login
  (`/api/auth/login`), y redirige a `admin/dashboard.html` o
  `asesor/panel.html` según el rol. Cada página protegida usa
  `assets/js/guard.js` (`C21Guard.requireRole([...], depth)`) en vez de
  tener su propio formulario de login — si no hay sesión válida o el rol no
  corresponde, redirige al login. `asesores.html`, `dashboard.html`,
  `metas.html`, `desafios.html` y `calendario.html` dejaron de usar
  `mock-data.js`/`real-data.js`: ahora siempre hablan con la API real.
- **`asesor/panel.html`** ya no tiene el selector "ver como (demo)" —
  cada asesor entra con su propio login y ve solo su ficha
  (`/api/asesores/:id` con su propio `asesorId` del JWT), sus desafíos
  propios/de "Todos", y su cartera (filtrando `/api/cierres` por
  captador/colocador).
- **Facturas de proveedores** (lo que pidió Pablo explícitamente para
  Administración): tabla nueva `facturas_proveedores`
  (`backend/schema.sql` + `backend/migrations/002_facturas_proveedores.sql`,
  ya aplicada contra la base real de Render sin tocar nada existente —
  ver "Migraciones incrementales" abajo), ruta `backend/src/routes/facturas.js`,
  formulario nuevo en `admin/finanzas.html` (carga con conversión Gs→USD,
  igual patrón que `cierres.html`; marcar "Pagada"; KPIs de pendiente/pagado).
- **Mensualidades** conectado a la API real en `finanzas.html` (antes
  100% mock): generar mensualidades del mes, listar por año, marcar
  pagada/pendiente (`backend/src/routes/mensualidades.js`, nuevo — faltaba
  el endpoint, la tabla `mensualidades` ya existía pero sin ruta).
- **Seguridad reforzada en el backend** (se encontró al revisar permisos
  para los 3 roles): `POST`/`DELETE` de `/api/cierres` y el `PATCH` de
  `/api/desafios` exigían solo estar logueado, no rol de staff — un asesor
  podía crear/borrar cierres o marcar cualquier desafío como Cumplido vía
  API directa. Ahora `cierres` exige `requireAdmin` en escritura, y
  `desafios` solo deja a un asesor tocar `progreso` (nunca `estado`) y
  solo en desafíos propios o de "Todos".

### Migraciones incrementales (importante para el futuro)

`backend/schema.sql` sigue siendo el "instalar de cero" — tiene un
`DROP TABLE` al principio, **nunca correr `npm run migrate` contra la base
real** con datos de uso diario (se pierde todo). Para sumar tablas/columnas
nuevas sin destruir nada, se agregó `backend/migrations/` +
`npm run migrate:add` (`backend/src/migrate_incremental.js`): aplica los
`.sql` de esa carpeta que todavía no se aplicaron (lleva registro en una
tabla `schema_migrations`), todo con `CREATE TABLE IF NOT EXISTS`. Usar
siempre este camino de ahora en más para cambios de esquema contra Render.

### Pendiente de esta sesión (no llegamos)

- Pasar los datos de los dos Excel nuevos a la base real (cierres del año
  completo desde "TOTAL CIERRES", mensualidades, etc.) — quedó pendiente
  un análisis detallado de esas planillas que no llegó a terminar a tiempo.
  Antes de reimportar cierres, chequear que no se dupliquen con los que ya
  haya cargado Magalí a mano desde `cierres.html`.
- Push a GitHub: el commit `e7b1919` quedó listo local pero el `git push`
  lo bloqueó el modo automático de Claude Code (clasificado como
  "publicación fuera de lugar") — hay que correrlo a mano con `! git push`.
- Pantalla de cambiar la propia contraseña (seguía pendiente de antes,
  tampoco se hizo esta noche).

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
  con tema claro/oscuro, identidad dorado/petróleo. `index.html` es el
  login real único (`/api/auth/login`, ya no hay modo demo) — redirige a
  `admin/dashboard.html` o `asesor/panel.html` según el rol de la cuenta.
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
    `calendario_eventos`, `mensualidades`, `facturas_proveedores` (nueva,
    2026-10-21). GCI/lados/captaciones de cada asesor se calculan al vuelo
    desde `cierres` (no son columnas sueltas).
  - Rutas: `/api/auth`, `/api/asesores`, `/api/cierres`, `/api/desafios`,
    `/api/calendario`, `/api/usuarios`, `/api/mensualidades` (nueva),
    `/api/facturas` (nueva).
  - Corre local en `http://localhost:3000` (`cd backend && npm run dev`).
- **Todas las páginas de `admin/*.html` y `asesor/panel.html` hablan
  siempre con la API real** desde el 2026-10-21 — ya no queda modo
  demo/mock en ninguna. El login único vive en `index.html`; cada página
  usa `assets/js/guard.js` para exigir sesión + rol correcto (ver sección
  "Sesión 2026-10-21" arriba para el detalle de qué se conectó).
- `mock-data.js` quedó sin uso (nadie lo carga ya) — se puede borrar en
  una próxima sesión si no hace falta de referencia.

## Roles y usuarios reales

4 roles en `usuarios.rol`: `broker`, `gerente`, `administracion`, `asesor`.
Desde el 2026-10-21: **Broker** ve y puede editar todo, y es el único que
puede crear otros logins de Broker/Gerente/Administración (ya estaba así
desde antes). **Gerente** y **Administración** comparten el mismo nivel de
acceso que Broker para todo lo operativo (asesores, cierres, metas,
desafíos, calendario) — la diferencia es que Administración es quien está
a cargo en la práctica de cargar/gestionar facturas de proveedores y
mensualidades en `admin/finanzas.html` (Broker y Gerente también pueden
entrar ahí, nada se los bloquea). **Asesor** solo ve su propio panel
(`asesor/panel.html`): su ficha, sus desafíos (puede actualizar su
progreso, no marcar "Cumplido" ni tocar desafíos de otros) y su cartera.
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
nuevos, cierres cargados por `cierres.html`), eso se pierde. **Desde el
2026-10-21 existe `npm run migrate:add`** (corre lo que haya en
`backend/migrations/` sin borrar nada) — usar siempre ese camino para
cambios de esquema contra la base real, no `migrate`.

## Próximos pasos (en orden sugerido)

1. Cargar a la base real los datos de los Excel nuevos ("RESUMEN SEMANAL
   2026.xlsx", "Rendimiento 2026.xlsx", en la raíz del repo, no en git) —
   quedó pendiente de la sesión 2026-10-21, ver esa sección arriba.
2. Pantalla para cambiar la propia contraseña (lo pidió Pablo, todavía no
   se hizo).
3. Desplegar el backend como Web Service en Render (proyecto `nova`,
   Frankfurt) y apuntar el frontend ahí en vez de `localhost:3000`
   (cambiar `API_BASE` en `assets/js/api.js`).
4. Subir el frontend a Hostinger.
5. Antes del 14/11/2026: pasar `nova-db` a plan pago.
6. Brevo para emails transaccionales (invitación de acceso, recuperar
   contraseña) — todavía no arrancado.
