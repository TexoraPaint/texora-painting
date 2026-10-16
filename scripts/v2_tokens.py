#!/usr/bin/env python3
"""Round-2 lane V: name layout containers in the markup so the stylesheet and the row-291 reading-edge probe see them.
Adds a marker class (tx-grid / tx-split / tx-card, defined in css/tx-v2.css, no visual effect) to elements that ARE a
multi-column grid, a heading|body split or a padded card. Idempotent. Never touches home, About, go/*, legal pages."""
import glob, os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {'index.html', 'about.html', 'cookie-policy.html', 'privacy-policy.html', 'terms.html'}
RULES = [  # (class token that must be present, extra token required too or None, marker to add)
    ('process-steps', None, 'tx-grid'),
    ('dw-steps', None, 'tx-grid'),
    ('tx-aw-inner', None, 'tx-grid'),
    ('nf-quick-links', None, 'tx-card'),
    ('timeline-step', None, 'tx-split'),
    ('tx-band-inner', ('article-wrap', 'project-body', 'policy-wrap'), 'tx-split'),
    ('leave-review', None, 'tx-card'),
    ('tx-photo-band', None, 'tx-card'),
]
def div_end(s, start):
    """index just past the closing tag of the <div> that opens at s[start]"""
    depth = 0
    for m in re.finditer(r'<div\b|</div>', s[start:]):
        depth += 1 if m.group(0).startswith('<div') else -1
        if depth == 0:
            return start + m.end()
    return len(s)

def fix(s):
    def sub(m):
        toks = m.group(2).split()
        add = []
        if 'tx-band-inner' in toks and 'tx-split' in toks and not re.search(r'<h[23]\b', s[m.start():div_end(s, m.start())]):
            toks.remove('tx-split')  # undo an earlier mark on an intro-only wrapper
            return m.group(1) + ' '.join(toks) + m.group(3)
        for tok, anyof, mark in RULES:
            if tok in toks and mark not in toks and mark not in add and (anyof is None or any(a in toks for a in anyof)):
                # a heading|body split only exists where the wrapper has a heading of its own; an intro-only wrapper
                # (a lone paragraph) is plain band prose and stays unmarked
                if tok == 'tx-band-inner' and not re.search(r'<h[23]\b', s[m.start():div_end(s, m.start())]):
                    continue
                add.append(mark)
        if not add:
            return m.group(0)
        return m.group(1) + ' '.join(toks + add) + m.group(3)
    return re.sub(r'(<(?:div|section|ul|ol)\b[^>]*?\bclass=")([^"]*)(")', sub, s)
n = 0
for f in sorted(glob.glob(f'{R}/*.html') + glob.glob(f'{R}/blog/*.html') + glob.glob(f'{R}/projects/*/index.html')):
    rel = os.path.relpath(f, R).replace(chr(92), '/')
    if rel in SKIP or rel.startswith('go/'): continue
    raw = open(f, encoding='utf-8', newline='').read()
    s = fix(raw)
    if s != raw:
        open(f, 'w', encoding='utf-8', newline='').write(s); n += 1
print('pages tokenised', n)
