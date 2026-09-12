/* Studio 56 — conversion tracking.

   One job: turn the handful of things that actually matter into named events,
   and hand them to whatever analytics tool is installed. No tool is installed
   yet, so today every event lands in window.dataLayer and window.s56Events and
   nothing breaks. Add GA4 (or GTM, or Plausible) later and the same events
   start arriving with no changes to this file or to any page.

   Event names follow GA4's recommended set where one fits — generate_lead,
   add_to_cart, begin_checkout, file_download — because recommended events can
   be marked as conversions in GA4 without any custom configuration.

   Buttons opt in with markup, not code:
     <a data-track="event_name" data-track-label="where it was">
   so a new button is tracked by adding an attribute, never by editing JS. */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     GA4. Paste the Measurement ID here and analytics switches on; leave it
     empty and the site sets no cookies, shows no banner and needs no
     consent — which is why it ships empty.
     ------------------------------------------------------------------ */
  var GA4_ID = 'G-ZKPRWV7WQ8';     // Studio 56 GA4 property
  var META_PIXEL_ID = '802801639552754';   // Studio 56 Meta Pixel
  var CONSENT_KEY = 's56-consent';
  var SOURCE_KEY = 's56-source';

  /* ------------------------------------------------------------------
     Where the visitor came from.

     Altegio's journal shows nothing about origin for a booking made through
     the site's own widget -- the payload only ever carried name, phone and
     email -- so the studio could not tell an Instagram booking from a Google
     one. This records a plain channel label; booking.js sends it along with
     the record, and it shows up in the journal beside the appointment.

     First touch wins and is never overwritten: somebody who arrives from
     Instagram, leaves, and comes back directly a week later still counts as
     Instagram. That is the rule the studio already uses for leads.

     It lives here rather than in booking.js because this file loads on every
     page. Land on the gift page from Instagram and walk to the prices page,
     and by then the referrer is our own domain -- the origin has to be caught
     on the first page, whichever page that is.

     No identifier is stored, only the channel and, when an ad supplies it,
     which creative was clicked: "instagram / bio", "google", "direct",
     "ig / paid / Laser oferta / Stat_Cuerpo completo-48mes-v1".

     utm_content carries the ad name. It is the only way the journal can show
     which of several creatives produced a booking -- the pixel knows, but the
     pixel only sees the visitors who accepted cookies, and this label is
     written whether they did or not.
     ------------------------------------------------------------------ */
  var captureSource = function () {
    try {
      if (window.localStorage.getItem(SOURCE_KEY)) return;   // first touch already held
    } catch (e) { return; }                                  // storage blocked: skip quietly

    var label = '';
    try {
      var q = new URLSearchParams(window.location.search);
      var src = q.get('utm_source');
      if (src) {
        var med = q.get('utm_medium');
        var camp = q.get('utm_campaign');
        var cont = q.get('utm_content');
        label = src + (med ? ' / ' + med : '') + (camp ? ' / ' + camp : '') +
                (cont ? ' / ' + cont : '');
      } else if (document.referrer) {
        var host = new URL(document.referrer).hostname.replace(/^www\./, '');
        if (host && host !== window.location.hostname) label = host;
      }
    } catch (e) {}

    try { window.localStorage.setItem(SOURCE_KEY, label || 'direct'); } catch (e) {}
  };
  captureSource();

  /* The address the visitor landed on, kept whole for the tags below. */
  var LANDED_ON = window.location.href;

  /* ---------- tidy the address bar ----------
     An ad link carries its campaign in the query string, which is right for us
     and meaningless to the person reading it -- four parameters of internal
     bookkeeping across the top of her screen the moment she arrives.

     The parameters have already done their work by this point: captureSource()
     above holds the first touch, and GA4 is handed the full URL explicitly. So
     the utm_* are dropped from what she sees. Nothing is reloaded and no entry
     is added to her history, so Back still leaves the site.

     fbclid and gclid stay: Meta and Google match a click to an ad by those, not
     by utm_*, and the Meta pixel only loads once consent is given -- long after
     this runs. Removing them would break the attribution the ads are billed on.
     Anything else the visitor arrived with is left alone too. */
  try {
    var url = new URL(window.location.href);
    var dropped = 0;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id']
      .forEach(function (k) { if (url.searchParams.has(k)) { url.searchParams['delete'](k); dropped++; } });
    if (dropped && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
    }
  } catch (e) {}


  window.dataLayer = window.dataLayer || [];
  window.s56Events = window.s56Events || [];   // readable in the console while testing

  var readConsent = function () {
    try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; }
  };

  /* ---------- consent, then GA4 ----------
     Consent Mode v2: storage is denied before any choice is made, so the tag
     may load but cannot write cookies. Accepting flips the four signals and
     Google backfills what it can. Declining leaves them denied for good. */
  if (GA4_ID) {
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    });

    if (readConsent() === 'granted') {
      window.gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
        analytics_storage: 'granted'
      });
    }

    var tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4_ID;
    document.head.appendChild(tag);

    window.gtag('js', new Date());
    /* page_location is pinned to the URL we actually landed on. gtag.js reads
       document.location when it processes this call, not when we queue it --
       so without this, tidying the address bar below could beat the tag to it
       and the campaign would arrive as (not set). */
    window.gtag('config', GA4_ID, { anonymize_ip: true, page_location: LANDED_ON });
  }

  /* ---------- Meta Pixel ----------
     GA4 can load in a denied state and backfill later; the pixel has no such
     mode, so the only compliant option is not to load it at all until consent
     exists — and to load it mid-session the moment consent is given.

     The ID is deliberately the existing 802801639552754: it already holds the
     visitor history collected while the site was on Weblium, and a fresh pixel
     would start that audience from zero. */
  var loadPixel = function () {
    if (!META_PIXEL_ID || window.fbq) return;

    /* Meta's own stub, kept verbatim — it queues calls made before the real
       library finishes loading. */
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  };

  if (readConsent() === 'granted') loadPixel();

  var setConsent = function (value) {
    try { window.localStorage.setItem(CONSENT_KEY, value); } catch (e) {}

    if (window.gtag) {
      var state = value === 'granted' ? 'granted' : 'denied';
      window.gtag('consent', 'update', {
        ad_storage: state,
        ad_user_data: state,
        ad_personalization: state,
        analytics_storage: state
      });
    }

    if (value === 'granted') loadPixel();

    var banner = document.getElementById('consent-banner');
    if (banner) banner.remove();
    document.body.classList.remove('consent-open');
    /* anything waiting for the cookie question to be answered (the offer
       banner in app.js) listens for this rather than polling the DOM */
    try { document.dispatchEvent(new CustomEvent('s56:consent')); } catch (e) {}
  };

  /* One string table per language. document.documentElement.lang is "uk" on the
     /ua/ pages, "ru" on /ru/ and "es" everywhere else; those pages sit one level
     down, so their privacy-policy link is a relative "privacidad.html" all the
     same. Spanish is the fallback for any unexpected value. */
  var LANG = document.documentElement.lang;
  var pick = function (t) { return t[LANG] || t.es; };
  var T = pick({
    uk: {
      cookies: 'Куки',
      text: 'Ми використовуємо аналітичні куки, щоб розуміти, як користуються сайтом, і покращувати його. ' +
            'Ви можете прийняти або відхилити їх — відмова не вплине на роботу сайту. ',
      policy: 'Політика конфіденційності',
      accept: 'Прийняти',
      reject: 'Відхилити'
    },
    ru: {
      cookies: 'Куки',
      text: 'Мы используем аналитические куки, чтобы понимать, как пользуются сайтом, и улучшать его. ' +
            'Вы можете принять или отклонить их — отказ не повлияет на работу сайта. ',
      policy: 'Политика конфиденциальности',
      accept: 'Принять',
      reject: 'Отклонить'
    },
    es: {
      cookies: 'Cookies',
      text: 'Usamos cookies de análisis para entender cómo se usa la web y mejorarla. ' +
            'Puedes aceptarlas o rechazarlas — rechazarlas no afecta al funcionamiento de la web. ',
      policy: 'Política de privacidad',
      accept: 'Aceptar',
      reject: 'Rechazar'
    }
  });

  var showBanner = function () {
    if (document.getElementById('consent-banner')) return;

    var banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.id = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', T.cookies);
    banner.innerHTML =
      '<p class="consent-text">' + T.text +
      '<a href="privacidad.html">' + T.policy + '</a>.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="btn btn-primary" data-consent="granted">' + T.accept + '</button>' +
      '<button type="button" class="btn btn-secondary" data-consent="denied">' + T.reject + '</button>' +
      '</div>';

    document.body.appendChild(banner);
    document.body.classList.add('consent-open');
    /* the cart bar and sticky CTA sit at bottom:0 — lift them clear of this */
    document.documentElement.style.setProperty('--consent-h', banner.offsetHeight + 'px');
  };

  document.addEventListener('click', function (e) {
    var choice = e.target.closest('[data-consent]');
    if (choice) {
      setConsent(choice.dataset.consent);
      return;
    }
    /* withdrawing has to be as easy as giving — the footer link reopens this */
    var reopen = e.target.closest('[data-consent-open]');
    if (reopen) {
      e.preventDefault();
      showBanner();
    }
  });

  if ((GA4_ID || META_PIXEL_ID) && !readConsent()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }

  /* ---------- attribution ----------
     Recorded first-party and sent with the booking itself, so channel data
     survives ad blockers and a declined cookie banner — the sheet in Albato
     ends up knowing where a lead came from even when GA4 never saw the visit.

     Both touches are kept: first-touch is the one that decides the channel
     under the studio's own attribution rule, last-touch is kept alongside it
     so a re-engagement campaign is still visible. */
  var ATTR_FIRST = 's56-attr-first';
  var ATTR_LAST = 's56-attr-last';

  var readStore = function (key) {
    try { return JSON.parse(window.localStorage.getItem(key)); } catch (e) { return null; }
  };

  var currentTouch = function () {
    var q = new URLSearchParams(window.location.search);
    var ref = document.referrer || '';
    var refHost = '';
    try { refHost = ref ? new URL(ref).hostname : ''; } catch (e) {}

    var source = q.get('utm_source') || '';
    var medium = q.get('utm_medium') || '';

    if (!source) {
      if (q.get('gclid')) { source = 'google'; medium = medium || 'cpc'; }
      else if (q.get('fbclid')) { source = 'facebook'; medium = medium || 'paid_social'; }
      else if (refHost && refHost !== window.location.hostname) { source = refHost; medium = medium || 'referral'; }
      else { source = 'directo'; medium = medium || 'none'; }
    }

    return {
      source: source,
      medium: medium,
      campaign: q.get('utm_campaign') || '',
      content: q.get('utm_content') || '',
      term: q.get('utm_term') || '',
      gclid: q.get('gclid') || '',
      fbclid: q.get('fbclid') || '',
      referrer: ref,
      landing: window.location.pathname + window.location.search,
      ts: new Date().toISOString()
    };
  };

  var touch = currentTouch();

  /* A bare direct hit on page five is not a new touch — it would overwrite a
     real campaign with "directo" just because someone came back later. */
  var isMeaningful = touch.source !== 'directo';

  if (!readStore(ATTR_FIRST)) {
    try { window.localStorage.setItem(ATTR_FIRST, JSON.stringify(touch)); } catch (e) {}
  }
  if (isMeaningful || !readStore(ATTR_LAST)) {
    try { window.localStorage.setItem(ATTR_LAST, JSON.stringify(touch)); } catch (e) {}
  }

  window.s56Attribution = function () {
    return { first: readStore(ATTR_FIRST), last: readStore(ATTR_LAST) };
  };

  /* GA4 event names on the left, Meta's standard events on the right. Only
     standard names can be picked as an optimisation goal in Ads Manager, so
     anything with a real equivalent is mapped; the rest go through as custom
     events, which still work for reporting and audiences. */
  var META_EVENTS = {
    generate_lead: 'Lead',
    booking_success: 'Schedule',
    cart_updated: 'AddToCart',
    begin_checkout: 'InitiateCheckout'
  };

  /* Fan out to whichever tool is present. All are optional. */
  var send = function (name, params) {
    var payload = params || {};

    window.s56Events.push([name, payload, new Date().toISOString()]);
    window.dataLayer.push(Object.assign({ event: name }, payload));

    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
    if (typeof window.plausible === 'function') window.plausible(name, { props: payload });
    if (typeof window.fbq === 'function') {
      if (META_EVENTS[name]) window.fbq('track', META_EVENTS[name], payload);
      else window.fbq('trackCustom', name, payload);
    }
  };

  window.s56Track = send;

  /* ---------- declarative: anything carrying data-track ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-track]');
    if (!el) return;

    var params = { label: el.dataset.trackLabel || '' };
    var href = el.getAttribute('href');
    if (href) params.link_url = href;

    send(el.dataset.track, params);
  });

  /* ---------- WhatsApp is the studio's real lead channel ----------
     Tracked here rather than by attribute so no wa.me link can be added
     later and silently go uncounted. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="wa.me"]');
    if (!link || link.hasAttribute('data-track')) return;

    send('generate_lead', {
      method: 'whatsapp',
      label: link.dataset.trackLabel || link.className || '',
      link_url: link.getAttribute('href')
    });
  });

  /* ---------- price list download ---------- */
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href$=".pdf"]');
    if (!link) return;
    send('file_download', { file_name: link.getAttribute('href'), link_text: link.textContent.trim() });
  });

  /* ---------- cart: what people pick, and what they abandon ---------- */
  document.addEventListener('s56cartchange', function () {
    var items;
    try {
      items = JSON.parse(window.localStorage.getItem('s56-cart')) || [];
    } catch (err) {
      return;
    }

    send('cart_updated', {
      items: items.length,
      value: items.reduce(function (sum, i) { return sum + (i.price || 0); }, 0),
      currency: 'EUR'
    });
  });

  /* ---------- booking submitted: the lead itself ----------
     Listens on document in the capture phase deliberately. cart.js empties the
     cart inside its own submit handler on the form, so a listener on the form
     would race it and report every lead as worth 0 €. Capture on an ancestor
     always runs first, whatever order the scripts happen to load in. */
  document.addEventListener('submit', function (e) {
    if (!e.target || e.target.id !== 'reserva-form') return;

    var items = [];
    try {
      items = JSON.parse(window.localStorage.getItem('s56-cart')) || [];
    } catch (err) { /* value just goes unreported */ }

    send('generate_lead', {
      method: 'formulario_reserva',
      currency: 'EUR',
      value: items.reduce(function (sum, i) { return sum + (i.price || 0); }, 0),
      items: items.length,
      servicios: items.map(function (i) { return i.name; }).join(' | ')
    });
  }, true);
})();
