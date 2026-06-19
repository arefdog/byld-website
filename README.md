# BYLD — gobyld.com

The BYLD marketing website, built with [Hugo](https://gohugo.io/). It recreates
the live gobyld.com site as a fast, static, self-hostable Hugo project using the
official BYLD brand assets (TWK Lausanne + Helvetica Now Text, BYLD logo).

## Stack

- **Hugo** (no external theme — custom layouts in `layouts/`)
- Plain CSS (`static/css/main.css`), no build step required
- Content driven by data files in `data/` so copy can be edited without touching templates

## Structure

```
hugo.toml                 # site config, menu, params (email, address, socials)
content/_index.md         # homepage hero copy (front matter)
data/services.yaml        # the six services
data/systems.yaml         # ECHO / The ICON / ATLAS
data/comparison.yaml      # BYLD vs Traditional vs Prefab table
data/press.yaml           # press quotes
layouts/                  # custom templates (baseof, index, partials)
static/css/main.css       # the theme
static/fonts/             # brand fonts (Lausanne, Helvetica Now Text)
static/img/               # logos + favicon
```

## Develop

```bash
hugo server -D          # live reload at http://localhost:1313
```

If Hugo isn't on your PATH, this repo was built with the binary at
`~/.local/bin/hugo` (v0.163.3).

## Build

```bash
hugo --minify           # outputs static site to ./public
```

Deploy `public/` to any static host (Netlify, Cloudflare Pages, GitHub Pages, S3).

## Editing content

- **Hero text** → `content/_index.md` front matter
- **Services / systems / press / comparison** → the matching `data/*.yaml` file
- **Email, address, social links, nav** → `hugo.toml`

> All brand assets, copy, and IP belong to BYLD.
