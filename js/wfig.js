/* Figure 01: Wigner functions drawn live from WignerCore at the screen's own pixel density.
 * Labels are HTML text, so they use the site font and stay sharp at any zoom. */
(function () {
  var host = document.querySelector('[data-wfig]');
  if (!host || !window.WignerCore) return;
  var SP = Math.sqrt(Math.PI), A = Math.sqrt(2 * Math.PI);   // cat peaks at +-2 sqrt(pi)
  var QMAX = 9.5, PMAX = 5.2;
  var DB = 10 * Math.log10(4);                                // peak width s = 0.5 (vacuum s = 1)
  var STATES = [
    { t: 'Squeezed vacuum', s: 'Single-pass OPA', p: { dB: DB, alpha: 0, breed: 0, eta: 1 } },
    { t: 'Cat state', s: 'Photon subtraction', p: { dB: DB, alpha: A, breed: 0, eta: 1 } },
    { t: 'Bred cat', s: 'Cat ⊗ cat → 50:50 BS → homodyne', ss: 'Cat ⊗ cat breeding', p: { dB: DB, alpha: A, breed: 1, eta: 1 } },
    { t: 'GKP-like state', s: 'Second breeding round', p: { dB: DB, alpha: A, breed: 2, eta: 1 } }
  ];
  var QT = [[-4, '−4√π'], [-2, '−2√π'], [0, '0'], [2, '2√π'], [4, '4√π']];
  var PT = [[-2, '−2√π'], [-1, '−√π'], [0, '0'], [1, '√π'], [2, '2√π']];
  // matplotlib RdBu: negative red, positive blue
  var CM = ['67001f', 'b2182b', 'd6604d', 'f4a582', 'fddbc7', 'f7f7f7', 'd1e5f0', '92c5de', '4393c3', '2166ac', '053061']
    .map(function (h) { return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; });
  var LUT = new Uint8ClampedArray(256 * 3);
  for (var i = 0; i < 256; i++) {
    var x = i / 255 * 10, k = Math.min(9, Math.floor(x)), f = x - k;
    for (var c = 0; c < 3; c++) LUT[i * 3 + c] = CM[k][c] + (CM[k + 1][c] - CM[k][c]) * f;
  }

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  var panels = STATES.map(function (st, n) {
    var fig = el('figure', 'wp');
    var cap = el('figcaption');
    cap.appendChild(el('b', null, st.t));
    cap.appendChild(el('span', st.ss ? 'full' : null, '0' + (n + 1) + ' · ' + st.s));
    if (st.ss) cap.appendChild(el('span', 'short', '0' + (n + 1) + ' · ' + st.ss));
    var yl = el('div', 'wp-y'), plot = el('div', 'wp-plot'), xl = el('div', 'wp-x');
    PT.forEach(function (t) {
      var s = el('span', t[0] % 2 ? 'odd' : null, t[1]); s.style.top = (PMAX - t[0] * SP) / (2 * PMAX) * 100 + '%'; yl.appendChild(s);
    });
    QT.forEach(function (t) {
      var s = el('span', t[0] % 4 ? 'odd' : null, t[1]); s.style.left = (t[0] * SP + QMAX) / (2 * QMAX) * 100 + '%'; xl.appendChild(s);
    });
    var cv = el('canvas'); plot.appendChild(cv);
    plot.appendChild(el('i', 'ax-p', 'p')); plot.appendChild(el('i', 'ax-q', 'q'));
    fig.appendChild(cap); fig.appendChild(yl); fig.appendChild(plot); fig.appendChild(el('div')); fig.appendChild(xl);
    return { fig: fig, cv: cv, plot: plot, T: WignerCore.terms(st.p).terms, w: 0, h: 0 };
  });
  host.textContent = '';
  panels.forEach(function (p) { host.appendChild(p.fig); });
  host.classList.add('live');

  function draw(p) {
    var r = p.plot.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (w === p.w && h === p.h) return;
    p.w = w; p.h = h; p.cv.width = w; p.cv.height = h;
    var qs = new Float64Array(w), ps = new Float64Array(h), j;
    for (j = 0; j < w; j++) qs[j] = -QMAX + (j + 0.5) / w * 2 * QMAX;
    for (j = 0; j < h; j++) ps[j] = PMAX - (j + 0.5) / h * 2 * PMAX;   // row 0 = top
    var W = WignerCore.grid(p.T, qs, ps), m = 0;
    for (j = 0; j < W.length; j++) if (Math.abs(W[j]) > m) m = Math.abs(W[j]);
    var ctx = p.cv.getContext('2d'), img = ctx.createImageData(w, h), d = img.data;
    for (j = 0; j < W.length; j++) {
      var li = Math.round((W[j] / m + 1) * 127.5) * 3;
      d[j * 4] = LUT[li]; d[j * 4 + 1] = LUT[li + 1]; d[j * 4 + 2] = LUT[li + 2]; d[j * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  function drawAll() {
    host.classList.toggle('compact', host.getBoundingClientRect().width < 420);
    panels.forEach(draw);
  }
  var tmr;
  function soon() { clearTimeout(tmr); tmr = setTimeout(drawAll, 120); }
  if ('ResizeObserver' in window) new ResizeObserver(soon).observe(host); else window.addEventListener('resize', soon);
  drawAll();
})();
