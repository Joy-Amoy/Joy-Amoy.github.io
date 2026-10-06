# minicorp-website

Static marketing site — no build step, no dependencies.

```
index.html    landing page (hero, industry orbit, research paper, CTA)
blog.html     post index
about.html    team + values
styles.css    all styles; design tokens live in :root
main.js       sticky nav, scroll reveal, orbit spokes, abstract expander
img/          WebP assets used by the site (1.5 MB total)
images/       original PNG sources (37 MB, not referenced by any page)
```

## Local preview

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Deploying to GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → `main` / `/ (root)`.
Every push to `main` republishes.

All asset paths are **relative** (`img/…`, `about.html`) so the site works
under the `/minicorp-website/` sub-path without extra configuration.

## Before launch

- Copy marked `<!-- PLACEHOLDER -->` in the HTML is filler — stats, team
  names/roles, and blog posts all need replacing.
- `Request a demo` buttons carry `data-demo` and currently just show an alert.
  Point them at Formspree / Tally / a Google Form; there is no backend.
- Regenerate `img/` from `images/` with:
  `cwebp -q 86 images/<name>.png -o img/<name>.webp`
