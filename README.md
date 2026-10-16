# Century 21 Nova · Plataforma de gestión

Web de gestión interna para la oficina: tareas administrativas, metas y proyecciones
de los asesores, desafíos, calendario, finanzas y un panel propio para cada asesor
con sus números y desafíos asignados.

## Estado actual — Fase 1 (prototipo visual)

Todo lo que hay acá es **HTML/CSS/JS sin backend**, con datos de ejemplo
(`assets/js/mock-data.js`), pensado para mostrarle el diseño y la navegación
completa a la dueña antes de construir la base de datos real. Los desafíos y
el calendario se guardan en `localStorage` del navegador solo para que la demo
se sienta interactiva — no es persistencia real todavía.

- `index.html` — login (visual, cualquier usuario/contraseña entra).
- `admin/` — panel de administración: dashboard, asesores, metas y proyecciones,
  desafíos, calendario, finanzas (solo admin), tasación ACM, informes.
- `asesor/panel.html` — panel del asesor: resumen, mis desafíos, mi cartera,
  calendario del equipo. Hay un selector "ver como" para probar distintos asesores
  sin login real.
- `assets/` — estilos (tokens de marca + claro/oscuro), datos de ejemplo y
  gráficos SVG propios (sin librerías externas).

## Identidad visual

Dorado sobre verde petróleo (`assets/img/nova_fondo.png` es el banner/logo real
de Century 21 Nova). El sidebar del panel es siempre oscuro; el contenido
respeta el tema claro/oscuro que elija cada usuario (botón de sol/luna, se
guarda en `localStorage`).

## Próximos pasos

1. **Fase 1 (acá):** aprobar diseño y navegación con la dueña, revisar en GitHub.
2. **Fase 2:** backend en Render (Node.js + Express + PostgreSQL), autenticación
   real por rol (admin/asesor), Brevo para emails transaccionales (invitaciones,
   recuperación de contraseña, avisos de nuevos desafíos). Migrar los datos reales
   desde las planillas "Rendimiento 2026".
3. **Fase 3:** deploy del frontend a Hostinger (como los otros proyectos) conectado
   a la API de Render.

## Cómo verlo en local

Es un sitio estático, no necesita build. Alcanza con abrir `index.html`, o mejor,
levantar un servidor simple para que los `iframe` funcionen bien:

```
python -m http.server 8000
```

y entrar a `http://localhost:8000/`.
