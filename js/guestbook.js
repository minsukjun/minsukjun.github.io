/* Guestbook front end. API: Cloudflare Worker at data-api; spam check: Cloudflare Turnstile (data-sitekey).
   The section stays hidden until the API answers, so nothing looks broken if the Worker is down. */
(function () {
  var sec = document.getElementById('guestbook');
  if (!sec) return;
  var API = sec.getAttribute('data-api'), SITEKEY = sec.getAttribute('data-sitekey');
  var form = sec.querySelector('.gb-form'), list = sec.querySelector('.gb-list'), msg = sec.querySelector('.gb-msg');
  var send = sec.querySelector('.gb-send'), count = sec.querySelector('.gb-count'), tsBox = sec.querySelector('.gb-ts');
  var ta = form.elements.message, tsId = null, tsToken = '', waiting = false;
  var LOCK = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V7H4a1.5 1.5 0 0 0-1.5 1.5v5A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 12 7h-.5V4.5A3.5 3.5 0 0 0 8 1zm2 6H6V4.5a2 2 0 1 1 4 0V7z"/></svg>';

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fmt(iso) { try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch (e) { return ''; } }

  function render(entries) {
    list.textContent = '';
    if (!entries.length) { list.appendChild(el('p', 'gb-empty', 'No notes yet. Be the first.')); return; }
    entries.forEach(function (e) {
      var c = el('article', 'gb-card'), h = el('div', 'gb-head');
      h.appendChild(el('span', 'gb-name', e.name)); h.appendChild(el('time', 'gb-date', fmt(e.created_at)));
      c.appendChild(h);
      if (e.secret) { var l = el('p', 'gb-lock'); l.innerHTML = LOCK; l.appendChild(document.createTextNode('Private note')); c.appendChild(l); }
      else c.appendChild(el('p', 'gb-text', e.message));
      if (e.reply) { var r = el('div', 'gb-reply'); r.appendChild(el('b', null, 'Minsuk')); r.appendChild(document.createTextNode(e.reply)); c.appendChild(r); }
      list.appendChild(c);
    });
  }
  function load() {
    return fetch(API + '/api/entries').then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
      sec.hidden = false; var nav = document.querySelector('.gb-nav'); if (nav) nav.hidden = false;
      render(d.entries || []);
    });
  }

  function loadTurnstile() {
    if (!SITEKEY || window.__gbTs) return; window.__gbTs = true;
    window.gbTsReady = function () {
      tsId = turnstile.render(tsBox, { sitekey: SITEKEY, theme: 'light', size: 'flexible', callback: function (t) { tsToken = t; if (waiting) { waiting = false; submit(); } }, 'expired-callback': function () { tsToken = ''; } });
    };
    var s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=gbTsReady'; s.async = true; s.defer = true;
    document.head.appendChild(s);
  }
  form.addEventListener('focusin', loadTurnstile);
  ta.addEventListener('input', function () { count.textContent = ta.value.length + ' / 300'; });

  function say(text, cls) { msg.textContent = text; msg.className = 'gb-msg' + (cls ? ' ' + cls : ''); }
  form.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
  function submit() {
    var name = form.elements.name.value.trim(), message = ta.value.trim();
    if (!name || !message) { say('Please add your name and a message.', 'err'); return; }
    if (!SITEKEY) { say('The guestbook is not open yet.', 'err'); return; }
    if (!tsToken) { loadTurnstile(); waiting = true; say('One moment, checking you are human…'); return; }
    send.disabled = true; say('Sending…');
    fetch(API + '/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, message: message, secret: form.elements.secret.checked, token: tsToken }) })
      .then(function (r) { return r.json().then(function (d) { return [r.status, d]; }); })
      .then(function (x) {
        if (x[0] === 201) { form.reset(); count.textContent = '0 / 300'; say(x[1] && x[1].pending !== false ? 'Thanks. Your note will appear after review.' : 'Thanks!', 'ok'); }
        else say({ captcha: 'Human check failed. Please try again.', rate: 'Too many notes. Try again in a few minutes.', empty: 'Please add your name and a message.' }[x[1].error] || 'Something went wrong. Please try again.', 'err');
      })
      .catch(function () { say('Network error. Please try again.', 'err'); })
      .then(function () { send.disabled = false; tsToken = ''; if (window.turnstile && tsId !== null) turnstile.reset(tsId); });
  }

  load().catch(function () { /* API not live yet: keep the section hidden */ });
})();
