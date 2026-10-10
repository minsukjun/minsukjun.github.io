/* Exact Wigner functions for even squeezed cats, ideal breeding and output loss (hbar = 1, vacuum Var(q) = 1/2).
 *
 * Wavefunction: psi(x) = sum_j c_j exp(-(x - a_j)^2 / (2 s2)),  s2 = 10^(-dB/10)   (Var(q) of one peak = s2/2)
 * Even cat:     peaks at +-a with a = sqrt(2) * alpha.
 * Breeding:     two copies on a 50:50 beam splitter, p = 0 homodyne on one output. For equal widths the output is
 *               sum_jk c_j c_k exp(-(u - (a_j + a_k)/sqrt2)^2 / (2 s2)), i.e. new peaks at (a_j + a_k)/sqrt2.
 * Wigner:       every pair (j,k) gives  c_j c_k exp(-(q - m)^2 / s2 - s2 p^2) cos(p (a_j - a_k)),  m = (a_j + a_k)/2.
 *               Written as amp * exp(-(q - mq)^2/(2 vq)) * exp(-p^2/(2 vp)) * cos(k p).
 * Loss eta:     q -> sqrt(eta) q + sqrt(1-eta) q_vac (same for p). Per term: scale (mq*sqrt(eta), vq*eta, vp*eta,
 *               k/sqrt(eta)), then convolve both axes with N(0, (1-eta)/2):
 *               vq' = vq + d,  amp *= sqrt(vq/vq');  V = vp + d,  amp *= sqrt(vp/V) exp(-k^2 vp d / (2V)),  k' = k vp / V.
 */
(function (root) {
  var SQ2 = Math.SQRT2;

  function wavefunction(p) {
    var s2 = Math.pow(10, -p.dB / 10), a = SQ2 * p.alpha;
    var peaks = a < 1e-6 ? [[0, 1]] : [[-a, 1], [a, 1]];
    for (var r = 0; r < p.breed; r++) {
      var map = {};
      peaks.forEach(function (x) {
        peaks.forEach(function (y) {
          var c = (x[0] + y[0]) / SQ2, key = c.toFixed(9);
          if (!map[key]) map[key] = [c, 0];
          map[key][1] += x[1] * y[1];
        });
      });
      peaks = Object.keys(map).map(function (k) { return map[k]; }).sort(function (u, v) { return u[0] - v[0]; });
    }
    return { s2: s2, peaks: peaks };
  }

  function terms(p) {
    var wf = wavefunction(p), s2 = wf.s2, T = [];
    wf.peaks.forEach(function (x) {
      wf.peaks.forEach(function (y) {
        T.push({ amp: x[1] * y[1], mq: (x[0] + y[0]) / 2, vq: s2 / 2, vp: 1 / (2 * s2), k: x[0] - y[0] });
      });
    });
    var eta = Math.min(1, Math.max(1e-4, p.eta));
    if (eta < 1) {
      var d = (1 - eta) / 2, se = Math.sqrt(eta);
      T.forEach(function (t) {
        t.amp /= eta;                       // W(q/sqrt(eta), p/sqrt(eta)) / eta keeps the integral
        t.mq *= se; t.vq *= eta; t.vp *= eta; t.k /= se;
        var vq2 = t.vq + d; t.amp *= Math.sqrt(t.vq / vq2); t.vq = vq2;
        var V = t.vp + d; t.amp *= Math.sqrt(t.vp / V) * Math.exp(-t.k * t.k * t.vp * d / (2 * V)); t.k *= t.vp / V; t.vp = V;
      });
    }
    // normalise so that the Wigner function integrates to 1
    var Z = 0;
    T.forEach(function (t) { Z += t.amp * 2 * Math.PI * Math.sqrt(t.vq * t.vp) * Math.exp(-t.k * t.k * t.vp / 2); });
    T.forEach(function (t) { t.amp /= Z; });
    return { terms: T, peaks: wf.peaks, s2: s2 };
  }

  function grid(T, qs, ps, out) {
    var nq = qs.length, np = ps.length, i, j, n;
    out = out || new Float32Array(nq * np);
    out.fill(0);
    var gq = new Float64Array(nq), gp = new Float64Array(np);
    for (n = 0; n < T.length; n++) {
      var t = T[n];
      for (i = 0; i < nq; i++) { var dq = qs[i] - t.mq; gq[i] = Math.exp(-dq * dq / (2 * t.vq)); }
      for (j = 0; j < np; j++) gp[j] = t.amp * Math.exp(-ps[j] * ps[j] / (2 * t.vp)) * Math.cos(t.k * ps[j]);
      for (j = 0; j < np; j++) { var g = gp[j]; if (g === 0) continue; var row = j * nq; for (i = 0; i < nq; i++) out[row + i] += g * gq[i]; }
    }
    return out;
  }

  function marginals(T, qs, ps) {
    var Pq = new Float64Array(qs.length), Pp = new Float64Array(ps.length);
    T.forEach(function (t) {
      var fq = t.amp * Math.sqrt(2 * Math.PI * t.vp) * Math.exp(-t.k * t.k * t.vp / 2);
      for (var i = 0; i < qs.length; i++) { var dq = qs[i] - t.mq; Pq[i] += fq * Math.exp(-dq * dq / (2 * t.vq)); }
      var fp = t.amp * Math.sqrt(2 * Math.PI * t.vq);
      for (var j = 0; j < ps.length; j++) Pp[j] += fp * Math.exp(-ps[j] * ps[j] / (2 * t.vp)) * Math.cos(t.k * ps[j]);
    });
    return { Pq: Pq, Pp: Pp };
  }

  var api = { wavefunction: wavefunction, terms: terms, grid: grid, marginals: marginals };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WignerCore = api;
})(this);
