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

  window.dataLayer = window.dataLayer || [];
  window.s56Events = window.s56Events || [];   // readable in the console while testing

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
