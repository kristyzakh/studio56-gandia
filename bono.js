/* Studio 56 — recipient gift page.
   Everything comes from the URL, so a bono is just a link: no accounts,
   no database. Example:
   bono.html?para=Elena&de=Anna&t=endospheres&n=4&oc=Feliz%20cumpleaños&msg=...&cod=S56-1042 */
(function () {
  'use strict';

  var TREATMENTS = {
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

  setText('bono-occasion', get('oc', 'Un regalo para ti'));
  setText('bono-to', to || 'Para ti');
  setText('bono-from', from || 'Studio 56');
  setText('bono-from-2', from || 'Studio 56');
  setText('bono-treatment', treatment.name);
  setText('bono-sessions', sessions === 1 ? '1 sesión' : sessions + ' sesiones');
  setText('bono-what', treatment.what);
  setText('bono-message', get('msg', 'Un rato para ti, que te lo has ganado.'));
  if (code) setText('bono-code', code);

  document.title = to ? to + ', tienes un regalo · Studio 56' : 'Tienes un regalo · Studio 56';

  // hand the studio everything it needs in the first message
  var lines = ['Hola! Tengo un bono regalo de Studio 56 y quiero pedir cita.'];
  if (code) lines.push('Código: ' + code);
  lines.push(treatment.name + ' — ' + (sessions === 1 ? '1 sesión' : sessions + ' sesiones'));
  if (to) lines.push('A nombre de: ' + to);
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
