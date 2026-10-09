#!/usr/bin/env python3
"""BLOCKING gate: zero generator-token residue in rendered output.

Usage: python3 scripts/check_token_residue.py [site_root]   (default: the repo root)
Exit 0 = clean. Exit 1 = at least one hit (each one is printed). Exit 2 = the gate inspected nothing.

Strips <script>, <style> and HTML comments, then scans visible text AND every attribute value
on every *.html page (same exclusions as check_section_order.py) for:
  standalone undefined / null / NaN, [object Object], {{, }}, lorem ipsum, TODO, TBD, (verify
"""
import glob
import os
import re
import sys
from html.parser import HTMLParser

EXCLUDE = {
    "index.html", "about.html", "404.html",
    "privacy-policy.html", "terms.html", "cookie-policy.html",
    "thank-you.html", "service-quote-received.html", "qr.html", "review-island-preview.html",
}
EXCLUDE_DIRS = ("go/",)

TOKENS = [
    ("undefined", re.compile(r"(?<![\w-])undefined(?![\w-])")),
    ("null", re.compile(r"(?<![\w-])null(?![\w-])")),
    ("NaN", re.compile(r"(?<![\w-])NaN(?![\w-])")),
    ("[object Object]", re.compile(r"\[object Object\]")),
    ("{{", re.compile(r"\{\{")),
    ("}}", re.compile(r"\}\}")),
    ("lorem ipsum", re.compile(r"\blorem\s+ipsum\b", re.I)),
    ("TODO", re.compile(r"\bTODO\b")),
    ("TBD", re.compile(r"\bTBD\b")),
    ("(verify", re.compile(r"\(verify", re.I)),
]


class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hits = []

    def _scan(self, where, text):
        for name, rx in TOKENS:
            for m in rx.finditer(text):
                ctx = text[max(0, m.start() - 40): m.end() + 40].replace("\n", " ").strip()
                self.hits.append((self.getpos()[0], name, where, ctx))

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if v:
                self._scan(f"<{tag} {k}=>", v)

    handle_startendtag = handle_starttag

    def handle_data(self, data):
        self._scan("text", data)


def strip(html):
    # keep line count stable so reported line numbers point at the source
    keep = lambda m: "\n" * m.group(0).count("\n")
    html = re.sub(r"<!--.*?-->", keep, html, flags=re.S)
    return re.sub(r"<(script|style)\b.*?</\1\s*>", keep, html, flags=re.S | re.I)


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), ".."))
    checked, total = 0, 0
    for f in sorted(glob.glob(os.path.join(root, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(f, root).replace(os.sep, "/")
        if rel.startswith(".") or rel.startswith(EXCLUDE_DIRS) or rel in EXCLUDE:
            continue
        s = Scan()
        s.feed(strip(open(f, encoding="utf-8").read()))
        checked += 1
        for line, name, where, ctx in s.hits:
            print(f"FAIL {rel}:{line}: '{name}' in {where}: ...{ctx}...")
        total += len(s.hits)
    if checked == 0:
        print(f"FAIL: gate inspected nothing under {root}")
        sys.exit(2)
    print(f"{'FAIL' if total else 'PASS'} token residue: {checked} pages checked, {total} hit(s)")
    sys.exit(1 if total else 0)


if __name__ == "__main__":
    main()
