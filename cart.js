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
    remove: 'Прибрати ',
    sending: 'Надсилаємо…',
    hello: 'Вітаю! Хочу записатися:',
    total: 'Разом: ',
    name: 'Імʼя: ',
    phone: 'Телефон: ',
    datePref: 'Бажана дата: ',
    notes: 'Нотатки: ',
    saveRe: /економія|заощад/i
  } : {
    unit: ['servicio', 'servicios', 'servicios'],
    priceFirstOn: 'Mostrando el precio de primera sesión. Tócalo para ver el precio normal.',
    priceFirstOff: 'Mostrando el precio normal. Tócalo si es tu primera sesión.',
    remove: 'Quitar ',
    sending: 'Enviando…',
    hello: 'Hola! Quiero reservar:',
    total: 'Total: ',
    name: 'Nombre: ',
    phone: 'Teléfono: ',
    datePref: 'Fecha preferida: ',
    notes: 'Notas: ',
    saveRe: /ahorras/i
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

  var isFirst = function () {
    return window.localStorage.getItem(KEY_FIRST) !== '0';
  };

  var setFirst = function (on) {
    try { window.localStorage.setItem(KEY_FIRST, on ? '1' : '0'); } catch (e) {}
    document.dispatchEvent(new CustomEvent('s56cartchange'));
  };

  /* Price actually charged for a line: the −20 % first-session rate only exists
     on single Endospheres sessions, and only while the client says it's their first. */
  var linePrice = function (item) {
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
        btn.setAttribute('aria-pressed', ids.indexOf(btn.dataset.id) !== -1 ? 'true' : 'false');
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
        var discounted = charged !== item.price;

        var li = document.createElement('li');

        var label = document.createElement('span');
        label.className = 'row-label';
        label.textContent = item.name;

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
        notas: data.get('notas') || '',
        servicios: items.map(function (i) {
          return { nombre: i.name, precio: i.price, precio_aplicado: linePrice(i) };
        }),
        servicios_texto: items.map(function (i) {
          return i.name + ' (' + fmt(linePrice(i)) + ')';
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
        items.forEach(function (i) { lines.push('· ' + i.name + ' — ' + fmt(linePrice(i))); });
        lines.push(T.total + fmt(total(items)));
        lines.push(T.name + payload.nombre);
        lines.push(T.phone + telefono);
        lines.push(T.datePref + payload.fecha_preferida + ' (' + payload.franja_preferida + ')');
        if (payload.notas) lines.push(T.notes + payload.notas);
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
