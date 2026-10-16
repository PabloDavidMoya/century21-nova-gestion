/* Century 21 Nova — mini gráficos SVG sin dependencias externas */
(function () {
  function el(tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  /* Barras meta (fantasma) vs real (dorado), mes a mes. uptoIdx = último mes con dato real. */
  function metaReal(svg, labels, metaArr, realArr, uptoIdx) {
    svg.innerHTML = '';
    var W = 760, H = 220, padL = 6, padR = 6, padB = 26, padT = 12;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var n = labels.length;
    var realVals = realArr.filter(function (v) { return v != null; });
    var max = Math.max.apply(null, metaArr.concat(realVals.length ? realVals : [0])) * 1.15 || 1;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var groupW = plotW / n;
    var barW = Math.min(16, groupW * 0.3);

    for (var i = 0; i < n; i++) {
      var cx = padL + groupW * i + groupW / 2;
      var mH = (metaArr[i] / max) * plotH;
      var rH = (realArr[i] / max) * plotH;
      var isFuture = i > uptoIdx || realArr[i] == null;

      svg.appendChild(el('rect', {
        x: cx - barW - 2, y: padT + plotH - mH, width: barW, height: Math.max(mH, 1),
        rx: 3, fill: 'var(--surface-3)'
      }));
      if (!isFuture) {
        var bar = el('rect', {
          x: cx + 2, y: padT + plotH - rH, width: barW, height: Math.max(rH, 1),
          rx: 3, fill: i === uptoIdx ? 'var(--gold-400)' : 'var(--gold-700)'
        });
        bar.appendChild(el('title', {})); bar.lastChild.textContent = labels[i] + ': ' + Math.round(realArr[i]).toLocaleString('es-PY');
        svg.appendChild(bar);
      }
      svg.appendChild(el('text', {
        x: cx, y: H - 6, 'text-anchor': 'middle', 'font-size': '9', fill: 'var(--text-3)'
      })).textContent = labels[i];
    }
  }

  /* Línea simple (sparkline) para un asesor */
  function sparkline(svg, data) {
    svg.innerHTML = '';
    var W = 160, H = 46, pad = 4;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var vals = data.filter(function (v) { return v > 0; });
    var max = Math.max.apply(null, vals.length ? vals : [1]);
    var n = data.length;
    var pts = data.map(function (v, i) {
      var x = pad + (i / (n - 1)) * (W - pad * 2);
      var y = H - pad - (v / (max || 1)) * (H - pad * 2);
      return x.toFixed(1) + ',' + y.toFixed(1);
    });
    svg.appendChild(el('polyline', {
      points: pts.join(' '), fill: 'none', stroke: 'var(--gold-400)', 'stroke-width': '2',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    }));
  }

  /* Barra horizontal de ranking */
  function rankBars(container, items, max, accessor, labelFn) {
    container.innerHTML = '';
    items.forEach(function (it) {
      var val = accessor(it);
      var pct = Math.max(4, Math.round((val / max) * 100));
      var row = document.createElement('div');
      row.className = 'rank-row';
      row.style.cssText = 'display:flex;align-items:center;gap:10px;margin-bottom:10px;';
      row.innerHTML =
        '<div style="width:120px;font-size:.8rem;color:var(--text-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + labelFn(it) + '</div>' +
        '<div class="progress" style="flex:1"><span style="width:' + pct + '%"></span></div>' +
        '<div style="width:90px;text-align:right;font-size:.8rem;font-weight:700">' + window.C21.fmtUSD(val) + '</div>';
      container.appendChild(row);
    });
  }

  window.C21Charts = { metaReal: metaReal, sparkline: sparkline, rankBars: rankBars };
})();
