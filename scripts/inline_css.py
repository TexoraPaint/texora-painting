#!/usr/bin/env python3
"""Inline the three render-blocking sheets into every bb money page (PSI row 506). Idempotent: re-run after ANY edit to
css/bb-structure.css, css/tx-owner-nav.css or css/photo-text-layout.css — the .css files stay the source of truth and
non-bb pages keep linking them. Gated pages (home, About, legal, deck, cost guide, conversion) are never touched."""
import glob, re, sys, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHEETS = ['photo-text-layout', 'bb-structure', 'tx-owner-nav']
SKIP = {'index.html','about.html','reviews.html','terms.html','privacy-policy.html','cookie-policy.html','deck-building.html','deck-staining.html',
        'project-deck-refinishing.html','painting-cost-guide-delta.html','thank-you.html','service-quote-received.html','qr.html','review-island-preview.html','404.html'}
css = {}
for n in SHEETS:
    s = open(f'{R}/css/{n}.css', encoding='utf-8').read()
    s = s.replace("url('../img/", "url('/img/").replace('url("../img/', 'url("/img/').replace('url(../img/', 'url(/img/')
    assert '../' not in s, n
    css[n] = s.strip()
done = 0
for f in sorted(glob.glob(f'{R}/*.html')):
    b = os.path.basename(f)
    if b in SKIP: continue
    s = open(f, encoding='utf-8').read()
    if not re.search(r'<body[^>]*class="[^"]*\bbb\b', s): continue
    s0 = s
    for n in SHEETS:
        block = f'<style data-tx-inline="{n}">{css[n]}</style>'
        s, k1 = re.subn(r'<link rel="stylesheet" href="/?css/%s\.css(?:\?v=[0-9a-f]+)?">' % n, lambda m: block, s)
        s, k2 = re.subn(r'<style data-tx-inline="%s">[\s\S]*?</style>' % n, lambda m: block, s) if not k1 else (s, 0)
        assert k1 + k2 <= 1, (b, n, k1, k2)   # a page that never linked this sheet is left as it is
    if s != s0: open(f, 'w', encoding='utf-8').write(s); done += 1
print('pages inlined/refreshed', done)
