/* Texora public-area maps: load one Google iframe only after an explicit user click. */
(function () {
  'use strict';
  function allowedMap(raw) {
    try {
      var url = new URL(raw);
      if (url.protocol !== 'https:' || url.hostname !== 'maps.google.com' || url.pathname !== '/maps' || url.username || url.password || url.port || url.hash) return false;
      var keys = Array.from(url.searchParams.keys()).sort().join(',');
      if (url.searchParams.get('output') !== 'embed') return false;
      if (keys === 'cid,output') return url.searchParams.get('cid') === '9701219678679078001';
      if (keys !== 'hl,output,q,z' || url.searchParams.get('hl') !== 'en' || url.searchParams.get('z') !== '13') return false;
      var pair = url.searchParams.get('q').match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
      return !!pair && Number(pair[1]) > 49 && Number(pair[1]) < 49.5 && Number(pair[2]) > -123.5 && Number(pair[2]) < -122.5;
    } catch (_) { return false; }
  }
  document.addEventListener('click', function (event) {
    if (!event.isTrusted || !event.target || typeof event.target.closest !== 'function') return;
    var button = event.target.closest('button[data-tx-map-load]');
    if (!button || button.disabled || !button.closest('.tx-local-area-maps')) return;
    var card = button.closest('.tx-map-card');
    var frame = card && card.querySelector('iframe[data-tx-map-src]');
    if (!frame || frame.getAttribute('src')) return;
    var source = frame.getAttribute('data-tx-map-src');
    if (!allowedMap(source)) return;
    frame.setAttribute('src', source);
    frame.removeAttribute('aria-hidden');
    button.disabled = true;
    var gate = card.querySelector('.tx-map-gate');
    if (gate) gate.hidden = true;
    var status = card.querySelector('.tx-map-status');
    if (status) status.textContent = 'Google Maps requested. The open-map link is also available.';
  });
})();
