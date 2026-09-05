/* Studio 56 — shared front-end behaviour.
   Every block guards on the elements it needs, so this one file is safe to
   load on all pages. */
(function () {
  'use strict';

  /* ---------- real viewport height ----------
     100dvh alone wasn't enough: some in-app browsers (Telegram's included)
     report a dvh that doesn't match the area their own chrome actually
     covers, so the drawer's background fell short and the page behind it
     showed through in a strip at the bottom. visualViewport.height is the
     API built specifically to track the real visible area on screen —
     falling back to innerHeight where it's unavailable — recomputed on
     resize so it stays correct as any chrome shows or hides. */
  var setViewportHeight = function () {
    var h = (window.visualViewport && window.visualViewport.height) || window.innerHeight;
    document.documentElement.style.setProperty('--vh', h * 0.01 + 'px');
  };
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', setViewportHeight);

  /* ---------- menu overlay ---------- */
  var drawer = document.getElementById('drawer');
  var openBtn = document.getElementById('menu-open');
  var closeBtn = document.getElementById('menu-close');

  if (drawer && openBtn && closeBtn) {
    var setDrawer = function (open) {
      drawer.setAttribute('data-open', open ? 'true' : 'false');
      openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
      (open ? closeBtn : openBtn).focus();
    };

    openBtn.addEventListener('click', function () { setDrawer(true); });
    closeBtn.addEventListener('click', function () { setDrawer(false); });

    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setDrawer(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.getAttribute('data-open') === 'true') setDrawer(false);
    });

    // Open the menu straight from the URL: /#menu
    if (location.hash === '#menu') setDrawer(true);
    window.addEventListener('hashchange', function () {
      if (location.hash === '#menu') setDrawer(true);
    });
  }

  /* ---------- scroll-driven effects ----------
     One rAF-throttled scroll handler drives both effects. Scroll-driven
     rather than IntersectionObserver so the first paint is already correct
     instead of waiting for the reader to move. */
  var cards = [].slice.call(document.querySelectorAll('.card'));

  if (cards.length) {
    var frame = null;

    var update = function () {
      frame = null;
      var vh = window.innerHeight;

      // service cards: the one nearest the middle scales up
      {
        var mid = vh / 2, best = null, bestDist = Infinity;
        cards.forEach(function (c) {
          var r = c.getBoundingClientRect();
          if (r.bottom <= 0 || r.top >= vh) return;
          var d = Math.abs((r.top + r.bottom) / 2 - mid);
          if (d < bestDist) { bestDist = d; best = c; }
        });
        cards.forEach(function (c) { c.classList.toggle('is-active', c === best); });
      }

    };

    var schedule = function () {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.studio56Update = update;   // exposed for verification
    update();
  }

  /* ---------- booking form: submit stays inactive until every field is filled ----------
     Applied by script rather than hard-coded in the HTML, so if this file
     fails to load the form is still submittable rather than dead. */
  [].slice.call(document.querySelectorAll('form')).forEach(function (form) {
    var submit = form.querySelector('button[type="submit"]');
    var required = [].slice.call(form.querySelectorAll('[required]'));
    if (!submit || !required.length) return;

    var sync = function () {
      submit.disabled = !required.every(function (field) {
        return field.type === 'checkbox' ? field.checked : field.value.trim() !== '';
      });
    };
    required.forEach(function (field) {
      field.addEventListener('input', sync);
      field.addEventListener('change', sync);
    });
    sync();
  });

  /* ---------- accordion price toggle: first-session discount switch ----------
     Same on/off mechanic as the cart-driven toggle on precios.html, but display-
     only — treatment pages like endospheres.html don't have a cart, so this just
     rewrites the amount cells in place. #first-toggle is precios.html's cart
     toggle and cart.js already owns it there; excluded here so the two never
     both attach to the same button. */
  var uk = document.documentElement.lang === 'uk';
  var HINT_ON = uk
    ? 'Показано ціну першого сеансу. Натисніть, щоб побачити звичайну ціну.'
    : 'Mostrando el precio de primera sesión. Tócalo para ver el precio normal.';
  var HINT_OFF = uk
    ? 'Показано звичайну ціну. Натисніть, якщо це ваш перший сеанс.'
    : 'Mostrando el precio normal. Tócalo si es tu primera sesión.';

  [].slice.call(document.querySelectorAll('.tag-toggle:not(#first-toggle)')).forEach(function (toggle) {
    var hint = toggle.parentElement.querySelector('.tag-hint');
    var rows = [].slice.call(toggle.closest('.acc-body, .price-section').querySelectorAll('[data-price-first]'));
    if (!rows.length) return;

    var on = true;

    var render = function () {
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (hint) {
        hint.textContent = on ? HINT_ON : HINT_OFF;
      }
      rows.forEach(function (row) {
        var amount = row.querySelector('.amount');
        amount.textContent = '';
        if (on) {
          var was = document.createElement('s');
          was.className = 'was';
          was.textContent = row.dataset.price + ' €';
          var now = document.createElement('span');
          now.className = 'now';
          now.textContent = row.dataset.priceFirst + ' €';
          amount.appendChild(was);
          amount.appendChild(now);
        } else {
          amount.textContent = row.dataset.price + ' €';
        }
      });
    };

    toggle.addEventListener('click', function () { on = !on; render(); });
    render();
  });

  /* ---------- about carousel: each arrow reflects what's actually off-screen ----------
     Driven by IntersectionObserver on a sentinel at each end of the track, not by
     scrollLeft math on the 'scroll' event. iOS Safari coalesces or drops scroll
     events during momentum scrolling, which left arrows stuck invisible after one
     swipe; IntersectionObserver's whole job is "is this on screen," so it doesn't
     depend on the browser dispatching a particular event at a particular time. */
  var aboutCarousel = document.querySelector('.about-carousel');
  var aboutTrack = aboutCarousel && aboutCarousel.querySelector('.about-track');
  var aboutStart = aboutTrack && aboutTrack.querySelector('.about-sentinel-start');
  var aboutEnd = aboutTrack && aboutTrack.querySelector('.about-sentinel-end');

  if (aboutTrack && aboutStart && aboutEnd && window.IntersectionObserver) {
    var aboutObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var cls = entry.target === aboutStart ? 'at-start' : 'at-end';
        aboutCarousel.classList.toggle(cls, entry.isIntersecting);
      });
    }, { root: aboutTrack, threshold: 0.9 });

    aboutObserver.observe(aboutStart);
    aboutObserver.observe(aboutEnd);
  }

  /* ---------- bono regalo: live card preview + price ----------
     Prices follow the studio's existing 3 + 1 mechanic: 4 sessions cost 3,
     8 sessions cost 6. Endospheres figures match the printed price list. */
  var giftCard = document.getElementById('gift-card');

  if (giftCard) {
    var PRICES = uk ? {
      endospheres: { unit: 65, first: 52, label: 'Ендосфера', detail: 'Тіло, 60 хв за сеанс.' },
      laser:       { unit: 43, label: 'Лазерна епіляція', detail: 'Пахви + глибоке бікіні за сеанс.' }
    } : {
      endospheres: { unit: 65, first: 52, label: 'Endospheres', detail: 'Cuerpo, 60 min por sesión.' },
      laser:       { unit: 43, label: 'Depilación Láser', detail: 'Axilas + ingles completas por sesión.' }
    };

    /* сеанс / сеанси / сеансів — the Ukrainian card can show any of the three */
    var sessionWord = function (n) {
      if (!uk) return n === 1 ? '1 sesión' : n + ' sesiones';
      var m10 = n % 10, m100 = n % 100, w;
      if (m10 === 1 && m100 !== 11) w = 'сеанс';
      else if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) w = 'сеанси';
      else w = 'сеансів';
      return n + ' ' + w;
    };

    var G = uk ? {
      /* must match bono.js's own fallback — it is what the card will really show */
      occasion: 'Подарунок для вас',
      msg: 'Побудь трохи для себе.',
      single: 'Один сеанс.',
      firstOff: function (save) { return 'Ціна першого сеансу зі знижкою −20 % · економія ' + save + '.'; },
      pay: function (billed, n, per) { return 'Платите за ' + sessionWord(billed) + ', даруєте ' + n + ' · ' + per + ' за сеанс.'; },
      save: ' · економія ',
      hello: 'Вітаю! Хочу подарунковий сертифікат:',
      forWhom: '· Кому: ', fromWhom: '· Від: ',
      msgLine: '· Повідомлення: ',
      whenLine: '· Надіслати: ', destLine: '· Куди: ', asap: 'одразу',
      tbc: '(уточнимо)'
    } : {
      occasion: 'Un regalo para ti',
      msg: 'Tómate un rato para ti.',
      single: 'Una sesión suelta.',
      firstOff: function (save) { return 'Precio de primera sesión con el −20 % · ahorras ' + save + '.'; },
      pay: function (billed, n, per) { return 'Pagas ' + billed + ' sesiones, regalas ' + n + ' · ' + per + ' por sesión.'; },
      save: ' · ahorras ',
      hello: 'Hola! Quiero un bono regalo:',
      forWhom: '· Para: ', fromWhom: '· De: ',
      msgLine: '· Mensaje: ',
      whenLine: '· Enviar: ', destLine: '· A dónde: ', asap: 'cuanto antes',
      tbc: '(por confirmar)'
    };

    var state = { treatment: 'endospheres', sessions: '4' };

    var el = function (id) { return document.getElementById(id); };
    var DEFAULT_MSG = G.msg;

    var billedFor = function (n) { return n === 4 ? 3 : (n === 8 ? 6 : n); };   // 3 + 1

    /* datetime-local hands back 2026-09-05T14:30; the studio reads the order in
       WhatsApp, so it goes out as 05.09.2026, 14:30 */
    var fmtWhen = function (v) {
      var parts = v.split('T');
      if (parts.length !== 2) return v;
      var d = parts[0].split('-');
      return d[2] + '.' + d[1] + '.' + d[0] + ', ' + parts[1];
    };

    /* A single Endospheres session is somebody's first, so it is sold at the
       price list's −20 % first-session rate: the bono costs exactly what the
       recipient would have paid walking in on her own. Packs carry their own
       saving and never stack with that discount, and the discount is Endospheres
       only — laser has no such rate. */
    var priceFor = function () {
      var t = PRICES[state.treatment];
      var n = Number(state.sessions);
      if (n === 1 && t.first) return t.first;
      return t.unit * billedFor(n);
    };

    var fmtEur = function (n) {
      return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' €';
    };

    var render = function () {
      var t = PRICES[state.treatment];
      var n = Number(state.sessions);

      el('gc-treatment').textContent = t.label;
      el('gc-sessions').textContent = sessionWord(n);
      el('gc-occasion').textContent = G.occasion;
      el('gift-detail').textContent = t.detail;
      var billed = billedFor(n);
      var total = priceFor();
      var saving = t.unit * n - total;

      el('gift-price').textContent = fmtEur(total);

      /* a bono is a pack: never show its total without the per-session rate
         and the saving beside it */
      el('gift-saving').textContent = n === 1
        ? (saving > 0 ? G.firstOff(fmtEur(saving)) : G.single)
        : G.pay(billed, n, fmtEur(total / n));

      el('gift-bar-total').textContent = fmtEur(total);
      el('gift-bar-meta').textContent = sessionWord(n)
        + (saving > 0 ? G.save + fmtEur(saving) : '');

      var to = el('gift-to').value.trim();
      var from = el('gift-from').value.trim();
      var msg = el('gift-message').value.trim();
      el('gc-to').textContent = to || '—';
      el('gc-from').textContent = from || '—';
      el('gc-message').textContent = msg || DEFAULT_MSG;
      el('gift-count').textContent = el('gift-message').value.length;

      // hand the studio the whole order in the first WhatsApp message
      var lines = [
        G.hello,
        '· ' + t.label + ' — ' + sessionWord(n) + ' (' + priceFor() + ' €)',
        G.forWhom + (to || G.tbc),
        G.fromWhom + (from || G.tbc),
        G.msgLine + (msg || DEFAULT_MSG)
      ];

      /* delivery is the studio's job now, so the order has to carry when and where */
      var when = el('gift-when').value;
      var dest = el('gift-dest').value.trim();
      lines.push(G.whenLine + (when ? fmtWhen(when) : G.asap));
      if (dest) lines.push(G.destLine + dest);
      el('gift-buy').href = 'https://wa.me/34621070775?text=' + encodeURIComponent(lines.join('\n'));

      // same selection, rendered as the recipient will see it
      var q = new URLSearchParams({
        para: to, de: from, t: state.treatment, n: state.sessions,
        msg: msg || DEFAULT_MSG
      });
      el('gift-preview').href = 'bono.html?' + q.toString();

      giftCard.classList.add('is-changing');
      window.setTimeout(function () { giftCard.classList.remove('is-changing'); }, 180);
    };

    [].slice.call(document.querySelectorAll('.chips')).forEach(function (group) {
      var key = group.getAttribute('data-group');
      group.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        [].slice.call(group.querySelectorAll('.chip')).forEach(function (c) {
          c.classList.toggle('is-on', c === chip);
        });
        state[key] = chip.getAttribute('data-value');
        render();
      });
    });

    ['gift-to', 'gift-from', 'gift-message', 'gift-when', 'gift-dest'].forEach(function (id) {
      el(id).addEventListener('input', render);
    });

    el('gift-when').min = new Date().toISOString().slice(0, 16);

    render();
  }

  /* ---------- sticky booking CTA ---------- */
  var cta = document.getElementById('sticky-cta');
  var booking = document.getElementById('cita');
  if (cta && booking && window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      cta.hidden = entries[0].isIntersecting;
    }, { threshold: 0.12 }).observe(booking);
  }
})();
