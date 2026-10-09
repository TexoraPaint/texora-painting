#!/usr/bin/env python3
"""Every URL in sitemap.xml must have >= 3 inbound internal links from distinct other pages in this repo.
Exits 1 on any page under the floor (except the named allowlist, each with the decision that unblocks it)."""
import glob, re, sys, urllib.parse
BASE = "https://texorapainting.com"
FLOOR = 3
# Pages waiting on an outside decision; remove a line once it is made.
ALLOW = {
}
def norm(u, src):
    u = urllib.parse.urljoin(BASE + "/" + src, u.split("#")[0].split("?")[0])
    if not u.startswith(BASE): return None
    p = urllib.parse.urlparse(u).path or "/"
    if p.endswith("/index.html"): p = p[:-10]
    if p != "/" and not p.endswith("/") and "." not in p.rsplit("/", 1)[-1]: p += ".html"
    return p
pages = [f for f in glob.glob("*.html") + glob.glob("blog/*.html") + glob.glob("projects/*/*.html") if not f.startswith("go/")]
inbound = {}
for f in pages:
    src = norm(f, "")
    for href in set(re.findall(r'<a\b[^>]*\bhref="([^"]+)"', open(f, encoding="utf-8").read())):
        if href.startswith(("tel:", "mailto:", "javascript:")): continue
        t = norm(href, f)
        if t and t != src: inbound.setdefault(t, set()).add(src)
want = [urllib.parse.urlparse(u).path or "/" for u in re.findall(r"<loc>([^<]+)</loc>", open("sitemap.xml").read())]
low = [(p, len(inbound.get(p, ()))) for p in want if len(inbound.get(p, ())) < FLOOR]
fail = [x for x in low if x[0] not in ALLOW]
for p, n in low: print(("ALLOWED " if p in ALLOW else "FAIL    ") + "%-45s %d inbound%s" % (p, n, ("  (" + ALLOW[p] + ")") if p in ALLOW else ""))
print("checked %d sitemap URLs, %d under the floor of %d, %d failing" % (len(want), len(low), FLOOR, len(fail)))
sys.exit(1 if fail else 0)
