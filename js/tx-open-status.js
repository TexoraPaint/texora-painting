/* Open-status line (Website Checklist row 518).
   Reads the opening hours this page already publishes in its LocalBusiness JSON-LD
   (openingHoursSpecification) - no second copy of the schedule - and shows the status
   in the business's own time zone (Delta, BC = America/Vancouver).
   The server-rendered text is the published schedule; this script swaps it for
   "Open now" / "Closed - opens <day> <time>". Test hook: ?txnow=2026-11-12T23:30:00-08:00 */
(function () {
  var els = document.querySelectorAll('[data-tx-open-status]');
  if (!els.length || !window.Intl) return;
  var TZ = 'America/Vancouver';
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var spec = null;
  function find(o) {
    if (spec || !o || typeof o !== 'object') return;
    if (o.openingHoursSpecification) { spec = o.openingHoursSpecification; return; }
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) find(o[k]);
  }
  var blocks = document.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < blocks.length && !spec; i++) { try { find(JSON.parse(blocks[i].textContent)); } catch (e) {} }
  if (!spec) return;
  spec = [].concat(spec);
  function mins(t) { var p = String(t || '').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  var week = {}; // day -> [[open, close], ...] in minutes
  spec.forEach(function (s) {
    [].concat(s.dayOfWeek || []).forEach(function (d) {
      d = String(d).replace(/^https?:\/\/schema\.org\//, '');
      (week[d] = week[d] || []).push([mins(s.opens), mins(s.closes)]);
    });
  });
  function allDay(r) { return r[0] === 0 && r[1] >= 1439; }
  var always = DAYS.every(function (d) { return (week[d] || []).some(allDay); });
  var now = new Date();
  var q = /[?&]txnow=([^&]+)/.exec(location.search);
  if (q) { var t = new Date(decodeURIComponent(q[1])); if (!isNaN(t)) now = t; }
  var parts = {};
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).forEach(function (p) { parts[p.type] = p.value; });
  var today = DAYS.indexOf(parts.weekday);
  var cur = (+parts.hour % 24) * 60 + (+parts.minute);
  function isOpen(d, m) { return (week[DAYS[d]] || []).some(function (r) { return m >= r[0] && m <= r[1]; }); }
  function fmt(m) {
    var h = Math.floor(m / 60), mm = m % 60, ap = h < 12 ? 'am' : 'pm';
    h = h % 12 || 12;
    return h + (mm ? ':' + (mm < 10 ? '0' : '') + mm : '') + ' ' + ap;
  }
  var text, open = isOpen(today, cur);
  if (open) {
    text = always ? 'Open now, 24h' : 'Open now';
  } else {
    text = 'Closed';
    for (var k = 0; k < 8; k++) {
      var d = (today + k) % 7;
      var next = (week[DAYS[d]] || []).map(function (r) { return r[0]; })
        .filter(function (o) { return k > 0 || o > cur; }).sort(function (a, b) { return a - b; })[0];
      if (next !== undefined) {
        text = 'Closed - opens ' + (k === 0 ? 'today' : k === 1 ? 'tomorrow' : DAYS[d]) + ' ' + fmt(next);
        break;
      }
    }
  }
  for (var j = 0; j < els.length; j++) {
    els[j].textContent = text;
    var box = els[j].closest('[data-tx-open-box]');
    if (box) box.setAttribute('data-state', open ? 'open' : 'closed');
  }
})();
