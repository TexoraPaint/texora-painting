/* Texora owner preview: the hero quote card carries the chosen service down to the page's full form. */
(function () {
  'use strict';
  var form = document.getElementById('heroQuoteForm');
  var select = document.getElementById('serviceSelect');
  if (!form || !select) return;
  function setSelect(value) {
    for (var i = 0; i < select.options.length; i++) { if (select.options[i].text === value) { select.selectedIndex = i; return; } }
  }
  Array.prototype.forEach.call(form.querySelectorAll('input[name="Service Needed"]'), function (radio) {
    radio.addEventListener('change', function () { if (radio.checked) setSelect(radio.value); });
    if (radio.checked) setSelect(radio.value);
  });
})();

/* How-it-works failsafe: the owner's steps reveal on scroll; if the section has been on screen for 1.2s and
   any step is still hidden (renderer never fired the scroll logic), show them all. */
(function () {
  'use strict';
  var how = document.getElementById('how');
  if (!how) return;
  var timer = null;
  function reveal() { Array.prototype.forEach.call(how.querySelectorAll('.hw-step'), function (s) { s.classList.add('on'); }); }
  function check() {
    var r = how.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.85 && r.bottom > 0 && !timer) timer = setTimeout(reveal, 1200);
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
})();
