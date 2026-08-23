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
  [].slice.call(document.querySelectorAll('.tag-toggle:not(#first-toggle)')).forEach(function (toggle) {
    var hint = toggle.parentElement.querySelector('.tag-hint');
    var rows = [].slice.call(toggle.closest('.acc-body, .price-section').querySelectorAll('[data-price-first]'));
    if (!rows.length) return;

    var on = true;

    var render = function () {
      toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (hint) {
        hint.textContent = on
          ? 'Mostrando el precio de primera sesión. Tócalo para ver el precio normal.'
          : 'Mostrando el precio normal. Tócalo si es tu primera sesión.';
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
    var PRICES = {
      endospheres: { unit: 65, label: 'Endospheres', detail: 'Cuerpo, 60 min por sesión.' },
      laser:       { unit: 43, label: 'Depilación láser', detail: 'Axilas + ingles completas por sesión.' }
    };

    var state = { treatment: 'endospheres', sessions: '4', occasion: 'Porque sí' };

    var el = function (id) { return document.getElementById(id); };
    var DEFAULT_MSG = 'Un rato para ti, que te lo has ganado.';

    var billedFor = function (n) { return n === 4 ? 3 : (n === 8 ? 6 : n); };   // 3 + 1

    var priceFor = function () {
      return PRICES[state.treatment].unit * billedFor(Number(state.sessions));
    };

    var fmtEur = function (n) {
      return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' €';
    };

    var render = function () {
      var t = PRICES[state.treatment];
      var n = Number(state.sessions);

      el('gc-treatment').textContent = t.label;
      el('gc-sessions').textContent = n === 1 ? '1 sesión' : n + ' sesiones';
      el('gc-occasion').textContent = state.occasion;
      el('gift-detail').textContent = t.detail;
      var billed = billedFor(n);
      var total = priceFor();
      var saving = t.unit * (n - billed);

      el('gift-price').textContent = fmtEur(total);

      /* a bono is a pack: never show its total without the per-session rate
         and the saving beside it */
      el('gift-saving').textContent = n === 1
        ? 'Una sesión suelta.'
        : 'Pagas ' + billed + ' sesiones, regalas ' + n + ' · ' + fmtEur(total / n) + ' por sesión.';

      el('gift-bar-total').textContent = fmtEur(total);
      el('gift-bar-meta').textContent = (n === 1 ? '1 sesión' : n + ' sesiones')
        + (saving > 0 ? ' · ahorras ' + fmtEur(saving) : '');

      var to = el('gift-to').value.trim();
      var from = el('gift-from').value.trim();
      var msg = el('gift-message').value.trim();
      el('gc-to').textContent = to || '—';
      el('gc-from').textContent = from || '—';
      el('gc-message').textContent = msg || DEFAULT_MSG;
      el('gift-count').textContent = el('gift-message').value.length;

      // hand the studio the whole order in the first WhatsApp message
      var lines = [
        'Hola! Quiero un bono regalo:',
        '· ' + t.label + ' — ' + (n === 1 ? '1 sesión' : n + ' sesiones') + ' (' + priceFor() + ' €)',
        '· Ocasión: ' + state.occasion,
        '· Para: ' + (to || '(por confirmar)'),
        '· De: ' + (from || '(por confirmar)'),
        '· Mensaje: ' + (msg || DEFAULT_MSG)
      ];
      el('gift-buy').href = 'https://wa.me/34621070775?text=' + encodeURIComponent(lines.join('\n'));

      // same selection, rendered as the recipient will see it
      var q = new URLSearchParams({
        para: to, de: from, t: state.treatment, n: state.sessions,
        oc: state.occasion, msg: msg || DEFAULT_MSG
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

    ['gift-to', 'gift-from', 'gift-message'].forEach(function (id) {
      el(id).addEventListener('input', render);
    });

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
