/* Studio 56 — recipient gift page.
   Everything comes from the URL, so a bono is just a link: no accounts,
   no database. Example:
   bono.html?para=Elena&de=Anna&t=endospheres&n=4&oc=Feliz%20cumpleaños&msg=...&cod=S56-1042 */
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
    msg: 'Час для себе — ви його заслужили.',
    titleWith: function (name) { return name + ', для вас подарунок · Studio 56'; },
    titlePlain: 'Для вас подарунок · Studio 56',
    hello: 'Вітаю! У мене подарунковий сертифікат Studio 56, хочу записатися.',
    code: 'Код: ',
    onName: 'На імʼя: '
  } : {
    occasion: 'Un regalo para ti',
    to: 'Para ti',
    msg: 'Un rato para ti, que te lo has ganado.',
    titleWith: function (name) { return name + ', tienes un regalo · Studio 56'; },
    titlePlain: 'Tienes un regalo · Studio 56',
    hello: 'Hola! Tengo un bono regalo de Studio 56 y quiero pedir cita.',
    code: 'Código: ',
    onName: 'A nombre de: '
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

  if (openBtn && gift) {
    openBtn.addEventListener('click', function () {
      openSection.classList.add('is-open');
      gift.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
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
