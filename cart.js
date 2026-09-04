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
    notes: 'Нотатки: ',
    saveRe: /економія|заощад/i,
    packLead: 'Вигідніше пакетом: ',
    packLeadPartial: 'Частину зон вигідніше пакетом: ',
    packSave: ' — економія ',
    packBtn: 'Застосувати пакет',
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
    notes: 'Notas: ',
    saveRe: /ahorras/i,
    packLead: 'Más barato en pack: ',
    packLeadPartial: 'Parte de las zonas sale mejor en pack: ',
    packSave: ' — ahorras ',
    packBtn: 'Aplicar el pack',
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

    var LASER_PACKS = [
      { id: 'depilacion-laser-3-1-axilas-ingles', zones: ['depilacion-laser-axilas', 'depilacion-laser-ingles-completas'] },
      { id: 'depilacion-laser-3-1-axilas-ingles-medias-piernas', zones: ['depilacion-laser-axilas', 'depilacion-laser-ingles-completas', 'depilacion-laser-medias-piernas'] },
      { id: 'depilacion-laser-3-1-axilas-ingles-piernas-completas', zones: ['depilacion-laser-axilas', 'depilacion-laser-ingles-completas', 'depilacion-laser-piernas-completas'] },
      { id: 'depilacion-laser-3-1-cuerpo-completo', zones: ['depilacion-laser-cuerpo-completo'] }
    ];

    var ENDO_PACKS = {
      'endospheres-rostro-de-30-a-40-min': 'endospheres-3-1-rostro',
      'endospheres-cuerpo-60-min': 'endospheres-3-1-cuerpo-60-min',
      'endospheres-cuerpo-90-min': 'endospheres-3-1-cuerpo-90-min'
    };

    var ELECTRO_MINUTES = {
      'electrodepilacion-30-minutos': 30,
      'electrodepilacion-60-minutos': 60,
      'electrodepilacion-90-minutos': 90,
      'electrodepilacion-120-minutos': 120
    };

    var sameSet = function (a, b) {
      if (a.length !== b.length || !a.length) return false;
      var sa = a.slice().sort(), sb = b.slice().sort();
      return sa.every(function (v, i) { return v === sb[i]; });
    };

    /* Laser and ендосфера return a swappable {removeIds, addId, standalone};
       electro is a plain {electro:true} flag, with no numbers attached.

       A pack counts when everything it covers is already selected — it does NOT have
       to be the whole selection. Picking axilas + ingles + brazos should still hear
       about the axilas + ingles pack, with brazos simply staying a separate line;
       requiring an exact set match meant that case said nothing at all. */
    var findMatch = function (ids) {
      var laserZones = ids.filter(function (id) {
        return id.indexOf('depilacion-laser-') === 0 && id.indexOf('-3-1-') === -1;
      });

      var best = null;
      for (var p = 0; p < LASER_PACKS.length; p++) {
        var pack = LASER_PACKS[p];
        if (ids.indexOf(pack.id) !== -1) continue;

        var coversAll = pack.zones.every(function (z) { return laserZones.indexOf(z) !== -1; });
        if (!coversAll) continue;

        /* the pack is 4 sessions, so the fair comparison is 4 one-off visits, not 1 */
        var standalone = 4 * pack.zones.reduce(function (s, z) { return s + rowById[z].price; }, 0);
        var save = standalone - rowById[pack.id].price;

        /* several packs can fit at once (packs 1-3 nest); offer the biggest saving */
        if (save > 0 && (!best || save > best.save)) {
          best = {
            removeIds: pack.zones,
            addId: pack.id,
            standalone: standalone,
            save: save,
            partial: pack.zones.length < laserZones.length
          };
        }
      }
      if (best) return best;

      /* No combo pack fits, but a single zone is selected on its own: every real
         "3 + 1" on the price list is priced as three sessions with the fourth free
         (Ендосфера 40 -> 120, усе тіло 90 -> 270), so the same arithmetic gives an
         honest figure for a zone that has no pack row of its own. Nothing invented:
         it is the studio's own 3 + 1 applied to one zone. */
      if (laserZones.length === 1) {
        var zone = rowById[laserZones[0]];
        var parts = zone.name.split(' · ');
        return {
          removeIds: [laserZones[0]],
          virtual: true,
          virtualId: 'depilacion-laser-3-1-' + laserZones[0].replace('depilacion-laser-', ''),
          virtualName: parts[0] + ' · 3 + 1 ' + parts[parts.length - 1],
          virtualPrice: 3 * zone.price,
          standalone: 4 * zone.price
        };
      }

      for (var single in ENDO_PACKS) {
        if (ids.indexOf(single) !== -1 && ids.indexOf(ENDO_PACKS[single]) === -1) {
          return { removeIds: [single], addId: ENDO_PACKS[single], standalone: 4 * rowById[single].price };
        }
      }

      var electroIds = ids.filter(function (id) { return ELECTRO_MINUTES.hasOwnProperty(id); });
      if (electroIds.length) return { electro: true };

      return null;
    };

    var syncSuggestion = function () {
      var match = findMatch(read().map(function (i) { return i.id; }));

      if (match && match.electro) {
        suggestionText.textContent = T.packElectroHint;
        suggestionBtn.textContent = T.packElectroBtn;
        suggestion.hidden = false;
        cartBarEl.classList.add('has-suggestion');
        return;
      }

      if (match) {
        var pack = match.virtual
          ? { name: match.virtualName, price: match.virtualPrice }
          : rowById[match.addId];
        var save = match.standalone - pack.price;
        if (save > 0) {
          var label = pack.name.split(' · ').pop();
          var lead = match.partial ? T.packLeadPartial : T.packLead;
          suggestionText.textContent = lead + label + ' — ' + fmt(pack.price) + T.packSave + fmt(save);
          suggestionBtn.textContent = T.packBtn;
          suggestion.hidden = false;
          cartBarEl.classList.add('has-suggestion');
          return;
        }
      }

      suggestion.hidden = true;
      cartBarEl.classList.remove('has-suggestion');
    };

    suggestionBtn.addEventListener('click', function () {
      var items = read();
      var match = findMatch(items.map(function (i) { return i.id; }));
      if (!match) return;

      if (match.electro) {
        document.getElementById('p-electro').scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }

      var pack = match.virtual
        ? { id: match.virtualId, name: match.virtualName, price: match.virtualPrice }
        : rowById[match.addId];
      var kept = items.filter(function (i) { return match.removeIds.indexOf(i.id) === -1; });
      kept.push({ id: pack.id, name: pack.name, price: pack.price, priceFirst: null, note: null });
      write(kept);
    });

    document.addEventListener('s56cartchange', syncSuggestion);
    syncSuggestion();
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
