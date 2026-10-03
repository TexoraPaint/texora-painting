/* Texora owner preview: the two menus in the owner's header. His own script keeps running the phone toggle. */
(function () {
  'use strict';
  var nav = document.querySelector('nav');
  if (!nav) return;
  var menus = Array.prototype.slice.call(nav.querySelectorAll('[data-txn-menu]'));
  if (!menus.length) return;
  var desktop = window.matchMedia('(min-width:901px)');
  var closeTimer = null;
  function setMenu(menu, open) {
    menu.classList.toggle('is-open', open);
    menu.querySelector('button').setAttribute('aria-expanded', String(open));
  }
  function closeMenus(except) { menus.forEach(function (m) { if (m !== except) setMenu(m, false); }); }
  menus.forEach(function (menu) {
    var button = menu.querySelector('button');
    var hoverOpened = false;
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      if (!open && hoverOpened) { hoverOpened = false; return; }
      hoverOpened = false;
      closeMenus(menu);
      setMenu(menu, open);
    });
    menu.addEventListener('mouseenter', function () {
      if (!desktop.matches) return;
      clearTimeout(closeTimer);
      closeMenus(menu);
      hoverOpened = button.getAttribute('aria-expanded') !== 'true';
      setMenu(menu, true);
    });
    menu.addEventListener('mouseleave', function () {
      if (!desktop.matches) return;
      clearTimeout(closeTimer);
      hoverOpened = false;
      closeTimer = setTimeout(function () { if (!menu.contains(document.activeElement)) setMenu(menu, false); }, 220);
    });
    menu.addEventListener('focusout', function (e) { if (desktop.matches && !menu.contains(e.relatedTarget)) setMenu(menu, false); });
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || button.getAttribute('aria-expanded') !== 'true') return;
      e.preventDefault(); e.stopPropagation(); setMenu(menu, false); button.focus();
    });
  });
  document.addEventListener('click', function (e) { if (!nav.contains(e.target)) closeMenus(null); });
  window.addEventListener('resize', function () { closeMenus(null); });
})();

/* Desktop quote tab: fixed to the right edge on every page, points where the nav's own quote button points,
   hidden at the top of the page and while the quote form it targets is on screen. */
(function () {
  'use strict';
  var src = document.querySelector('nav a.btn-nav:not([href^="tel:"])') || document.querySelector('nav a.nav-cta-m');
  if (!src || document.querySelector('.tx-qtab')) return;
  var href = src.getAttribute('href');
  var tab = document.createElement('a');
  tab.className = 'tx-qtab'; tab.href = href; tab.textContent = 'Free quote';
  document.body.appendChild(tab);
  var target = null, formOnScreen = false;
  if (href.charAt(0) === '#') target = document.getElementById(href.slice(1));
  if (target && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) { formOnScreen = e[0].isIntersecting; update(); }, { threshold: 0.2 }).observe(target);
  }
  function update() { tab.classList.toggle('is-on', window.scrollY > 700 && !formOnScreen); }
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* Preview guard: on any host that is not texorapainting.com (Netlify deploy previews, the Hostinger preview),
   quote forms do not send. A test lead from a preview would land in the client's real inbox. Production is unchanged. */
(function () {
  'use strict';
  if (/(^|\.)texorapainting\.com$/.test(location.hostname)) return;
  Array.prototype.forEach.call(document.querySelectorAll('form[action*="formsubmit.co"]'), function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (form.querySelector('.tx-preview-note')) return;
      var p = document.createElement('p');
      p.className = 'tx-preview-note'; p.setAttribute('role', 'status');
      p.textContent = 'Preview copy of the site: this form does not send. On texorapainting.com it goes to Texora.';
      p.style.cssText = 'margin:12px 0 0;padding:10px 12px;border-radius:8px;background:#fff4e5;color:#7a3d00;font:700 13px/1.4 "Open Sans",Arial,sans-serif;text-align:center';
      form.appendChild(p);
    }, true);
  });
})();
