#!/usr/bin/env python3
"""Round-2 lane V (row 263): a section-end quote button after the photo and before/after proof blocks that carry none.
Reuses the page's own existing hero quote button (same href, same label as the one already in its hero); adds no words
of its own. At most one per proof group, placed at the end of the group's last block. Idempotent.
Never touches home, About, go/*, legal pages."""
import glob, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'index.html', 'about.html', 'cookie-policy.html', 'privacy-policy.html', 'terms.html'}
HERO_BTN = re.compile(r'<a href="(#(?:service-quote|area-quote|hero-quote|quote))" class="btn-hero">([^<]+)</a>')
HAS_CONV = re.compile(r'href="(?:#(?:service-quote|area-quote|hero-quote|quote)|tel:[^"]*)"')
MARK = 'tx-section-cta'
PHOTO_SEC = re.compile(r'<section\b[^>]*(?:data-section="photos"|class="client-photos"|class="tx-photo-band)[^>]*>')

def div_end(s, start):
    depth = 0
    for m in re.finditer(r'<div\b|</div>', s[start:]):
        depth += 1 if m.group(0).startswith('<div') else -1
        if depth == 0:
            return start + m.end()
    raise ValueError

def process(s):
    m = HERO_BTN.search(s)
    if not m or MARK in s:
        return s
    btn = f'<div class="{MARK}"><a href="{m.group(1)}">{m.group(2)}</a></div>\n'
    out = s
    # 1) photo blocks: one button after the last photo section, unless that section or any photo section already has a quote/call link
    secs = list(PHOTO_SEC.finditer(out))
    if secs:
        ends = [out.find('</section>', x.start()) for x in secs]
        if not any(HAS_CONV.search(out[x.start():e]) for x, e in zip(secs, ends)):
            e = max(ends)
            out = out[:e] + btn + out[e:]
    # 2) service before/after gallery block
    i = out.find('<div class="svc-gallery">')
    if i >= 0:
        e = div_end(out, i)
        if not HAS_CONV.search(out[i:e]):
            out = out[:e - len('</div>')] + btn + out[e - len('</div>'):]
    return out

n = 0
for f in sorted(glob.glob(f'{R}/*.html')):
    if os.path.basename(f) in SKIP: continue
    raw = open(f, encoding='utf-8', newline='').read()
    s = process(raw)
    if s != raw:
        open(f, 'w', encoding='utf-8', newline='').write(s); n += 1
print('pages with a section-end quote button added', n)
