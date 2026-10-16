"""Genera assets/js/real-data.js a partir de las planillas reales de la oficina
(en ../reporte-cierres, fuera de este repo). Ese archivo queda IGNORADO por git
(ver .gitignore) — nunca se sube a GitHub, solo vive en esta PC.

Fuentes:
- Rendimiento 2026 (4).xlsx, hoja "Asignar metas": roster real, GCI 2026
  acumulado, lados, meta anual (al 06/10/2026, última vez que se guardó el archivo).
- cierres_jul_ago_sep_resumen.xlsx, hojas "Datos" (jul-sep) y "Octubre" (en curso):
  ledger real de cierres, con montos, tipo de inmueble y quién captó/colocó.
- cierres_jul_ago_sep_resumen.xlsx, hoja "Asesores": fecha de ingreso (antigüedad).

Qué NO incluye (porque no está en las planillas):
- Desglose mensual de GCI por asesor (el roster solo trae el acumulado a hoy).
  El panel muestra el acumulado vs. meta; no se inventa una curva mensual por asesor.
- Mensualidades pagadas/pendientes por asesor (no hay ninguna planilla de pagos).
  Esa sección sigue con datos de ejemplo hasta que exista una fuente real.
- Calendario y desafíos (no son datos históricos, son planificación hacia adelante).

Correr después de actualizar las planillas:  python scripts/build_real_data.py
"""
import datetime
import json
import pathlib
import re
import sys
import unicodedata

import openpyxl

HERE = pathlib.Path(__file__).parent
SRC = HERE.parent.parent / 'reporte-cierres'
OUT = HERE.parent / 'assets' / 'js' / 'real-data.js'

HOY = datetime.date(2026, 10, 15)
MES_ACTUAL_IDX = 9  # Octubre
TIPO_CAMBIO = 5750
MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
ESTACIONALIDAD = [0.0847, 0.0677, 0.0760, 0.0705, 0.0743, 0.1048, 0.0896, 0.0539, 0.0919, 0.0843, 0.0861, 0.1163]


def norm(s):
    if not s:
        return ''
    s = str(s).strip().upper()
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode('ascii')
    s = re.sub(r'\s+', ' ', s)
    s = s.split('/')[0].strip()  # "ALEXANDRA VILLAMAYOR/ EVELYN" -> primer nombre
    return s


def titlecase(name):
    particles = {'de', 'del', 'la', 'las', 'los', 'y'}
    words = name.strip().lower().split(' ')
    return ' '.join(w if w in particles else w.capitalize() for w in words)


def nivel_por_lados(lados):
    if lados >= 25:
        return {'key': 'gold-lvl', 'label': 'Gold'}
    if lados >= 11:
        return {'key': 'silver', 'label': 'Silver'}
    return {'key': 'bronze', 'label': 'Bronze'}


def load_roster_metas():
    wb = openpyxl.load_workbook(SRC / 'Rendimiento 2026 (4).xlsx', data_only=True)
    ws = wb['Asignar metas']
    roster = {}
    for r in range(7, 48):
        estatus = ws.cell(row=r, column=1).value
        asesor = ws.cell(row=r, column=3).value
        if not asesor or estatus != 'Activo':
            continue
        gci = ws.cell(row=r, column=4).value or 0
        lados = ws.cell(row=r, column=5).value
        meta = ws.cell(row=r, column=7).value or 0
        key = norm(asesor)
        if not key:
            continue
        roster[key] = {
            'nombre': titlecase(asesor.strip()),
            'estado': 'Activo' if estatus == 'Activo' else 'Inactivo',
            'gciAcumulado': round(float(gci), 2),
            'lados': int(lados) if lados else None,
            'metaAnual': round(float(meta), 2),
        }
    return roster


def load_antiguedad():
    wb = openpyxl.load_workbook(SRC / 'cierres_jul_ago_sep_resumen.xlsx', data_only=True)
    ws = wb['Asesores']
    out = {}
    for r in range(5, ws.max_row + 1):
        nombre = ws.cell(row=r, column=1).value
        mes = ws.cell(row=r, column=2).value
        dia = ws.cell(row=r, column=3).value
        anio = ws.cell(row=r, column=4).value
        if not nombre or not (mes and dia and anio):
            continue
        try:
            ingreso = datetime.date(int(anio), int(mes), int(dia))
        except ValueError:
            continue
        meses = (HOY.year - ingreso.year) * 12 + (HOY.month - ingreso.month)
        if HOY.day < ingreso.day:
            meses -= 1
        meses = max(meses, 0)
        anios = meses // 12
        if meses >= 12:
            label = '1 año' if anios == 1 else f'{anios} años'
        else:
            label = '1 mes' if meses == 1 else f'{meses} meses'
        out[norm(nombre)] = label
    return out


def gross_usd(moneda, comision):
    if comision is None:
        return 0.0
    if moneda == 'Gs':
        return round(float(comision) / TIPO_CAMBIO, 2)
    return round(float(comision), 2)


def load_ledger(roster_keys):
    """Lee Datos (jul-sep) + Octubre (en curso): devuelve movimientos reales
    con mes, gross USD, tipo inmueble, captador/colocador normalizados."""
    wb = openpyxl.load_workbook(SRC / 'cierres_jul_ago_sep_resumen.xlsx', data_only=True)
    rows = []
    sin_resolver = set()

    ws = wb['Datos']
    for r in range(2, ws.max_row + 1):
        fecha_cobro = ws.cell(row=r, column=20).value
        gross = ws.cell(row=r, column=21).value
        tipo_inmueble = ws.cell(row=r, column=4).value
        tipo_transaccion = ws.cell(row=r, column=16).value
        captador = ws.cell(row=r, column=8).value
        colocador = ws.cell(row=r, column=9).value
        lados_tipo = ws.cell(row=r, column=10).value
        if not fecha_cobro or gross is None:
            continue
        rows.append({
            'mes_idx': fecha_cobro.month - 1,
            'gross': float(gross),
            'tipo_inmueble': tipo_inmueble,
            'tipo_transaccion': tipo_transaccion,
            'captador': norm(captador),
            'colocador': norm(colocador),
            'lados_tipo': lados_tipo,
        })

    ws = wb['Octubre']
    for r in range(5, ws.max_row + 1):
        fecha = ws.cell(row=r, column=1).value
        asesor = ws.cell(row=r, column=2).value
        tipo_transaccion = ws.cell(row=r, column=4).value
        moneda = ws.cell(row=r, column=5).value
        comision = ws.cell(row=r, column=7).value
        of_captadora = ws.cell(row=r, column=11).value
        of_colocadora = ws.cell(row=r, column=12).value
        if not fecha or comision is None:
            continue
        gross = gross_usd(moneda, comision)
        asesor_norm = norm(asesor)
        resolved = asesor_norm in roster_keys
        if not resolved:
            sin_resolver.add(asesor)
        # En octubre solo tenemos el asesor de la operación, no distinguimos
        # captador/colocador por separado: se acredita como "ambas puntas"
        # cuando la oficina hizo las dos puntas (of_captadora == of_colocadora == C21 NOVA).
        ambas = (of_captadora == 'C21 NOVA' and of_colocadora == 'C21 NOVA')
        rows.append({
            'mes_idx': fecha.month - 1,
            'gross': gross,
            'tipo_inmueble': None,
            'tipo_transaccion': tipo_transaccion,
            'captador': asesor_norm if resolved else '',
            'colocador': asesor_norm if resolved and ambas else '',
            'lados_tipo': 'Ambas puntas' if ambas else 'Colocación',
        })

    return rows, sin_resolver


def build():
    roster = load_roster_metas()
    antiguedad = load_antiguedad()
    ledger, sin_resolver = load_ledger(set(roster.keys()))

    # ---- Oficina: real mensual (jul-oct), meta mensual por estacionalidad ----
    meta_anual_oficina = round(sum(a['metaAnual'] for a in roster.values()), 2)
    real_mensual = [None] * 12
    for i in range(6, MES_ACTUAL_IDX + 1):
        real_mensual[i] = 0.0
    for mov in ledger:
        i = mov['mes_idx']
        if 0 <= i < 12:
            if real_mensual[i] is None:
                real_mensual[i] = 0.0
            real_mensual[i] += mov['gross']
    real_mensual = [round(v, 2) if v is not None else None for v in real_mensual]
    meta_mensual = [round(meta_anual_oficina * w, 2) for w in ESTACIONALIDAD]

    # ---- Captaciones por producto (jul-oct, solo asesores propios como captador) ----
    productos = {}
    for mov in ledger:
        tipo = mov['tipo_inmueble']
        if not tipo:
            continue
        p = productos.setdefault(tipo, {'producto': tipo, 'captadas': 0, 'colocadas': 0})
        if mov['captador'] in roster:
            p['captadas'] += 1
        if mov['colocador'] in roster:
            p['colocadas'] += 1
    captaciones_por_producto = [p for p in productos.values() if p['captadas'] or p['colocadas']]

    # ---- Por asesor: captaciones/colocaciones jul-oct (parcial, no es el año completo) ----
    capt_count = {k: 0 for k in roster}
    coloc_count = {k: 0 for k in roster}
    for mov in ledger:
        if mov['captador'] in capt_count:
            capt_count[mov['captador']] += 1
        if mov['colocador'] in coloc_count:
            coloc_count[mov['colocador']] += 1

    asesores_out = []
    for i, (key, a) in enumerate(sorted(roster.items(), key=lambda kv: -kv[1]['gciAcumulado'])):
        lados = a['lados'] if a['lados'] is not None else round(a['gciAcumulado'] / 3500)
        asesores_out.append({
            'id': f'r{i+1}',
            'nombre': a['nombre'],
            'estado': a['estado'],
            'antiguedad': antiguedad.get(key, '—'),
            'metaAnual': a['metaAnual'],
            'gciAcumulado': a['gciAcumulado'],
            'metaAcumuladaAHoy': round(a['metaAnual'] * sum(ESTACIONALIDAD[:MES_ACTUAL_IDX + 1]), 2),
            'lados': lados,
            'captaciones': capt_count[key] + coloc_count[key],
            'nivel': nivel_por_lados(lados),
        })
    for a in asesores_out:
        meta_hoy = a['metaAcumuladaAHoy'] or 1
        a['cumplimiento'] = round((a['gciAcumulado'] / meta_hoy) * 100)

    oficina = {
        'metaAnual': meta_anual_oficina,
        'metaMensual': meta_mensual,
        'realMensual': real_mensual,
        'tiers': [
            {'label': 'Centurion', 'monto': 200000},
            {'label': 'Doble Centurion', 'monto': 500000},
            {'label': 'Grand Centurion', 'monto': 1200000},
        ],
    }
    # El KPI principal usa el acumulado ANUAL real (roster de "Asignar metas",
    # que cubre todo 2026 a la fecha de corte), no solo jul-oct: el ledger de
    # cierres (Datos/Octubre) todavia no cubre ene-jun, asi que sumar solo esos
    # meses subestimaria la produccion real del año.
    oficina['realAcumulado'] = round(sum(a['gciAcumulado'] for a in asesores_out), 2)
    oficina['metaAcumuladaAHoy'] = round(meta_anual_oficina * sum(ESTACIONALIDAD[:MES_ACTUAL_IDX + 1]), 2)
    oficina['cumplimiento'] = round((oficina['realAcumulado'] / oficina['metaAcumuladaAHoy']) * 100) if oficina['metaAcumuladaAHoy'] else 0

    data = {
        'MESES': MESES,
        'MES_ACTUAL_IDX': MES_ACTUAL_IDX,
        'asesores': asesores_out,
        'oficina': oficina,
        'captacionesPorProducto': captaciones_por_producto,
        'meta': {
            'fuente': 'Datos reales de las planillas de la oficina (Rendimiento 2026 y cierres jul-oct).',
            'cortePlanillaMetas': '2026-10-06',
            'corteLedger': '2026-10-12',
            'nota': 'El GCI por asesor es el acumulado del año a la fecha de la planilla, no hay desglose mensual real por asesor. Captaciones por asesor son solo jul-oct. Mensualidades siguen con datos de ejemplo (no hay planilla de pagos).',
        },
    }

    js = (
        '/* GENERADO por scripts/build_real_data.py a partir de las planillas reales.\n'
        '   Este archivo esta en .gitignore: nunca se sube a GitHub. */\n'
        '(function () {\n'
        '  var REAL = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n'
        '  var base = window.C21 || {};\n'
        '  window.C21 = Object.assign({}, base, REAL, {\n'
        '    isReal: true,\n'
        '    getAsesor: function (id) { return REAL.asesores.filter(function (a) { return a.id === id; })[0]; },\n'
        '    fmtUSD: base.fmtUSD\n'
        '  });\n'
        '})();\n'
    )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(js, encoding='utf-8')

    print('real-data.js generado:', OUT)
    print('Asesores en el roster real:', len(asesores_out))
    print('GCI acumulado oficina (suma de roster):', sum(a['gciAcumulado'] for a in asesores_out))
    print('Meta anual oficina (suma de metas individuales):', meta_anual_oficina)
    print('Real mensual (oficina), jul-oct:', real_mensual[6:MES_ACTUAL_IDX + 1])
    if sin_resolver:
        print('\nADVERTENCIA: nombres en "Octubre" que no pude emparejar con el roster (se contaron en el total de oficina pero no se les atribuyó producción individual):')
        for n in sin_resolver:
            print(' -', n)


if __name__ == '__main__':
    build()
