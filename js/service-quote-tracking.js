/* Service-only browser-return measurement. This does not prove inbox delivery. */
(function (w, d) {
  'use strict';
  var KEY = 'txa_service_quote_v1';
  var ALLOWED = ["interior-painting.html","exterior-painting.html","cabinet-painting.html","drywall-repair.html","trim-doors-ceilings.html","full-home-repaint.html","drywall-installation.html","drywall-taping-finishing.html","texture-matching.html","ceiling-drywall-repair.html","popcorn-ceiling-repair.html","water-damage-drywall-repair.html","bathroom-refresh.html","wood-rot-fascia-repair.html","heritage-home-restoration.html","brick-staining.html","strata-painting.html","warehouse-painting.html","interior-painting-tsawwassen.html","interior-painting-ladner.html","interior-painting-port-coquitlam.html","interior-painting-port-moody.html","exterior-painting-tsawwassen.html","exterior-painting-ladner.html","exterior-painting-port-coquitlam.html","exterior-painting-port-moody.html","drywall-repair-tsawwassen.html","drywall-repair-ladner.html","drywall-repair-port-coquitlam.html","drywall-repair-port-moody.html","drywall-installation-tsawwassen.html","drywall-installation-ladner.html","drywall-installation-port-coquitlam.html","drywall-installation-port-moody.html","painters-ladner.html","painters-tsawwassen.html","painters-delta.html","painters-coquitlam.html","painters-port-coquitlam.html","painters-port-moody.html","painters-richmond.html","painters-surrey.html","painters-burnaby.html","painters-new-westminster.html","painters-north-vancouver.html","painters-vancouver.html","beach-grove.html","tsawwassen-springs.html","ladner-village.html","east-delta.html","citadel-heights.html","mary-hill.html","heritage-mountain.html","newport-village.html","college-park-port-moody.html"];
  var TTL = 30 * 60 * 1000;
  function production() {
    return w.location.protocol === 'https:' && /^(?:www\.)?texorapainting\.com$/.test(w.location.hostname);
  }
  function route(path) {
    if (!/^\/[a-z0-9-]+(?:\.html)?\/?$/.test(path)) return null;
    var name = path.slice(1).replace(/\/$/, '');
    if (!/\.html$/.test(name)) name += '.html';
    return ALLOWED.indexOf(name) >= 0 ? name : null;
  }
  function discard() {
    try { w.sessionStorage.removeItem(KEY); } catch (e) {}
  }
  function normalNavigation() {
    try {
      var entry = w.performance.getEntriesByType('navigation')[0];
      return !!entry && entry.type === 'navigate';
    } catch (e) { return false; }
  }
  function trackingAllowed() {
    try { return w.localStorage.getItem('txa_cookie') !== 'declined'; }
    catch (e) { return false; }
  }
  var form = d.getElementById('service-quote');
  var source = route(w.location.pathname);
  if (form && source && production()) {
    form.addEventListener('submit', function (event) {
      var next = form.elements.namedItem('_next');
      if (!next) return;
      // Keep an allowed www return on the same origin as its session marker.
      var returnUrl = 'https://' + w.location.hostname + '/service-quote-received.html';
      next.value = returnUrl;
      discard();
      // Native validation/POST remains the browser's responsibility; never block it.
      if (!event.isTrusted || event.defaultPrevented || !form.checkValidity() ||
          form.getAttribute('action') !== 'https://formsubmit.co/info@texorapainting.com' ||
          (form.getAttribute('method') || '').toLowerCase() !== 'post') return;
      try {
        if (!w.crypto || typeof w.crypto.randomUUID !== 'function') return;
        var id = 'txs_' + w.crypto.randomUUID();
        var intent = {v: 1, id: id, route: source, at: Date.now()};
        w.sessionStorage.setItem(KEY, JSON.stringify(intent));
        if (w.sessionStorage.getItem(KEY) !== JSON.stringify(intent)) { discard(); return; }
        next.value = returnUrl + '?request=' + encodeURIComponent(id);
      } catch (e) { discard(); }
    });
  }
  if (!d.getElementById('tx-service-confirmation') || !production()) return;
  var intent, request;
  try {
    request = new URLSearchParams(w.location.search).get('request');
    intent = JSON.parse(w.sessionStorage.getItem(KEY));
  } catch (e) { discard(); return; }
  if (!intent || intent.v !== 1 || !/^txs_[a-f0-9-]{36}$/i.test(intent.id || '') ||
      request !== intent.id || ALLOWED.indexOf(intent.route) < 0 ||
      typeof intent.at !== 'number' || !isFinite(intent.at) ||
      Date.now() - intent.at < 0 || Date.now() - intent.at > TTL) { discard(); return; }
  // Consume before any event or loader. A failed storage operation fails closed.
  try {
    w.sessionStorage.removeItem(KEY);
    if (w.sessionStorage.getItem(KEY) !== null) return;
  } catch (e) { return; }
  var message = d.getElementById('tx-service-confirmation-message');
  if (message) message.textContent = 'Thanks for requesting a quote from Texora Painting. If you have questions about your request, call us below.';
  if (!normalNavigation() || !trackingAllowed()) return;
  // The shim is defined before config/events, so the vendor library replays in order.
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || function () { w.dataLayer.push(arguments); };
  w.gtag('js', new Date());
  w.gtag('config', 'G-H03RYY12LT');
  w.gtag('config', 'AW-18140485777');
  w.gtag('event', 'generate_lead', {event_category: 'form', event_label: 'service_quote_request', value: 1});
  w.gtag('event', 'conversion', {send_to: 'AW-18140485777/A9X8CKKYpYAdEJGxh8pD', value: 1.0, currency: 'CAD', transaction_id: intent.id});
  if (!w.fbq) {
    var fb = w.fbq = function () { fb.callMethod ? fb.callMethod.apply(fb, arguments) : fb.queue.push(arguments); };
    if (!w._fbq) w._fbq = fb;
    fb.push = fb; fb.loaded = true; fb.version = '2.0'; fb.queue = [];
  }
  w.fbq('init', '1503091811834061');
  w.fbq('track', 'PageView');
  w.fbq('track', 'Lead', {}, {eventID: intent.id});
  function load(url) {
    var element = d.createElement('script'); element.async = true; element.src = url; d.head.appendChild(element);
  }
  load('https://www.googletagmanager.com/gtag/js?id=G-H03RYY12LT');
  load('https://connect.facebook.net/en_US/fbevents.js');
})(window, document);
