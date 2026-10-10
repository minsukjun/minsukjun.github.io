/* Wigner playground: 3D surface of W(q,p) with P(q) on the back wall and P(p) on the right wall.
   Physics lives in wigner-core.js (exact Gaussian sums, verified against brute-force numerics). */
(function () {
  var sec = document.getElementById('playground');
  if (!sec || !window.WignerCore) return;
  var $ = function (s) { return sec.querySelector(s); };
  var stage = $('.pg-stage'), canvas = $('.pg-stage canvas'), labels = sec.querySelectorAll('.pg-lab');
  var C = window.WignerCore;

  /* ---------------- state ---------------- */
  var P = { dB: 9, alpha: Math.sqrt(2 * Math.PI), breed: 2, eta: 1 };
  var PRESETS = {
    squeezed: { dB: 6, alpha: 0, breed: 0, eta: 1 },
    cat: { dB: 6, alpha: 1.8, breed: 0, eta: 1 },
    gkp: { dB: 9, alpha: Math.sqrt(2 * Math.PI), breed: 2, eta: 1 }
  };

  /* ---------------- grid ---------------- */
  var NQ = 181, NP = 141, QM = 8, PM = 6, SZ = 0.9, HMAX = 3.2, FLOOR = 0, TOP = 3.9, Wref = 1 / Math.PI;
  var qs = new Float64Array(NQ), ps = new Float64Array(NP);
  for (var i = 0; i < NQ; i++) qs[i] = -QM + 2 * QM * i / (NQ - 1);
  for (var j = 0; j < NP; j++) ps[j] = -PM + 2 * PM * j / (NP - 1);
  var dA = (qs[1] - qs[0]) * (ps[1] - ps[0]);
  var Wt = new Float32Array(NQ * NP), Wc = new Float32Array(NQ * NP);
  var PqT = new Float64Array(NQ), PpT = new Float64Array(NP), PqC = new Float64Array(NQ), PpC = new Float64Array(NP);

  /* ---------------- controls ---------------- */
  var ctrl = {
    dB: $('#pg-db'), alpha: $('#pg-alpha'), eta: $('#pg-eta')
  };
  var out = { dB: $('#pg-db-v'), alpha: $('#pg-alpha-v'), eta: $('#pg-eta-v'),
    neg: $('#pg-neg'), pur: $('#pg-pur'), sp: $('#pg-sp'), pk: $('#pg-pk') };
  var breedBtns = sec.querySelectorAll('[data-breed]'), presetBtns = sec.querySelectorAll('[data-preset]');

  function syncUI() {
    ctrl.dB.value = P.dB; ctrl.alpha.value = P.alpha; ctrl.eta.value = P.eta;
    out.dB.textContent = (+P.dB).toFixed(1) + ' dB';
    out.alpha.textContent = (+P.alpha).toFixed(2);
    out.eta.textContent = (+P.eta).toFixed(2);
    breedBtns.forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-breed') === P.breed); b.setAttribute('aria-pressed', +b.getAttribute('data-breed') === P.breed); });
    [ctrl.dB, ctrl.alpha, ctrl.eta].forEach(function (r) {
      var f = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty('--f', f + '%');
    });
    var match = null;
    Object.keys(PRESETS).forEach(function (k) {
      var s = PRESETS[k];
      if (Math.abs(s.dB - P.dB) < 1e-6 && Math.abs(s.alpha - P.alpha) < 0.006 && s.breed === P.breed && Math.abs(s.eta - P.eta) < 1e-6) match = k;
    });
    presetBtns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-preset') === match); });
  }
  ['dB', 'alpha', 'eta'].forEach(function (k) {
    ctrl[k].addEventListener('input', function () { P[k] = +ctrl[k].value; update(); });
  });
  breedBtns.forEach(function (b) { b.addEventListener('click', function () { P.breed = +b.getAttribute('data-breed'); update(); }); });
  presetBtns.forEach(function (b) { b.addEventListener('click', function () { var s = PRESETS[b.getAttribute('data-preset')]; Object.keys(s).forEach(function (k) { P[k] = s[k]; }); update(); }); });

  /* ---------------- analytic purity: mu = 2 pi * integral W^2 ---------------- */
  function purity(T) {
    var s = 0;
    for (var a = 0; a < T.length; a++) for (var b = 0; b < T.length; b++) {
      var A = T[a], B = T[b];
      var vq = A.vq + B.vq, iq = Math.sqrt(2 * Math.PI * A.vq * B.vq / vq) * Math.exp(-(A.mq - B.mq) * (A.mq - B.mq) / (2 * vq));
      var U = A.vp * B.vp / (A.vp + B.vp), r = Math.sqrt(2 * Math.PI * U);
      var ip = 0.5 * r * (Math.exp(-(A.k + B.k) * (A.k + B.k) * U / 2) + Math.exp(-(A.k - B.k) * (A.k - B.k) * U / 2));
      s += A.amp * B.amp * iq * ip;
    }
    return 2 * Math.PI * s;
  }

  var info = { neg: 0, pur: 1, sp: 0, pk: 1 };
  function compute() {
    var r = C.terms(P);
    var r0 = P.eta < 1 ? C.terms({ dB: P.dB, alpha: P.alpha, breed: P.breed, eta: 1 }) : r;
    var g0 = P.eta < 1 ? C.grid(r0.terms, qs, ps) : null;
    C.grid(r.terms, qs, ps, Wt);
    var m = C.marginals(r.terms, qs, ps);
    PqT.set(m.Pq); PpT.set(m.Pp);
    var neg = 0, mx = 1e-9, src = g0 || Wt;
    for (var n = 0; n < Wt.length; n++) { if (Wt[n] < 0) neg -= Wt[n]; var av = src[n] < 0 ? -src[n] : src[n]; if (av > mx) mx = av; }
    Wref = mx;
    info.neg = 2 * neg * dA;
    info.pur = Math.min(1, purity(r.terms));
    info.pk = r.peaks.length;
    info.sp = r.peaks.length > 1 ? (r.peaks[1][0] - r.peaks[0][0]) * Math.sqrt(P.eta) / Math.sqrt(Math.PI) : 0;
    out.neg.textContent = info.neg.toFixed(3);
    out.pur.textContent = info.pur.toFixed(3);
    out.pk.textContent = info.pk;
    out.sp.textContent = info.pk > 1 ? info.sp.toFixed(2) + ' √π' : '—';
  }

  /* ---------------- WebGL guard ---------------- */
  var hasGL = false;
  try { var tc = document.createElement('canvas'); hasGL = !!(window.WebGLRenderingContext && (tc.getContext('webgl') || tc.getContext('experimental-webgl'))); } catch (e) {}
  if (!window.THREE || !hasGL) { sec.classList.add('nogl'); syncUI(); compute(); return; }

  /* ---------------- scene ---------------- */
  var T3 = THREE;
  if (T3.ColorManagement) T3.ColorManagement.legacyMode = false;
  var renderer = new T3.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T3.sRGBEncoding;
  var scene = new T3.Scene();
  var camera = new T3.PerspectiveCamera(30, 1, 0.1, 200);
  scene.add(new T3.HemisphereLight(0xffffff, 0x8f9db5, 0.55));
  var dl = new T3.DirectionalLight(0xffffff, 0.7); dl.position.set(-6, 14, 10); scene.add(dl);
  var dl2 = new T3.DirectionalLight(0xdfe8ff, 0.25); dl2.position.set(8, 6, -8); scene.add(dl2);

  var X = function (q) { return q; }, Z = function (p) { return -p * SZ; };
  var XR = X(QM), ZB = Z(PM), ZF = Z(-PM), XL = X(-QM);

  // surface
  var pos = new Float32Array(NQ * NP * 3), col = new Float32Array(NQ * NP * 3), idx = [];
  for (j = 0; j < NP; j++) for (i = 0; i < NQ; i++) { var o = (j * NQ + i) * 3; pos[o] = X(qs[i]); pos[o + 2] = Z(ps[j]); }
  for (j = 0; j < NP - 1; j++) for (i = 0; i < NQ - 1; i++) { var a = j * NQ + i; idx.push(a, a + 1, a + NQ, a + 1, a + NQ + 1, a + NQ); }
  var geo = new T3.BufferGeometry();
  geo.setAttribute('position', new T3.BufferAttribute(pos, 3));
  geo.setAttribute('color', new T3.BufferAttribute(col, 3));
  geo.setIndex(idx);
  var surf = new T3.Mesh(geo, new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.0, side: T3.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  scene.add(surf);

  // floor grid + box frame
  var lineM = new T3.LineBasicMaterial({ color: 0x7d8aa0, transparent: true, opacity: 0.28 });
  var frameM = new T3.LineBasicMaterial({ color: 0x6e7788, transparent: true, opacity: 0.55 });
  function lines(pts, m) { var g = new T3.BufferGeometry().setFromPoints(pts); var l = new T3.LineSegments(g, m); scene.add(l); return l; }
  var V = function (x, y, z) { return new T3.Vector3(x, y, z); }, gl = [];
  for (var q = -8; q <= 8.001; q += 2) gl.push(V(X(q), 0.004, ZB), V(X(q), 0.004, ZF));
  for (var p = -6; p <= 6.001; p += 2) gl.push(V(XL, 0.004, Z(p)), V(XR, 0.004, Z(p)));
  lines(gl, lineM);
  var wl = [];
  for (q = -8; q <= 8.001; q += 2) wl.push(V(X(q), FLOOR, ZB), V(X(q), TOP, ZB));
  for (p = -6; p <= 6.001; p += 2) wl.push(V(XR, FLOOR, Z(p)), V(XR, TOP, Z(p)));
  lines(wl, new T3.LineBasicMaterial({ color: 0x9aa6b8, transparent: true, opacity: 0.18 }));
  lines([V(XL, FLOOR, ZB), V(XR, FLOOR, ZB), V(XR, FLOOR, ZB), V(XR, FLOOR, ZF), V(XL, FLOOR, ZB), V(XL, TOP, ZB),
         V(XR, FLOOR, ZB), V(XR, TOP, ZB), V(XR, FLOOR, ZF), V(XR, TOP, ZF), V(XL, TOP, ZB), V(XR, TOP, ZB), V(XR, TOP, ZB), V(XR, TOP, ZF)], frameM);
  // translucent wall panes
  function pane(w, h, x, y, z, ry) {
    var m = new T3.Mesh(new T3.PlaneGeometry(w, h), new T3.MeshBasicMaterial({ color: 0xdfe6f1, transparent: true, opacity: 0.32, side: T3.DoubleSide, depthWrite: false }));
    m.position.set(x, y, z); m.rotation.y = ry; scene.add(m);
  }
  pane(2 * QM, TOP - FLOOR, 0, (TOP + FLOOR) / 2, ZB - 0.001, 0);
  pane(ZF - ZB, TOP - FLOOR, XR + 0.001, (TOP + FLOOR) / 2, (ZB + ZF) / 2, -Math.PI / 2);

  // marginal curves + fills on the walls
  var COL_Q = new T3.Color('#0a64d8'), COL_P = new T3.Color('#2f7fe6');
  function wallCurve(n, color) {
    var lg = new T3.BufferGeometry(); lg.setAttribute('position', new T3.BufferAttribute(new Float32Array(n * 3), 3));
    var line = new T3.Line(lg, new T3.LineBasicMaterial({ color: color, linewidth: 2 }));
    var fg = new T3.BufferGeometry(); fg.setAttribute('position', new T3.BufferAttribute(new Float32Array(n * 6), 3));
    var fi = []; for (var k = 0; k < n - 1; k++) { var b = 2 * k; fi.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } fg.setIndex(fi);
    var fill = new T3.Mesh(fg, new T3.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.16, side: T3.DoubleSide, depthWrite: false }));
    scene.add(fill); scene.add(line);
    return { line: lg, fill: fg };
  }
  var cq = wallCurve(NQ, COL_Q), cp = wallCurve(NP, COL_P);
  var WALL_H = (TOP - FLOOR) * 0.86;

  /* ---------------- colours: one blue family ---------------- */
  var ZERO = [0.93, 0.945, 0.97], POS1 = [0.16, 0.59, 1.0], POS2 = [0.0, 0.33, 0.78], NEG1 = [0.40, 0.38, 0.93], NEG2 = [0.24, 0.16, 0.70];
  function lin(c) { return [Math.pow(c[0], 2.2), Math.pow(c[1], 2.2), Math.pow(c[2], 2.2)]; }
  ZERO = lin(ZERO); POS1 = lin(POS1); POS2 = lin(POS2); NEG1 = lin(NEG1); NEG2 = lin(NEG2);
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function colorOf(v) {
    if (v >= 0) { v = Math.pow(v, 0.7); return v < 0.5 ? mix(ZERO, POS1, v / 0.5) : mix(POS1, POS2, Math.min(1, (v - 0.5) / 0.5)); }
    v = Math.pow(-v, 0.7); return v < 0.45 ? mix(ZERO, NEG1, v / 0.45) : mix(NEG1, NEG2, Math.min(1, (v - 0.45) / 0.45));
  }

  function writeGeometry() {
    var hs = HMAX / Wref;
    for (var n = 0; n < NQ * NP; n++) {
      pos[n * 3 + 1] = Wc[n] * hs;
      var c = colorOf(Wc[n] / Wref);
      col[n * 3] = c[0]; col[n * 3 + 1] = c[1]; col[n * 3 + 2] = c[2];
    }
    geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
    var mq = 1e-9, mp = 1e-9, k;
    for (k = 0; k < NQ; k++) mq = Math.max(mq, PqC[k]);
    for (k = 0; k < NP; k++) mp = Math.max(mp, Math.abs(PpC[k]));
    var lq = cq.line.attributes.position.array, fq = cq.fill.attributes.position.array;
    for (k = 0; k < NQ; k++) {
      var y = FLOOR + Math.max(0, PqC[k]) / mq * WALL_H, x = X(qs[k]);
      lq[k * 3] = x; lq[k * 3 + 1] = y; lq[k * 3 + 2] = ZB + 0.01;
      fq[k * 6] = x; fq[k * 6 + 1] = FLOOR; fq[k * 6 + 2] = ZB + 0.005; fq[k * 6 + 3] = x; fq[k * 6 + 4] = y; fq[k * 6 + 5] = ZB + 0.005;
    }
    var lp = cp.line.attributes.position.array, fp = cp.fill.attributes.position.array;
    for (k = 0; k < NP; k++) {
      var yy = FLOOR + Math.max(0, PpC[k]) / mp * WALL_H, z = Z(ps[k]);
      lp[k * 3] = XR - 0.01; lp[k * 3 + 1] = yy; lp[k * 3 + 2] = z;
      fp[k * 6] = XR - 0.005; fp[k * 6 + 1] = FLOOR; fp[k * 6 + 2] = z; fp[k * 6 + 3] = XR - 0.005; fp[k * 6 + 4] = yy; fp[k * 6 + 5] = z;
    }
    [cq.line, cq.fill, cp.line, cp.fill].forEach(function (g) { g.attributes.position.needsUpdate = true; });
  }

  /* ---------------- camera + drag rotate ---------------- */
  var view = { yaw: -0.42, pitch: 0.5 }, HOME = { yaw: -0.42, pitch: 0.5 }, drag = null;
  var target = V(0.5, 0.6, 0);
  function placeCamera() {
    var w = stage.clientWidth, h = stage.clientHeight, asp = w / h;
    var vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * asp);
    var dist = Math.max(10.2 / Math.tan(hf / 2), 6.0 / Math.tan(vf / 2));
    camera.position.set(target.x + dist * Math.cos(view.pitch) * Math.sin(view.yaw), target.y + dist * Math.sin(view.pitch), target.z + dist * Math.cos(view.pitch) * Math.cos(view.yaw));
    camera.lookAt(target);
  }
  stage.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; stage.classList.add('dragging'); try { stage.setPointerCapture(e.pointerId); } catch (_) {} });
  stage.addEventListener('pointermove', function (e) {
    if (!drag) return;
    view.yaw -= (e.clientX - drag.x) * 0.006; view.pitch = Math.max(0.08, Math.min(1.35, view.pitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY; kick();
  });
  function up(e) { drag = null; stage.classList.remove('dragging'); try { stage.releasePointerCapture(e.pointerId); } catch (_) {} }
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  stage.addEventListener('dblclick', function () { view.yaw = HOME.yaw; view.pitch = HOME.pitch; kick(); });

  var LAB = {
    q: V(0, 0, ZF + 0.9), p: V(XR + 1.3, -0.2, ZF * 0.45),
    pq: V(X(-QM) + 1.2, TOP + 0.35, ZB), pp: V(XR, TOP + 0.35, Z(-PM) - 0.6), w: V(XL - 0.2, TOP - 0.2, ZB)
  };
  var tv = new T3.Vector3();
  function placeLabels() {
    var w = stage.clientWidth, h = stage.clientHeight;
    labels.forEach(function (el) {
      tv.copy(LAB[el.getAttribute('data-l')]).project(camera);
      el.style.transform = 'translate(' + ((tv.x + 1) / 2 * w).toFixed(1) + 'px,' + ((1 - tv.y) / 2 * h).toFixed(1) + 'px) translate(-50%,-50%)';
    });
  }

  /* ---------------- render loop (on demand, with a short morph) ---------------- */
  var running = false, visible = true;
  function kick() { if (!running && visible) { running = true; requestAnimationFrame(tick); } }
  function tick() {
    var moving = false, k = 0.22, n, d;
    for (n = 0; n < Wc.length; n++) { d = Wt[n] - Wc[n]; if (d > 2e-5 || d < -2e-5) { Wc[n] += d * k; moving = true; } else Wc[n] = Wt[n]; }
    for (n = 0; n < NQ; n++) { d = PqT[n] - PqC[n]; PqC[n] = Math.abs(d) > 1e-6 ? PqC[n] + d * k : PqT[n]; if (Math.abs(d) > 1e-6) moving = true; }
    for (n = 0; n < NP; n++) { d = PpT[n] - PpC[n]; PpC[n] = Math.abs(d) > 1e-6 ? PpC[n] + d * k : PpT[n]; if (Math.abs(d) > 1e-6) moving = true; }
    writeGeometry(); placeCamera(); renderer.render(scene, camera); placeLabels();
    if (moving || drag) requestAnimationFrame(tick); else running = false;
  }
  var pending = false;
  function update() {
    syncUI();
    if (pending) return; pending = true;
    requestAnimationFrame(function () { pending = false; compute(); kick(); });
  }
  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); kick();
  }
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(stage);

  syncUI(); compute(); Wc.set(Wt); PqC.set(PqT); PpC.set(PpT); resize();
})();
