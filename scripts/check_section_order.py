#!/usr/bin/env python3
"""BLOCKING gate: section (band) order on every page type, plus exactly one <h1> per page.

Usage: python3 scripts/check_section_order.py [site_root]   (default: the repo root)
Exit 0 = clean. Exit 1 = at least one violation (each one is printed). Exit 2 = the gate inspected nothing.

Bands are read from data-section / data-bb-section attributes, in document order, after
<script>, <style> and HTML comments are stripped.

Rules
  1. Exactly one <h1> on every checked page.
  2. Every page of a known type carries its anchor bands, in the canonical order below
     (derived from main on 2026-10-09). Other bands may sit anywhere between the hero and the CTA.
  3. On every checked page that has the bands:
       - reviews is never the last content band before the CTA / footer
       - faq comes after reviews
       - service-areas and directions (the maps) come after faq
       - cta is the last band
"""
import glob
import os
import re
import sys
from html.parser import HTMLParser

EXCLUDE = {
    "index.html", "about.html", "404.html",
    "privacy-policy.html", "terms.html", "cookie-policy.html",          # legal
    "thank-you.html", "service-quote-received.html", "qr.html", "review-island-preview.html",
}
EXCLUDE_DIRS = ("go/",)

NEIGHBOURHOODS = {
    "beach-grove", "citadel-heights", "college-park-port-moody", "east-delta", "heritage-mountain",
    "ladner-village", "mary-hill", "newport-village", "tsawwassen-springs",
}
SVC_TOWNS = ("ladner", "tsawwassen", "port-moody", "port-coquitlam")

# Anchor bands per page type, in the order they appear on main today (2026-10-09).
ORDER = {
    "service": ["proof-strip", "hero", "triples", "why-us", "explainer", "symptoms", "how-it-works",
                "reviews", "faq", "service-areas", "cta"],
    "service-town": ["proof-strip", "hero", "triples", "local-expertise", "detail", "reviews", "scenario",
                     "services-in-city", "our-work", "faq", "service-areas", "directions", "cta"],
    "city-hub": ["proof-strip", "hero", "triples", "local-expertise", "detail", "reviews", "services-in-city",
                 "guidance", "local-problems", "why-choose", "our-work", "faq", "service-areas",
                 "directions", "cta"],
    "neighbourhood": ["proof-strip", "hero", "triples", "local-expertise", "detail", "reviews",
                      "services-in-city", "guidance", "local-problems", "our-work", "faq",
                      "service-areas", "directions", "cta"],
    "hub-index": ["hero", "reviews", "closing-form", "cta"],   # services.html, service-areas.html
}


def page_type(rel, bands, ds_bands):
    base = os.path.basename(rel)[:-5]
    if "/" in rel:
        return None
    if base in ("services", "service-areas"):
        return "hub-index"
    if base.startswith("painters-"):
        return "city-hub"
    if base in NEIGHBOURHOODS:
        return "neighbourhood"
    if "hero" not in ds_bands:
        # projects, blog, gallery, awards, faq, reviews ... (hero only via data-bb-section or none):
        # h1 + generic rules only
        return None
    if any(base.endswith("-" + t) for t in SVC_TOWNS):
        return "service-town"
    return "service"


class Bands(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.bands, self.ds, self.h1 = [], set(), 0

    def handle_starttag(self, tag, attrs):
        if tag == "h1":
            self.h1 += 1
        d = dict(attrs)
        name = d.get("data-section") or d.get("data-bb-section")
        if name:
            self.bands.append(name)
        if d.get("data-section"):
            self.ds.add(d["data-section"])


def strip(html):
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    return re.sub(r"<(script|style)\b.*?</\1\s*>", "", html, flags=re.S | re.I)


def pages(root):
    out = []
    for f in glob.glob(os.path.join(root, "**", "*.html"), recursive=True):
        rel = os.path.relpath(f, root).replace(os.sep, "/")
        if rel.startswith(".") or rel.startswith(EXCLUDE_DIRS) or rel in EXCLUDE:
            continue
        out.append((rel, f))
    return sorted(out)


def check(rel, bands, h1, ds_bands=frozenset()):
    errs = []
    if h1 != 1:
        errs.append(f"expected exactly 1 <h1>, found {h1}")
    pos = {}
    for i, b in enumerate(bands):
        pos.setdefault(b, i)
    t = page_type(rel, bands, ds_bands)
    if t:
        want = ORDER[t]
        missing = [b for b in want if b not in pos]
        if missing:
            errs.append(f"[{t}] missing anchor band(s): {', '.join(missing)}")
        present = [b for b in want if b in pos]
        got = sorted(present, key=lambda b: pos[b])
        if got != present:
            errs.append(f"[{t}] anchor bands out of order: got {' > '.join(got)}; want {' > '.join(present)}")
        if "hero" in pos and pos["hero"] != min(pos[b] for b in bands if b != "proof-strip"):
            errs.append(f"[{t}] hero is not the first band")
        if "proof-strip" in pos and pos["proof-strip"] != 0:
            errs.append(f"[{t}] proof-strip is not the first band")
    # generic rules, any page that has the bands
    if "reviews" in pos:
        last = len(bands) - 1
        cta = bands.index("cta") if "cta" in bands else None
        before_end = bands[cta - 1] if cta else bands[last]
        if before_end == "reviews":
            errs.append("reviews is the last content band before the CTA/footer")
        if "faq" in pos and pos["faq"] < pos["reviews"]:
            errs.append("faq comes before reviews (must come after)")
    if "faq" in pos:
        for maps in ("service-areas", "directions"):
            if maps in pos and pos[maps] < pos["faq"]:
                errs.append(f"{maps} comes before faq (must come after)")
    if "cta" in pos and bands[-1] != "cta":
        errs.append(f"cta is not the last band (last is {bands[-1]})")
    return t, errs


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), ".."))
    checked, typed, bad = 0, 0, 0
    for rel, f in pages(root):
        p = Bands()
        p.feed(strip(open(f, encoding="utf-8").read()))
        t, errs = check(rel, p.bands, p.h1, p.ds)
        checked += 1
        typed += bool(t)
        for e in errs:
            print(f"FAIL {rel}: {e}")
        bad += bool(errs)
    if checked == 0 or typed == 0:
        print(f"FAIL: gate inspected nothing (pages={checked}, typed={typed}) under {root}")
        sys.exit(2)
    print(f"{'FAIL' if bad else 'PASS'} section order + single h1: {checked} pages checked, {typed} typed, {bad} with violations")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
