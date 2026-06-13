# Texora Painting — Claude Rules

## MANDATORY: Before Every Push

**NEVER push to GitHub without completing ALL of the following steps:**

1. **Local preview** — start the preview server (`python3 .claude/serve.py`) and take a screenshot showing the change looks correct
2. **Lighthouse mobile** — run Lighthouse on `http://127.0.0.1:4500/` with `--form-factor=mobile`. Score must be ≥ 85, CLS must be ≤ 0.15
3. **Lighthouse desktop** — run Lighthouse on `http://127.0.0.1:4500/` with `--form-factor=desktop`. Score must be ≥ 85
4. **Show results to the user** — display scores (mobile, desktop, LCP, CLS) before asking for push approval
5. **Wait for explicit approval** — user must say "push", "go ahead", or "ship it" before running `git push`

If scores drop compared to previous run, diagnose and fix before proceeding.

## Lighthouse Commands

```bash
# Start preview server
python3 "/Users/illiafominykh/Downloads/Texora Painting/texora-painting/.claude/serve.py" &

# Mobile test
npx lighthouse http://127.0.0.1:4500/ --preset=perf --form-factor=mobile \
  --screenEmulation.mobile=true --screenEmulation.width=375 \
  --screenEmulation.height=812 --screenEmulation.deviceScaleFactor=2 \
  --output=json --output-path=/tmp/lh-mobile.json \
  --chrome-flags="--headless --no-sandbox" --quiet

# Desktop test
npx lighthouse http://127.0.0.1:4500/ --preset=perf --form-factor=desktop \
  --screenEmulation.mobile=false --screenEmulation.width=1350 \
  --screenEmulation.height=940 --screenEmulation.deviceScaleFactor=1 \
  --output=json --output-path=/tmp/lh-desktop.json \
  --chrome-flags="--headless --no-sandbox" --quiet

# Read results
node -e "
  ['mobile','desktop'].forEach(f => {
    const r = require('/tmp/lh-' + f + '.json');
    const s = Math.round(r.categories.performance.score * 100);
    const m = r.audits;
    console.log(f.toUpperCase() + ':', s + '/100',
      '| LCP:', m['largest-contentful-paint'].displayValue,
      '| FCP:', m['first-contentful-paint'].displayValue,
      '| CLS:', m['cumulative-layout-shift'].displayValue,
      '| TBT:', m['total-blocking-time'].displayValue);
  });
"
```

## Project Info

- **Stack:** Pure static HTML/CSS/JS, ~70 pages, no framework, no build step
- **Deploy:** Netlify auto-deploy on push to `main` branch (~30–60s)
- **Repo:** `TexoraPaint/texora-painting` on GitHub
- **Live site:** `https://texorapainting.com`
- **Preview server:** `python3 .claude/serve.py` → `http://127.0.0.1:4500`
- **Business:** Texora Painting, Tsawwassen/Ladner BC — local painting & drywall company

## Security Rules

- **No API keys in any HTML/JS file.** `GOOGLE_PLACES_KEY` lives ONLY in Netlify env vars
- All API calls go through `netlify/functions/reviews.js`

## CSS Conventions

- All CSS is inline `<style>` per page (minified)
- CSS variables: `--orange: #f47b20`, `--blue: #1a3a6e`, `--orange-dark: #d96a10`
- Never use `#a85000` — always `#f47b20` for orange

## Current Performance Baselines (June 2026)

- Mobile: 100/100, CLS: 0, LCP: 1.4s
- Desktop: 89/100, CLS: 0.007, LCP: 1.9s
