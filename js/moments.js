/* Moments: horizontal gallery with arrow buttons and a lightbox. */
(function () {
  var sec = document.getElementById('moments');
  if (!sec) return;
  var track = sec.querySelector('.mo-track'), btns = sec.querySelectorAll('.mo-btn');
  var cards = Array.prototype.slice.call(sec.querySelectorAll('.mo-card'));
  var lb = sec.querySelector('.mo-lb'), lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption');
  var cur = 0, lastFocus = null;
  document.body.appendChild(lb);   // escape the section's stacking context so the viewer sits above the nav

  function step() { return (cards[0] ? cards[0].getBoundingClientRect().width : 330) + 20; }
  function updBtns() {
    var max = track.scrollWidth - track.clientWidth - 2;
    btns[0].disabled = track.scrollLeft <= 2; btns[1].disabled = track.scrollLeft >= max;
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () { track.scrollBy({ left: +b.getAttribute('data-dir') * step() * 2, behavior: 'smooth' }); });
  });
  track.addEventListener('scroll', updBtns, { passive: true });
  window.addEventListener('resize', updBtns);
  updBtns();

  // collapsed by default; photos are AES-GCM encrypted and decrypted in the browser after the password
  var toggle = sec.querySelector('.mo-toggle'), panel = sec.querySelector('.mo-panel'), label = sec.querySelector('.mo-tl');
  var form = sec.querySelector('.mo-lock'), input = form.querySelector('input'), err = form.querySelector('.mo-err');
  var unlocked = false, SALT = sec.getAttribute('data-salt'), ITER = +sec.getAttribute('data-iter');
  function b64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function deriveKey(pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(SALT), iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    });
  }
  function decrypt(key, url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('fetch'); return r.arrayBuffer(); }).then(function (buf) {
      return crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(buf, 0, 12) }, key, new Uint8Array(buf, 12));
    }).then(function (plain) { return URL.createObjectURL(new Blob([plain], { type: 'image/webp' })); });
  }
  function setOpen(open) {
    sec.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open); panel.setAttribute('aria-hidden', !open);
    label.textContent = open ? 'Hide photos' : 'View photos';
    if (open) { track.scrollLeft = 0; setTimeout(function () { updBtns(); panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 350); }
  }
  toggle.addEventListener('click', function () {
    if (unlocked) { setOpen(!sec.classList.contains('open')); return; }
    toggle.hidden = true; form.hidden = false; input.focus();
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!input.value) return;
    if (!window.crypto || !crypto.subtle) { err.textContent = 'This browser cannot open the photos.'; return; }
    form.classList.add('busy'); err.textContent = '';
    var imgs = Array.prototype.slice.call(sec.querySelectorAll('.mo-track img'));
    deriveKey(input.value).then(function (key) {
      var first = imgs.filter(function (im) { return im.hasAttribute('data-enc'); })[0];
      return decrypt(key, first.getAttribute('data-enc')).then(function (url0) {
        first.src = url0;
        return Promise.all(imgs.map(function (im) {
          if (im === first) return null;
          if (im.hasAttribute('data-src')) { im.src = im.getAttribute('data-src'); return null; }
          return decrypt(key, im.getAttribute('data-enc')).then(function (u) { im.src = u; });
        }));
      });
    }).then(function () {
      unlocked = true; form.hidden = true; toggle.hidden = false; input.value = ''; setOpen(true);
    }).catch(function () {
      err.textContent = 'Wrong password.'; form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); input.select();
    }).then(function () { form.classList.remove('busy'); });
  });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { form.hidden = true; toggle.hidden = false; err.textContent = ''; toggle.focus(); } });

  function show(i) {
    cur = (i + cards.length) % cards.length;
    var c = cards[cur], img = c.querySelector('img');
    lbImg.src = img.src; lbImg.alt = img.alt;
    lbCap.innerHTML = '<b>' + c.querySelector('.mo-k').textContent + '</b>' + img.alt;
  }
  function open(i) { lastFocus = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.mo-x').focus(); }
  function close() { lb.hidden = true; document.body.style.overflow = ''; if (lastFocus) lastFocus.focus(); }
  sec.querySelectorAll('.mo-img').forEach(function (b) { b.addEventListener('click', function () { open(+b.getAttribute('data-i')); }); });
  lb.querySelector('.mo-x').addEventListener('click', close);
  lb.querySelector('.prev').addEventListener('click', function () { show(cur - 1); });
  lb.querySelector('.next').addEventListener('click', function () { show(cur + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(cur - 1); else if (e.key === 'ArrowRight') show(cur + 1);
  });
  var sx = null;
  lb.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) { if (sx === null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) show(cur + (dx < 0 ? 1 : -1)); sx = null; });
})();
