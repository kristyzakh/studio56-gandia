/* Studio 56 — recipient gift page.
   Everything comes from the URL, so a bono is just a link: no accounts,
   no database. Example:
   bono.html?para=Elena&de=Anna&t=endospheres&n=4&oc=Feliz%20cumpleaños&msg=...&cod=S56-1042&hasta=2027-09-05 */
(function () {
  'use strict';

  /* Same convention as cart.js and app.js: "uk" on the /ua/ pages, "es" elsewhere. */
  var UK = document.documentElement.lang === 'uk';

  var TREATMENTS = UK ? {
    endospheres: {
      name: 'Ендосфера',
      what: 'Компресійна мікровібрація: активує кровообіг, розганяє застій рідини й повертає шкірі тонус. Без голок, без відновлення, без болю.'
    },
    laser: {
      name: 'Лазерна епіляція',
      what: 'Діодний лазер 808 нм із розширеним охолодженням. Поступово прибирає волосся й лишається комфортним навіть у найчутливіших зонах.'
    },
    electro: {
      name: 'Електроепіляція',
      what: 'Єдиний метод остаточного видалення волосся, волосок за волоском. Працює з волоссям будь-якого кольору, зокрема світлим і білим.'
    },
    cera: {
      name: 'Віск і шугаринг',
      what: 'Видалення волосся з коренем воском або цукровою пастою. Гладенька шкіра того ж дня, зокрема на чутливій шкірі.'
    }
  } : {
    endospheres: {
      name: 'Endospheres',
      what: 'Microvibración compresiva: activa la circulación, moviliza la retención de líquidos y mejora el tono de la piel. Sin agujas, sin bajas, sin dolor.'
    },
    laser: {
      name: 'Depilación Láser',
      what: 'Láser de diodo de 808 nm con refrigeración avanzada. Elimina el vello de forma progresiva y resulta cómodo incluso en las zonas más sensibles.'
    },
    electro: {
      name: 'Electrodepilación',
      what: 'El único método de eliminación definitiva del vello, pelo a pelo. Funciona con cualquier color de vello, también rubio o blanco.'
    },
    cera: {
      name: 'Cera y Sugaring',
      what: 'Depilación de raíz con cera tibia o pasta de azúcar. Piel lisa el mismo día, también en pieles sensibles.'
    }
  };

  var T = UK ? {
    occasion: 'Подарунок для вас',
    to: 'Для вас',
    msg: 'Побудь трохи для себе.',
    titleWith: function (name) { return name + ', для вас подарунок · Studio 56'; },
    titlePlain: 'Для вас подарунок · Studio 56',
    hello: 'Вітаю! У мене подарунковий сертифікат Studio 56, хочу записатися.',
    code: 'Код: ',
    onName: 'На імʼя: ',
    validUntil: 'Дійсний до ',
    locale: 'uk-UA'
  } : {
    occasion: 'Un regalo para ti',
    to: 'Para ti',
    msg: 'Tómate un rato para ti.',
    titleWith: function (name) { return name + ', tienes un regalo · Studio 56'; },
    titlePlain: 'Tienes un regalo · Studio 56',
    hello: 'Hola! Tengo un bono regalo de Studio 56 y quiero pedir cita.',
    code: 'Código: ',
    onName: 'A nombre de: ',
    validUntil: 'Válido hasta el ',
    locale: 'es-ES'
  };

  var sessionWord = function (n) {
    if (!UK) return n === 1 ? '1 sesión' : n + ' sesiones';
    var m10 = n % 10, m100 = n % 100, w;
    if (m10 === 1 && m100 !== 11) w = 'сеанс';
    else if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) w = 'сеанси';
    else w = 'сеансів';
    return n + ' ' + w;
  };

  var params = new URLSearchParams(location.search);
  var get = function (k, fallback) {
    var v = (params.get(k) || '').trim();
    return v || fallback;
  };
  var setText = function (id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  var treatment = TREATMENTS[get('t', 'endospheres')] || TREATMENTS.endospheres;
  var sessions = parseInt(get('n', '4'), 10) || 1;
  var to = get('para', '');
  var from = get('de', '');
  var code = get('cod', '');

  setText('bono-occasion', get('oc', T.occasion));
  setText('bono-to', to || T.to);
  setText('bono-from', from || 'Studio 56');
  setText('bono-from-2', from || 'Studio 56');
  setText('bono-treatment', treatment.name);
  setText('bono-sessions', sessionWord(sessions));
  setText('bono-what', treatment.what);
  setText('bono-message', get('msg', T.msg));
  if (code) setText('bono-code', code);

  /* The expiry only shows when the link actually carries one: an invented
     date on somebody's gift would be worse than no date at all. */
  var until = get('hasta', '');
  if (until) {
    var ymd = until.split('-');
    var day = new Date(+ymd[0], +ymd[1] - 1, +ymd[2]);
    if (ymd.length === 3 && !isNaN(day.getTime())) {
      var validEl = document.getElementById('bono-valid');
      var pretty = day.toLocaleDateString(T.locale, {
        day: 'numeric', month: 'long', year: 'numeric'
      }).replace(/\s*р\.$/, '');   // uk-UA appends "р."; too clerical for a gift
      setText('bono-valid', T.validUntil + pretty);
      if (validEl) validEl.hidden = false;
    }
  }

  document.title = to ? T.titleWith(to) : T.titlePlain;

  // hand the studio everything it needs in the first message
  var lines = [T.hello];
  if (code) lines.push(T.code + code);
  lines.push(treatment.name + ' — ' + sessionWord(sessions));
  if (to) lines.push(T.onName + to);
  var cta = document.getElementById('bono-cta');
  if (cta) cta.href = 'https://wa.me/34621070775?text=' + encodeURIComponent(lines.join('\n'));

  /* ---- opening ---- */
  var openSection = document.getElementById('bono-open');
  var openBtn = document.getElementById('bono-open-btn');
  var gift = document.getElementById('bono-gift');

  /* Confetti, drawn by hand rather than pulled from a CDN: it is one burst on
     one button, and a gift page should not depend on somebody else's server
     being up. The canvas is created on the click and removed when the last
     piece falls, so nobody who never opens the bono pays for it. */
  var CONFETTI = ['#FCF3EE', '#BA9CA4', '#F5EBE4', '#D8C0C6'];

  var burstFrom = function (el) {
    var canvas = document.createElement('canvas');
    canvas.className = 'bono-confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w, h;
    var size = function () {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    /* from the button the finger just pressed, so the burst belongs to the tap */
    var r = el.getBoundingClientRect();
    var ox = r.left + r.width / 2;
    var oy = r.top + r.height / 2;

    var n = w < 520 ? 90 : 130;
    var bits = [];
    for (var i = 0; i < n; i++) {
      /* a cone that opens upward: straight down would read as falling, not opening */
      var a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
      var v = 620 + Math.random() * 820;
      bits.push({
        x: ox, y: oy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        w: 5 + Math.random() * 5,
        h: 8 + Math.random() * 7,
        spin: (Math.random() - 0.5) * 14,
        phase: Math.random() * Math.PI * 2,
        color: CONFETTI[(Math.random() * CONFETTI.length) | 0]
      });
    }

    var GRAVITY = 1250;
    var LIFE = 2.6;
    var t0 = null;
    window.addEventListener('resize', size);

    var frame = function (now) {
      if (t0 === null) t0 = now;
      var elapsed = (now - t0) / 1000;
      var dt = Math.min(0.032, elapsed - (frame.last || 0));
      frame.last = elapsed;

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = elapsed > LIFE - 0.6 ? Math.max(0, (LIFE - elapsed) / 0.6) : 1;

      bits.forEach(function (b) {
        b.vy += GRAVITY * dt;
        var drag = Math.exp(-0.85 * dt);
        b.vx *= drag; b.vy *= drag;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.phase += b.spin * dt;

        /* squashing the width by the spin phase reads as paper turning over */
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.phase * 0.35);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w * Math.abs(Math.cos(b.phase)), b.h);
        ctx.restore();
      });

      if (elapsed < LIFE) {
        window.requestAnimationFrame(frame);
      } else {
        window.removeEventListener('resize', size);
        canvas.remove();
      }
    };
    window.requestAnimationFrame(frame);
  };

  if (openBtn && gift) {
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    openBtn.addEventListener('click', function () {
      openSection.classList.add('is-open');

      if (calm) {
        gift.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      burstFrom(openBtn);

      /* Curtain up, cut, curtain away. The confetti canvas sits above the
         veil, so the paper keeps falling across the whole transition and
         ties the two halves of the page together. */
      var veil = document.createElement('div');
      veil.className = 'bono-veil';
      veil.setAttribute('aria-hidden', 'true');
      document.body.appendChild(veil);

      window.setTimeout(function () { veil.classList.add('is-up'); }, 560);

      window.setTimeout(function () {
        gift.scrollIntoView({ block: 'start' });   // instant: nobody sees it
        veil.classList.remove('is-up');
        veil.classList.add('is-gone');
        if (window.studio56BonoUpdate) window.studio56BonoUpdate();
      }, 1260);

      window.setTimeout(function () { veil.remove(); }, 1950);
    }, { once: true });
  }

  /* ---- reveal panels on scroll ----
     Scroll-driven rather than IntersectionObserver so the first panel is
     already correct on load instead of waiting for movement. */
  var panels = [].slice.call(document.querySelectorAll('.reveal'));
  if (panels.length) {
    var frame = null;
    var update = function () {
      frame = null;
      var vh = window.innerHeight;
      panels.forEach(function (p) {
        var r = p.getBoundingClientRect();
        if (r.top < vh * 0.88 && r.bottom > 0) p.classList.add('is-in');
      });
    };
    var schedule = function () {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.studio56BonoUpdate = update;   // exposed for verification
    update();
  }
})();
