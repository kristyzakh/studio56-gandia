/* Studio 56 — booking straight into Altegio, without leaving the site.
   -------------------------------------------------------------------
   Backed by Altegio's public booking API (book_services / book_staff /
   book_dates / book_times / book_check / book_record). Those endpoints need
   only a partner token and no client login, which is the whole point: the
   reason so few people book online today is almost certainly the number of
   steps between wanting an appointment and having one.

   The token must never reach the browser, so every call goes to our own
   proxy, which adds the Authorization header and refuses any location but
   ours. window.S56_BOOKING = { base: '<proxy url>' } switches this on.

   Until that exists, the widget runs against fixtures — but ONLY on
   localhost or with ?mock=1. On the live site with no proxy configured it
   does not render at all and the WhatsApp fallback stays. A form that
   accepts a booking and quietly does nothing with it is worse than no form. */
(function () {
  'use strict';

  var root = document.getElementById('booking-widget');
  if (!root) return;

  var UK = document.documentElement.lang === 'uk';

  var T = UK ? {
    steps: ['Процедура', 'Майстриня', 'Дата', 'Час', 'Ваші дані'],
    anyStaff: 'Будь-яка вільна',
    anyStaffNote: 'Підберемо, хто вільний у цей час',
    pickService: 'Оберіть процедуру',
    pickDate: 'Оберіть день',
    pickTime: 'Оберіть час',
    noTimes: 'На цей день вільних вікон немає. Спробуйте інший.',
    noDates: 'Найближчими днями вільних вікон немає — напишіть нам у WhatsApp, підберемо час.',
    more: 'Показати ще два тижні',
    change: 'Назад',
    otherCategories: '← Інші процедури',
    optionsWord: function (n) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return ' послуга';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return ' послуги';
      return ' послуг';
    },
    name: 'Як вас звати',
    namePh: 'Імʼя та прізвище',
    phone: 'Телефон',
    email: 'Пошта',
    optional: '(необовʼязково)',
    comment: 'Щось, що нам варто знати',
    commentPh: 'Алергії, поточні процедури…',
    consent: 'Погоджуюся з <a href="privacidad.html">політикою конфіденційності</a> і на те, щоб Studio 56 звʼязалася зі мною.',
    submit: 'Записатися',
    sending: 'Записуємо…',
    from: 'від ',
    min: ' хв',
    okTitle: 'Готово, ви записані',
    okLead: 'Чекаємо на вас у Studio 56. Підтвердження надіслали, а якщо плани зміняться — просто напишіть нам.',
    okWhen: 'Коли',
    okWhat: 'Що',
    okWho: 'Майстриня',
    okNumber: 'Номер запису',
    again: 'Записатися ще раз',
    errBusy: 'Це вікно щойно зайняли. Оберіть, будь ласка, інший час.',
    errStaff: 'На цей час немає вільної майстрині. Спробуйте інший час.',
    errParams: 'Щось не так із даними запису. Перевірте, будь ласка, поля.',
    errEmail: 'Перевірте адресу пошти — вона потрібна для запису.',
    errPhone: 'Перевірте номер телефону.',
    errNet: 'Не вдалося звʼязатися зі студією. Спробуйте ще раз або напишіть у WhatsApp.',
    mock: 'Демонстраційний режим: показані вигадані вікна, запис не створюється.',
    days: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    months: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
             'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
  } : {
    steps: ['Tratamiento', 'Profesional', 'Día', 'Hora', 'Tus datos'],
    anyStaff: 'La que esté libre',
    anyStaffNote: 'Asignamos a quien esté disponible a esa hora',
    pickService: 'Elige el tratamiento',
    pickDate: 'Elige el día',
    pickTime: 'Elige la hora',
    noTimes: 'Ese día no queda hueco. Prueba con otro.',
    noDates: 'No quedan huecos en estos días — escríbenos por WhatsApp y buscamos hora.',
    more: 'Ver dos semanas más',
    change: 'Atrás',
    otherCategories: '← Otros tratamientos',
    optionsWord: function (n) { return n === 1 ? ' servicio' : ' servicios'; },
    name: 'Cómo te llamas',
    namePh: 'Nombre y apellidos',
    phone: 'Teléfono',
    email: 'Email',
    optional: '(opcional)',
    comment: 'Algo que debamos saber',
    commentPh: 'Alergias, tratamientos en curso…',
    consent: 'Acepto la <a href="privacidad.html">política de privacidad</a> y que Studio 56 se ponga en contacto conmigo.',
    submit: 'Reservar',
    sending: 'Reservando…',
    from: 'desde ',
    min: ' min',
    okTitle: 'Listo, tienes tu cita',
    okLead: 'Te esperamos en Studio 56. Te hemos enviado la confirmación, y si te cambian los planes solo tienes que escribirnos.',
    okWhen: 'Cuándo',
    okWhat: 'Qué',
    okWho: 'Profesional',
    okNumber: 'Nº de reserva',
    again: 'Pedir otra cita',
    errBusy: 'Acaban de ocupar ese hueco. Elige otra hora, por favor.',
    errStaff: 'No hay nadie libre a esa hora. Prueba con otra.',
    errParams: 'Algo no cuadra en la reserva. Revisa los campos, por favor.',
    errEmail: 'Revisa el email — hace falta para reservar.',
    errPhone: 'Revisa el número de teléfono.',
    errNet: 'No hemos podido conectar con el estudio. Inténtalo otra vez o escríbenos por WhatsApp.',
    mock: 'Modo demostración: los huecos son inventados y no se crea ninguna reserva.',
    days: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  };

  /* ---------- transport ---------- */

  /* The Cloudflare Worker that holds the partner token. Not a secret — it is
     just an address — so it lives here in plain sight. Empty until deployed,
     and while it is empty the widget stays off the live site. */
  var PROXY = 'https://studio56-booking.kristyzakharchenko.workers.dev';

  var cfg = window.S56_BOOKING || {};
  if (!cfg.base && PROXY) cfg.base = PROXY;
  var local = /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.)/.test(location.hostname);
  var MOCK = !cfg.base && (local || /[?&]mock=1/.test(location.search));
  if (!cfg.base && !MOCK) return;          // never pretend to take a booking

  var fallback = document.getElementById('booking-fallback');
  if (fallback) fallback.hidden = true;

  var track = function (name, payload) {
    if (window.s56Track) window.s56Track(name, payload || {});
  };

  var live = function (path, opts) {
    opts = opts || {};
    return fetch(cfg.base.replace(/\/$/, '') + path, {
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/vnd.api.v2+json', 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.json().then(function (j) { return { ok: r.ok, j: j }; });
    }).then(function (res) {
      if (!res.j || res.j.success === false) {
        var meta = (res.j && res.j.meta) || {};
        var err = new Error('altegio');
        err.code = meta.code || 0;
        err.status = res.status;
        /* Altegio reports field problems in meta.errors and sends no numeric
           code with them. Reading only the code turned every one of those into
           "could not reach the studio" — which sent us looking at the network
           while the API was answering perfectly clearly. */
        err.fields = meta.errors || null;
        err.detail = meta.message || '';
        throw err;
      }
      return res.j.data;
    });
  };

  /* Fixtures shaped exactly like the API's own payloads, so switching to the
     proxy is a change of transport and nothing else. */
  var FIX = {
    services: UK ? [
      { id: 1, title: 'Ендосфера · Обличчя', price_min: 40, seance_length: 2400 },
      { id: 2, title: 'Ендосфера · Тіло, 60 хв', price_min: 65, seance_length: 3600 },
      { id: 3, title: 'Ендосфера · Тіло, 90 хв', price_min: 95, seance_length: 5400 },
      { id: 4, title: 'Лазерна епіляція', price_min: 10, seance_length: 1800 },
      { id: 5, title: 'Електроепіляція · безкоштовна консультація', price_min: 0, seance_length: 1800 },
      { id: 6, title: 'Віск і шугаринг', price_min: 8, seance_length: 1800 }
    ] : [
      { id: 1, title: 'Endospheres · Rostro', price_min: 40, seance_length: 2400 },
      { id: 2, title: 'Endospheres · Cuerpo, 60 min', price_min: 65, seance_length: 3600 },
      { id: 3, title: 'Endospheres · Cuerpo, 90 min', price_min: 95, seance_length: 5400 },
      { id: 4, title: 'Depilación Láser', price_min: 10, seance_length: 1800 },
      { id: 5, title: 'Electrodepilación · consulta gratuita', price_min: 0, seance_length: 1800 },
      { id: 6, title: 'Cera y Sugaring', price_min: 8, seance_length: 1800 }
    ],
    staff: [
      { id: 11, name: 'Anna', specialization: UK ? 'Ендосфера, лазер' : 'Endospheres, láser' },
      { id: 12, name: 'Alina', specialization: UK ? 'Епіляція, депіляція' : 'Depilación' }
    ]
  };

  var ymd = function (d) {
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  };
  /* deterministic per date, so a mocked calendar looks like a real one:
     closed Sundays, thin Saturdays, the odd fully-booked day */
  var seeded = function (s) {
    var h = 0, i;
    for (i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
    return h;
  };
  var mockTimes = function (date) {
    var d = new Date(date + 'T00:00:00'), h = seeded(date), out = [], t;
    if (d.getDay() === 0) return [];
    if (h % 11 === 0) return [];
    for (t = 10 * 60; t <= (d.getDay() === 6 ? 14 * 60 : 19 * 60); t += 30) {
      if ((h + t) % 3 === 0) continue;
      out.push({ time: ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2),
                 datetime: date + 'T' + ('0' + Math.floor(t / 60)).slice(-2) + ':' + ('0' + (t % 60)).slice(-2) + ':00' });
    }
    return out;
  };

  var api = {
    services: function () {
      /* The real endpoint answers with { services, category }, not a bare list.
         68 services in 5 categories, so the picker is two shallow screens
         rather than one list nobody would scroll. */
      if (MOCK) return Promise.resolve({ services: FIX.services, categories: [] });
      return live('/book_services').then(function (d) {
        return { services: (d && d.services) || [], categories: (d && d.category) || [] };
      });
    },
    staff: function () {
      return MOCK ? Promise.resolve(FIX.staff) : live('/book_staff');
    },
    dates: function (from, to, serviceId, staffId) {
      if (MOCK) {
        var out = [], d = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00');
        for (; d <= end; d.setDate(d.getDate() + 1)) if (mockTimes(ymd(d)).length) out.push(ymd(d));
        return Promise.resolve({ booking_dates: out });
      }
      return live('/book_dates?date_from=' + from + '&date_to=' + to +
                  '&service_ids[]=' + serviceId + '&staff_id=' + (staffId || 0));
    },
    times: function (staffId, date, serviceId) {
      if (MOCK) return Promise.resolve(mockTimes(date));
      return live('/book_times/' + (staffId || 0) + '/' + date + '?service_ids[]=' + serviceId);
    },
    record: function (payload) {
      if (MOCK) return Promise.resolve([{ id: 0, record_id: 'DEMO-' + Date.now().toString(36).toUpperCase() }]);
      return live('/book_record', { method: 'POST', body: payload });
    }
  };

  /* ---------- state ---------- */

  var state = { category: null, service: null, staff: null, date: null, time: null, weeks: 2 };
  var cache = { services: [], categories: [], staff: [], dates: [], times: [] };

  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  /* Options drop in one after another rather than all at once. Capped at the
     ninth item: at 55 ms a step, the 33 laser zones would otherwise take the
     better part of two seconds to finish arriving. */
  /* Altegio holds this category as "Depilación láser" while the next one along
     is "Depilación Láser Hombre" — the source is inconsistent with itself, and
     the category is chain-level, so fixing it there would reach further than
     this site. Normalised on the way out instead. */
  var pretty = function (s) {
    return String(s || '').replace(/\bl([áa])ser\b/g, function (m, a) { return 'L' + a + 'ser'; });
  };

  var cascade = function (node, i) {
    node.style.animationDelay = (Math.min(i, 8) * 55) + 'ms';
    return node;
  };

  var money = function (lo, hi) {
    if (!lo && !hi) return '';
    if (hi && hi !== lo) return lo + '–' + hi + ' €';
    return lo + ' €';
  };
  var human = function (date) {
    var d = new Date(date + 'T00:00:00');
    return d.getDate() + ' ' + T.months[d.getMonth()];
  };

  /* ---------- steps ---------- */

  var mount = el('div', 'bk');
  root.appendChild(mount);
  if (MOCK) {
    var note = el('p', 'bk-mock', T.mock);
    root.insertBefore(note, mount);
  }

  /* label on top, answer underneath, exactly like every other field on the
     site. The number stays, quietly, because progress is worth showing. */
  var step = function (n, label, value, onChange, body) {
    /* a div, not a section: the site gives every <section> 52 px of vertical
       padding, and a step is a field, not a chapter of the page */
    var s = el('div', 'bk-step' + (onChange ? ' is-done' : ''));
    var head = el('div', 'bk-step-head');
    head.appendChild(el('span', 'bk-step-n', String(n)));
    head.appendChild(el('span', 'bk-step-t', label));
    if (onChange) {
      var btn = el('button', 'bk-change', T.change);
      btn.type = 'button';
      btn.addEventListener('click', onChange);
      head.appendChild(btn);
    }
    s.appendChild(head);
    if (value) s.appendChild(el('p', 'bk-step-v', value));
    if (body) s.appendChild(body);
    return s;
  };

  var render = function () {
    mount.innerHTML = '';
    var n = 0;

    /* 1 · service */
    n++;
    if (!state.service) {
      var list = el('div', 'bk-list');

      if (cache.categories.length && !state.category) {
        cache.categories.forEach(function (c) {
          var count = cache.services.filter(function (s) { return s.category_id === c.id; }).length;
          if (!count) return;
          var b = el('button', 'bk-opt');
          b.type = 'button';
          b.innerHTML = '<span class="bk-opt-t">' + pretty(c.title) + '</span>' +
                        '<span class="bk-opt-m">' + count + T.optionsWord(count) + '</span>';
          b.addEventListener('click', function () {
            state.category = c;
            track('booking_category', { category: c.title });
            render();
          });
          list.appendChild(cascade(b, list.children.length));
        });
        mount.appendChild(step(n, T.steps[0], null, null, list));
        return;
      }

      var pool = state.category
        ? cache.services.filter(function (s) { return s.category_id === state.category.id; })
        : cache.services;

      pool.forEach(function (sv) {
        var b = el('button', 'bk-opt');
        b.type = 'button';
        b.innerHTML = '<span class="bk-opt-t">' + pretty(sv.title) + '</span>' +
                      '<span class="bk-opt-m">' + money(sv.price_min, sv.price_max) +
                      (sv.seance_length ? ' · ' + Math.round(sv.seance_length / 60) + T.min : '') + '</span>';
        b.addEventListener('click', function () {
          state.service = sv; state.date = null; state.time = null;
          track('booking_service', { service: sv.title });
          loadDates();
        });
        list.appendChild(cascade(b, list.children.length));
      });

      mount.appendChild(step(n, T.steps[0], state.category ? pretty(state.category.title) : null, state.category ? function () { state.category = null; render(); } : null, list));
      return;
    }
    mount.appendChild(step(n, T.steps[0], pretty(state.service.title), function () {
      state.service = null; state.category = null;
      state.staff = null; state.date = null; state.time = null; render();
    }));

    /* 2 · staff */
    n++;
    if (!state.staff) {
      var slist = el('div', 'bk-list');
      var any = el('button', 'bk-opt');
      any.type = 'button';
      any.innerHTML = '<span class="bk-opt-t">' + T.anyStaff + '</span><span class="bk-opt-m">' + T.anyStaffNote + '</span>';
      any.addEventListener('click', function () {
        state.staff = { id: 0, name: T.anyStaff }; state.date = null; state.time = null;
        track('booking_staff', { staff: 'any' });   // a step is a step: drop-off here counts too
        loadDates();
      });
      slist.appendChild(cascade(any, 0));
      cache.staff.forEach(function (st) {
        var b = el('button', 'bk-opt');
        b.type = 'button';
        b.innerHTML = '<span class="bk-opt-t">' + st.name + '</span><span class="bk-opt-m">' + (st.specialization || '') + '</span>';
        b.addEventListener('click', function () {
          state.staff = st; state.date = null; state.time = null;
          track('booking_staff', { staff: st.name });
          loadDates();
        });
        slist.appendChild(cascade(b, slist.children.length));
      });
      mount.appendChild(step(n, T.steps[1], null, null, slist));
      return;
    }
    mount.appendChild(step(n, T.steps[1], state.staff.name, function () {
      state.staff = null; state.date = null; state.time = null; render();
    }));

    /* 3 · date */
    n++;
    if (!state.date) {
      var wrap = el('div');
      if (!cache.dates.length) {
        wrap.appendChild(el('p', 'bk-empty', T.noDates));
      } else {
        var strip = el('div', 'bk-days');
        var d = new Date(), end = new Date();
        end.setDate(end.getDate() + state.weeks * 7);
        for (; d <= end; d.setDate(d.getDate() + 1)) {
          var key = ymd(d), free = cache.dates.indexOf(key) !== -1;
          var b = el('button', 'bk-day' + (free ? '' : ' is-off'));
          b.type = 'button';
          b.disabled = !free;
          b.innerHTML = '<span class="bk-day-w">' + T.days[d.getDay()] + '</span>' +
                        '<span class="bk-day-n">' + d.getDate() + '</span>';
          if (free) b.addEventListener('click', (function (k) {
            return function () { state.date = k; state.time = null; track('booking_date', { date: k }); loadTimes(); };
          })(key));
          strip.appendChild(b);
        }
        wrap.appendChild(strip);
        if (state.weeks < 8) {
          var more = el('button', 'bk-more', T.more);
          more.type = 'button';
          more.addEventListener('click', function () { state.weeks += 2; loadDates(); });
          wrap.appendChild(more);
        }
      }
      mount.appendChild(step(n, T.steps[2], null, null, wrap));
      return;
    }
    mount.appendChild(step(n, T.steps[2], human(state.date), function () {
      state.date = null; state.time = null; render();
    }));

    /* 4 · time */
    n++;
    if (!state.time) {
      var box = el('div');
      if (!cache.times.length) box.appendChild(el('p', 'bk-empty', T.noTimes));
      else {
        var grid = el('div', 'bk-times');
        cache.times.forEach(function (t) {
          var b = el('button', 'bk-time', t.time);
          b.type = 'button';
          b.addEventListener('click', function () {
            state.time = t; track('booking_time', { datetime: t.datetime }); render();
          });
          grid.appendChild(cascade(b, grid.children.length));
        });
        box.appendChild(grid);
      }
      mount.appendChild(step(n, T.steps[3], null, null, box));
      return;
    }
    mount.appendChild(step(n, T.steps[3], state.time.time, function () { state.time = null; render(); }));

    /* 5 · details */
    n++;
    mount.appendChild(step(n, T.steps[4], null, null, form()));
  };

  var form = function () {
    var f = el('form', 'bk-form');
    f.noValidate = true;
    f.innerHTML =
      '<div class="field"><label for="bk-name">' + T.name + '</label>' +
      '<input type="text" id="bk-name" autocomplete="name" placeholder="' + T.namePh + '" required></div>' +
      '<div class="field"><label for="bk-phone">' + T.phone + '</label><div class="phone-row">' +
      '<select id="bk-prefix" class="phone-prefix" aria-label="' + T.phone + '">' +
      '<option value="+34" selected>ES +34</option><option value="+380">UA +380</option>' +
      '<option value="+44">UK +44</option><option value="+49">DE +49</option>' +
      '<option value="+33">FR +33</option><option value="+40">RO +40</option>' +
      '<option value="+212">MA +212</option></select>' +
      '<input type="tel" id="bk-phone" inputmode="tel" autocomplete="tel-national" placeholder="600 000 000" required></div></div>' +
      '<div class="field"><label for="bk-email">' + T.email + '</label>' +
      '<input type="email" id="bk-email" autocomplete="email" required></div>' +
      '<div class="field"><label for="bk-comment">' + T.comment + ' <span class="optional">' + T.optional + '</span></label>' +
      '<textarea id="bk-comment" rows="2" placeholder="' + T.commentPh + '"></textarea></div>' +
      '<label class="consent"><input type="checkbox" id="bk-consent" required><span>' + T.consent + '</span></label>' +
      '<p class="bk-error" id="bk-error" hidden></p>' +
      '<button type="submit" class="btn btn-primary btn-block" id="bk-submit" disabled>' + T.submit + '</button>';

    var submit = f.querySelector('#bk-submit');
    /* Altegio's own booking settings make email mandatory: without it the API
       answers 422 "The required parameter email was not passed" and nothing is
       created. So the form asks for it rather than letting somebody fill in
       five steps and be turned away at the last one. */
    var required = [f.querySelector('#bk-name'), f.querySelector('#bk-phone'),
                    f.querySelector('#bk-email'), f.querySelector('#bk-consent')];
    var sync = function () {
      submit.disabled = !required.every(function (x) {
        return x.type === 'checkbox' ? x.checked : x.value.trim() !== '';
      });
    };
    required.forEach(function (x) {
      x.addEventListener('input', sync); x.addEventListener('change', sync);
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      submit.disabled = true;
      submit.textContent = T.sending;
      f.querySelector('#bk-error').hidden = true;

      var payload = {
        phone: f.querySelector('#bk-prefix').value + f.querySelector('#bk-phone').value.replace(/\s+/g, ''),
        fullname: f.querySelector('#bk-name').value.trim(),
        email: f.querySelector('#bk-email').value.trim(),
        comment: f.querySelector('#bk-comment').value.trim() || undefined,
        appointments: [{
          id: 1,
          services: [state.service.id],
          staff_id: state.staff.id || 0,
          datetime: state.time.datetime
        }]
      };

      track('booking_submit', { service: state.service.title, datetime: state.time.datetime });

      api.record(payload).then(function (data) {
        var rec = (data && data[0]) || {};
        track('booking_success', { record: rec.record_id });
        done(rec);
      })['catch'](function (err) {
        track('booking_error', { code: err.code || 'network' });
        var box = f.querySelector('#bk-error');
        var fields = err.fields ? Object.keys(err.fields) : [];
        box.textContent =
            err.code === 437 ? T.errBusy
          : err.code === 436 || err.code === 433 ? T.errStaff
          : fields.indexOf('email') !== -1 || err.code === 400 ? T.errEmail
          : fields.indexOf('phone') !== -1 ? T.errPhone
          : fields.length || err.status === 422 || err.code === 404 || err.code === 438 ? T.errParams
          : T.errNet;
        box.hidden = false;
        submit.textContent = T.submit;
        sync();
      });
    });
    return f;
  };

  var done = function (rec) {
    mount.innerHTML = '';
    var box = el('div', 'bk-done');
    box.innerHTML =
      '<p class="bk-done-t">' + T.okTitle + '</p>' +
      '<p class="bk-done-l">' + T.okLead + '</p>' +
      '<dl class="bk-done-d">' +
      '<dt>' + T.okWhen + '</dt><dd>' + human(state.date) + ', ' + state.time.time + '</dd>' +
      '<dt>' + T.okWhat + '</dt><dd>' + pretty(state.service.title) + '</dd>' +
      '<dt>' + T.okWho + '</dt><dd>' + state.staff.name + '</dd>' +
      (rec.record_id ? '<dt>' + T.okNumber + '</dt><dd>' + rec.record_id + '</dd>' : '') +
      '</dl>';
    var again = el('button', 'bk-more', T.again);
    again.type = 'button';
    again.addEventListener('click', function () {
      state = { service: null, staff: null, date: null, time: null, weeks: 2 };
      render();
    });
    box.appendChild(again);
    mount.appendChild(box);
  };

  /* ---------- loaders ---------- */

  var busy = function (on) { mount.setAttribute('aria-busy', on ? 'true' : 'false'); };

  var loadDates = function () {
    busy(true);
    var from = ymd(new Date()), to = new Date();
    to.setDate(to.getDate() + state.weeks * 7);
    api.dates(from, ymd(to), state.service.id, state.staff && state.staff.id)
      .then(function (d) { cache.dates = (d && d.booking_dates) || []; })
      ['catch'](function () { cache.dates = []; })
      .then(function () { busy(false); render(); });
  };

  var loadTimes = function () {
    busy(true);
    api.times(state.staff && state.staff.id, state.date, state.service.id)
      .then(function (t) { cache.times = t || []; })
      ['catch'](function () { cache.times = []; })
      .then(function () { busy(false); render(); });
  };

  Promise.all([api.services(), api.staff()]).then(function (r) {
    cache.services = (r[0] && r[0].services) || [];
    cache.categories = (r[0] && r[0].categories) || [];
    cache.staff = r[1] || [];

    /* A treatment page has already answered the first question. Opening on
       "choose a category" there would make somebody who is reading about laser
       tell us it is laser. Matched on the category title, and if the title
       ever changes in Altegio the widget simply opens on the full list. */
    var want = (root.getAttribute('data-preselect') || '').toLowerCase();
    if (want) {
      var hit = null;
      cache.categories.forEach(function (c) {
        if (!hit && String(c.title || '').toLowerCase().indexOf(want) !== -1) hit = c;
      });
      if (hit) state.category = hit;
    }
    track('booking_open', {});
    render();
  })['catch'](function () {
    /* if we cannot even list services we cannot book: hand the page back */
    mount.remove();
    if (fallback) fallback.hidden = false;
  });
})();
