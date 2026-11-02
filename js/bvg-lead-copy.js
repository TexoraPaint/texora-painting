/* Bloomview lead copy: measurement only. Sends a copy of a submitted quote request to the agency log.
   Never blocks or changes the form post; FormSubmit still delivers it to info@texorapainting.com. */
(function (w, d) {
  'use strict';
  if (!/^(?:www\.)?texorapainting\.com$/.test(w.location.hostname)) return;
  var EP = 'https://bloomviewgrowth.com/collect/texora-lead.php';
  var ACTION = 'https://formsubmit.co/info@texorapainting.com';
  function val(f, n) {
    var e = f.elements.namedItem(n);
    return e && e.value ? String(e.value) : '';
  }
  d.addEventListener('submit', function (e) {
    try {
      var f = e.target;
      if (e.defaultPrevented || !f || f.getAttribute('action') !== ACTION || !w.navigator.sendBeacon) return;
      if (!f.checkValidity() || f.getAttribute('data-bvg-sent')) return;
      f.setAttribute('data-bvg-sent', '1');
      w.navigator.sendBeacon(EP, new URLSearchParams({
        name: val(f, 'Full Name') || val(f, 'Name'),
        phone: val(f, 'Phone Number') || val(f, 'Phone'),
        email: val(f, 'Email'),
        service: val(f, 'Service Needed'),
        message: val(f, 'Project Details').slice(0, 3000),
        honey: val(f, '_honey'),
        page: w.location.href.slice(0, 480),
        referrer: d.referrer.slice(0, 480)
      }));
    } catch (err) {}
  });
})(window, document);
