#!/usr/bin/env python3
"""Round-2 visual/QA layer (lane V). Idempotent: re-run after ANY edit to css/tx-v2.css or js/tx-quote-dialog.js.
  - writes css/tx-v2.css as <style data-tx-inline="tx-v2"> as the last style in <head> of every page except
    home, About, go/*, and the three legal pages (never touched);
  - adds <script src="/js/tx-quote-dialog.js?v=N" defer> to pages whose quote buttons anchor to their own form;
  - keeps js/service-quote-tracking.js on its current ?v=.
The .css file stays the source of truth (same convention as scripts/inline_css.py)."""
import glob, os, re, sys
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'index.html', 'about.html', 'cookie-policy.html', 'privacy-policy.html', 'terms.html', 'google6fb6dbc31d8bbc9a.html'}
DLG_V = '1'          # bump when js/tx-quote-dialog.js changes
TRACK_V = '3'        # bump when js/service-quote-tracking.js changes
css = open(f'{R}/css/tx-v2.css', encoding='utf-8').read()
css = css.replace("url('../img/", "url('/img/").strip()
assert '../' not in css
block = f'<style data-tx-inline="tx-v2">{css}</style>'
files = sorted(glob.glob(f'{R}/*.html') + glob.glob(f'{R}/blog/*.html') + glob.glob(f'{R}/projects/*/index.html'))
QUOTE_A = re.compile(r'<a\b[^>]*\bhref="#(?:quote|service-quote|area-quote|hero-quote)"')
HAS_FORM = re.compile(r'<form\b[^>]*formsubmit\.co/info@texorapainting\.com')
changed = 0
for f in files:
    rel = os.path.relpath(f, R).replace('\\', '/')
    if rel in SKIP or rel.startswith('go/'):
        continue
    raw = open(f, encoding='utf-8', newline='').read()
    crlf = '\r\n' in raw
    s = raw
    s = re.sub(r'<style data-tx-inline="tx-v2">[\s\S]*?</style>\r?\n?', '', s)
    i = s.rfind('</head>')
    assert i > 0, rel
    s = s[:i] + block + ('\r\n' if crlf else '\n') + s[i:]
    # dialog script
    s = re.sub(r'(?:\r?\n)?<script src="/js/tx-quote-dialog\.js[^"]*" defer></script>', '', s)
    if QUOTE_A.search(s) and HAS_FORM.search(s):
        tag = f'<script src="/js/tx-quote-dialog.js?v={DLG_V}" defer></script>'
        m = re.search(r'<script src="/js/tx-owner-nav\.js[^"]*" defer></script>', s)
        assert m, rel
        s = s[:m.end()] + (chr(13) + chr(10) if crlf else chr(10)) + tag + s[m.end():]
    s = re.sub(r'(/js/service-quote-tracking\.js\?v=)\w+', r'\g<1>' + TRACK_V, s)
    if s != raw:
        open(f, 'w', encoding='utf-8', newline='').write(s)
        changed += 1
print('pages written', changed)
