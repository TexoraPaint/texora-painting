/* Quote buttons open the page's own quote form in a dialog instead of scrolling the page.
   The dialog is built at click time from a clone of this page's form (same action, fields and success redirect).
   No JavaScript, or no <dialog> support: the link keeps its #anchor and lands on the same inline form.
   Adds no tracking: the clone is submitted by the browser exactly like the inline form. */
(function (w, d) {
  'use strict';
  if (typeof w.HTMLDialogElement !== 'function') return;
  var HASHES = { '#quote': 1, '#service-quote': 1, '#area-quote': 1, '#hero-quote': 1 };
  var FORM_ACTION = 'formsubmit.co/info@texorapainting.com';
  var open = null;

  function normPath(p) {
    return p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  }
  function sameDocLink(a) {
    var u;
    try { u = new URL(a.getAttribute('href'), w.location.href); } catch (e) { return null; }
    if (u.origin !== w.location.origin || !HASHES[u.hash]) return null;
    if (normPath(u.pathname) !== normPath(w.location.pathname)) return null;
    return u.hash;
  }
  function pageForm(hash) {
    var t = d.querySelector(hash);
    var f = null;
    if (t) f = t.tagName === 'FORM' ? t : t.querySelector('form');
    if (!f) f = d.querySelector('form[action*="' + FORM_ACTION + '"]');
    return f;
  }
  function label(a) {
    var t = (a.getAttribute('aria-label') || a.textContent || '').replace(/[→←»›↗]/g, '').replace(/\s+/g, ' ').trim();
    return t || 'Get a free quote';
  }
  function suffixIds(root) {
    var map = {};
    Array.prototype.forEach.call(root.querySelectorAll('[id]'), function (el) {
      var n = el.id + '-dlg'; map[el.id] = n; el.id = n;
    });
    Array.prototype.forEach.call(root.querySelectorAll('[for]'), function (el) {
      var v = el.getAttribute('for'); if (map[v]) el.setAttribute('for', map[v]);
    });
    ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach(function (attr) {
      Array.prototype.forEach.call(root.querySelectorAll('[' + attr + ']'), function (el) {
        el.setAttribute(attr, el.getAttribute(attr).split(/\s+/).map(function (v) { return map[v] || v; }).join(' '));
      });
    });
    return map;
  }
  function stamp(form, trigger) {
    var value = 'popup: ' + w.location.origin + w.location.pathname + ' | ' + label(trigger);
    var f = form.querySelector('input[name="Source Page"]');
    if (!f) {
      f = d.createElement('input'); f.type = 'hidden'; f.name = 'Source Page';
      form.insertBefore(f, form.firstChild);
    }
    f.value = value;
  }
  function build(src, trigger) {
    var card = src.closest('.form-card') || src.querySelector('.form-card');
    var holder = card || src;
    var clone = holder.cloneNode(true);
    var form = clone.tagName === 'FORM' ? clone : clone.querySelector('form');
    if (!form) return null;
    suffixIds(clone);
    clone.removeAttribute('id');
    form.removeAttribute('id');
    form.setAttribute('data-tx-popup', '1');
    stamp(form, trigger);
    var heading = clone.querySelector('h2,h3');
    var dlg = d.createElement('dialog');
    dlg.className = 'tx-quote-dialog';
    var body = d.createElement('div'); body.className = 'tx-qd-body';
    var close = d.createElement('button');
    close.type = 'button'; close.className = 'tx-qd-close'; close.setAttribute('aria-label', 'Close quote form');
    close.innerHTML = '<span aria-hidden="true">&times;</span>';
    // Hub forms are styled by selectors scoped to the page's <main> class (.tx-area): keep that scope around the copy.
    var scope = src.closest('main'), wrap = clone;
    if (scope && scope.className) { wrap = d.createElement('div'); wrap.className = scope.className + ' tx-qd-scope'; wrap.appendChild(clone); }
    body.appendChild(close); body.appendChild(wrap); dlg.appendChild(body);
    if (heading) {
      if (!heading.id) heading.id = 'txqd-title';
      dlg.setAttribute('aria-labelledby', heading.id);
    } else dlg.setAttribute('aria-label', 'Get a free quote');
    close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () {
      if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
      open = null;
      if (trigger && trigger.focus && d.contains(trigger)) { try { trigger.focus({ preventScroll: true }); } catch (e) {} }
    });
    return dlg;
  }
  d.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var hash = sameDocLink(a);
    if (!hash || open) { if (hash && open) e.preventDefault(); return; }
    var src = pageForm(hash);
    if (!src) return;
    var dlg = build(src, a);
    if (!dlg) return;
    e.preventDefault();
    var nav = d.querySelector('.nav-links.open'); if (nav) nav.classList.remove('open');
    var tg = d.querySelector('.nav-toggle.open'); if (tg) tg.classList.remove('open');
    d.body.appendChild(dlg);
    try { dlg.showModal(); } catch (err) { d.body.removeChild(dlg); return w.location.hash = hash; }
    open = dlg;
    var fields = dlg.querySelectorAll('input:not([type=hidden]),select,textarea'), first = null, i;
    for (i = 0; i < fields.length && !first; i++) { if (fields[i].name !== '_honey' && fields[i].offsetParent) first = fields[i]; }
    if (first) { try { first.focus({ preventScroll: true }); } catch (x) {} }
  });
})(window, document);
