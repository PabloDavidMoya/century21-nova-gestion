/* Century 21 Nova — datos de ejemplo para el prototipo.
   Estructura pensada para calzar con las planillas "Rendimiento 2026":
   asesores, metas mensuales, GCI, lados, captaciones, niveles.
   Estos NO son datos reales de la oficina — son de muestra para el diseño,
   hasta que se conecte la base de datos real (Fase 2, backend en Render). */

(function () {
  var MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  var MES_ACTUAL_IDX = 9; // Octubre, en curso — igual que el reporte de cierres

  function nivelPorLados(lados) {
    if (lados >= 25) return { key: 'gold-lvl', label: 'Gold' };
    if (lados >= 11) return { key: 'silver', label: 'Silver' };
    return { key: 'bronze', label: 'Bronze' };
  }

  var asesores = [
    { id: 'a1', nombre: 'Alexandra Villamayor', estado: 'Activo', antiguedad: '3 años', metaAnual: 95000,
      mensual: [4200,3800,4600,6100,5800,6900,7800,7400,8600,9200,0,0] },
    { id: 'a2', nombre: 'Marian Sosa', estado: 'Activo', antiguedad: '2 años', metaAnual: 70000,
      mensual: [3200,2900,3600,4100,4700,5100,5500,5300,6100,6700,0,0] },
    { id: 'a3', nombre: 'Luis Benítez', estado: 'Activo', antiguedad: '4 años', metaAnual: 85000,
      mensual: [4100,4600,3900,5300,6000,6300,6600,7200,6800,7300,0,0] },
    { id: 'a4', nombre: 'Gisell Delgado', estado: 'Activo', antiguedad: '1 año', metaAnual: 45000,
      mensual: [1300,1100,1700,2100,1900,2500,2800,2900,3200,3300,0,0] },
    { id: 'a5', nombre: 'Mirtha González', estado: 'Activo', antiguedad: '1 año', metaAnual: 38000,
      mensual: [900,1400,1200,1600,1800,1950,2150,2300,2450,2650,0,0] },
    { id: 'a6', nombre: 'Keila Ruffinelli', estado: 'Inactivo', antiguedad: '2 años', metaAnual: 50000,
      mensual: [2600,2400,2500,0,0,0,0,0,0,0,0,0] },
    { id: 'a7', nombre: 'Fernando Ortiz', estado: 'Activo', antiguedad: '5 años', metaAnual: 100000,
      mensual: [6200,6800,6000,7400,8000,8600,9100,8700,9600,10200,0,0] },
    { id: 'a8', nombre: 'Rocío Ayala', estado: 'Activo', antiguedad: '6 meses', metaAnual: 25000,
      mensual: [0,0,700,1000,1200,1300,1500,1650,1800,1950,0,0] }
  ];

  var OFFICE_SPLIT = 0.3; // % del GCI de los asesores que queda para la oficina

  asesores.forEach(function (a, i) {
    a.mensualidad = 200;
    a.mesesPagados = a.estado === 'Activo' ? MES_ACTUAL_IDX + 1 - (i % 2) : Math.max(0, MES_ACTUAL_IDX - 2);
    a.gciAcumulado = a.mensual.reduce(function (s, v) { return s + v; }, 0);
    a.metaAcumuladaAHoy = (a.metaAnual / 12) * (MES_ACTUAL_IDX + 1);
    a.cumplimiento = Math.round((a.gciAcumulado / a.metaAcumuladaAHoy) * 100);
    a.lados = Math.round(a.gciAcumulado / 3500);
    a.captaciones = Math.round(a.lados * 1.1);
    a.nivel = nivelPorLados(a.lados);
  });

  var oficina = {
    metaAnual: 500000,
    metaMensual: [25000,40000,40000,40000,45000,45000,40000,40000,45000,40000,45000,55000],
    realMensual: MESES.map(function (_, i) {
      return asesores.reduce(function (s, a) { return s + (a.mensual[i] || 0); }, 0);
    }),
    tiers: [
      { label: 'Centurion', monto: 200000 },
      { label: 'Doble Centurion', monto: 500000 },
      { label: 'Grand Centurion', monto: 1200000 }
    ]
  };
  oficina.realAcumulado = oficina.realMensual.reduce(function (s, v) { return s + v; }, 0);
  oficina.metaAcumuladaAHoy = oficina.metaMensual.slice(0, MES_ACTUAL_IDX + 1).reduce(function (s, v) { return s + v; }, 0);
  oficina.cumplimiento = Math.round((oficina.realAcumulado / oficina.metaAcumuladaAHoy) * 100);
  oficina.splitOficina = OFFICE_SPLIT;
  oficina.ingresoComisionesMensual = oficina.realMensual.map(function (v) { return v * OFFICE_SPLIT; });
  oficina.ingresoMensualidadesMensual = MESES.map(function (_, i) {
    if (i > MES_ACTUAL_IDX) return 0;
    return asesores.filter(function (a) { return a.mesesPagados > i; }).length * 200;
  });

  var captacionesPorProducto = [
    { producto: 'Casas', captadas: 34, colocadas: 21 },
    { producto: 'Departamentos', captadas: 22, colocadas: 15 },
    { producto: 'Terrenos', captadas: 18, colocadas: 9 },
    { producto: 'Duplex', captadas: 11, colocadas: 7 },
    { producto: 'Alquileres', captadas: 26, colocadas: 19 }
  ];

  var CALENDARIO_KEY = 'c21-calendario-demo';
  var calendarioDefault = [
    { fecha: '2026-10-17', tipo: 'reunion', titulo: 'Reunión semanal de equipo', hora: '09:00' },
    { fecha: '2026-10-18', tipo: 'cumple', titulo: 'Cumpleaños — Marian Sosa', hora: '' },
    { fecha: '2026-10-21', tipo: 'capacitacion', titulo: 'Capacitación: cierre de objeciones', hora: '15:00' },
    { fecha: '2026-10-24', tipo: 'evento', titulo: 'Jornada de puertas abiertas — San Bernardino', hora: '10:00' },
    { fecha: '2026-10-28', tipo: 'cumple', titulo: 'Cumpleaños — Fernando Ortiz', hora: '' },
    { fecha: '2026-11-02', tipo: 'reunion', titulo: 'Cierre de mes — revisión de metas', hora: '09:00' },
    { fecha: '2026-11-05', tipo: 'capacitacion', titulo: 'Capacitación: uso del ACM', hora: '15:00' }
  ];

  function loadCalendario() {
    try {
      var raw = localStorage.getItem(CALENDARIO_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignorar y usar default */ }
    return calendarioDefault.slice();
  }
  function saveCalendario(list) {
    try { localStorage.setItem(CALENDARIO_KEY, JSON.stringify(list)); } catch (e) { /* modo privado */ }
  }

  var DESAFIOS_KEY = 'c21-desafios-demo';
  var desafiosDefault = [
    { id: 'd1', titulo: '10 llamadas diarias', descripcion: 'Registrar 10 llamadas de prospección por día hábil durante el mes.', tipo: 'Prospección', asignadoA: 'Todos', meta: 200, progreso: 134, unidad: 'llamadas', vence: '2026-10-31', estado: 'Activo' },
    { id: 'd2', titulo: 'Reactivar cartera fría', descripcion: 'Contactar las captaciones sin movimiento hace más de 60 días.', tipo: 'Cartera', asignadoA: 'Todos', meta: 15, progreso: 9, unidad: 'propiedades', vence: '2026-10-24', estado: 'Activo' },
    { id: 'd3', titulo: '3 captaciones nuevas', descripcion: 'Sumar 3 captaciones nuevas en el mes para subir de categoría.', tipo: 'Captación', asignadoA: 'Todos', meta: 3, progreso: 1, unidad: 'captaciones', vence: '2026-10-31', estado: 'Activo' },
    { id: 'd4', titulo: 'Meta Silver', descripcion: 'Llegar a 11 lados acumulados en el año para pasar a categoría Silver.', tipo: 'Nivel', asignadoA: 'Todos', meta: 11, progreso: 8, unidad: 'lados', vence: '2026-12-31', estado: 'Activo' },
    { id: 'd5', titulo: 'Responder en menos de 1 hora', descripcion: 'Tiempo de respuesta a consultas web durante septiembre.', tipo: 'Atención', asignadoA: 'Todos', meta: 100, progreso: 100, unidad: '% consultas', vence: '2026-09-30', estado: 'Cumplido' }
  ];

  function loadDesafios() {
    try {
      var raw = localStorage.getItem(DESAFIOS_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignorar y usar default */ }
    return desafiosDefault.slice();
  }
  function saveDesafios(list) {
    try { localStorage.setItem(DESAFIOS_KEY, JSON.stringify(list)); } catch (e) { /* modo privado */ }
  }

  window.C21 = {
    MESES: MESES,
    MES_ACTUAL_IDX: MES_ACTUAL_IDX,
    asesores: asesores,
    oficina: oficina,
    captacionesPorProducto: captacionesPorProducto,
    getAsesor: function (id) { return asesores.filter(function (a) { return a.id === id; })[0]; },
    loadCalendario: loadCalendario,
    saveCalendario: saveCalendario,
    loadDesafios: loadDesafios,
    saveDesafios: saveDesafios,
    fmtUSD: function (n) { return '$ ' + Math.round(n).toLocaleString('es-PY'); }
  };
})();
