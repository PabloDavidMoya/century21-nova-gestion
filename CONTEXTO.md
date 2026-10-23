# Contexto del proyecto — Century 21 Nova · Plataforma de gestión

Última actualización: 2026-10-23 (Nuevo módulo Proforma de cierre).

## Sesión 2026-10-23: Proforma de cierre (nuevo módulo)

Pablo pidió una "proforma pero en el sistema" — resultó ser el formulario
interno que ya usan en papel/Excel antes de cerrar una operación:
datos del asesor, del inmueble, del propietario y del comprador/inquilino,
y el desglose de precio y comisión. Se armó como módulo nuevo, calcado del
patrón de Reservas (tabla propia + ruta CRUD + página con form + listado).

Hecho:
- **Tabla `proformas`** (`backend/schema.sql` + `backend/migrations/005_proformas.sql`,
  migración incremental — no se corrió `npm run migrate` contra la base real).
  Guarda asesor, tipo de inmueble, dirección/barrio/ciudad, lado (mismo enum
  que `cierres.lados_tipo`), datos de propietario y comprador/inquilino
  (nombre/teléfono/fuente de cada uno), tipo de transacción, fecha y precio
  de cierre, y el desglose de comisión (monto total, parte del agente, parte
  de la oficina). Estado simple `Pendiente`/`Cerrada`. **No inserta
  automáticamente en `cierres`** — sigue siendo Administración quien carga
  el cierre real en "Cargar cierre"; la proforma es el documento de trabajo
  previo, no reemplaza el ledger.
- **`backend/src/routes/proformas.js`**: GET/POST/PATCH/DELETE, con
  `requireBroker` en los cuatro (mismo nivel de acceso que Reservas —
  gerente/administración ya tienen su barra lateral limitada solo a
  Finanzas por diseño de `guard.js`, así que se mantuvo consistente en vez
  de abrirlo a todo el staff). Registrada en `server.js`.
- **`admin/proformas.html`**: formulario completo + listado de proformas
  guardadas, con botones "Imprimir / PDF" y "Compartir WhatsApp" por fila.
  El documento imprimible lleva el logo de C21 Nova (`assets/img/nova_fondo.png`
  como membrete) y queda oculto en pantalla (`#printArea`, solo visible por
  `@media print` o al generar el PDF).
  - Imprimir usa `window.print()` con CSS de impresión dedicado (mismo
    patrón que `tasacion-app.html`).
  - Compartir por WhatsApp genera un PDF real en el navegador con
    `html2pdf.js` (CDN, cdnjs) y usa `navigator.share()` con el archivo
    adjunto cuando el navegador lo soporta (Android/Chrome); si no, descarga
    el PDF y abre `wa.me` con un texto, para adjuntarlo a mano.
- Se agregó el link "Proforma de cierre" a la barra lateral de las demás
  11 páginas de `admin/` (entre Reservas y Calendario), para que quede
  navegable desde cualquier pantalla del panel.
- Probado en local: backend (`npm run dev`, puerto 3000) + frontend
  estático (`python -m http.server 8731`, raíz del proyecto) — es el
  mismo setup que ya estaba documentado más abajo. `CORS_ORIGIN` en
  `.env` está fijo a `http://localhost:8731`, así que el frontend tiene
  que servirse desde ese puerto puntual (no sirve abrir los `.html` con
  `file://` directo, ni otro puerto).
- Encontrado (no de esta sesión, pre-existente): `assets/js/api.js` sigue
  con `API_BASE = 'http://localhost:3000'` hardcodeado — el sitio público
  en GitHub Pages (`https://pablodavidmoya.github.io/century21-nova-gestion/`,
  confirmado que Pages sirve desde `master`/raíz) no puede hablar con la
  API real todavía. Falta la URL pública del Web Service de Render para
  arreglarlo — pendiente, Pablo la va a pasar.

### Ajuste en la misma sesión: tipo de inmueble + moneda en Proforma

Pablo probó el módulo recién armado y pidió dos correcciones:
1. "Tipo de inmueble" era un input de texto libre — se cambió a `<select>`
   con las mismas opciones que ya usa "Cargar cierre" (Casa, Departamento,
   Duplex, Terreno habitacional, Quinta, Local / Comercial, Casa en
   condominio), para no tener texto suelto sin estandarizar.
2. Los 4 montos (precio de cierre, comisión total, parte del agente, parte
   de la oficina) no tenían forma de cargarse en Guaraníes — se agregó el
   mismo patrón de Moneda + Tipo de cambio ajustable que ya usan Reservas
   y Cargar cierre (un selector USD/Gs y un campo de TC que aparece solo
   si se elige Gs; cada monto se tipea en la moneda elegida y se ve un
   preview en USD al lado). Se guarda tanto el valor en USD (columnas
   `*_usd`, las que usa el resto del sistema) como el monto y moneda
   originales (columnas `*_original`, `moneda_original`, `tipo_cambio`),
   para que el documento impreso muestre ambas cifras cuando la carga fue
   en Gs. Columnas nuevas en `backend/migrations/006_proformas_moneda.sql`
   (aplicada contra la base real).

Pendiente para una sesión futura (no pedido todavía, anotado para no
perderlo): botón "Convertir a cierre" que precargue el formulario de
"Cargar cierre" con los datos de la proforma aprobada, para no tipear dos
veces.

## Sesión 2026-10-22: Informes conectado a la base real

Pablo seguía sin ver los meses de enero-junio en "Informes" aunque ya
estaban cargados en la base (ver import de la sesión anterior). Causa
real: `admin/informes.html` **no hablaba con la API** — era un
`<iframe>` estático apuntando a un reporte viejo publicado aparte en
GitHub Pages (`https://pablodavidmoya.github.io/nova/`), congelado en
datos de jul-oct. Ningún dato que se cargara a la base iba a cambiar lo
que mostraba esa página.

Se reconstruyó `admin/informes.html` para que calcule todo en vivo desde
`/api/cierres`: KPIs (GCI confirmado, cierres confirmados, ventas/
alquileres, pendientes de aprobar), gráfico de barras "GCI por mes" y
"Por tipo de inmueble", y un generador de reporte con filtro de rango de
fechas (Desde/Hasta) + botón "Año completo" + "Imprimir/PDF". El reporte
viejo del iframe quedó como link de referencia al pie, ya no es la fuente
principal.

Pablo pidió después sumarle un filtro de tipo de operación ("que se
pueda filtrar entre venta y alquiler") — se agregó un `<select>` Todos/
Venta/Alquiler que se combina con el rango de fechas (ambos filtros
aplican juntos sobre el mismo array ya traído de la API, sin pedirla de
nuevo).

De paso se encontró y corrigió un bug chico: `GET /api/cierres` tenía
`LIMIT 100` fijo — con 113 filas ya cargadas se estaba truncando
silenciosamente lo que necesitaba el reporte anual. Subido a `LIMIT
2000`.

Verificado en vivo contra Render (no se tocaron contraseñas de nadie: se
generó un JWT temporal de prueba con el mismo `JWT_SECRET` del backend
para loguear como broker en el navegador, solo para este chequeo):
año completo = $104.488 GCI / 113 cierres / 29 ventas / 84 alquileres;
filtro "Venta" solo = $71.051 / 29 cierres / 29 ventas / 0 alquileres;
marzo 2026 + "Alquiler" = $1.000 / 1 cierre — todo consistente.

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

### Tercera parte de la sesión 2026-10-21: permisos por rol + cierres enero-junio

**Permisos reales por rol** (Pablo lo pidió explícito: "los asesores no
deberían ver todo lo privado de Nova" y "Magalí solo contable"):
- Gerente/Administración quedaron limitados a `finanzas.html` (facturas de
  proveedores + mensualidades) en página y en API — todo lo demás
  (`/api/asesores`, `/api/cierres`, `/api/desafios`, `/api/calendario`,
  `/api/reservas`, `/api/usuarios`) les da 403. Verificado contra Render con
  la cuenta de Magalí.
- Un asesor ya no puede ver el listado completo de asesores ni todos los
  cierres de la oficina — antes el filtro a "lo propio" era solo del
  frontend, la API de verdad devolvía todo (cualquiera con sesión de asesor
  podía pedir `/api/asesores` o `/api/cierres` directo y ver el GCI/cierres
  de todos sus compañeros). Ahora el backend filtra server-side.
- Nuevo: el asesor puede cargar su propia venta desde su panel
  ("Cargar mi venta", mismo patrón Gs→USD que `cierres.html`). Entra con
  `estado='Pendiente'` y **no** suma a GCI/metas hasta que el Broker la
  aprueba o rechaza (botones nuevos en `admin/cierres.html`). Columna
  `estado` en `cierres` (migración `004_cierres_estado.sql`, ya aplicada).
  El agregado de GCI en `asesores.js` solo cuenta `estado='Confirmado'`.
- Fix de bug: el botón de mostrar/ocultar clave del login se quedaba
  trabado mostrando la clave para siempre después del primer click.

**Cierres de enero a junio importados** (quedaban solo jul-oct). Fuente:
hojas mensuales de `RESUMEN SEMANAL 2026.xlsx` (no están en git). Son notas
semanales a mano, no una planilla prolija — hubo que: detectar que varios
montos estaban en Gs sin aviso (ej. "MARIAN VENTA CAPIATA" aparecía como
8.525.000 **USD** cuando eran Gs ≈ 1.483 USD — se corrigió con heurística
de magnitud: comisión > 50.000 en esas hojas = Gs, se convierte a 5.750
Gs/USD); fusionar a mano varios pares de filas que eran la **misma**
operación anotada dos veces (ej. "VENTA ALE Y ESTELA" / "VENTA ESTELA Y ALE
ALTEA07/01", o los dos lados de "LOS CASTAÑOS ALE y jose" / "...Jose y
Ale"); y armar un matching de nombre de pila contra `asesores` SIN
substring genérico (un intento inicial hacía que "ale" matcheara con
"Gonz**ale**z"/"Mor**ale**s" por error — se sacó, quedó solo match exacto
de primer nombre + una lista corta de apodos verificados a mano: ale→
Alexandra Villamayor, anto/antonella→Maria Antonella Caceres, fede→
Federico Villamayor, ayrton→Ariel Ayrton Zena).

Resultado: **66 cierres nuevos cargados** (enero 8, marzo 3, abril 6, mayo
15, junio 34 — total ≈ USD 51.460), todos `estado='Confirmado'` con
`observaciones` marcando que vienen de este import. La tabla `cierres` pasó
de 47 a 113 filas.

**Quedaron 6 filas SIN cargar, a propósito, por ser demasiado ambiguas para
adjudicar solas** (plata real, mejor preguntarle a Pablo que inventar):
- Febrero: una fila mezcla 4 "intenciones" de semanas distintas con una
  sola comisión de USD 2.200 — no se sabe a cuál de las 4 corresponde.
- Junio "LOS CASTAÑOS ALE y jose" (USD 1.984,78): hay **4 asesores llamados
  José** en la base (Franco/Martínez/Medina/Morales) — no se sabe cuál.
- Junio "ALQUILER STEFANY DEPOSITO" y varias filas con "Stefany/Stefani":
  hay un duplicado viejo sin resolver, **Stefania Morinigo** vs **Stefani
  Morinigo** (dos fichas para la misma persona, ya flagueado antes) — hasta
  que Pablo decida cuál es la correcta, cualquier fila con ese nombre queda
  afuera.
- Junio "Venta Edificio Doña Marena Cinthi con prosperty" (USD 4.565,33):
  hay dos Cinthia en la base (Cardozo/Fischer) y "prosperty" parece ser otra
  inmobiliaria externa, no un asesor interno.
- Junio "The Choice Estela Y Maria Paz 310": "Maria Paz Pane" quedó afuera
  porque el token suelto "maria" es ambiguo (hay 3 asesoras que arrancan con
  Maria) y no vale la pena un alias para un solo caso.
- Junio "The Choice Esytela Y Prestigio 203": "Prestigio" es otra
  inmobiliaria (co-broker externo), no hay asesor interno que cargar ahí
  (son datos legítimos de comisión compartida con otra oficina, no un
  error).

Si Pablo quiere esas 6 cargadas, lo más simple es por `cierres.html` a
mano (son pocas).

### Segunda parte de la sesión 2026-10-21: datos reales de los Excel + Reservas

Análisis completo de los dos Excel nuevos (`RESUMEN SEMANAL 2026.xlsx` y
`Rendimiento 2026.xlsx`, en la raíz, no en git). Qué se hizo con cada hoja:

- **`Asignar metas`** (Rendimiento 2026.xlsx): roster actualizado de 41
  asesores con meta anual. Se comparó 1 a 1 contra la tabla `asesores` real
  por nombre normalizado y se aplicó el diff directo a Render:
  - **19 asesores nuevos insertados** (todos `Inactivo`, gente que ya no
    está pero que figura en la planilla histórica — ej. Gisell Delgado,
    Oscar Maldonado, Jhonatan Fretes, etc. — algunos con meta histórica
    distinta de 0).
  - **1 corrección puntual**: "Pamela Figuredo" ya existía en la base pero
    con `meta_anual=0` y mal escrito el apellido en el Excel viejo vs el
    nuevo (Figuredo/Figueredo, mismo nombre de cierres/usuarios — **no se
    tocó**); se le actualizó la meta a 20000 por ser evidentemente la misma
    persona.
  - El resto de los asesores activos ya tenía la meta correcta en la base
    (coincidía con `scripts/build_real_data.py` de una corrida anterior).
  - ⚠️ **Detectado, no tocado**: hay DOS filas distintas en `asesores` para
    la misma persona con nombre mal escrito — "Stefani Morinigo" (con meta
    correcta, 25000) y "Stefania Morinigo" (duplicado viejo, meta 0). Son
    el mismo caso que Pamela pero con usuarios/cierres ya pueden estar
    repartidos entre los dos ids — **no se fusionó para no perder
    histórico**; si hace falta, decidir con Pablo cuál id es el "bueno" y
    migrar sus cierres antes de borrar el duplicado.
- **`MENSUALIDADES`** (Rendimiento 2026.xlsx): solo 3 asesores tenían pagos
  reales con monto numérico cargados (Mirtha González, Diana González, José
  Medina — $100 cada uno, enero-marzo). Se importaron a la tabla
  `mensualidades` como `pagado=true`. El resto de las celdas estaban vacías
  o decían "exonerado" (María Antonella Cáceres, feb-abr) — eso no se
  importó porque el esquema actual no tiene un estado "exonerado", solo
  pagado/pendiente; si hace falta, es un cambio de esquema a futuro.
- **`FC`** (flujo de caja proyectado): sin montos reales cargados, pero su
  lista de ~27 categorías de gasto se usó para reemplazar el `<select>`
  genérico de categoría en el formulario de facturas de `admin/finanzas.html`
  (Alquiler oficina, Salarios, Honorarios, Regalía por transacciones, etc.)
- **`TOTAL CIERRES`, `RANKING AGENTES`, `CATEGORIAS`**: **no se importaron,
  a propósito**. Son rollups/tablas derivadas que ya se calculan al vuelo
  desde `cierres`+`asesores` (gross, lados, ranking) — importarlas hubiera
  sido duplicar datos que ya existen y se pueden desincronizar. `CATEGORIAS`
  además mezcla algo distinto (% de split de comisión tipo "Top
  Producer/Aguila" por asesor, con una estructura de hoja irregular) — eso
  sí sería una funcionalidad nueva (tabla de categoría/split por asesor),
  pero toca compensación real y no se quiso improvisar el modelo de datos
  de madrugada; queda para una sesión con Pablo revisando los números.
- **`RESUMEN SEMANAL 2026.xlsx` → hojas mensuales (ENERO..OCT)**: ledger
  transaccional "pendiente de cobro/cobrado" con columnas que cambian de
  mes a mes (12 a 33 columnas), montos en Gs y comisiones compartidas —
  **no se importó**, demasiado inconsistente para mapear automáticamente
  sin inventar reglas; si Pablo quiere esto en la base, lo mejor es
  revisar con él hoja por hoja o cargar los cierres ya cerrados a mano
  desde `cierres.html` (que sí queda bien modelado).
- **`RESERVAS`** (RESUMEN SEMANAL 2026.xlsx): **sí era una funcionalidad
  nueva que faltaba** (operaciones en curso, antes de convertirse en
  cierre). Se creó la tabla `reservas` (migración
  `backend/migrations/003_reservas.sql`, ya aplicada a Render + agregada a
  `schema.sql`), rutas `backend/src/routes/reservas.js`, y página nueva
  `admin/reservas.html` (mismo patrón que `cierres.html`: moneda Gs/USD con
  conversión, asesor, estado Activa/Cerrada/Caída). Las filas históricas de
  esa hoja **no se cargaron automáticamente** — tienen nombres de asesor
  ambiguos (solo primer nombre, a veces dos personas juntas como "claudia y
  ale") y texto libre en observaciones ("FALTA COMISION 5.000.000",
  "CAIDO"); cargar eso mal podría mostrarle a alguien una reserva que no es
  suya. Queda la pantalla lista para que Administración las vaya cargando
  de nuevo a mano (son pocas, están activas, no es trabajo pesado).
- **`TAREAS GENERAL`**: es una agenda/checklist gerencial suelta
  (reclutamiento, KPIs, objetivos), no tareas semanales estructuradas por
  asesor — no mapea a ninguna tabla razonable, no se tocó.

### Pendiente de esta sesión (no llegamos)

- Push a GitHub: los commits locales quedaron listos pero el `git push`
  lo bloquea el modo automático de Claude Code (clasificado como
  "publicación fuera de lugar") — hay que correrlo a mano con `! git push`.
- Pantalla de cambiar la propia contraseña (seguía pendiente de antes,
  tampoco se hizo esta noche).
- Decidir con Pablo el duplicado "Stefani"/"Stefania Morinigo" en
  `asesores` (ver arriba) y si vale la pena modelar el % de split de
  comisión ("Top Producer/Aguila") de la hoja `CATEGORIAS`.

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
    `calendario_eventos`, `mensualidades`, `facturas_proveedores`,
    `reservas` (nueva, 2026-10-21). GCI/lados/captaciones de cada asesor se
    calculan al vuelo desde `cierres` (no son columnas sueltas).
  - Rutas: `/api/auth`, `/api/asesores`, `/api/cierres`, `/api/desafios`,
    `/api/calendario`, `/api/usuarios`, `/api/mensualidades`,
    `/api/facturas`, `/api/reservas` (nueva).
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

1. Pantalla para cambiar la propia contraseña (lo pidió Pablo, todavía no
   se hizo).
2. Desplegar el backend como Web Service en Render (proyecto `nova`,
   Frankfurt) y apuntar el frontend ahí en vez de `localhost:3000`
   (cambiar `API_BASE` en `assets/js/api.js`).
3. Subir el frontend a Hostinger.
4. Antes del 14/11/2026: pasar `nova-db` a plan pago.
5. Brevo para emails transaccionales (invitación de acceso, recuperar
   contraseña) — todavía no arrancado.
6. Cargar a mano desde `admin/reservas.html` las reservas activas actuales
   (la planilla tenía nombres de asesor ambiguos, no se importaron solas —
   ver sección de la sesión 2026-10-21).
7. Decidir con Pablo el duplicado Stefani/Stefania Morinigo y si modelar
   el % de split de comisión por asesor (hoja `CATEGORIAS`).
