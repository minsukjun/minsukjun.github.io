/* LTOI chip scene — single-pass PPLT OPA → photon subtraction (cat) → cat ⊗ cat breeding with homodyne
   conditioning → GKP-like state. One fixed WebGL canvas; the chip is framed into the hero slot, then into the
   pinned "Selected figures" section, where scroll drives a step-by-step story. Three.js r149 (classic build).
   Wigner cards are analytic: W = Σ_jk w_j w_k exp(-(q-m)²/s² - s²p²) cos(Δ p), m = (q_j+q_k)/2, Δ = q_k - q_j. */
(function () {
  var heroStage = document.getElementById('hero-stage');
  var fixedLayer = document.getElementById('gl-fixed');
  if (!heroStage || !fixedLayer) return;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var heroArea = $('.gl-area', heroStage), canvas = $('canvas', fixedLayer), heroSvg = $('svg.leaders', heroStage);
  var cards = $$('.wcard', heroStage), labels = $$('.clabel', heroStage), steps = $$('.hstep');
  var caption = document.getElementById('hcaption'), heroEl = document.getElementById('top');
  var sc = document.getElementById('research'), sticky = $('.sc-sticky', sc), slot = $('.chip-slot', sc);
  var panels = $$('[data-step]', sc), callSvg = $('svg.callouts g', sc), dots = $$('.sc-dots i', sc);
  var callouts = $$('.callout[data-g]', sc);
  var dyn = { cats: $('#c-cats'), after: $('#c-after'), bhd: $('#c-bhd'), herald: $('#c-herald') };
  var badges = $$('.catbadge', sc);
  var subFigs = $$('[data-step="1"] .sf', sc), subTexts = $$('[data-step="1"] .st', sc), subDots = $$('[data-step="1"] .subdots i', sc);
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function mixC(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  function rgb(c) { return 'rgb(' + c.map(Math.round).join(',') + ')'; }

  /* ---------------- Colours (green → red) ---------------- */
  var C = { pump: [48, 209, 88], sq: [198, 244, 50], cat: [255, 159, 10], bred: [255, 69, 58], lo: [235, 235, 245], mix: [255, 160, 150] };
  var NEG = [52, 199, 89];

  /* ---------------- Wigner cards ---------------- */
  var A = 1.9, S = 0.45, N = 72, DOM = 5.3;
  var ST = {
    vac:  { pk: [0], w: [1], s: 1 },
    sq:   { pk: [0], w: [1], s: S },
    cat:  { pk: [-A, A], w: [1, 1], s: S },
    bred: { pk: [-Math.SQRT2 * A, 0, Math.SQRT2 * A], w: [1, 2, 1], s: S }
  };
  function grid(st) {
    var g = new Float32Array(N * N), m = 0, i, j, k, l;
    for (j = 0; j < N; j++) {
      var p = DOM - 2 * DOM * j / (N - 1);
      for (i = 0; i < N; i++) {
        var q = -DOM + 2 * DOM * i / (N - 1), v = 0;
        for (k = 0; k < st.pk.length; k++) for (l = 0; l < st.pk.length; l++) {
          var mid = (st.pk[k] + st.pk[l]) / 2, d = st.pk[l] - st.pk[k];
          v += st.w[k] * st.w[l] * Math.exp(-(q - mid) * (q - mid) / (st.s * st.s) - st.s * st.s * p * p) * Math.cos(d * p);
        }
        g[j * N + i] = v; if (Math.abs(v) > m) m = Math.abs(v);
      }
    }
    for (i = 0; i < g.length; i++) g[i] /= m;
    return g;
  }
  var G = {}; Object.keys(ST).forEach(function (k) { G[k] = grid(ST[k]); });
  var CARD = [
    { from: 'vac', to: 'sq', col: C.sq, at: 2.3 },
    { from: 'sq', to: 'cat', col: C.cat, at: 4.5 },
    { from: 'cat', to: 'bred', col: C.bred, at: 7.0 }
  ];
  var off = document.createElement('canvas'); off.width = N; off.height = N;
  var octx = off.getContext('2d'), img = octx.createImageData(N, N);
  cards.forEach(function (el, i) {
    var c = CARD[i]; c.el = el; c.cv = $('canvas', el); c.ctx = c.cv.getContext('2d'); c.m = -1;
    el.style.setProperty('--c', rgb(c.col));
  });
  function drawCard(c, m) {
    var a = G[c.from], b = G[c.to], d = img.data, bg = [14, 14, 16];
    for (var i = 0; i < N * N; i++) {
      var v = a[i] + (b[i] - a[i]) * m, col, t;
      if (v >= 0) { col = c.col; t = Math.pow(v, 0.62); } else { col = NEG; t = Math.pow(-v, 0.62); }
      var r = bg[0] + (col[0] - bg[0]) * t, gg = bg[1] + (col[1] - bg[1]) * t, bb = bg[2] + (col[2] - bg[2]) * t;
      var wh = Math.max(0, Math.abs(v) - 0.78) * 1.6;
      d[i * 4] = r + (255 - r) * wh; d[i * 4 + 1] = gg + (255 - gg) * wh; d[i * 4 + 2] = bb + (255 - bb) * wh; d[i * 4 + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    var w = c.cv.width, h = c.cv.height, x = c.ctx;
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.drawImage(off, 0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,0.10)'; x.lineWidth = 1;
    x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
  }
  function sizeCards() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    CARD.forEach(function (c) {
      var r = c.cv.getBoundingClientRect();
      c.cv.width = Math.max(48, Math.round(r.width * dpr)); c.cv.height = Math.max(48, Math.round(r.height * dpr)); c.m = -1;
    });
  }
  var CAPS = [
    'A 775 nm pump is coupled into the LTOI chip and split into two arms.',
    'Single-pass OPA in periodically poled LT squeezes the light; a filter strips the pump.',
    'A small tap sends photons to an SNSPD — a click heralds a cat state in each arm.',
    'Two cats meet on a 50:50 beam splitter. Homodyne detection of one output against a local oscillator leaves a GKP-like state in the other.'
  ];
  var lastStage = -1;
  function setStage(n) {
    if (n === lastStage) return; lastStage = n;
    steps.forEach(function (s, i) { s.classList.toggle('on', i < n); s.classList.toggle('now', i === n - 1); });
    if (caption) caption.textContent = CAPS[n];
  }

  /* ---------------- Scroll map of the pinned section ---------------- */
  var WTS = [1.2, 2.0, 1.2, 1.2], STARTS = [0, 1.2, 3.2, 4.4], TOT = 5.6;
  // step 02 autoplays: [duration s, u1 at end]; holds sit on the flat parts of the path
  var STORY = [[0.7, 0.04], [1.4, 0.25], [2.8, 0.40], [1.4, 0.55], [2.8, 0.70], [1.6, 0.85], [3.4, 1.0]];
  var STORY_T = STORY.reduce(function (a, k) { return a + k[0]; }, 0);
  function storyU(t) {
    t = t % STORY_T; var u0 = 0.04;
    for (var i = 0; i < STORY.length; i++) { if (t < STORY[i][0]) return lerp(u0, STORY[i][1], t / STORY[i][0]); t -= STORY[i][0]; u0 = STORY[i][1]; }
    return 1;
  }
  var story = { on: false, t0: 0 };
  function scrollPos() {
    var vh = window.innerHeight, sr = sc.getBoundingClientRect();
    var span = Math.max(1, sr.height - vh), pos = clamp(-sr.top / span, 0, 1) * TOT;
    var step = pos < STARTS[1] ? 0 : pos < STARTS[2] ? 1 : pos < STARTS[3] ? 2 : 3;
    return { sr: sr, vh: vh, pos: pos, step: step, pEnter: clamp(1 - sr.top / vh, 0, 1), u1: clamp((pos - STARTS[1]) / WTS[1], 0, 1) };
  }
  var lastPanel = -2, lastSub = -1;
  function setPanels(sp) {
    var active = sp.pEnter > 0.82 ? sp.step : -1;
    if (active !== lastPanel) {
      lastPanel = active;
      panels.forEach(function (p) { p.classList.toggle('on', +p.getAttribute('data-step') === active); });
      dots.forEach(function (d, i) { d.classList.toggle('on', i === active); });
      sc.classList.toggle('design', active === 3);
    }
    var sub = sp.u1 < 0.42 ? 0 : sp.u1 < 0.72 ? 1 : 2;
    if (sub !== lastSub) {
      lastSub = sub;
      [subFigs, subTexts, subDots].forEach(function (list) { list.forEach(function (e, i) { e.classList.toggle('on', i === sub); }); });
    }
    return active;
  }

  /* ---------------- WebGL guard ---------------- */
  var hasGL = false;
  try { var tc = document.createElement('canvas'); hasGL = !!(window.WebGLRenderingContext && (tc.getContext('webgl') || tc.getContext('experimental-webgl'))); } catch (e) {}
  if (!window.THREE || !hasGL) {
    document.documentElement.classList.add('nogl'); sizeCards();
    CARD.forEach(function (c) { c.el.classList.add('on'); c.el.style.setProperty('--m', '1'); drawCard(c, 1); });
    setStage(3);
    var upd = function () { setPanels(scrollPos()); };
    window.addEventListener('scroll', upd, { passive: true }); upd();
    return;
  }

  /* ---------------- Scene ---------------- */
  var T3 = THREE;
  if (T3.ColorManagement) T3.ColorManagement.legacyMode = false;
  var renderer = new T3.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputEncoding = T3.sRGBEncoding;
  renderer.toneMapping = T3.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.3;
  var scene = new T3.Scene();
  var camera = new T3.PerspectiveCamera(28, 2, 0.1, 200);
  scene.add(new T3.AmbientLight(0xffffff, 0.18));
  scene.add(new T3.HemisphereLight(0xe6e8ee, 0x050507, 0.38));
  var key = new T3.DirectionalLight(0xffffff, 0.85); key.position.set(-9, 10, 13); scene.add(key);
  var rim = new T3.DirectionalLight(0xffd2cc, 0.3); rim.position.set(6, 6, -11); scene.add(rim);

  var chip = new T3.Group(); scene.add(chip);
  var LX = 8.6, LZ = 3.6;
  var Y_SI0 = -0.62, Y_SI1 = -0.2, Y_OX1 = -0.04, Y_SLAB = 0.0, RIDGE_H = 0.06, RIDGE_W = 0.12, Y_P = 0.11;
  var zA = -1.35, zB = 1.35, TL = 1.3;

  function mat(c, o) { o = o || {}; o.color = c; return new T3.MeshStandardMaterial(o); }
  function boxB(x0, x1, y0, y1, z0, z1, m) {
    var b = new T3.Mesh(new T3.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); chip.add(b); return b;
  }
  // layer stack: Si substrate / SiO2 BOX / LT slab — colour only
  boxB(-LX, LX, Y_SI0, Y_SI1, -LZ, LZ, mat(0x2a2a2f, { roughness: 0.55, metalness: 0.35 }));
  boxB(-LX, LX, Y_SI1, Y_OX1, -LZ, LZ, mat(0xb4bcc6, { roughness: 0.25, metalness: 0.05 }));
  boxB(-LX, LX, Y_OX1, Y_SLAB, -LZ, LZ, new T3.MeshPhysicalMaterial({ color: 0x3a2629, roughness: 0.38, metalness: 0.08, clearcoat: 0.4, clearcoatRoughness: 0.4 }));

  (function () {
    var c = document.createElement('canvas'); c.width = c.height = 128;
    var x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 4, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    var m = new T3.Mesh(new T3.PlaneGeometry(27, 12), new T3.MeshBasicMaterial({ map: new T3.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = -1.0; chip.add(m);
  })();

  var padM = mat(0xc4c4ca, { roughness: 0.3, metalness: 0.75 });
  for (var px = -7.6; px <= 7.7; px += 0.74) {
    if ((px > 2.9 && px < 4.6) || (px > 5.2 && px < 7.2)) continue;
    boxB(px - 0.18, px + 0.18, Y_SLAB, Y_SLAB + 0.025, -3.38, -3.02, padM);
  }

  /* ---------------- Waveguide paths ---------------- */
  function Path() { this.p = []; }
  Path.prototype.add = function (x, z) {
    var l = this.p[this.p.length - 1];
    if (!l || Math.abs(l.x - x) > 1e-4 || Math.abs(l.z - z) > 1e-4) this.p.push(new T3.Vector3(x, Y_P, z));
    return this;
  };
  Path.prototype.line = function (x0, z0, x1, z1, n) { n = n || 6; for (var i = 0; i <= n; i++) { var t = i / n; this.add(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); } return this; };
  Path.prototype.bend = function (x0, z0, x1, z1, n) { n = n || 26; for (var i = 0; i <= n; i++) { var t = i / n; this.add(x0 + (x1 - x0) * t, z0 + (z1 - z0) * (1 - Math.cos(Math.PI * t)) / 2); } return this; };
  Path.prototype.arc = function (cx, cz, r, a0, a1, n) { n = n || 18; for (var i = 0; i <= n; i++) { var a = a0 + (a1 - a0) * i / n; this.add(cx + r * Math.cos(a), cz + r * Math.sin(a)); } return this; };
  Path.prototype.join = function (o) { var self = this; o.p.forEach(function (v) { self.add(v.x, v.z); }); return this; };
  Path.prototype.curve = function () { return new T3.CatmullRomCurve3(this.p, false, 'centripetal'); };

  var paths = {
    in:    new Path().line(-11.2, 0, -LX, 0, 10).line(-LX, 0, -7.0, 0, 6),
    armA1: new Path().bend(-7.0, 0, -5.4, zA).line(-5.4, zA, -1.4, zA, 16),
    armB1: new Path().bend(-7.0, 0, -5.4, zB).line(-5.4, zB, -1.4, zB, 16),
    dumpA: new Path().line(-1.2, zA - 0.24, 0.0, zA - 0.24).bend(0.0, zA - 0.24, 1.2, -2.5).line(1.2, -2.5, 1.55, -2.5),
    dumpB: new Path().line(-1.2, zB + 0.24, 0.0, zB + 0.24).bend(0.0, zB + 0.24, 1.2, 2.5).line(1.2, 2.5, 1.55, 2.5),
    armA2: new Path().line(-1.4, zA, 2.6, zA, 16),
    armB2: new Path().line(-1.4, zB, 2.6, zB, 16),
    herA:  new Path().line(0.8, zA - 0.24, 1.8, zA - 0.24).bend(1.8, zA - 0.24, 3.0, -2.62).line(3.0, -2.62, 3.45, -2.62),
    herB:  new Path().line(0.8, zB + 0.24, 1.8, zB + 0.24).bend(1.8, zB + 0.24, 3.0, 2.62).line(3.0, 2.62, 3.45, 2.62),
    armA3: new Path().bend(2.6, zA, 4.1, -0.13).line(4.1, -0.13, 4.8, -0.13),
    armB3: new Path().bend(2.6, zB, 4.1, 0.13).line(4.1, 0.13, 4.8, 0.13),
    out1:  new Path().line(4.8, -0.13, 5.5, -0.13).bend(5.5, -0.13, 6.7, -1.3).line(6.7, -1.3, 7.6, -1.3, 8),
    lo:    new Path().line(6.2, -5.8, 6.2, -LZ, 8).line(6.2, -LZ, 6.2, -2.16, 8).arc(6.8, -2.16, 0.6, Math.PI, Math.PI / 2).line(6.8, -1.56, 7.6, -1.56, 8),
    bhd1:  new Path().bend(7.6, -1.3, 8.1, -0.95, 16).line(8.1, -0.95, 8.15, -0.95, 2),
    bhd2:  new Path().bend(7.6, -1.56, 8.1, -1.95, 16).line(8.1, -1.95, 8.15, -1.95, 2),
    out2:  new Path().line(4.8, 0.13, 5.5, 0.13).bend(5.5, 0.13, 6.7, 1.3).line(6.7, 1.3, LX, 1.3, 10).line(LX, 1.3, 11.2, 1.3, 10)
  };
  // taper toward the facets (ridge narrows on the slab)
  var EDGE = { in: function (p) { return p.x + LX; }, out2: function (p) { return LX - p.x; }, lo: function (p) { return p.z + LZ; } };
  function onChip(p) { return Math.abs(p.x) <= LX + 1e-3 && Math.abs(p.z) <= LZ + 1e-3; }
  function ridgeGeo(curve, len, edgeFn) {
    var n = Math.max(24, Math.round(len * 24)), pts = [];
    for (var i = 0; i <= n; i++) {
      var u = i / n, p = curve.getPointAt(u);
      if (!onChip(p)) continue;
      var t = curve.getTangentAt(u), d = edgeFn ? edgeFn(p) : 99;
      pts.push({ x: p.x, z: p.z, nx: -t.z, nz: t.x, w: d < TL ? RIDGE_W * (0.3 + 0.7 * d / TL) : RIDGE_W });
    }
    var pos = [], idx = [], yT = Y_SLAB + RIDGE_H, yB = Y_SLAB;
    function strip(f) {
      var b0 = pos.length / 3;
      pts.forEach(function (q) { var v = f(q); pos.push(v[0], v[1], v[2], v[3], v[4], v[5]); });
      for (var i = 0; i < pts.length - 1; i++) { var a = b0 + 2 * i; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    strip(function (q) { var h = q.w / 2; return [q.x + q.nx * h, yT, q.z + q.nz * h, q.x - q.nx * h, yT, q.z - q.nz * h]; });
    strip(function (q) { var h = q.w / 2; return [q.x + q.nx * h, yB, q.z + q.nz * h, q.x + q.nx * h, yT, q.z + q.nz * h]; });
    strip(function (q) { var h = q.w / 2; return [q.x - q.nx * h, yT, q.z - q.nz * h, q.x - q.nx * h, yB, q.z - q.nz * h]; });
    var g = new T3.BufferGeometry();
    g.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  var ridgeM = mat(0xc41f1c, { roughness: 0.3, metalness: 0.1, side: T3.DoubleSide });
  var seg = {};
  Object.keys(paths).forEach(function (k) {
    var cu = paths[k].curve();
    seg[k] = { curve: cu, len: cu.getLength() };
    chip.add(new T3.Mesh(ridgeGeo(cu, seg[k].len, EDGE[k]), ridgeM));
  });

  var fibM = new T3.MeshPhysicalMaterial({ color: 0xe9e9ee, roughness: 0.15, transmission: 0.6, transparent: true, opacity: 0.42, thickness: 0.2 });
  function fiberX(x0, x1, z) { var f = new T3.Mesh(new T3.CylinderGeometry(0.13, 0.13, x1 - x0, 20, 1, true), fibM); f.rotation.z = Math.PI / 2; f.position.set((x0 + x1) / 2, 0.03, z); chip.add(f); }
  function fiberZ(z0, z1, x) { var f = new T3.Mesh(new T3.CylinderGeometry(0.13, 0.13, z1 - z0, 20, 1, true), fibM); f.rotation.x = Math.PI / 2; f.position.set(x, 0.03, (z0 + z1) / 2); chip.add(f); }
  fiberX(-11.2, -LX, 0); fiberX(LX, 11.2, 1.3); fiberZ(-5.8, -LZ, 6.2);

  // PPLT: periodically poled domains under the squeezer ridges
  var domains = [];
  [zA, zB].forEach(function (z, arm) {
    for (var i = 0; i < 28; i++) {
      var x = -5.0 + i * 0.12, odd = i % 2;
      var m = mat(odd ? 0x1f6a3e : 0x7a2229, { roughness: 0.45, metalness: 0.1, emissive: 0x000000 });
      boxB(x, x + 0.11, Y_SLAB, Y_SLAB + 0.018, z - 0.31, z + 0.31, m);
      domains.push({ x: x + 0.055, arm: arm, odd: odd, mat: m, glow: 0 });
    }
  });
  var gold = mat(0xc8a04a, { roughness: 0.3, metalness: 0.85 });
  boxB(1.95, 2.55, Y_SLAB + RIDGE_H, Y_SLAB + RIDGE_H + 0.03, zA - 0.11, zA + 0.11, gold);
  boxB(1.95, 2.55, Y_SLAB + RIDGE_H, Y_SLAB + RIDGE_H + 0.03, zB - 0.11, zB + 0.11, gold);
  boxB(1.96, 2.04, Y_SLAB, Y_SLAB + 0.02, -3.02, zA - 0.11, gold);

  function device(x, z, w, d) {
    boxB(x - w / 2, x + w / 2, Y_SLAB, Y_SLAB + 0.22, z - d / 2, z + d / 2, mat(0x0d0d0f, { roughness: 0.5, metalness: 0.4 }));
    var topM = new T3.MeshBasicMaterial({ color: 0x222226 });
    var top = new T3.Mesh(new T3.PlaneGeometry(w * 0.7, d * 0.7), topM);
    top.rotation.x = -Math.PI / 2; top.position.set(x, Y_SLAB + 0.225, z); chip.add(top);
    return { m: topM, glow: 0, col: [0, 0, 0] };
  }
  var dev = {
    dumpA: device(1.85, -2.5, 0.42, 0.42), dumpB: device(1.85, 2.5, 0.42, 0.42),
    snA: device(3.75, -2.62, 0.55, 0.5), snB: device(3.75, 2.62, 0.55, 0.5),
    pd1: device(8.32, -0.95, 0.32, 0.32), pd2: device(8.32, -1.95, 0.32, 0.32)
  };

  /* ---------------- Pulses ---------------- */
  function colorAt(x) {
    if (x < -5.0) return C.pump;
    if (x < -1.8) return mixC(C.pump, C.sq, sstep(-5.0, -1.8, x));
    if (x < 1.0) return C.sq;
    if (x < 1.8) return mixC(C.sq, C.cat, sstep(1.0, 1.8, x));
    if (x < 4.2) return C.cat;
    if (x < 4.8) return mixC(C.cat, C.bred, sstep(4.2, 4.8, x));
    return C.bred;
  }
  var glowTex = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,255,255,0.85)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new T3.CanvasTexture(c);
  })();
  function sprite() {
    var m = new T3.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, blending: T3.AdditiveBlending, depthWrite: false, opacity: 0 });
    var o = new T3.Sprite(m); o.visible = false; chip.add(o); return o;
  }
  function tint(o, c, w) { o.material.color.setRGB(lerp(c[0] / 255, 1, w), lerp(c[1] / 255, 1, w), lerp(c[2] / 255, 1, w)); }
  var TRAIL = 11, LOOP = 10.5;
  var SCHED = [
    ['in', 0.0, 1.0, null], ['armA1', 1.0, 2.9, null], ['armB1', 1.0, 2.9, null],
    ['dumpA', 3.0, 3.8, C.pump, 'dumpA'], ['dumpB', 3.0, 3.8, C.pump, 'dumpB'],
    ['armA2', 2.9, 4.4, null], ['armB2', 2.9, 4.4, null],
    ['herA', 3.8, 4.5, C.cat, 'snA'], ['herB', 3.8, 4.5, C.cat, 'snB'],
    ['armA3', 4.4, 5.4, null], ['armB3', 4.4, 5.4, null],
    ['out1', 5.4, 6.3, C.bred], ['lo', 4.7, 6.3, C.lo],
    ['bhd1', 6.3, 6.75, C.mix, 'pd1'], ['bhd2', 6.3, 6.75, C.mix, 'pd2'],
    ['out2', 5.4, 7.6, null]
  ];
  var pulses = SCHED.map(function (s) {
    var sp = []; for (var k = 0; k < TRAIL; k++) sp.push(sprite());
    return { seg: s[0], t0: s[1], t1: s[2], col: s[3], dev: s[4], sprites: sp, fired: false };
  });
  var lights = [];
  for (var li = 0; li < 4; li++) { var L = new T3.PointLight(0xffffff, 0, 2.6, 2); chip.add(L); lights.push(L); }

  // scripted pulses for the breeding story (step 02): two cats → beam splitter → BHD / output
  var upper = new Path().join(paths.armA3).join(paths.out1).join(paths.bhd1).curve();
  var lower = new Path().join(paths.armB3).join(paths.out2).curve();
  function xTable(cu) { var t = []; for (var i = 0; i <= 600; i++) { var f = i / 600; t.push([f, cu.getPointAt(f).x]); } return t; }
  var upT = xTable(upper), loT = xTable(lower), loCurve = seg.lo.curve;
  function uAtX(tab, x) {
    if (x <= tab[0][1]) return 0;
    for (var i = 1; i < tab.length; i++) if (tab[i][1] >= x) { var a = tab[i - 1], b = tab[i]; return a[0] + (b[0] - a[0]) * (x - a[1]) / Math.max(1e-6, b[1] - a[1]); }
    return 1;
  }
  function catPulse() { return { s: [sprite(), sprite(), sprite()] }; }
  var sp = { up: catPulse(), low: catPulse(), lo: catPulse() };
  function placeCat(p, curve, u, col, twoPeak, vis) {
    if (!vis) { p.s.forEach(function (o) { o.visible = false; }); return null; }
    var c = curve.getPointAt(u), t = curve.getTangentAt(u), sep = 0.15;
    if (twoPeak) {
      p.s[0].position.set(c.x - t.x * sep, c.y, c.z - t.z * sep); p.s[0].scale.set(0.62, 0.62, 1);
      p.s[1].position.set(c.x + t.x * sep, c.y, c.z + t.z * sep); p.s[1].scale.set(0.62, 0.62, 1);
    } else {
      p.s[0].position.copy(c); p.s[0].scale.set(0.9, 0.9, 1);
      p.s[1].position.copy(c); p.s[1].scale.set(0.01, 0.01, 1);
    }
    p.s[2].position.copy(c); p.s[2].scale.set(1.5, 1.5, 1);
    p.s.forEach(function (o, i) { o.visible = true; tint(o, col, i < 2 ? 0.4 : 0); o.material.opacity = i < 2 ? 1 : 0.28; });
    return c;
  }

  /* ---------------- Anchors ---------------- */
  function V(x, y, z) { return new T3.Vector3(x, y, z); }
  var ANCH = [V(-3.4, 0.06, zA), V(3.75, 0.25, -2.62), V(10.4, 0.05, 1.3)];
  var LAB = {
    pplt: V(-3.4, 0.05, zB + 0.8), filter: V(-0.6, 0.05, zB + 0.9), snspd: V(3.75, 0.3, 2.62 + 0.75),
    breeder: V(4.9, 0.05, 0.85), lo: V(6.2, 0.05, -4.6), bhd: V(8.3, 0.3, -2.55), out: V(10.0, 0.05, 1.3 + 0.6)
  };
  var CALL = {
    sqv: V(-3.4, 0.06, zB), catst: V(2.25, 0.06, zB), bred: V(7.4, 0.06, 1.3), gkp: V(10.2, 0.03, 1.3),
    squeezer: V(-3.4, 0.06, zB), coupler: V(-LX + 0.4, 0.06, 0), bs: V(4.8, 0.06, 0),
    snspd: V(3.75, 0.25, 2.62), bhd: V(8.32, 0.25, -1.45)
  };
  var CALL_OFF = {
    sqv: [-20, 78], catst: [30, 86], bred: [-30, -96], gkp: [10, 70],
    squeezer: [-30, 74], coupler: [90, -84], bs: [-70, -96], snspd: [96, 70], bhd: [40, -86]
  };
  var tmpV = new T3.Vector3(), VW = 1, VH = 1;
  function toScreen(v) { tmpV.copy(v).project(camera); return [(tmpV.x + 1) / 2 * VW, (1 - tmpV.y) / 2 * VH]; }

  /* ---------------- Interaction: gentle hover + drag that springs back ---------------- */
  var pointer = { x: 0, y: 0, tx: 0, ty: 0 }, drag = { on: false, yaw: 0, pitch: 0, lx: 0, ly: 0 };
  function bindInteract(el) {
    el.addEventListener('pointermove', function (e) {
      if (drag.on) {
        drag.yaw -= (e.clientX - drag.lx) * 0.005;
        drag.pitch = clamp(drag.pitch + (e.clientY - drag.ly) * 0.0035, -0.55, 0.45);
        drag.lx = e.clientX; drag.ly = e.clientY; return;
      }
      var r = el.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    el.addEventListener('pointerdown', function (e) {
      drag.on = true; drag.lx = e.clientX; drag.ly = e.clientY;
      el.classList.add('dragging'); try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });
    function up(e) { drag.on = false; el.classList.remove('dragging'); try { el.releasePointerCapture(e.pointerId); } catch (_) {} }
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', function () { if (!drag.on) pointer.tx = pointer.ty = 0; });
  }
  bindInteract(heroArea); bindInteract(slot);

  /* ---------------- Scroll → chip rectangle + camera ---------------- */
  function scrollState() {
    var sp0 = scrollPos(), vw = VW, vh = VH, narrow = vw < 720, hr = heroArea.getBoundingClientRect();
    var exitY = Math.min(0, sp0.sr.bottom - vh);
    var Aa = narrow ? { x: 0, y: vh * 0.08, w: vw, h: vh * 0.31 } : { x: vw * 0.02, y: vh * 0.17, w: vw * 0.54, h: vh * 0.66 };
    var Bb = narrow ? { x: 0, y: vh * 0.06, w: vw, h: vh * 0.26 } : { x: vw * 0.17, y: vh * 0.07, w: vw * 0.66, h: vh * 0.44 };
    var d = sstep(STARTS[3] - 0.2, STARTS[3] + 0.2, sp0.pos), e = sp0.pEnter * sp0.pEnter * (3 - 2 * sp0.pEnter);
    var hx = hr.left, hy = hr.top, hw = hr.width, hh = hr.height;
    if (!narrow) { hx = hr.left + hr.width * 0.04; hy = hr.top + hr.height * 0.31; hw = hr.width * 0.92; hh = hr.height * 0.69; }
    if (sp0.pEnter > 0) hy = Math.max(hy, vh * 0.06);
    var Sx = lerp(Aa.x, Bb.x, d), Sy = lerp(Aa.y, Bb.y, d) + exitY, Sw = lerp(Aa.w, Bb.w, d), Sh = lerp(Aa.h, Bb.h, d);
    sp0.x = lerp(hx, Sx, e); sp0.y = lerp(hy, Sy, e); sp0.w = Math.max(40, lerp(hw, Sw, e)); sp0.h = Math.max(40, lerp(hh, Sh, e));
    sp0.narrow = narrow; sp0.slot = { x: Sx, y: Sy, w: Sw, h: Sh }; sp0.design = d;
    sp0.zoom = sp0.pEnter > 0.9 ? sstep(STARTS[1], STARTS[1] + 0.4, sp0.pos) * (1 - sstep(STARTS[2] - 0.05, STARTS[2] + 0.35, sp0.pos)) : 0;
    return sp0;
  }
  function resize() { VW = window.innerWidth; VH = window.innerHeight; renderer.setSize(VW, VH, false); sizeCards(); }

  /* ---------------- Call-out drawing ---------------- */
  function arrowSVG(lx, ly, ax, ay) {
    var dx = ax - lx, dy = ay - ly, L = Math.sqrt(dx * dx + dy * dy) || 1, ux = dx / L, uy = dy / L;
    return '<line x1="' + (lx + ux * 16).toFixed(1) + '" y1="' + (ly + uy * 14).toFixed(1) + '" x2="' + (ax - ux * 7).toFixed(1) + '" y2="' + (ay - uy * 7).toFixed(1) + '" marker-end="url(#ah)"/>' +
      '<circle cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="3.5"/>';
  }
  function place(el, x, y, on) {
    el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(-50%,-50%)';
    el.classList.toggle('on', !!on);
  }
  function linkSVG(ax, ay, fig, narrow) {
    var fx, fy, c1x, c1y, c2x, c2y;
    if (narrow) { fx = fig.left + fig.width / 2; fy = fig.top - 6; c1x = ax; c1y = ay + 60; c2x = fx; c2y = fy - 60; }
    else { fx = fig.left - 8; fy = fig.top + fig.height / 2; c1x = ax + 90; c1y = ay; c2x = fx - 90; c2y = fy; }
    return '<path class="link" d="M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + ' C ' + c1x.toFixed(1) + ' ' + c1y.toFixed(1) + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1) + ', ' + fx.toFixed(1) + ' ' + fy.toFixed(1) + '" marker-end="url(#ahb)"/>' +
      '<circle class="lk" cx="' + ax.toFixed(1) + '" cy="' + ay.toFixed(1) + '" r="4"/>';
  }

  /* ---------------- Frame ---------------- */
  var lastT = 0, lastNow = 0;
  function frame(tAbs) {
    var t = reduce ? 7.9 : tAbs % LOOP;
    var dt = clamp(t - lastT, 0, 0.1); if (t < lastT) { dt = 0.016; pulses.forEach(function (p) { p.fired = false; }); }
    lastT = t;
    var rdt = clamp(tAbs - lastNow, 0, 0.1); lastNow = tAbs;
    var st = scrollState();
    if (st.step === 1 && st.pEnter > 0.82) { if (!story.on) { story.on = true; story.t0 = tAbs; } st.u1 = reduce ? 0.95 : storyU(tAbs - story.t0); }
    else { story.on = false; st.u1 = 0; }
    var active = setPanels(st), scripted = st.zoom > 0.25 && active === 1;

    // camera: gentle hover parallax; a drag rotates directly and springs back on release
    if (!drag.on) {
      pointer.x += (pointer.tx - pointer.x) * 0.05; pointer.y += (pointer.ty - pointer.y) * 0.05;
      var kk = 1 - Math.exp(-rdt * 6); drag.yaw += (0 - drag.yaw) * kk; drag.pitch += (0 - drag.pitch) * kk;
    }
    var asp = st.w / st.h, vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
    var spanW = lerp(st.narrow ? 24 : 25, st.narrow ? 11 : 11.2, st.zoom), spanH = lerp(st.narrow ? 7.6 : 10.5, 5.6, st.zoom);
    var dist = Math.max((spanW / 2) / Math.tan(hf / 2), (spanH / 2) / Math.tan(vf / 2));
    var yaw = lerp(-0.26, -0.06, st.zoom) + 0.02 * Math.sin(tAbs * 0.22) + pointer.x * 0.035 + drag.yaw;
    var pitch = clamp(lerp(0.67, 0.95, st.zoom) - pointer.y * 0.025 + drag.pitch + 0.12 * st.design, 0.12, 1.4);
    var target = V(lerp(0.6, 5.7, st.zoom), 0, lerp(0.2, -0.2, st.zoom));
    camera.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(pitch) * Math.cos(yaw));
    camera.lookAt(target);
    camera.aspect = asp; camera.setViewOffset(st.w, st.h, -st.x, -st.y, VW, VH); camera.updateProjectionMatrix();
    slot.style.transform = 'translate(' + st.slot.x.toFixed(1) + 'px,' + st.slot.y.toFixed(1) + 'px)';
    slot.style.width = st.slot.w.toFixed(0) + 'px'; slot.style.height = st.slot.h.toFixed(0) + 'px';

    // looping pulses (hidden while the breeding story plays). Waveguides keep their colour.
    Object.keys(dev).forEach(function (k) { dev[k].glow *= Math.exp(-dt / 0.9); });
    domains.forEach(function (dm) { dm.glow *= Math.exp(-dt / 0.6); });
    var lit = [];
    pulses.forEach(function (p) {
      var on = !scripted && t >= p.t0 && t <= p.t1, s = seg[p.seg];
      if (!on) {
        p.sprites.forEach(function (o) { o.visible = false; });
        if (!scripted && t > p.t1 && !p.fired && p.dev) { p.fired = true; dev[p.dev].glow = 1.4; dev[p.dev].col = p.col; }
        return;
      }
      var u = (t - p.t0) / (p.t1 - p.t0), head = s.curve.getPointAt(clamp(u, 0, 1)), col = p.col || colorAt(head.x);
      for (var k = 0; k < TRAIL; k++) {
        var uk = u - k * 0.11 / s.len, o = p.sprites[k];
        if (uk < 0) { o.visible = false; continue; }
        var pt = k === 0 ? head : s.curve.getPointAt(uk), ck = p.col || colorAt(pt.x), f = 1 - k / TRAIL;
        o.visible = true; o.position.set(pt.x, pt.y, pt.z);
        var sz = (k === 0 ? 0.95 : 0.62) * (0.35 + 0.65 * f); o.scale.set(sz, sz, 1);
        tint(o, ck, k === 0 ? 0.45 : 0); o.material.opacity = k === 0 ? 1 : 0.75 * f * f;
      }
      lit.push({ pos: head, col: col });
      if (p.seg === 'armA1' || p.seg === 'armB1') {
        var arm = p.seg === 'armA1' ? 0 : 1;
        domains.forEach(function (dm) { if (dm.arm === arm) dm.glow = Math.max(dm.glow, Math.exp(-Math.pow((dm.x - head.x) / 0.45, 2)) * 1.1); });
      }
    });

    // breeding story (step 02), driven by scroll position u1
    var u1 = st.u1, cU = null, cL = null;
    if (scripted) {
      var xs = function (end) { // x along the arms with holds before and after the beam splitter
        if (u1 < 0.04) return 2.6;
        if (u1 < 0.25) return lerp(2.6, 3.3, sstep(0.04, 0.25, u1));
        if (u1 < 0.40) return 3.3;
        if (u1 < 0.55) return lerp(3.3, 5.9, sstep(0.40, 0.55, u1));
        if (u1 < 0.70) return 5.9;
        return lerp(5.9, end, sstep(0.70, 0.85, u1));
      };
      var before = u1 < 0.47, colU = before ? C.cat : C.bred;
      cU = placeCat(sp.up, upper, uAtX(upT, xs(8.15)), colU, before, u1 < 0.86);
      cL = placeCat(sp.low, lower, uAtX(loT, xs(9.4)), colU, before, true);
      var loU = u1 < 0.62 ? -1 : lerp(0.45, 1, sstep(0.62, 0.84, u1));
      placeCat(sp.lo, loCurve, clamp(loU, 0, 1), C.lo, false, loU >= 0 && u1 < 0.86);
      if (u1 > 0.84) { dev.pd1.glow = 1; dev.pd1.col = C.mix; dev.pd2.glow = 1; dev.pd2.col = C.mix; }
      if (cU) lit.push({ pos: cU, col: colU });
      lit.push({ pos: cL, col: colU });
      if (!cU) cU = upper.getPointAt(uAtX(upT, 8.15));
    } else { ['up', 'low', 'lo'].forEach(function (k) { placeCat(sp[k], upper, 0, C.cat, false, false); }); }

    domains.forEach(function (dm) { var c = dm.odd ? C.pump : C.bred, g = dm.glow * 0.8; dm.mat.emissive.setRGB(c[0] / 255 * g, c[1] / 255 * g, c[2] / 255 * g); });
    Object.keys(dev).forEach(function (k) { var v = dev[k], g = Math.min(1, v.glow), c = v.col; v.m.color.setRGB(0.13 + c[0] / 255 * g, 0.13 + c[1] / 255 * g, 0.15 + c[2] / 255 * g); });
    lights.forEach(function (L, i) {
      var a = lit[i];
      if (a) { L.position.set(a.pos.x, 0.45, a.pos.z); L.color.setRGB(a.col[0] / 255, a.col[1] / 255, a.col[2] / 255); L.intensity = 1.1; } else L.intensity = 0;
    });
    renderer.render(scene, camera);

    // Wigner cards + stage text
    var fade = 1 - sstep(9.6, 10.3, t), n = 0;
    CARD.forEach(function (c, i) {
      var m = sstep(c.at - 0.25, c.at + 0.55, t) * fade;
      if (m > 0.5) n = i + 1;
      c.el.classList.toggle('on', m > 0.02); c.el.style.setProperty('--m', m.toFixed(3));
      if (Math.abs(m - c.m) > 0.004) { c.m = m; drawCard(c, m); }
    });
    setStage(t < 1.6 ? 0 : Math.max(1, n));

    // hero leaders + labels
    var hv = 1 - sstep(0.02, 0.2, st.pEnter), hs = heroStage.getBoundingClientRect(), html = '';
    if (!st.narrow && hv > 0.01) {
      CARD.forEach(function (c, i) {
        var cr = c.el.getBoundingClientRect(), a = toScreen(ANCH[i]);
        var x1 = cr.left - hs.left + cr.width / 2, y1 = cr.bottom - hs.top, x2 = a[0] - hs.left, y2 = a[1] - hs.top;
        var m = Math.max(0, parseFloat(c.el.style.getPropertyValue('--m')) || 0), col = rgb(c.col);
        html += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' C ' + x1.toFixed(1) + ' ' + (y1 + 40).toFixed(1) + ', ' + x2.toFixed(1) + ' ' + (y2 - 50).toFixed(1) + ', ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" fill="none" stroke="' + (m > 0.02 ? col : 'rgba(255,255,255,0.18)') + '" stroke-opacity="' + ((0.25 + 0.6 * m) * hv).toFixed(2) + '" stroke-width="1"/>';
        html += '<circle cx="' + x2.toFixed(1) + '" cy="' + y2.toFixed(1) + '" r="' + (2.5 + 1.5 * m).toFixed(1) + '" fill="' + (m > 0.02 ? col : 'rgba(255,255,255,0.35)') + '" fill-opacity="' + hv.toFixed(2) + '"/>';
      });
    }
    heroSvg.innerHTML = html;
    labels.forEach(function (el) {
      var a = toScreen(LAB[el.getAttribute('data-a')]);
      el.style.opacity = hv.toFixed(2);
      el.style.transform = 'translate(' + (a[0] - hs.left).toFixed(1) + 'px,' + (a[1] - hs.top).toFixed(1) + 'px) translate(-50%,-50%)';
    });

    // call-outs in the pinned section
    var sr = sticky.getBoundingClientRect(), ch = '', sx = st.narrow ? 0.55 : 1;
    var grp = active === 0 ? '0' : active === 2 ? '2' : '';
    callouts.forEach(function (el) {
      var k = el.getAttribute('data-a'), on = el.getAttribute('data-g') === grp;
      var a = toScreen(CALL[k]), o = CALL_OFF[k], ax = a[0] - sr.left, ay = a[1] - sr.top, lx = ax + o[0] * sx, ly = ay + o[1] * sx;
      place(el, lx, ly, on);
      if (on) ch += arrowSVG(lx, ly, ax, ay);
    });
    // step 02: labels on the chip and links to the active sub-figure
    var fig = $('[data-step="1"] .sf.on', sc), fr = fig ? fig.getBoundingClientRect() : null;
    if (fr) fr = { left: fr.left - sr.left, top: fr.top - sr.top, width: fr.width, height: fr.height };
    function scr(v) { var a = toScreen(v); return [a[0] - sr.left, a[1] - sr.top]; }
    var showCats = scripted && u1 > 0.2 && u1 < 0.44, showAfter = scripted && u1 > 0.5 && u1 < 0.74;
    var showBhd = scripted && u1 > 0.8, showHer = scripted && u1 > 0.86;
    if (scripted && cL) {
      var pu = scr(cU), pl = scr(cL), mx = (pu[0] + pl[0]) / 2, my = Math.min(pu[1], pl[1]);
      var lx = mx - 120 * sx, ly = my - 70 * sx;
      place(dyn.cats, lx, ly, showCats);
      if (showCats) { ch += arrowSVG(lx, ly, pu[0], pu[1]); ch += arrowSVG(lx, ly, pl[0], pl[1]); }
      badges.forEach(function (b, i) { var p = i ? pl : pu; place(b, p[0], p[1] - 30 * sx, u1 > 0.03 && u1 < 0.44); });
      var ma = [(pu[0] + pl[0]) / 2, (pu[1] + pl[1]) / 2];
      place(dyn.after, ma[0] - 40 * sx, ma[1] - 64 * sx, showAfter);
      if (showAfter && fr) ch += linkSVG(ma[0], ma[1], fr, st.narrow);
      var pd = scr(V(8.32, 0.25, -1.45)), bl = [pd[0] - 20 * sx, pd[1] - 80 * sx];
      place(dyn.bhd, bl[0], bl[1], showBhd);
      if (showBhd) ch += arrowSVG(bl[0], bl[1], pd[0], pd[1]);
      place(dyn.herald, pl[0] - 20 * sx, pl[1] + 56 * sx, showHer);
      if (showHer && fr) ch += linkSVG(pl[0], pl[1], fr, st.narrow);
    } else {
      [dyn.cats, dyn.after, dyn.bhd, dyn.herald].concat(badges).forEach(function (el) { el.classList.remove('on'); });
    }
    callSvg.innerHTML = ch;
  }

  resize();
  window.addEventListener('resize', resize);
  var visible = true, t0 = performance.now(), paused = 0, pauseAt = 0, vis = { hero: true, sc: false };
  function setVis() {
    var v = vis.hero || vis.sc;
    fixedLayer.style.visibility = v ? 'visible' : 'hidden';
    if (v && !visible) { paused += performance.now() - pauseAt; visible = true; requestAnimationFrame(loop); }
    else if (!v && visible) { visible = false; pauseAt = performance.now(); }
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.target === heroEl) vis.hero = e.isIntersecting; else vis.sc = e.isIntersecting; });
      setVis();
    }, { threshold: 0 });
    io.observe(heroEl); io.observe(sc);
  }
  function loop(now) {
    if (!visible) return;
    frame((now - t0 - paused) / 1000);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
