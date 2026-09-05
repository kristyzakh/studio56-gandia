/* Studio 56 — service selection, checkout and booking submission.
   Same convention as app.js: every block guards on the elements it needs,
   so this one file is safe to load on all pages. */
(function () {
  'use strict';

  /* Albato inbound webhook. Until it is filled in, the checkout falls back to
     opening WhatsApp with the whole order prefilled, so the button is never dead. */
  var BOOKING_ENDPOINT = '';
  var WHATSAPP = '34621070775';

  /* Language table — "uk" on the /ua/ pages, "es" everywhere else. */
  var UK = document.documentElement.lang === 'uk';
  var T = UK ? {
    unit: ['послуга', 'послуги', 'послуг'],
    priceFirstOn: 'Показано ціну першого сеансу. Натисніть, щоб побачити звичайну ціну.',
    priceFirstOff: 'Показано звичайну ціну. Натисніть, якщо це ваш перший сеанс.',
    add: 'Додати ',
    remove: 'Прибрати ',
    sending: 'Надсилаємо…',
    hello: 'Вітаю! Хочу записатися:',
    total: 'Разом: ',
    name: 'Імʼя: ',
    phone: 'Телефон: ',
    datePref: 'Бажана дата: ',
    saveRe: /економія|заощад/i,
    offerLead: 'З акцією 3 + 1 чотири сеанси — ',
    offerInstead: ' замість ',
    courseOff: 'Порахувати курс 3 + 1',
    courseOn: 'Ціна за курс — 4 сеанси',
    courseHint: 'Показано ціну курсу. Окремими сеансами вийшло б ',
    courseTag: ' · курс 4 сеанси',
    packElectroHint: 'Плануєте кілька сеансів електроепіляції? Пакет годин виходить дешевше за годину.',
    packElectroBtn: 'Переглянути пакети'
  } : {
    unit: ['servicio', 'servicios', 'servicios'],
    priceFirstOn: 'Mostrando el precio de primera sesión. Tócalo para ver el precio normal.',
    priceFirstOff: 'Mostrando el precio normal. Tócalo si es tu primera sesión.',
    add: 'Añadir ',
    remove: 'Quitar ',
    sending: 'Enviando…',
    hello: 'Hola! Quiero reservar:',
    total: 'Total: ',
    name: 'Nombre: ',
    phone: 'Teléfono: ',
    datePref: 'Fecha preferida: ',
    saveRe: /ahorras/i,
    offerLead: 'Con el 3 + 1, cuatro sesiones — ',
    offerInstead: ' en vez de ',
    courseOff: 'Calcular el curso 3 + 1',
    courseOn: 'Precio del curso — 4 sesiones',
    courseHint: 'Precio del curso. Sesión a sesión saldría ',
    courseTag: ' · curso de 4 sesiones',
    packElectroHint: '¿Vas a hacer varias sesiones de electrodepilación? Un pack de horas sale más barato por hora.',
    packElectroBtn: 'Ver los packs'
  };

  /* plural form index: ES is [1 | rest]; UK is [1 | 2-4 | 5-0 & teens]. */
  var pluralIdx = function (n) {
    if (!UK) return n === 1 ? 0 : 1;
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return 0;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 1;
    return 2;
  };

  var KEY = 's56-cart';
  var KEY_FIRST = 's56-cart-first';

  var read = function () {
    try {
      var v = JSON.parse(window.localStorage.getItem(KEY));
      return Array.isArray(v) ? v : [];
    } catch (e) {
      return [];
    }
  };

  var write = function (items) {
    try { window.localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('s56cartchange'));
  };

  /* Kept for the visit, not for ever. "Is this your first session" is a fact
     about a person on a particular day, not a preference: somebody who once
     tapped to see the normal price would otherwise never be shown the
     introductory one again, on any later visit. Session storage still carries
     the answer from the price list to the booking page, which is what it is
     needed for. */
  var firstStore = function () {
    try { return window.sessionStorage; } catch (e) { return null; }
  };

  var isFirst = function () {
    var s = firstStore();
    return !s || s.getItem(KEY_FIRST) !== '0';
  };

  var setFirst = function (on) {
    var s = firstStore();
    try { if (s) s.setItem(KEY_FIRST, on ? '1' : '0'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('s56cartchange'));
  };

  /* Price actually charged for a line: the −20 % first-session rate only exists
     on single Endospheres sessions, and only while the client says it's their first. */
  /* 3 + 1 applies to laser and endospheres only; electro sells hour bundles and
     wax is per zone, so they stay at one session whatever the toggle says. */
  var OFFER_PREFIXES = ['depilacion-laser-', 'endospheres-'];
  var offerable = function (item) {
    return OFFER_PREFIXES.some(function (pre) { return item.id.indexOf(pre) === 0; });
  };

  var COURSE_KEY = 's56-course';
  var isCourse = function () {
    try { return localStorage.getItem(COURSE_KEY) === '1'; } catch (e) { return false; }
  };
  var setCourse = function (on) {
    try { on ? localStorage.setItem(COURSE_KEY, '1') : localStorage.removeItem(COURSE_KEY); } catch (e) {}
  };

  /* The studio must see what the visitor actually chose, not a price we
     reverse-engineered: a line booked as a course says so. */
  var lineName = function (item) {
    return item.name + (isCourse() && offerable(item) ? T.courseTag : '');
  };

  var linePrice = function (item) {
    /* four sessions, pay for three — and never off the first-session rate, which
       is an introductory price and does not compound with the offer */
    if (isCourse() && offerable(item)) return 3 * item.price;
    return (isFirst() && item.priceFirst) ? item.priceFirst : item.price;
  };

  var total = function (items) {
    return items.reduce(function (sum, item) { return sum + linePrice(item); }, 0);
  };

  var fmt = function (n) {
    return (Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '') + ' €';
  };

  var plural = function (n) {
    return n + ' ' + T.unit[pluralIdx(n)];
  };

  /* ---------- price rows: tap to add or remove ---------- */
  var rowButtons = [].slice.call(document.querySelectorAll('.row-add'));

  if (rowButtons.length) {
    var syncRows = function () {
      var ids = read().map(function (i) { return i.id; });
      rowButtons.forEach(function (btn) {
        var on = ids.indexOf(btn.dataset.id) !== -1;
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label', (on ? T.remove : T.add) + btn.dataset.name);
      });
    };

    /* The discounted rate is a choice, not a given: a returning client booking a
       single session needs to be able to pick the normal price. The switch rewrites
       the eligible rows so what you see is what gets added. */
    var toggle = document.getElementById('first-toggle');
    var hint = document.getElementById('first-hint');

    var syncPrices = function () {
      var on = isFirst();

      if (toggle) {
        toggle.setAttribute('aria-pressed', on ? 'true' : 'false');
        hint.textContent = on ? T.priceFirstOn : T.priceFirstOff;
      }

      rowButtons.forEach(function (btn) {
        if (!btn.dataset.priceFirst) return;

        var amount = btn.querySelector('.amount');
        amount.textContent = '';

        if (on) {
          var was = document.createElement('s');
          was.className = 'was';
          was.textContent = fmt(Number(btn.dataset.price));
          var now = document.createElement('span');
          now.className = 'now';
          now.textContent = fmt(Number(btn.dataset.priceFirst));
          amount.appendChild(was);
          amount.appendChild(now);
        } else {
          amount.textContent = fmt(Number(btn.dataset.price));
        }
      });
    };

    if (toggle) {
      toggle.addEventListener('click', function () { setFirst(!isFirst()); });
    }
    document.addEventListener('s56cartchange', syncPrices);
    syncPrices();

    rowButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var items = read();
        var at = items.findIndex(function (i) { return i.id === btn.dataset.id; });

        if (at !== -1) {
          items.splice(at, 1);
        } else {
          /* A pack's saving travels with it into the cart — the whole point of a
             pack is the saving, so it should never be shown without one. */
          var noteEl = btn.querySelector('.note');
          var note = noteEl && T.saveRe.test(noteEl.textContent) ? noteEl.textContent : null;

          items.push({
            id: btn.dataset.id,
            name: btn.dataset.name,
            price: Number(btn.dataset.price),
            priceFirst: btn.dataset.priceFirst ? Number(btn.dataset.priceFirst) : null,
            note: note
          });
        }
        write(items);
      });
    });

    document.addEventListener('s56cartchange', syncRows);
    syncRows();
  }

  /* ---------- pack suggestions: point out a cheaper bundle for what's picked ----------
     Only Ендосфера, Лазер, Електро have packs; Шугаринг/віск is per-zone by design.
     Laser and Ендосфера comparisons are apples-to-apples (the pack covers exactly what
     was selected), so they get an exact € saving and a one-tap swap. Electro's packs
     are hour-bundles unrelated to which single session length you picked, so a "you
     save €X" claim would compare different amounts of service — that one stays a
     plain nudge toward the packs list instead of a number we can't stand behind. */
  var suggestion = document.getElementById('pack-suggestion');

  if (suggestion && rowButtons.length) {
    var suggestionText = document.getElementById('pack-suggestion-text');
    var suggestionBtn = document.getElementById('pack-suggestion-btn');
    var cartBarEl = document.getElementById('cart-bar');

    var rowById = {};
    rowButtons.forEach(function (b) {
      rowById[b.dataset.id] = { id: b.dataset.id, name: b.dataset.name, price: Number(b.dataset.price) };
    });

    /* 3 + 1 is a studio-wide offer, not a product: every fourth session free,
       on laser and endospheres, on single zones as much as on zone packs. So
       there is nothing to swap the selection for — the cart simply shows what
       four sessions of what is already picked would cost under it. The old
       engine matched hard-coded pack rows; those rows are gone from the price
       list now, and matching them would have thrown on the first lookup. */
    var ELECTRO_MINUTES = {
      'electrodepilacion-30-minutos': 30,
      'electrodepilacion-60-minutos': 60,
      'electrodepilacion-90-minutos': 90,
      'electrodepilacion-120-minutos': 120
    };

    var syncSuggestion = function () {
      var items = read();
      var ids = items.map(function (i) { return i.id; });

      var eligible = items.filter(offerable);

      if (eligible.length) {
        var perVisit = eligible.reduce(function (s, i) { return s + rowById[i.id].price; }, 0);
        if (perVisit > 0) {
          suggestionText.textContent = isCourse()
            ? T.courseHint + fmt(4 * perVisit)
            : T.offerLead + fmt(3 * perVisit) + T.offerInstead + fmt(4 * perVisit);
          suggestionBtn.hidden = true;
          suggestion.hidden = false;
          cartBarEl.classList.add('has-suggestion');
          return;
        }
      }

      if (ids.some(function (id) { return ELECTRO_MINUTES.hasOwnProperty(id); })) {
        suggestionText.textContent = T.packElectroHint;
        suggestionBtn.textContent = T.packElectroBtn;
        suggestionBtn.hidden = false;
        suggestion.hidden = false;
        cartBarEl.classList.add('has-suggestion');
        return;
      }

      suggestion.hidden = true;
      cartBarEl.classList.remove('has-suggestion');
    };

    /* The only button left belongs to the electro nudge — 3 + 1 has nothing to
       swap to, so it shows no button at all. */
    suggestionBtn.addEventListener('click', function () {
      var target = document.getElementById('p-electro');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.addEventListener('s56cartchange', syncSuggestion);
    syncSuggestion();
  }

  /* ---------- course toggle ---------- */
  var courseBtn = document.getElementById('cart-course');

  if (courseBtn) {
    var courseLabel = document.getElementById('cart-course-label');
    var syncCourse = function () {
      var on = isCourse();
      var any = read().some(offerable);
      courseBtn.hidden = !any;               // nothing to apply it to
      courseBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      courseLabel.textContent = on ? T.courseOn : T.courseOff;
    };
    courseBtn.addEventListener('click', function () {
      setCourse(!isCourse());
      syncCourse();
      document.dispatchEvent(new CustomEvent('s56cartchange'));
    });
    document.addEventListener('s56cartchange', syncCourse);
    syncCourse();
  }

  /* ---------- sticky cart bar ---------- */
  var bar = document.getElementById('cart-bar');

  if (bar) {
    var barCount = document.getElementById('cart-bar-count');
    var barTotal = document.getElementById('cart-bar-total');

    var syncBar = function () {
      var items = read();
      bar.hidden = items.length === 0;
      document.body.classList.toggle('has-cart', items.length > 0);
      if (items.length) {
        barCount.textContent = plural(items.length);
        barTotal.textContent = fmt(total(items));
      }
    };

    document.addEventListener('s56cartchange', syncBar);
    syncBar();
  }

  /* ---------- cart peek: review and remove without leaving the page ----------
     Tapping a price row toggles that one service off again, but a pack the
     calculator worked out for a single zone has no row of its own — so once it was
     applied there was no way at all to take it back off this page. Opening the bar
     covers every line the same way, whatever put it there. */
  var peek = document.getElementById('cart-peek');

  if (peek) {
    var peekToggle = document.getElementById('cart-peek-toggle');
    var peekBar = document.getElementById('cart-bar');

    /* Open by default: what you picked is the thing you came to check, and
       hiding it behind a tap made the bar a number with no explanation.
       Collapsing is remembered for the visit, so somebody who wants it out of
       the way does not have to close it again after every service they add. */
    var collapsed = false;

    var setPeek = function (open) {
      peek.hidden = !open;
      peekToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      peekBar.classList.toggle('has-peek', open);
    };

    var renderPeek = function () {
      var items = read();
      peek.textContent = '';

      items.forEach(function (item) {
        var li = document.createElement('li');

        var name = document.createElement('span');
        name.className = 'cart-peek-name';
        name.textContent = item.name;

        var price = document.createElement('span');
        price.className = 'cart-peek-price';
        price.textContent = fmt(linePrice(item));

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'row-remove';
        remove.setAttribute('aria-label', T.remove + item.name);
        remove.addEventListener('click', function () {
          write(read().filter(function (i) { return i.id !== item.id; }));
        });

        li.appendChild(name);
        li.appendChild(price);
        li.appendChild(remove);
        peek.appendChild(li);
      });

      /* an empty bar is hidden anyway, so leaving it open would strand the state */
      setPeek(items.length > 0 && !collapsed);
    };

    peekToggle.addEventListener('click', function () {
      collapsed = !peek.hidden;
      setPeek(peek.hidden);
    });

    document.addEventListener('s56cartchange', renderPeek);
    renderPeek();
  }

  /* ---------- checkout ---------- */
  var checkout = document.getElementById('checkout');

  if (checkout) {
    var list = document.getElementById('cart-items');
    var empty = document.getElementById('cart-empty');
    var totalEl = document.getElementById('cart-total');
    var firstRow = document.getElementById('first-session-row');
    var firstBox = document.getElementById('first-session');
    var form = document.getElementById('reserva-form');

    var renderCart = function () {
      var items = read();

      empty.hidden = items.length > 0;
      checkout.hidden = items.length === 0;
      if (!items.length) return;

      list.textContent = '';
      items.forEach(function (item) {
        var charged = linePrice(item);
        /* Strike through the old price only when the new one is lower. A course
           costs more than one session by design, and "28 € 84 €" with the 28
           crossed out reads as a price rise, not as four sessions. */
        var discounted = charged < item.price;

        var li = document.createElement('li');

        var label = document.createElement('span');
        label.className = 'row-label';
        label.textContent = lineName(item);

        if (item.note) {
          var note = document.createElement('span');
          note.className = 'note';
          note.textContent = item.note;
          label.appendChild(note);
        }

        var amount = document.createElement('span');
        amount.className = 'amount';
        if (discounted) {
          var was = document.createElement('s');
          was.className = 'was';
          was.textContent = fmt(item.price);
          var now = document.createElement('span');
          now.className = 'now';
          now.textContent = fmt(charged);
          amount.appendChild(was);
          amount.appendChild(now);
        } else {
          amount.textContent = fmt(charged);
        }

        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'row-remove';
        remove.setAttribute('aria-label', T.remove + item.name);
        remove.addEventListener('click', function () {
          write(read().filter(function (i) { return i.id !== item.id; }));
        });

        li.appendChild(label);
        li.appendChild(amount);
        li.appendChild(remove);
        list.appendChild(li);
      });

      firstRow.hidden = !items.some(function (i) { return i.priceFirst; });
      firstBox.checked = isFirst();
      totalEl.textContent = fmt(total(items));
    };

    form.querySelector('#fecha').min = new Date().toISOString().slice(0, 10);

    firstBox.addEventListener('change', function () { setFirst(firstBox.checked); });
    document.addEventListener('s56cartchange', renderCart);
    renderCart();

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var items = read();
      if (!items.length) return;

      var data = new FormData(form);
      var telefono = String(data.get('prefijo')) + String(data.get('telefono')).replace(/\s+/g, '');

      /* Flat keys so an Albato → Google Sheets step can map straight to columns
         without unpacking anything. The attribution fields are the reason the
         sheet can report channel without depending on GA4. */
      var attr = (window.s56Attribution && window.s56Attribution()) || {};
      var first = attr.first || {};
      var last = attr.last || {};

      var payload = {
        source: 'web-checkout',
        referencia: 'S56-' + Date.now().toString(36).toUpperCase(),
        recibido: new Date().toISOString(),
        nombre: data.get('nombre'),
        telefono: telefono,
        fecha_preferida: data.get('fecha'),
        franja_preferida: data.get('franja'),
        primera_sesion: isFirst(),
        servicios: items.map(function (i) {
          return { nombre: lineName(i), precio: i.price, precio_aplicado: linePrice(i) };
        }),
        servicios_texto: items.map(function (i) {
          return lineName(i) + ' (' + fmt(linePrice(i)) + ')';
        }).join(' | '),
        total: total(items),

        origen_source: first.source || '',
        origen_medium: first.medium || '',
        origen_campaign: first.campaign || '',
        origen_landing: first.landing || '',
        origen_fecha: first.ts || '',
        ultimo_source: last.source || '',
        ultimo_medium: last.medium || '',
        ultimo_campaign: last.campaign || '',
        gclid: first.gclid || last.gclid || '',
        fbclid: first.fbclid || last.fbclid || ''
      };

      var submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      submit.textContent = T.sending;

      var done = function () {
        try { window.localStorage.removeItem(KEY); } catch (e) {}
        window.location.href = 'gracias.html';
      };

      if (!BOOKING_ENDPOINT) {
        var lines = [T.hello];
        items.forEach(function (i) { lines.push('· ' + lineName(i) + ' — ' + fmt(linePrice(i))); });
        lines.push(T.total + fmt(total(items)));
        lines.push(T.name + payload.nombre);
        lines.push(T.phone + telefono);
        lines.push(T.datePref + payload.fecha_preferida + ' (' + payload.franja_preferida + ')');
        window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(lines.join('\n')), '_blank');
        done();
        return;
      }

      /* no-cors keeps the browser from blocking the request when the webhook
         sends no CORS headers. The response is opaque, so this cannot report a
         failure — the studio confirms every booking by hand, which is the check. */
      window.fetch(BOOKING_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
      }).then(done, done);
    });
  }

  /* ---------- thank-you page: the booking is sent, so the cart is spent ---------- */
  if (document.getElementById('gracias')) {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
  }
})();
