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
        // off-screen frame: take its src away BEFORE moving it into the wrapper (moving a frame with a src starts a load)
        if (f.dataset.txFit !== '1' && f.getAttribute('src') && f.getBoundingClientRect().top >= window.innerHeight + 300) {
          f.dataset.txFit = '1'; f.dataset.txSrc = f.getAttribute('src'); f.removeAttribute('src');
        }
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

/* round 24: the home header on every other page (pill + CTA reveal); home has its own */
(function(){
  if(document.getElementById('rvwBar')||document.querySelector('.hero-cta-row')) return;
  var nav=document.querySelector('nav'); if(!nav) return;
  var a=document.createElement('a'); a.className='tx-pill rvwbar'; a.href='/reviews.html';
  a.setAttribute('aria-label','5.0 star rating from 45 reviews \u2014 see our reviews');
  a.innerHTML='<span class="rvwbar-inner"><span class="rvwbar-srcs"><svg viewBox="0 0 48 48" aria-hidden="true">'+'<path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>'+'</svg></span><span class="rvwbar-score">5.0</span><span class="rvwbar-stars">\u2605\u2605\u2605\u2605\u2605</span><span class="rvwbar-count">(45)</span></span>';
  document.body.appendChild(a);
  var tick=false; function hide(){a.classList.toggle('rvw-hidden',window.scrollY>70);tick=false;}
  window.addEventListener('scroll',function(){if(!tick){requestAnimationFrame(hide);tick=true;}},{passive:true}); hide();
  nav.classList.add('tx-cta-gate');
  var cta=document.querySelector(':is(.city-hero,.svc-hero,.project-hero,.tx-area-hero,.gallery-hero,.blog-hero,.page-hero,header.hero,section[class*=hero]) :is(.btn-hero,.hero-btns a,a[href*="quote"])');
  // show once the visitor has scrolled up past the hero quote button (or, with none, past the first section), like home
  var mark=cta||document.querySelector('main > *')||document.querySelector('main');
  if(!mark){nav.classList.add('show-cta');return;}
  var t2=false; function gate(){nav.classList.toggle('show-cta',mark.getBoundingClientRect().bottom<nav.getBoundingClientRect().height);t2=false;}
  window.addEventListener('scroll',function(){if(!t2){requestAnimationFrame(gate);t2=true;}},{passive:true}); gate();
})();
