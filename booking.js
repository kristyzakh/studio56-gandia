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

  /* A campaign can be narrower than the studio. data-hide-routes takes the
     route names a page has no business offering -- an ad set aimed at women
     should not open on a men's packages card -- and the widget does not build
     them. Read here rather than inside paint(), which runs long after the
     route list is built. Empty everywhere else: every other page offers all
     four routes. */
  var HIDDEN = (root.getAttribute('data-hide-routes') || '').split(/[,\s]+/);
  var hidden = function (name) { return HIDDEN.indexOf(name) !== -1; };

  /* An offer price is the page's, not Altegio's. A -30 % first session is
     applied in the studio, so the API answers with the normal price list and a
     form quoting it contradicts the card the visitor just tapped.

     data-offer-prices reads the numbers off the page's own zone buttons, which
     already carry the Altegio id and the offer price side by side. A second
     price list here would be a second thing to keep in step with Precios.pdf;
     this is a lookup into the one the page already renders. Empty everywhere
     else, and empty leaves every price exactly as Altegio sent it. */
  var OFFER = {};
  if (root.hasAttribute('data-offer-prices')) {
    [].slice.call(document.querySelectorAll('.row-add[data-altegio][data-price-first]'))
      .forEach(function (b) {
        var id = b.getAttribute('data-altegio'), v = Number(b.getAttribute('data-price-first'));
        if (id && v > 0) OFFER[id] = v;
      });
  }
  var offerOf = function (sv) {
    var v = OFFER[String(sv && sv.id)];
    return v > 0 ? v : 0;
  };

  var LANG = document.documentElement.lang;
  var pick = function (t) { return t[LANG] || t.es; };

  var T = pick({
    uk: {
    steps: ['Процедура', 'Майстриня', 'Дата', 'Час', 'Ваші дані'],
    anyStaff: 'Будь-яка вільна',
    anyStaffNote: 'Підберемо, хто вільний у цей час',
    pickService: 'Оберіть процедуру',
    pickDate: 'Оберіть день',
    pickTime: 'Оберіть час',
    noTimes: 'На цей день вільних вікон немає. Спробуйте інший.',
    noDates: 'Найближчими днями вільних вікон немає — напишіть нам у WhatsApp, підберемо час.',
    more: 'Показати ще два тижні',
    change: 'Змінити',
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
    errNoProof: 'Не вдалося підтвердити, що запис створився. Напишіть нам у WhatsApp, щоб не вийшло подвійного запису.',
    mock: 'Демонстраційний режим: показані вигадані вікна, запис не створюється.',
    pick: 'Що обираємо',
    one: 'Одна зона', oneNote: 'Обираєте одну ділянку',
    many: 'Кілька зон', manyNote: 'Позначте всі, порахуємо разом',
    packs: 'Пакети 3 + 1', packsNote: 'Чотири сеанси за ціною трьох',
    groups: { cara: 'Обличчя', bikini: 'Бікіні', piernas: 'Ноги', brazos: 'Руки', cuerpo: 'Тіло' },
    total: 'Разом', next: 'Далі', packWord: '1 пакет', chosenWord: function (n) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return n + ' зона';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return n + ' зони';
      return n + ' зон';
    },
    comboLead: 'Разом дешевше: ', comboInstead: ' замість ', comboTake: 'Взяти',
    perSession: 'за сеанс', removeIt: 'Прибрати',
    packSave: 'Заощадите ', packTake: 'Взяти пакет', packDrop: 'Один сеанс',
    packOn: 'Пакет 3 + 1 · 4 сеанси',
    men: 'Для чоловіків', menNote: 'Пакети зон, ціна за сеанс',
    free: 'Безкоштовно',
    packApart: 'окремо ',
    days: ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    months: ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
             'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
    },
    ru: {
    steps: ['Процедура', 'Мастер', 'Дата', 'Время', 'Ваши данные'],
    anyStaff: 'Любой свободный',
    anyStaffNote: 'Подберём, кто свободен в это время',
    pickService: 'Выберите процедуру',
    pickDate: 'Выберите день',
    pickTime: 'Выберите время',
    noTimes: 'На этот день свободных окон нет. Попробуйте другой.',
    noDates: 'В ближайшие дни свободных окон нет — напишите нам в WhatsApp, подберём время.',
    more: 'Показать ещё две недели',
    change: 'Изменить',
    otherCategories: '← Другие процедуры',
    optionsWord: function (n) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return ' услуга';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return ' услуги';
      return ' услуг';
    },
    name: 'Как вас зовут',
    namePh: 'Имя и фамилия',
    phone: 'Телефон',
    email: 'Почта',
    optional: '(необязательно)',
    consent: 'Соглашаюсь с <a href="privacidad.html">политикой конфиденциальности</a> и с тем, чтобы Studio 56 связалась со мной.',
    submit: 'Записаться',
    sending: 'Записываем…',
    from: 'от ',
    min: ' мин',
    okTitle: 'Готово, вы записаны',
    okLead: 'Ждём вас в Studio 56. Подтверждение отправили, а если планы изменятся — просто напишите нам.',
    okWhen: 'Когда',
    okWhat: 'Что',
    okWho: 'Мастер',
    okNumber: 'Номер записи',
    again: 'Записаться ещё раз',
    errBusy: 'Это окно только что заняли. Выберите, пожалуйста, другое время.',
    errStaff: 'На это время нет свободного мастера. Попробуйте другое время.',
    errParams: 'Что-то не так с данными записи. Проверьте, пожалуйста, поля.',
    errEmail: 'Проверьте адрес почты — он нужен для записи.',
    errPhone: 'Проверьте номер телефона.',
    errNet: 'Не удалось связаться со студией. Попробуйте ещё раз или напишите в WhatsApp.',
    errNoProof: 'Не удалось подтвердить, что запись создалась. Напишите нам в WhatsApp, чтобы не вышло двойной записи.',
    mock: 'Демонстрационный режим: показаны выдуманные окна, запись не создаётся.',
    pick: 'Что выбираем',
    one: 'Одна зона', oneNote: 'Выбираете один участок',
    many: 'Несколько зон', manyNote: 'Отметьте все, посчитаем вместе',
    packs: 'Пакеты 3 + 1', packsNote: 'Четыре сеанса по цене трёх',
    groups: { cara: 'Лицо', bikini: 'Бикини', piernas: 'Ноги', brazos: 'Руки', cuerpo: 'Тело' },
    total: 'Итого', next: 'Далее', packWord: '1 пакет', chosenWord: function (n) {
      var m10 = n % 10, m100 = n % 100;
      if (m10 === 1 && m100 !== 11) return n + ' зона';
      if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return n + ' зоны';
      return n + ' зон';
    },
    comboLead: 'Вместе дешевле: ', comboInstead: ' вместо ', comboTake: 'Взять',
    perSession: 'за сеанс', removeIt: 'Убрать',
    packSave: 'Сэкономите ', packTake: 'Взять пакет', packDrop: 'Один сеанс',
    packOn: 'Пакет 3 + 1 · 4 сеанса',
    men: 'Для мужчин', menNote: 'Пакеты зон, цена за сеанс',
    free: 'Бесплатно',
    packApart: 'отдельно ',
    days: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    months: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
             'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
    },
    es: {
    steps: ['Tratamiento', 'Profesional', 'Día', 'Hora', 'Tus datos'],
    anyStaff: 'La que esté libre',
    anyStaffNote: 'Asignamos a quien esté disponible a esa hora',
    pickService: 'Elige el tratamiento',
    pickDate: 'Elige el día',
    pickTime: 'Elige la hora',
    noTimes: 'Ese día no queda hueco. Prueba con otro.',
    noDates: 'No quedan huecos en estos días — escríbenos por WhatsApp y buscamos hora.',
    more: 'Ver dos semanas más',
    change: 'Editar',
    otherCategories: '← Otros tratamientos',
    optionsWord: function (n) { return n === 1 ? ' servicio' : ' servicios'; },
    name: 'Cómo te llamas',
    namePh: 'Nombre y apellidos',
    phone: 'Teléfono',
    email: 'Email',
    optional: '(opcional)',
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
    errNoProof: 'No hemos podido confirmar que la cita se haya creado. Escríbenos por WhatsApp para no duplicarla.',
    mock: 'Modo demostración: los huecos son inventados y no se crea ninguna reserva.',
    pick: 'Qué eliges',
    one: 'Una zona', oneNote: 'Eliges una sola zona',
    many: 'Varias zonas', manyNote: 'Marca todas y te sumamos el precio',
    packs: 'Packs 3 + 1', packsNote: 'Cuatro sesiones al precio de tres',
    groups: { cara: 'Cara', bikini: 'Bikini', piernas: 'Piernas', brazos: 'Brazos', cuerpo: 'Cuerpo' },
    total: 'Total', next: 'Seguir', packWord: '1 pack', chosenWord: function (n) { return n === 1 ? '1 zona' : n + ' zonas'; },
    comboLead: 'Juntas salen mejor: ', comboInstead: ' en vez de ', comboTake: 'Cambiar',
    perSession: 'por sesión', removeIt: 'Quitar',
    packSave: 'Ahorras ', packTake: 'Coger el pack', packDrop: 'Una sesión',
    packOn: 'Pack 3 + 1 · 4 sesiones',
    men: 'Para hombres', menNote: 'Paquetes de zonas, precio por sesión',
    free: 'Gratis',
    packApart: 'por separado ',
    days: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'],
    months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
             'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    }
  });

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
    services: pick({
      uk: [
      { id: 1, title: 'Ендосфера · Обличчя', price_min: 40, seance_length: 2400 },
      { id: 2, title: 'Ендосфера · Тіло, 60 хв', price_min: 65, seance_length: 3600 },
      { id: 3, title: 'Ендосфера · Тіло, 90 хв', price_min: 95, seance_length: 5400 },
      { id: 4, title: 'Лазерна епіляція', price_min: 10, seance_length: 1800 },
      { id: 5, title: 'Електроепіляція · безкоштовна консультація', price_min: 0, seance_length: 1800 },
      { id: 6, title: 'Віск і шугаринг', price_min: 8, seance_length: 1800 }
      ],
      ru: [
      { id: 1, title: 'Эндосфера · Лицо', price_min: 40, seance_length: 2400 },
      { id: 2, title: 'Эндосфера · Тело, 60 мин', price_min: 65, seance_length: 3600 },
      { id: 3, title: 'Эндосфера · Тело, 90 мин', price_min: 95, seance_length: 5400 },
      { id: 4, title: 'Лазерная эпиляция', price_min: 10, seance_length: 1800 },
      { id: 5, title: 'Электроэпиляция · бесплатная консультация', price_min: 0, seance_length: 1800 },
      { id: 6, title: 'Воск и шугаринг', price_min: 8, seance_length: 1800 }
      ],
      es: [
      { id: 1, title: 'Endospheres · Rostro', price_min: 40, seance_length: 2400 },
      { id: 2, title: 'Endospheres · Cuerpo, 60 min', price_min: 65, seance_length: 3600 },
      { id: 3, title: 'Endospheres · Cuerpo, 90 min', price_min: 95, seance_length: 5400 },
      { id: 4, title: 'Depilación Láser', price_min: 10, seance_length: 1800 },
      { id: 5, title: 'Electrodepilación · consulta gratuita', price_min: 0, seance_length: 1800 },
      { id: 6, title: 'Cera y Sugaring', price_min: 8, seance_length: 1800 }
      ]
    }),
    staff: [
      { id: 11, name: 'Anna', specialization: pick({ uk: 'Ендосфера, лазер', ru: 'Эндосфера, лазер', es: 'Endospheres, láser' }) },
      { id: 12, name: 'Alina', specialization: pick({ uk: 'Епіляція, депіляція', ru: 'Эпиляция, депиляция', es: 'Depilación' }) }
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

  /* Altegio takes one service_ids[] parameter per service and works out the
     combined length itself — two zones came back as one 50-minute slot, three
     as 80. So the whole chain carries the set, not a single id. */
  var ids = function (list) {
    return (list || []).map(function (sv) {
      return '&service_ids[]=' + (sv.id != null ? sv.id : sv);
    }).join('');
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
    staff: function (serviceIds) {
      if (MOCK) return Promise.resolve(FIX.staff);
      var q = ids(serviceIds);
      return live('/book_staff' + (q ? '?' + q.slice(1) : ''));
    },
    dates: function (from, to, serviceIds, staffId) {
      if (MOCK) {
        var out = [], d = new Date(from + 'T00:00:00'), end = new Date(to + 'T00:00:00');
        for (; d <= end; d.setDate(d.getDate() + 1)) if (mockTimes(ymd(d)).length) out.push(ymd(d));
        return Promise.resolve({ booking_dates: out });
      }
      return live('/book_dates?date_from=' + from + '&date_to=' + to +
                  ids(serviceIds) + '&staff_id=' + (staffId || 0));
    },
    /* "Any specialist" has to become a person before the booking is made, or
       the confirmation cannot say who it is with. book_staff filtered by the
       service and the slot answers exactly that. The datetime carries a +02:00
       offset, and a raw + in a query string means a space — hence the encode. */
    staffAt: function (datetime, serviceIds) {
      if (MOCK) return Promise.resolve(FIX.staff);
      return live('/book_staff?datetime=' + encodeURIComponent(String(datetime).slice(0, 19)) +
                  ids(serviceIds));
    },
    times: function (staffId, date, serviceIds) {
      if (MOCK) return Promise.resolve(mockTimes(date));
      return live('/book_times/' + (staffId || 0) + '/' + date + '?' + ids(serviceIds).slice(1));
    },
    record: function (payload) {
      if (MOCK) return Promise.resolve([{ id: 0, record_id: 'DEMO-' + Date.now().toString(36).toUpperCase() }]);
      return live('/book_record', { method: 'POST', body: payload });
    }
  };

  /* ---------- state ---------- */

  /* A treatment page is about one treatment. When the page has already
     answered "which service", that answer is not the visitor's to undo here —
     there is no route back to the full list, because on this page there is no
     full list. */
  var locked = false;

  var state = { category: null, mode: null, pack: false, basket: [], services: [], staff: null, assigned: null, date: null, time: null, weeks: 2 };
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
  /* Written by analytics.js on the visitor's first page. Kept as a plain
     label -- no identifier -- and prefixed so the studio can see at a glance
     that this booking came through the website rather than the phone. */
  var source = function () {
    var v = '';
    try { v = window.localStorage.getItem('s56-source') || ''; } catch (e) {}
    return v ? 'Сайт · ' + v : 'Сайт';
  };

  /* The pack the visitor ticked, written for the one person who acts on it:
     the master at the till. So it is in Russian whatever language the site was
     read in -- the CRM, the staff guide and the people selling are Russian, and
     a Spanish visitor asking for a pack must not produce a note the person
     selling it cannot use.

     Nothing is bought here. Altegio has no service for a single-zone 3 + 1, and
     the pack itself is an abonement, not a service -- so the booking stays one
     session and this says what the visitor asked for. The master confirms it in
     person, prices it and issues the abonement. */
  /* Written for the one person who acts on it: the specialist reading the
     журнал. Russian for the same reason packNote is -- the CRM, the staff
     guide and the people at the till are Russian whatever language the site
     was read in.

     It exists because the price differs. Altegio holds the normal price list
     and always will: a -30 % first session is applied in the studio, not sold
     as a service. So without this the appointment would arrive quoting a
     number nobody is going to charge. No flag gates it -- if nothing chosen
     carries an offer price there is nothing to say, and it says nothing. */
  var offerNote = function () {
    var off = state.services.filter(function (sv) { return wasOf(sv); });
    if (!off.length) return '';
    var now = off.reduce(function (t, sv) { return t + priceOf(sv); }, 0);
    var was = off.reduce(function (t, sv) { return t + wasOf(sv); }, 0);
    return ' · ⚡ ПЕРВЫЙ СЕАНС −30 %: ' +
           off.map(function (sv) { return pretty(sv.title); }).join(' + ') +
           ' — ' + now + ' € (вместо ' + was + ' €)';
  };

  var packNote = function () {
    if (!state.pack || !state.services.length) return '';
    return ' · ПАКЕТ 3+1: ' + pretty(state.services[0].title) + ' — 4 сеанса';
  };

  var pretty = function (s) {
    return String(s || '').replace(/\bl([áa])ser\b/g, function (m, a) { return 'L' + a + 'ser'; });
  };

  var cascade = function (node, i) {
    node.style.animationDelay = (Math.min(i, 8) * 55) + 'ms';
    return node;
  };

  /* A price of zero is a real answer, not a missing one -- saying nothing next
     to "free consultation" reads as a field somebody forgot to fill in. Any
     service left without a price in Altegio will also read as free, which is
     the right way round for a booking form: nothing paid should ever be
     listed without its price. */
  var money = function (lo, hi) {
    if (!lo && !hi) return T.free;
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

  var paint = function () {
    mount.innerHTML = '';
    /* The basket only floats on the step that builds it. Clearing here means no
       later step can inherit a bar with nothing behind it. */
    document.body.classList.remove('has-bk');
    var n = 0;

    /* 1 · service */
    n++;
    if (!state.services.length) {
      var list = el('div', 'bk-list');

      if (cache.categories.length && !state.category) {
        cache.categories.forEach(function (c) {
          /* A men's category is not a treatment of its own: it is offered as a
             route inside its parent. Listing it here as well would split men
             off before they ever reach the laser page, and put the same four
             packages behind two different doors. Its services are counted
             towards the parent, because that is where they are reached. */
          if (menParent(c)) return;
          var count = countIn(c.id);
          cache.categories.forEach(function (m) {
            if (menParent(m) === c) count += countIn(m.id);
          });
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

      var pool = inCategory();
      var zones = pool.filter(isZone), packs = pool.filter(isPack);
      var backToCategory = (state.category && !locked) ? function () {
        state.category = null; state.mode = null; state.basket = []; render();
      } : null;
      var catTitle = state.category ? pretty(state.category.title) : null;

      /* A short category is still a short list — the extra question would only
         be in the way. The long ones (33 laser zones, 20 for wax) are the
         reason this step exists at all. */
      if (zones.length <= 8) {
        pool.forEach(function (sv) { list.appendChild(cascade(optionFor(sv), list.children.length)); });
        mount.appendChild(step(n, T.steps[0], catTitle, backToCategory, list));
        return;
      }

      /* 1b · one zone, several, or a pack */
      if (!state.mode) {
        var routes = [['one', T.one, T.oneNote], ['many', T.many, T.manyNote]];
        if (packs.length && !hidden('packs')) routes.push(['packs', T.packs, T.packsNote]);
        /* Men's packages are their own route rather than a block inside
           "Packs 3 + 1", because they are not 3 + 1: they are several zones at
           one session's price. Filing them under a heading promising four
           sessions for three would be a lie about what is being bought. Single
           zones stay open to everybody, so nobody loses a booking by not
           coming through here. */
        if (menCategory() && !hidden('men')) routes.push(['men', T.men, T.menNote]);
        routes.forEach(function (r) {
          var b = el('button', 'bk-opt');
          b.type = 'button';
          b.innerHTML = '<span class="bk-opt-t">' + r[1] + '</span>' +
                        '<span class="bk-opt-m">' + r[2] + '</span>';
          b.addEventListener('click', function () {
            state.mode = r[0]; state.basket = [];
            track('booking_mode', { mode: r[0] });
            render();
          });
          list.appendChild(cascade(b, list.children.length));
        });
        mount.appendChild(step(n, T.steps[0], catTitle, backToCategory, list));
        return;
      }

      var backToMode = function () { state.mode = null; state.basket = []; render(); };

      /* All four routes go through the same basket: whatever was tapped is
         shown with its price, and nothing moves the visitor forward until they
         press the button themselves. Packs and the men's packages used to skip
         it and jump straight to the calendar -- two routes with a basket and
         two without, which reads as broken from the visitor's side.

         "single" is the selection rule, not the route: one zone, one pack or
         one men's package at a time, so picking another replaces the first.
         Only "several zones" accumulates. */
      var men = menCategory();
      var menServices = cache.services.filter(function (sv) { return men && sv.category_id === men.id; });
      var items = state.mode === 'packs' ? packs
                : state.mode === 'men'   ? menServices
                : zones;
      var modeLabel = { one: T.one, many: T.many, packs: T.packs, men: T.men }[state.mode];
      var single = state.mode !== 'many';

      var basketBox = el('div', 'bk-basket');
      var refresh = function () {
        var total = sumOf(state.basket);
        var combo = single ? null : comboFor(state.basket);
        basketBox.innerHTML = '';
        if (!state.basket.length) { basketBox.hidden = true; float_(); return; }
        basketBox.hidden = false;

        /* Every chosen zone as its own line: what it is, what a session
           costs, and a way to take it back out. Wrapped, so that when the box
           is pinned to the bottom of the screen it is the lines that scroll --
           the total and the button stay put where a thumb expects them. */
        var lines = el('div', 'bk-lines');
        basketBox.appendChild(lines);
        state.basket.forEach(function (sv) {
          var line = el('div', 'bk-line');
          var name = el('span', 'bk-line-t', pretty(sv.title));
          /* A 3 + 1 pack is priced for four sessions, so "per session" would
             be wrong on it. The men's packages really are per session. */
          var cost = el('span', 'bk-line-p', struck(sv) + priceOf(sv) + ' € ' +
                        (state.mode === 'packs' ? '' : '<small>' + T.perSession + '</small>'));
          var x = el('button', 'bk-line-x', '×');
          x.type = 'button';
          x.setAttribute('aria-label', T.removeIt + ' ' + pretty(sv.title));
          x.addEventListener('click', function () {
            state.basket.splice(state.basket.indexOf(sv), 1);
            state.pack = false;
            [].slice.call(list.querySelectorAll('.bk-opt.is-on')).forEach(function (b) {
              if (b.__sv === sv) { b.classList.remove('is-on'); b.setAttribute('aria-pressed', 'false'); }
            });
            refresh();
          });
          line.appendChild(name); line.appendChild(cost); line.appendChild(x);
          lines.appendChild(line);
        });

        /* 3 + 1 on a single zone. Altegio has no service for it — the packs it
           holds are all combinations — so the booking stays one session and
           the journal note says which pack it belongs to. Same arrangement the
           price list already runs on: four sessions, pay for three. */
        if (state.mode === 'one' && state.basket.length === 1 && offersPack() && !hidden('packs')) {
          var one = state.basket[0];
          var apart = 4 * priceOf(one), packPrice = 3 * priceOf(one);
          var offer = el('div', 'bk-pack' + (state.pack ? ' is-on' : ''));
          offer.innerHTML =
            '<span class="bk-pack-t">' + T.packs + '</span>' +
            '<span class="bk-pack-p"><s>' + T.packApart + apart + ' €</s>' +
            '<b>' + packPrice + ' €</b></span>' +
            '<span class="bk-pack-s">' + T.packSave + (apart - packPrice) + ' €</span>';
          var take = el('button', 'bk-pack-go', state.pack ? T.packDrop : T.packTake);
          take.type = 'button';
          take.addEventListener('click', function () { state.pack = !state.pack; refresh(); });
          offer.appendChild(take);
          basketBox.appendChild(offer);
          total = state.pack ? packPrice : priceOf(one);
        }

        var row = el('div', 'bk-basket-row');
        row.appendChild(el('span', 'bk-basket-n',
          state.pack ? T.packOn
          : state.mode === 'one' || state.mode === 'many' ? T.chosenWord(state.basket.length)
          : T.packWord));
        var wasSum = state.basket.reduce(function (t, sv) { return t + (wasOf(sv) || priceOf(sv)); }, 0);
        row.appendChild(el('span', 'bk-basket-sum',
          (!state.pack && wasSum > total ? '<s class="bk-was">' + wasSum + ' €</s> ' : '') + total + ' €'));
        basketBox.appendChild(row);
        if (combo) {
          var hint = el('div', 'bk-combo');
          hint.innerHTML = '<span>' + T.comboLead + '<b>' + priceOf(combo) + ' €</b>' +
                           T.comboInstead + total + ' €</span>';
          var take = el('button', 'bk-combo-take', T.comboTake);
          take.type = 'button';
          take.addEventListener('click', function () {
            state.services = [combo]; state.date = null; state.time = null;
            state.staff = null; state.assigned = null;
            track('booking_combo', { service: combo.title, saved: total - priceOf(combo) });
            loadStaff();
          });
          hint.appendChild(take);
          basketBox.appendChild(hint);
        }
        var go = el('button', 'btn btn-primary btn-block bk-go', T.next);
        go.type = 'button';
        go.addEventListener('click', function () {
          state.services = state.basket.slice(); state.date = null; state.time = null;
          state.staff = null; state.assigned = null;
          track('booking_service', { service: chosenTitle(), zones: state.basket.length });
          loadStaff();
        });
        basketBox.appendChild(go);
        float_();
      };

      /* The zone list is 27 items -- close to four phone screens. A basket
         sitting after it fills up entirely out of sight: you tick a zone, look,
         and nothing has visibly happened. So while zones are being chosen the
         basket is pinned to the bottom of the screen, the same answer the price
         page already uses for the same problem.

         Its height goes out as a custom property because it changes with every
         tick, and the widget needs that much bottom padding or the last zones
         sit underneath it with no way to reach them. */
      var float_ = function () {
        var on = !basketBox.hidden;
        basketBox.classList.toggle('is-float', on);
        document.body.classList.toggle('has-bk', on);
        document.body.style.setProperty('--bk-h',
          (on ? basketBox.offsetHeight : 0) + 'px');
      };

      var buttons = [];
      var make = function (sv) {
        var b = optionFor(sv, true);
        b.__sv = sv;
        buttons.push(b);
        var on = function () { return state.basket.indexOf(sv) !== -1; };
        var paint = function () {
          b.classList.toggle('is-on', on());
          b.setAttribute('aria-pressed', on() ? 'true' : 'false');
        };
        b.__paint = paint;
        b.addEventListener('click', function () {
          if (single) {
            state.basket = on() ? [] : [sv];
            state.pack = false;
            buttons.forEach(function (o) { o.__paint(); });
          } else if (on()) {
            state.basket.splice(state.basket.indexOf(sv), 1);
            paint();
          } else {
            state.basket.push(sv);
            paint();
          }
          refresh();          /* no re-render: ticking must not move the page */
        });
        paint();
        return b;
      };
      if (state.mode === 'one' || state.mode === 'many') {
        groupedInto(list, zones, make);
      } else {
        items.forEach(function (sv) { list.appendChild(cascade(make(sv), list.children.length)); });
      }

      mount.appendChild(step(n, T.steps[0], catTitle + ' · ' + modeLabel, backToMode, list));
      mount.appendChild(basketBox);
      refresh();
      return;
    }
    mount.appendChild(step(n, T.steps[0], chosenTitle(), function () {
      /* back into the same list, ticks intact — going all the way out to the
         categories threw away a choice the visitor had just made */
      state.services = [];
      state.staff = null; state.assigned = null; state.date = null; state.time = null;
      if (!state.mode && !locked) state.category = null;
      render();
    }));

    /* 2 · staff */
    /* A page aimed at people who have never been here can opt out of the choice
       with data-skip-staff. A stranger cannot choose between names they do not
       know, and every step is a place to leave; Altegio assigns whoever is free
       and the confirmation page names them, which is when the name means
       something. Opt-in, so every other page keeps the picker. */
    var skipStaff = root.hasAttribute('data-skip-staff');
    if (skipStaff && !state.staff) state.staff = { id: 0, name: T.anyStaff };
    if (!skipStaff) n++;
    /* Named, so the visitor knows who they are seeing, but not asked -- there
       is nothing to choose between. Set here rather than in loadStaff so that
       stepping back from the calendar does not resurrect a one-option list. */
    if (!state.staff && cache.staff.length === 1) state.staff = cache.staff[0];
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
    if (!skipStaff) {
      mount.appendChild(step(n, T.steps[1], (state.assigned && state.assigned.name) || state.staff.name,
        cache.staff.length > 1 ? function () {
          state.staff = null; state.assigned = null; state.date = null; state.time = null; render();
        } : null));
    }

    /* 3 · date */
    n++;
    if (!state.date) {
      var wrap = el('div');
      if (!cache.dates.length) {
        /* Altegio takes three seconds to answer with the days. Saying "no
           quedan huecos" for those three seconds is a lie the visitor has no
           reason to doubt, so an empty-and-busy step shows the shape of the
           answer instead. No words: nothing to translate, nothing to read
           and then have replaced. */
        if (mount.getAttribute('aria-busy') === 'true') {
          var wait = el('div', 'bk-days');
          for (var wi = 0; wi < 5; wi++) wait.appendChild(el('span', 'bk-day bk-day-wait'));
          wrap.appendChild(wait);
        } else {
          wrap.appendChild(el('p', 'bk-empty', T.noDates));
        }
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
      state.date = null; state.time = null; state.assigned = null; render();
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
            state.time = t;
            track('booking_time', { datetime: t.datetime });
            if (state.staff && state.staff.id) { state.assigned = state.staff; render(); return; }
            busy(true);
            api.staffAt(t.datetime, state.services).then(function (list) {
              var free = (list || []).filter(function (s) { return s.bookable !== false; });
              state.assigned = free[0] || null;
            })['catch'](function () { state.assigned = null; })
              .then(function () { busy(false); render(); });
          });
          grid.appendChild(cascade(b, grid.children.length));
        });
        box.appendChild(grid);
      }
      mount.appendChild(step(n, T.steps[3], null, null, box));
      return;
    }
    mount.appendChild(step(n, T.steps[3], state.time.time, function () { state.time = null; state.assigned = null; render(); }));

    /* 5 · details */
    n++;
    mount.appendChild(step(n, T.steps[4], null, null, form()));
  };

  /* Every answer collapses the step above it into one line, so the page gets
     shorter the moment a choice is made. On a phone the visitor is usually
     scrolled to the bottom of a long list (33 laser zones) when they tap;
     the document shrinks out from under them and the browser lands them on
     the footer, with the next question somewhere above. So after every
     repaint, scroll so the question now being asked sits at the top of the
     screen -- with the one-line summary of the choice just made kept above
     it, so the visitor reads "you chose X, now pick Y" and still has that
     step's "back" link in reach. Not on the first paint: that is page load,
     and nobody asked. */
  var settled = false;
  /* One option button, used by every branch of the first step. */
  var optionFor = function (sv, quiet) {
    var b = el('button', 'bk-opt');
    b.type = 'button';
    b.innerHTML = '<span class="bk-opt-t">' + pretty(sv.title) + '</span>' +
                  '<span class="bk-opt-m">' + struck(sv) +
                  money(offerOf(sv) || sv.price_min, offerOf(sv) ? 0 : sv.price_max) + '</span>';
    if (!quiet) b.addEventListener('click', function () {
      state.services = [sv]; state.date = null; state.time = null;
      state.staff = null; state.assigned = null;
      track('booking_service', { service: sv.title });
      loadStaff();
    });
    return b;
  };

  /* Zones under body-part headings, in the order the studio lists them. */
  var groupedInto = function (list, zones, make) {
    ['cara', 'bikini', 'piernas', 'brazos', 'cuerpo'].forEach(function (key) {
      var inGroup = zones.filter(function (sv) { return groupOf(sv) === key; });
      if (!inGroup.length) return;
      list.appendChild(el('p', 'bk-group', T.groups[key]));
      inGroup.forEach(function (sv) { list.appendChild(cascade(make(sv), list.children.length)); });
    });
  };

  /* ---------- reading the catalogue ----------
     Altegio holds zones, ready-made combinations and 3+1 packs in one flat
     list of 33 items, told apart only by how the titles are written. Matching
     on the wording rather than on ids means a service renamed in Altegio still
     lands in the right place instead of vanishing from the form. */
  var isPack  = function (sv) { return /3\s*\+\s*1|promo|paquete/i.test(sv.title); };
  var isCombo = function (sv) { return !isPack(sv) && /\s\+\s/.test(sv.title); };
  var isZone  = function (sv) { return !isPack(sv) && !isCombo(sv); };

  /* Body part, by the words the studio actually uses. Anything unrecognised
     falls into "cuerpo" rather than disappearing. */
  var GROUPS = [
    ['cara',    /entrecejo|entresejo|p[oó]mulo|patilla|ment[oó]n|facial|labio|ceja|oreja|rostro/i],
    ['bikini',  /ingle|pubis|intergl[uú]tea|bikini|brasile/i],
    ['piernas', /pierna|muslo|pies|gemelo/i],
    ['brazos',  /brazo|antebrazo|manos|hombro/i],
    ['cuerpo',  /./]
  ];
  var groupOf = function (sv) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][1].test(sv.title)) return GROUPS[i][0];
    return 'cuerpo';
  };

  /* Altegio keeps the men's packages in a category named after this one --
     "Depilación Láser" -> "Depilación Láser Hombre" -- so it is found by that
     relationship rather than by an id. If the category is ever renamed the
     route simply stops being offered, which is the safe way to fail: the
     alternative is a button that books the wrong thing. */
  var MEN = /hombre|чолов|мужск/i;
  var countIn = function (id) {
    return cache.services.filter(function (sv) { return sv.category_id === id; }).length;
  };

  /* Altegio names the men's category after its parent -- "Depilación Láser"
     -> "Depilación Láser Hombre" -- so the relationship is read from the
     title rather than an id, and a rename quietly ends it instead of
     pointing somewhere wrong. Returns the parent, or null when this is an
     ordinary category. */
  var menParent = function (c) {
    var t = String(c.title || '').toLowerCase();
    if (!MEN.test(t) || !countIn(c.id)) return null;
    var hit = null;
    cache.categories.forEach(function (p) {
      var pt = String(p.title || '').toLowerCase();
      if (!hit && pt && pt !== t && t.indexOf(pt) === 0) hit = p;
    });
    return hit;
  };

  /* The men's category as seen from its parent -- the "for men" route. */
  var menCategory = function () {
    if (!state.category) return null;
    var hit = null;
    cache.categories.forEach(function (c) {
      if (!hit && menParent(c) === state.category) hit = c;
    });
    return hit;
  };

  /* 3 + 1 exists for laser (and Endospheres) only. Wax is sold per zone, per
     session -- no packs, no discounts -- so the offer must never appear there.
     Same rule the price page's cart.js already applies. Matched on the category
     title like everything else here, so a rename withdraws the offer rather
     than inventing one. */
  var offersPack = function () {
    return !!state.category &&
      /l[aá]ser|лазер|endosph|ендосф|эндосф/i.test(String(state.category.title || ''));
  };

  var inCategory = function () {
    return cache.services.filter(function (sv) {
      return !state.category || sv.category_id === state.category.id;
    });
  };
  var listPrice = function (sv) { return sv.price_min || 0; };
  /* Everything downstream -- the basket sum, the pack maths, the combo
     comparison -- already goes through here, so they all follow the offer
     without knowing about it. */
  var priceOf = function (sv) { return offerOf(sv) || listPrice(sv); };
  /* The price it was, when there is an offer to strike it through. */
  var wasOf = function (sv) {
    var off = offerOf(sv), full = listPrice(sv);
    return off && full > off ? full : 0;
  };
  var struck = function (sv) {
    return wasOf(sv) ? '<s class="bk-was">' + wasOf(sv) + ' €</s> ' : '';
  };
  var sumOf = function (list) {
    return list.reduce(function (t, sv) { return t + priceOf(sv); }, 0);
  };

  /* A combination is worth suggesting only when the visitor has hand-picked
     exactly the zones it contains. Compare on the words, since that is all
     the title gives us: "Axilas + Ingles Completas" against the two zones
     named Axilas and Ingles Completas. */
  var norm = function (t) {
    return String(t).toLowerCase().replace(/\|.*$/, '')
      .replace(/[áàä]/g,'a').replace(/[éèë]/g,'e').replace(/[íìï]/g,'i')
      .replace(/[óòö]/g,'o').replace(/[úùü]/g,'u').replace(/[^a-z0-9 ]/g,' ')
      .replace(/\s+/g,' ').trim();
  };
  /* Split on the plus BEFORE normalising — norm() strips punctuation, so
     splitting afterwards would leave one run-on string and never match. */
  var comboParts = function (title) {
    return String(title).replace(/\|.*$/, '').split('+')
      .map(norm).filter(Boolean).sort().join('|');
  };
  var comboFor = function (picked) {
    if (picked.length < 2) return null;
    var want = picked.map(function (sv) { return norm(sv.title); }).sort().join('|');
    var found = null;
    inCategory().filter(isCombo).forEach(function (cb) {
      if (comboParts(cb.title) === want && priceOf(cb) < sumOf(picked)) found = cb;
    });
    return found;
  };

  /* One line for however many zones were chosen — it goes in the step
     summary, the analytics event, the confirmation page and the journal. */
  var chosenTitle = function () {
    return state.services.map(function (sv) { return pretty(sv.title); }).join(' + ');
  };

  var render = function () {
    paint();
    if (!settled) { settled = true; return; }
    /* paint() has already put the new nodes in the document, and
       scrollIntoView forces layout itself -- no need to wait a frame. */
    var steps = mount.querySelectorAll('.bk-step');
    if (!steps.length) return;
    var anchor = steps.length > 1 ? steps[steps.length - 2] : steps[0];
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    anchor.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
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
      '<div class="field"><label for="bk-email">' + T.email + ' <span class="optional">' + T.optional + '</span></label>' +
      '<input type="email" id="bk-email" autocomplete="email"></div>' +
      '<label class="consent"><input type="checkbox" id="bk-consent" required><span>' + T.consent + '</span></label>' +
      '<p class="bk-error" id="bk-error" hidden></p>' +
      '<button type="submit" class="btn btn-primary btn-block" id="bk-submit" disabled>' + T.submit + '</button>';

    /* Group the number in threes while it is typed. Nine digits in a row are
       hard to check against the phone in your other hand, and a wrong number is
       a booking the studio cannot confirm. The caret is put back after the same
       digit it was after, or typing in the middle would throw it to the end. */
    /* Every country groups its numbers its own way, and threes-for-everyone left
       a Ukrainian number reading "287 319 1" — a stray digit that looks like a
       typo at the exact moment somebody is checking their own number. */
    var GROUPS = {
      '+34':  [3, 3, 3],          // 600 111 222
      '+380': [2, 3, 2, 2],       // 67 123 45 67
      '+7':   [3, 3, 2, 2],       // 912 345 67 89
      '+44':  [4, 3, 4],          // 7911 123 4567
      '+49':  [3, 3, 4],
      '+33':  [1, 2, 2, 2, 2],    // 6 12 34 56 78
      '+40':  [3, 3, 3],
      '+212': [3, 3, 3]
    };

    var group = function (digits, code) {
      var pattern = GROUPS[code] || [3, 3, 3];
      var out = [], i = 0, k = 0;
      while (i < digits.length) {
        var size = pattern[k] || 3;   // past the pattern, carry on in threes
        out.push(digits.slice(i, i + size));
        i += size; k++;
      }
      return out.join(' ');
    };

    var phone = f.querySelector('#bk-phone');
    var prefix = f.querySelector('#bk-prefix');
    prefix.addEventListener('change', function () {
      /* regroup what is already typed: the same digits split differently */
      phone.value = group(phone.value.replace(/\D/g, ''), prefix.value);
    });

    phone.addEventListener('input', function () {
      var caret = phone.selectionStart;
      var raw = phone.value;
      var before = raw.slice(0, caret).replace(/\D/g, '').length;
      var digits = raw.replace(/\D/g, '');

      /* Somebody pasting "+34 600 111 222" would otherwise get the country code
         swallowed into the number — 346 001 112 22 — and the studio would call
         a number that does not exist. The code is already chosen in the select
         beside this field, so drop it when it is clearly there. */
      var cc = prefix.value.replace('+', '');
      if ((raw.indexOf('+') !== -1 || digits.length > 9) && digits.indexOf(cc) === 0) {
        var cut = cc.length;
        digits = digits.slice(cut);
        before = Math.max(0, before - cut);
      }
      digits = digits.slice(0, 15);
      var out = group(digits, prefix.value);
      if (out === phone.value) return;
      phone.value = out;
      var pos = 0, seen = 0;
      while (pos < out.length && seen < before) {
        if (out.charAt(pos) !== ' ') seen++;
        pos++;
      }
      try { phone.setSelectionRange(pos, pos); } catch (e) {}
    });

    var submit = f.querySelector('#bk-submit');
    var required = [f.querySelector('#bk-name'), f.querySelector('#bk-phone'),
                    f.querySelector('#bk-consent')];
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
        /* Always send the key, even empty. book_record checks that email was
           passed, not that it holds anything: omit it and the API answers 422
           "The required parameter email was not passed", send "" and it moves
           straight on to validating the slot. Altegio's own booking settings
           list email as not required, so asking for it would be our rule, not
           the studio's — and every required field costs bookings. */
        email: f.querySelector('#bk-email').value.trim(),
        /* Origin, so the journal can tell an Instagram booking from a Google
           one. analytics.js catches it on the first page of the visit and
           keeps the first touch; here it just rides along. Sent as the
           booking's comment because that is what a person reading the journal
           actually sees. Absent (storage blocked, or nothing recorded) it is
           simply left out rather than sent empty or guessed at. */
        comment: source() + offerNote() + packNote(),
        appointments: [{
          id: 1,
          services: state.services.map(function (sv) { return sv.id; }),
          staff_id: (state.assigned && state.assigned.id) || state.staff.id || 0,
          datetime: state.time.datetime
        }]
      };

      track('booking_submit', { service: chosenTitle(), datetime: state.time.datetime });

      api.record(payload).then(function (data) {
        var rec = (data && data[0]) || {};

        /* Altegio answered, but without a record id there is nothing proving an
           appointment exists. Telling somebody they are booked on that basis is
           a guess, and the one thing this form must never do is guess. */
        if (!rec.record_id) {
          var blind = new Error('no record id');
          blind.noProof = true;
          throw blind;
        }

        track('booking_success', { record: rec.record_id });
        /* A booking deserves a page, not a swapped-out panel: the person gets
           something that looks like a confirmation and can be kept, and the
           studio gets a page view it can actually count. */
        var q = new URLSearchParams({
          when: human(state.date) + ', ' + state.time.time,
          what: chosenTitle(),
          who: (state.assigned && state.assigned.name) || state.staff.name,
          id: rec.record_id || ''
        });
        location.href = 'cita-confirmada.html?' + q.toString();
      })['catch'](function (err) {
        track('booking_error', { code: err.code || 'network' });
        var box = f.querySelector('#bk-error');
        var fields = err.fields ? Object.keys(err.fields) : [];
        box.textContent =
            err.noProof ? T.errNoProof
          : err.code === 437 ? T.errBusy
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
      '<dt>' + T.okWhat + '</dt><dd>' + chosenTitle() + '</dd>' +
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

  /* ---------- the shared cabinet ----------
     Anna and Alina work out of ONE room. Their calendars are therefore not
     independent: whoever is in it, nobody else can be. Altegio models exactly
     this with Resources, and the resource is set up correctly — "Cabina",
     quantity 1, attached to all 85 beauty services, and the appointments do
     hold it. Its online-booking engine simply ignores resources. Verified
     2026-09-08: with Anna booked at 10:00 and her record showing
     "Ресурсы: Cabina #1", book_check still answered success for Alina at the
     same 10:00. The resource only bites in the admin journal, so the block
     has to be built here.

     book_times cannot tell "off shift" apart from "booked" — both come back
     simply as a time that is not offered. So the only sound rule is to offer a
     slot when EVERY cabinet specialist offers it. That is deliberately
     conservative: it also drops hours when just one of them is on, which is
     why the real fix is disjoint schedules in Altegio and this is the stopgap.

     Elena is not in this list. She is a hairdresser and works somewhere else
     entirely, so her calendar has nothing to do with this room. */
  var CABINET = [2979218, 2979219];   /* Anna Churashkina · Alina Isajeva */

  /* Only the cabinet people who can actually perform what was chosen. A
     service just one of them does leaves nothing to share, and the plain
     single-staff call stands. */
  var cabinetStaff = function () {
    return (cache.staff || [])
      .map(function (st) { return Number(st.id); })
      .filter(function (id) { return CABINET.indexOf(id) !== -1; });
  };

  /* Keep the first list's entries — they carry the datetime and seance_length
     the rest of the flow needs — and drop every time the others do not also
     offer. */
  var sharedTimes = function (lists) {
    var rest = lists.slice(1).map(function (l) {
      return (l || []).reduce(function (m, t) { m[t.time] = 1; return m; }, {});
    });
    return (lists[0] || []).filter(function (t) {
      return rest.every(function (m) { return m[t.time]; });
    });
  };

  var sharedDates = function (lists) {
    var rest = lists.slice(1).map(function (d) {
      return ((d && d.booking_dates) || []).reduce(function (m, x) { m[x] = 1; return m; }, {});
    });
    return { booking_dates: (((lists[0] || {}).booking_dates) || []).filter(function (x) {
      return rest.every(function (m) { return m[x]; });
    }) };
  };

  /* ---------- loaders ---------- */

  var busy = function (on) { mount.setAttribute('aria-busy', on ? 'true' : 'false'); };

  /* Altegio knows who performs what, so ask it instead of hard-coding names:
     electrodepilación and sugaring are Alina's alone, laser and Endospheres are
     shared. Offering a choice of one person is a step that asks nothing, so the
     answer comes from the API and paint() drops the question when there is only
     one possible answer. Asked with every chosen service at once, so a
     multi-zone booking only offers someone who can do all of them. */
  var loadStaff = function () {
    busy(true);
    return api.staff(state.services)
      .then(function (list) { cache.staff = list || []; })
      ['catch'](function () { /* keep whoever we already knew about */ })
      .then(function () { busy(false); loadDates(); });
  };

  var loadDates = function () {
    busy(true);
    var from = ymd(new Date()), to = new Date();
    to.setDate(to.getDate() + state.weeks * 7);
    var share = cabinetStaff();
    var forStaff = function (id) { return api.dates(from, ymd(to), state.services, id); };
    return (share.length < 2
      ? forStaff(state.staff && state.staff.id)
      : Promise.all(share.map(forStaff)).then(sharedDates))
      .then(function (d) { cache.dates = (d && d.booking_dates) || []; })
      ['catch'](function () { cache.dates = []; })
      .then(function () { busy(false); render(); });
  };

  var loadTimes = function () {
    busy(true);
    var share = cabinetStaff();
    var forStaff = function (id) { return api.times(id, state.date, state.services); };
    (share.length < 2
      ? forStaff(state.staff && state.staff.id)
      : Promise.all(share.map(forStaff)).then(sharedTimes))
      .then(function (t) { cache.times = t || []; })
      ['catch'](function () { cache.times = []; })
      .then(function () { busy(false); render(); });
  };

  var ready = Promise.all([api.services(), api.staff()]).then(function (r) {
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
      if (hit) { state.category = hit; locked = true; }
    }
    track('booking_open', {});
    render();
  });

  ready['catch'](function () {
    /* if we cannot even list services we cannot book: hand the page back */
    mount.remove();
    if (fallback) fallback.hidden = false;
  });

  /* ---------- prefill from elsewhere on the page ----------
     The offer page lets somebody choose zones from photo cards long before
     they ever reach this form. Making them choose the same zones a second
     time here is the surest way to lose them, so cart.js hands the selection
     over and the widget opens on the day instead of on step one.

     What travels is Altegio service ids, read from data-altegio in the
     markup — nothing here matches on titles, which would break the first time
     a zone is renamed in Altegio. Returns whether the handoff took, so the
     caller can tell a prefill from a plain scroll. */
  window.s56Booking = {
    open: function (altegioIds) {
      return ready.then(function () {
        var want = (altegioIds || []).map(String), svcs = [];
        want.forEach(function (id) {
          cache.services.forEach(function (sv) { if (String(sv.id) === id) svcs.push(sv); });
        });
        if (!svcs.length) return false;
        state.mode = svcs.length > 1 ? 'many' : 'one';
        state.basket = svcs.slice();
        state.services = svcs.slice();
        state.pack = false;
        state.date = null; state.time = null; state.staff = null; state.assigned = null;
        track('booking_prefill', { service: chosenTitle(), zones: svcs.length });

        /* The zones are known the instant this is called; only the calendar is
           three seconds away. Painting first means the sheet opens on the right
           form -- chosen zones, waiting day strip -- instead of showing the
           step-one it was left on until the network catches up.

           And the two calls no longer queue. loadStaff -> loadDates was six
           seconds of Altegio, one wave after the other, when neither needs the
           other's answer: which cabinet staff to intersect is already known
           from the full list fetched at page load. If the service-filtered
           list turns out to disagree -- a zone only one of them performs --
           the days are fetched again, which is the rare case paying the cost
           instead of every booking. */
        busy(true);
        render();
        var assumed = cabinetStaff().join();
        var days = loadDates();
        var who = api.staff(state.services)
          .then(function (list) { if (list && list.length) cache.staff = list; })
          ['catch'](function () { /* keep whoever we already knew about */ });
        return Promise.all([days, who]).then(function () {
          return cabinetStaff().join() === assumed ? true : loadDates().then(function () { return true; });
        });
      })['catch'](function () { return false; });
    }
  };
})();
