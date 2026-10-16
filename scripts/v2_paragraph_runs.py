#!/usr/bin/env python3
"""Round-2 lane V (row 262): break the one run of four consecutive bare paragraphs (drywall-installation, first photo/text
band) by turning its last line, the existing insurance/written-quote sentence, into the page's own copy-callout block.
Same words, no new claim. Idempotent."""
import os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
f = f'{R}/drywall-installation.html'
s = open(f, encoding='utf-8', newline='').read()
a = '<p>We are fully insured and WorkSafeBC compliant, and every job starts with a written quote.</p>'
b = '<div class="tx-copy-callout">We are fully insured and WorkSafeBC compliant, and every job starts with a written quote.</div>'
if a in s:
    assert s.count(a) == 1
    open(f, 'w', encoding='utf-8', newline='').write(s.replace(a, b)); print('callout applied')
else:
    print('already applied' if b in s else 'sentence not found')
