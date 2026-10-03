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

/* round 11d (inner pages only; home + About keep the owner's behaviour):
   1) Google only draws the place card in a frame >= ~400px wide and decides at load time. On narrow screens each
      listing frame (cid=) gets a wrapper of its own, renders at 420px x 300px, is scaled down to the column and
      reloads once at that size, so phones see name, address and rating instead of a bare pin. Desktop is untouched.
   2) Map frames marked data-tx-src load once the visitor reaches them (coordinates stay in the markup). */
(function () {
  var b = document.body;
  if (!b || !(b.classList.contains('bb') || b.classList.contains('tx-inner'))) return;
  function fit() {
    document.querySelectorAll('iframe[src*="cid="],iframe[data-tx-src*="cid="]').forEach(function (f) {
      var host = f.parentElement; if (!host) return;
      var wrapped = host.classList.contains('tx-cid-fit');
      var col = wrapped ? host.parentElement : host;
      var w = col.clientWidth;
      if (w && w < 420) {
        if (!wrapped) {
          var cs = getComputedStyle(f), wrap = document.createElement('div');
          wrap.className = 'tx-cid-fit'; wrap.style.marginTop = cs.marginTop; wrap.style.borderRadius = cs.borderRadius; wrap.style.overflow = 'hidden';
          host.insertBefore(wrap, f); wrap.appendChild(f); host = wrap; f.style.marginTop = '0';
        }
        var k = w / 420, h = 300;
        f.style.width = '420px'; f.style.maxWidth = 'none'; f.style.height = h + 'px';
        f.style.transform = 'scale(' + k + ')'; f.style.transformOrigin = '0 0';
        host.style.width = w + 'px'; host.style.height = Math.round(h * k) + 'px';
        if (f.dataset.txFit !== '1' && f.getAttribute('src')) {
          f.dataset.txFit = '1';
          // only a frame already near the screen reloads now; the rest wait (no src) and load at 420px when reached
          if (f.getBoundingClientRect().top < window.innerHeight + 300) f.src = f.getAttribute('src');
          else { f.dataset.txSrc = f.getAttribute('src'); f.removeAttribute('src'); }
        }
      } else if (wrapped) {
        f.style.width = f.style.maxWidth = f.style.height = f.style.transform = f.style.transformOrigin = f.style.marginTop = '';
        col.insertBefore(f, host); col.removeChild(host);
      }
    });
  }
  var load = function (f) { if (f.dataset.txSrc) { f.src = f.dataset.txSrc; f.removeAttribute('data-tx-src'); } };
  var check = function () {
    var edge = window.innerHeight + 300, left = 0;
    document.querySelectorAll('iframe[data-tx-src]').forEach(function (f) { if (f.getBoundingClientRect().top < edge) load(f); else left++; });
    if (!left) { window.removeEventListener('scroll', check); }
  };
  fit();
  if (document.querySelector('iframe[data-tx-src]')) { window.addEventListener('scroll', check, { passive: true }); check(); }
  window.addEventListener('resize', function () { fit(); check(); });
})();
