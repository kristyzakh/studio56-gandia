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
  var GA4_ID = '';                 // e.g. 'G-XXXXXXXXXX'
  var CONSENT_KEY = 's56-consent';

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
    window.gtag('config', GA4_ID, { anonymize_ip: true });
  }

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

    var banner = document.getElementById('consent-banner');
    if (banner) banner.remove();
    document.body.classList.remove('consent-open');
  };

  var showBanner = function () {
    if (document.getElementById('consent-banner')) return;

    var banner = document.createElement('div');
    banner.className = 'consent-banner';
    banner.id = 'consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookies');
    banner.innerHTML =
      '<p class="consent-text">Usamos cookies de análisis para entender cómo se usa la web y mejorarla. ' +
      'Puedes aceptarlas o rechazarlas — rechazarlas no afecta a nada de lo que puedes hacer aquí. ' +
      '<a href="privacidad.html">Política de privacidad</a>.</p>' +
      '<div class="consent-actions">' +
      '<button type="button" class="btn btn-primary" data-consent="granted">Aceptar</button>' +
      '<button type="button" class="btn btn-secondary" data-consent="denied">Rechazar</button>' +
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

  if (GA4_ID && !readConsent()) {
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

  /* Fan out to whichever tool is present. All are optional. */
  var send = function (name, params) {
    var payload = params || {};

    window.s56Events.push([name, payload, new Date().toISOString()]);
    window.dataLayer.push(Object.assign({ event: name }, payload));

    if (typeof window.gtag === 'function') window.gtag('event', name, payload);
    if (typeof window.plausible === 'function') window.plausible(name, { props: payload });
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
