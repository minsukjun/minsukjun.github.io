/* Figures 02 (breeding geometry) and 03 (loss) drawn live: heatmaps on a canvas at the screen's pixel density,
 * curves and guide lines as SVG, all labels as HTML text in the site font. */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var SP = Math.sqrt(Math.PI), A = 2 * SP, R2 = Math.SQRT2;
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function sv(tag, attrs) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function lut(hex) {
    var C = hex.map(function (h) { return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; });
    var L = new Uint8ClampedArray(256 * 3), n = C.length - 1;
    for (var i = 0; i < 256; i++) {
      var x = i / 255 * n, k = Math.min(n - 1, Math.floor(x)), f = x - k;
      for (var c = 0; c < 3; c++) L[i * 3 + c] = C[k][c] + (C[k + 1][c] - C[k][c]) * f;
    }
    return L;
  }
  var BLUES = lut(['f7fbff', 'deebf7', 'c6dbef', '9ecae1', '6baed6', '4292c6', '2171b5', '08519c', '08306b']);

  // ---- shared frame: caption, y labels | plot | side, x labels ----
  function frame(cls, title, sub) {
    var f = el('div', 'cf ' + cls), cap = el('figcaption');
    cap.appendChild(el('b', null, title)); var s = el('span'); s.innerHTML = sub; cap.appendChild(s);
    var yl = el('div', 'wp-y'), plot = el('div', 'cf-plot'), side = el('div', 'cf-side'), xl = el('div', 'wp-x');
    f.appendChild(cap); f.appendChild(yl); f.appendChild(plot); f.appendChild(side); f.appendChild(xl);
    return { f: f, yl: yl, plot: plot, side: side, xl: xl };
  }
  function ticksX(box, list, lo, hi) { list.forEach(function (t) { var s = el('span', null, t[1]); s.style.left = (t[0] - lo) / (hi - lo) * 100 + '%'; box.appendChild(s); }); }
  function ticksY(box, list, lo, hi) { list.forEach(function (t) { var s = el('span', null, t[1]); s.style.top = (hi - t[0]) / (hi - lo) * 100 + '%'; box.appendChild(s); }); }
  function size(node) { var r = node.getBoundingClientRect(); return [r.width, r.height]; }

  var jobs = [];
  function redraw() { jobs.forEach(function (j) { j(); }); }
  var tmr;
  function soon() { clearTimeout(tmr); tmr = setTimeout(redraw, 120); }

  // ================= 02 · breeding =================
  var host2 = document.querySelector('[data-fig2]');
  if (host2) {
    var G = function (z) { return Math.exp(-2 * z * z); };              // peak width s = 0.5
    var cat = function (x) { return G(x - A) + G(x + A); };
    var L = 9, T6 = [[-6, '−6'], [0, '0'], [6, '6']];
    var U0 = [-R2 * A, 0, R2 * A];
    var maps = [
      { t: 'Two cat states', s: 'ψ(q₁) ψ(q₂): four blobs', ax: ['q₁', 'q₂'], fn: function (u, v) { return cat(u) * cat(v); } },
      { t: 'After the 50:50 beam splitter', s: 'plane rotated by 45°', ax: ['q₁′', 'q₂′'], lines: true,
        fn: function (u, v) { return cat((u + v) / R2) * cat((u - v) / R2); } }
    ];
    var parts = maps.map(function (m) {
      var F = frame('cf-map', m.t, m.s);
      ticksX(F.xl, T6, -L, L); ticksY(F.yl, T6, -L, L);
      var cv = el('canvas'), svg = sv('svg', { 'class': 'cf-svg', 'aria-hidden': 'true' });
      F.plot.appendChild(cv); F.plot.appendChild(svg);
      F.plot.appendChild(el('i', 'ax-y', m.ax[1])); F.plot.appendChild(el('i', 'ax-x', m.ax[0]));
      if (m.lines) F.side.innerHTML = '<div class="cf-note">p₂′ = 0 homodyne:<br>integrate along q₂′</div>';
      return { m: m, F: F, cv: cv, svg: svg, w: 0, h: 0 };
    });
    // heralded output: 1 : 2 : 1 peaks at 0, +-sqrt2 * A
    var F3 = frame('cf-line', 'Heralded output', 'ψ(q₁′): three peaks, weights 1 : 2 : 1');
    ticksX(F3.xl, [[-R2 * A, '−√2·2√π'], [0, '0'], [R2 * A, '√2·2√π']], -L, L);
    var svg3 = sv('svg', { 'class': 'cf-svg', 'aria-hidden': 'true' });
    F3.plot.appendChild(svg3);
    F3.plot.appendChild(el('i', 'ax-x', 'q₁′'));
    var leg = el('div', 'cf-legend');
    leg.innerHTML = '<span><i class="lg-solid"></i>Bred output</span><span><i class="lg-dash"></i>Input cat (scaled)</span>';
    F3.plot.appendChild(leg);

    host2.textContent = '';
    var alts = host2.getAttribute('data-alts').split('|');
    parts.concat([{ F: F3 }]).forEach(function (p, i) {
      p.F.f.classList.add('sf'); if (i === 0) p.F.f.classList.add('on');
      p.F.f.setAttribute('role', 'img'); p.F.f.setAttribute('aria-label', alts[i]);
      host2.appendChild(p.F.f);
    });
    host2.classList.add('live');

    var bred = function (x) { return G(x + R2 * A) + 2 * G(x) + G(x - R2 * A); };
    var bmax = bred(0), cmax = cat(A);
    jobs.push(function () {
      var narrow = host2.getBoundingClientRect().width < 380;
      host2.classList.toggle('compact', narrow);
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      parts.forEach(function (p) {
        var s = size(p.F.plot), w = Math.round(s[0] * dpr), h = Math.round(s[1] * dpr);
        if (!w || !h) return;
        if (w !== p.w || h !== p.h) {
          p.w = w; p.h = h; p.cv.width = w; p.cv.height = h;
          var ctx = p.cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data, vals = new Float32Array(w * h), mx = 0, i, j;
          for (j = 0; j < h; j++) {
            var v = L - (j + 0.5) / h * 2 * L;
            for (i = 0; i < w; i++) { var z = p.m.fn(-L + (i + 0.5) / w * 2 * L, v); vals[j * w + i] = z; if (z > mx) mx = z; }
          }
          for (i = 0; i < vals.length; i++) {
            var li = Math.round(vals[i] / mx * 255) * 3;
            d[i * 4] = BLUES[li]; d[i * 4 + 1] = BLUES[li + 1]; d[i * 4 + 2] = BLUES[li + 2]; d[i * 4 + 3] = 255;
          }
          ctx.putImageData(img, 0, 0);
        }
        p.svg.setAttribute('viewBox', '0 0 ' + s[0] + ' ' + s[1]);
        p.svg.textContent = '';
        if (p.m.lines) U0.forEach(function (u) {
          var x = ((u + L) / (2 * L) * s[0]).toFixed(2);
          p.svg.appendChild(sv('line', { x1: x, x2: x, y1: 0, y2: s[1], stroke: '#0066cc', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' }));
        });
      });
      // line chart, same box height as the maps
      var s0 = size(parts[0].F.plot);
      F3.plot.style.height = s0[1] + 'px';
      var s = size(F3.plot), W = s[0], H = s[1], top = H * 0.2, N = 360;
      svg3.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg3.textContent = '';
      function path(fn, close) {
        var dstr = '';
        for (var k = 0; k <= N; k++) {
          var x = -L + k / N * 2 * L, px = (k / N * W).toFixed(2), py = (H - fn(x) * (H - top)).toFixed(2);
          dstr += (k ? 'L' : 'M') + px + ' ' + py;
        }
        return close ? dstr + 'L' + W + ' ' + H + 'L0 ' + H + 'Z' : dstr;
      }
      var fb = function (x) { return bred(x) / bmax; }, fc = function (x) { return cat(x) / cmax; };
      svg3.appendChild(sv('path', { d: path(fb, true), fill: 'rgba(0,102,204,.14)' }));
      svg3.appendChild(sv('path', { d: path(fc), fill: 'none', stroke: '#86868b', 'stroke-width': 1.1, 'stroke-dasharray': '4 3' }));
      svg3.appendChild(sv('path', { d: path(fb), fill: 'none', stroke: '#0066cc', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }));
      svg3.appendChild(sv('line', { x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, stroke: '#c7c7cc', 'stroke-width': 1 }));
    });
    if ('ResizeObserver' in window) new ResizeObserver(soon).observe(host2);
  }

  // ================= 03 · loss =================
  var host3 = document.querySelector('[data-fig3]');
  if (host3) {
    var ETAS = [[0.99, '#083c7d'], [0.95, '#0e59a2'], [0.90, '#2676b8'], [0.80, '#4493c7'], [0.70, '#68acd5'], [0.50, '#94c4df']];
    var SMAX = 20, YMAX = 21;
    var obs = function (S, e) { return -10 * Math.log10(e * Math.pow(10, -S / 10) + 1 - e); };
    var F = frame('cf-loss', 'Loss caps squeezing', 'V<sub>obs</sub> = ηV + (1 − η)  →  ceiling −10 log₁₀(1 − η)');
    var T5 = [[0, '0'], [5, '5'], [10, '10'], [15, '15'], [20, '20']];
    ticksX(F.xl, T5, 0, SMAX); ticksY(F.yl, T5, 0, YMAX);
    var svg = sv('svg', { 'class': 'cf-svg', 'aria-hidden': 'true' });
    F.plot.appendChild(svg);
    F.plot.appendChild(el('i', 'ax-yt', 'Observed (dB)'));
    var lossless = el('i', 'ax-ll', 'lossless'); F.plot.appendChild(lossless);
    ETAS.forEach(function (e) {
      var s = el('span', 'cf-eta', 'η = ' + e[0].toFixed(2)); s.style.color = e[1];
      s.style.top = (1 - obs(SMAX, e[0]) / YMAX) * 100 + '%'; F.side.appendChild(s);
    });
    var xt = el('div', 'cf-xt', 'Generated squeezing (dB)');
    F.f.appendChild(xt);
    host3.textContent = '';
    F.f.setAttribute('role', 'img'); F.f.setAttribute('aria-label', host3.getAttribute('data-alt'));
    host3.appendChild(F.f); host3.classList.add('live');

    jobs.push(function () {
      host3.classList.toggle('compact', host3.getBoundingClientRect().width < 380);
      var s = size(F.plot), W = s[0], H = s[1], N = 200;
      if (!W) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.textContent = '';
      var X = function (S) { return (S / SMAX * W).toFixed(2); }, Y = function (v) { return (H - v / YMAX * H).toFixed(2); };
      [5, 10, 15].forEach(function (g) {
        svg.appendChild(sv('line', { x1: 0, x2: W, y1: Y(g), y2: Y(g), stroke: '#f0f0f2', 'stroke-width': 1 }));
      });
      svg.appendChild(sv('line', { x1: 0, y1: Y(0), x2: X(SMAX), y2: Y(20), stroke: '#c7c7cc', 'stroke-width': 1, 'stroke-dasharray': '3 3' }));
      ETAS.forEach(function (e) {
        var d = '';
        for (var k = 0; k <= N; k++) { var S = k / N * SMAX; d += (k ? 'L' : 'M') + X(S) + ' ' + Y(obs(S, e[0])); }
        svg.appendChild(sv('path', { d: d, fill: 'none', stroke: e[1], 'stroke-width': 1.9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
      });
      svg.appendChild(sv('line', { x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, stroke: '#c7c7cc', 'stroke-width': 1 }));
      svg.appendChild(sv('line', { x1: 0.5, x2: 0.5, y1: 0, y2: H, stroke: '#c7c7cc', 'stroke-width': 1 }));
      var ang = -Math.atan2(H / YMAX, W / SMAX) * 180 / Math.PI;
      lossless.style.left = (13.3 / SMAX * 100) + '%'; lossless.style.top = (1 - 14.6 / YMAX) * 100 + '%';
      lossless.style.transform = 'translate(-50%,-50%) rotate(' + ang.toFixed(1) + 'deg) translateY(-9px)';
    });
    if ('ResizeObserver' in window) new ResizeObserver(soon).observe(host3);
  }

  if (!('ResizeObserver' in window)) window.addEventListener('resize', soon);
  redraw();
})();
