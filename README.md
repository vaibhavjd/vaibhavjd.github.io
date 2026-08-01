# mylabtests.github.io

Astro 5 static site for **My Lab Tests** — compares lab-test prices, packages
and ratings across Indian diagnostics brands, city by city. ~303 pages build
from `data/published/*.json`, which the private `diag-pipeline` repo commits
on a nightly schedule (currently: generated fixtures, `data_mode: "fixture"`).

## Commands

```bash
npm install
npm run fixtures    # regenerate sample data (deterministic)
npm run build       # copy lint + build all pages into dist/
npm run dev         # dev server
npm run preview     # serve dist/
```

## How it fits together

- `data/published/` — the data contract (see `src/lib/types.ts`). The pipeline
  overwrites these files; the build reads nothing else.
- `src/pages/[slug]/index.astro` — one route generates all four templates
  (city hub, full-body-checkup, test×city, national test). `allRoutes()` in
  `src/lib/data.ts` applies the ≥3-provider publish gate; sitemaps reuse it.
- `src/components/ComparisonMatrix.tsx` — the only JavaScript island
  (package coverage matrix: filters/sort). Everything else is zero-JS HTML.
- `scripts/lint-copy.mjs` + `content/style/banned-phrases.txt` — the build
  fails if page copy contains machine-written filler phrases.
- `scripts/indexnow-submit.mjs` — post-deploy IndexNow ping (Bing/Yandex)
  with the URLs whose data changed; skipped while staging.
- SEO: canonical/OG/JSON-LD derive from `PUBLIC_SITE_URL`; staging builds
  carry `noindex` + robots disallow until `PUBLIC_STAGING=false`.

## Deploy

`.github/workflows/deploy.yml` builds and publishes to GitHub Pages on every
push to `main` (the pipeline's data commits trigger it via PAT). Repo
variables: `PUBLIC_SITE_URL`, `PUBLIC_STAGING`, `PUBLIC_GTM_ID`,
`PUBLIC_GSC_VERIFICATION`, `PUBLIC_BING_VERIFICATION`.

Domain cutover: add `public/CNAME` with `mylabtests.in`, point DNS, flip
`PUBLIC_SITE_URL`, rebuild. GitHub 301-redirects all github.io URLs.
