# Jekyll + Docker Setup Notes

## 1. Project Files

### `Dockerfile`

```dockerfile
FROM ruby:3.2-slim

RUN apt-get update -qq && apt-get install -y build-essential git

WORKDIR /srv/jekyll

RUN gem install bundler jekyll

COPY Gemfile* ./
RUN bundle install

EXPOSE 4000

CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "--livereload"]
```

### `Gemfile`

```ruby
source "https://rubygems.org"
gem "jekyll", "~> 4.3"
gem "webrick"
gem "minima", "~> 2.5"
```

> `webrick` must be an explicit dependency on Ruby 3.0+ (removed from stdlib).
> `minima` is the default Jekyll theme — needed for `layout: home` / `layout: post` to actually render as HTML instead of raw content. If the Gemfile is built manually (not via `jekyll new`), it won't be added automatically.

### `docker-compose.yml`

```yaml
services:
  jekyll:
    build: .
    ports:
      - "4000:4000"
      - "35729:35729"  # livereload
    volumes:
      - .:/srv/jekyll
      - bundle_cache:/usr/local/bundle
    command: bundle exec jekyll serve --host 0.0.0.0 --livereload --drafts

volumes:
  bundle_cache:
```

- `bundle_cache:` with no value = a **named volume** declaration using defaults. Equivalent to `bundle_cache: {}`. Caches installed gems across rebuilds.
- `--drafts` added permanently to `command:` so drafts show without needing a second manual `exec` (avoids port conflicts — see §4).
- If permission errors appear on `_site/`/`.jekyll-cache/` being root-owned, add `user: "${UID}:${GID}"` to the service, or `chown -R` afterward.

---

## 2. Core Commands

| Purpose | Command |
|---|---|
| Start (detached, background) | `docker compose up -d` |
| Start (foreground, logs visible) | `docker compose up --build` |
| Check running services | `docker compose ps` |
| View logs / debug crash | `docker compose logs jekyll` |
| Run a one-off command in the running container | `docker compose exec jekyll <cmd>` |
| Install/update gems after Gemfile change | `docker compose exec jekyll bundle install` |
| Reload config/plugin changes | `docker compose restart` |
| Production build (static output) | `docker compose exec jekyll bundle exec jekyll build` |
| Production build w/ separate prod config | `docker compose exec jekyll bundle exec jekyll build --config _config.yml,_config_production.yml` |
| Debug build errors | `docker compose exec jekyll bundle exec jekyll build --trace` |
| Find a gem's install path (e.g. to copy theme layouts) | `docker compose exec jekyll bundle show minima` |
| **Add x86_64-linux platform support** | `docker compose exec jekyll bundle lock --add-platform x86_64-linux` |

**`docker compose exec` vs `command:` in compose file:**
- `command:` defines the container's main (PID 1) process, started automatically by `docker compose up`.
- `exec` runs an *additional*, one-off command inside an **already-running** container. Requires the service to be up first (`service "jekyll" is not running` error otherwise).
- Running two long-running processes (e.g. `serve` via `command:` **and** `serve` via `exec`) causes a port conflict (`no acceptor (port is in use)` on livereload port 35729). Non-long-running commands like `build` don't conflict — safe to run via `exec` while `serve` is active.

**`bundle exec`** — runs a command using the exact gem versions locked in `Gemfile.lock`, not whatever's globally installed. Prevents version mismatches.

**Platform lock (`bundle lock --add-platform x86_64-linux`)** — adds the x86_64 Linux platform to `Gemfile.lock` so `bundle install` resolves correct native gem builds for that architecture (relevant if developing on ARM, e.g. Apple Silicon, but deploying/building for x86_64 — e.g. GitHub Actions runners, which default to `ubuntu-latest` on x86_64).

---

## 3. Writing Workflow

### Posts

```
_posts/2026-08-01-my-first-post.md
```

Filename **must** follow `YYYY-MM-DD-title.md` — Jekyll parses the date from the filename, no config flag to disable this.

```markdown
---
layout: post
title: "My First Post"
date: 2026-08-01
---

Content in **markdown**.
```

### Custom collections (workaround for date-prefixed filenames)

`_config.yml`:
```yaml
collections:
  writing:
    output: true
    permalink: /:collection/:title/
```

Folder: `_writing/my-post.md` (no date prefix needed; set `date:` in front matter instead).

Template usage:
```liquid
{% assign sorted = site.writing | sort: "date" | reverse %}
{% for item in sorted %}
  <a href="{{ item.url }}">{{ item.title }}</a>
{% endfor %}
```

Trade-off: loses automatic chronological sort, `jekyll-feed` targeting, and pagination-plugin support that's built around `site.posts` specifically.

### Hiding / unpublishing a post

| Method | Use case |
|---|---|
| `published: false` in front matter | Finished post, temporarily hidden/unlisted |
| `_drafts/` folder (no date-prefix needed) | Still writing, not scheduled — preview with `--drafts` flag |
| `exclude:` in `_config.yml` listing the file path | One-off exclusion, requires config edit + restart each toggle |

---

## 4. `_config.yml` Reference

```yaml
title: My Blog
description: "Notes on CS, running, and whatever else"
baseurl: "/digitalgarden"     # leading slash required; must exactly match repo name
url: "https://hainguyenphc.github.io"

theme: minima

markdown: kramdown
permalink: /:year/:month/:day/:title/
timezone: Asia/Ho_Chi_Minh

plugins:
  - jekyll-feed

exclude:
  - Dockerfile
  - docker-compose.yml
  - Gemfile
  - Gemfile.lock
  - vendor
  - node_modules
  - README.md
```

- Config changes require **container restart** (`docker compose restart`), unlike posts which hot-reload.
- `baseurl` — needed if site isn't served from domain root (e.g. GitHub Pages project sites at `username.github.io/reponame`). **Must have a leading `/`** (`/digitalgarden`, not `digitalgarden`) or Liquid filters/manual path-joins produce malformed URLs.
- `exclude` — prevents non-content files (Dockerfile, Gemfile, etc.) from being copied into `_site` verbatim. Without this, WEBrick may also fall back to showing a raw directory listing if there's no `index.html`.
- `timezone` — fixes "future date" post-skipping errors caused by container clock (often UTC) mismatching local timezone (e.g. `Asia/Ho_Chi_Minh`, GMT+7). Alternative fixes: `--future` flag on `jekyll serve`, or set `ENV TZ=Asia/Ho_Chi_Minh` in the Dockerfile (requires rebuild).
- Adding a plugin here (e.g. `jekyll-feed`) also requires adding it to `Gemfile` under `group :jekyll_plugins do ... end`, then `bundle install`.

---

## 5. Homepage, CSS, JS

**Homepage** — create `index.md` in project root:
```markdown
---
layout: home
title: Home
---

Welcome to my blog.
```
`layout: home` is a built-in `minima` layout that auto-lists recent posts. Without an `index.html` in `_site`, WEBrick shows a raw directory listing instead.

**Static assets** — place directly, Jekyll copies unchanged:
```
assets/css/style.css
assets/js/main.js
```
```html
<link rel="stylesheet" href="{{ '/assets/css/style.css' | relative_url }}">
<script src="{{ '/assets/js/main.js' | relative_url }}" defer></script>
```
Use `relative_url` filter (not hardcoded paths) so it respects `baseurl`.

**Overriding theme CSS** — Sass file with required empty front matter:
```scss
---
---
@import "minima";

body {
  font-family: Georgia, serif;
}
```
Save as `assets/css/style.scss`.

**Editing theme HTML structure** — copy `_layouts/`, `_includes/`, `_sass/` from the gem's install path (`bundle show minima`) into the project root; local files always take precedence over theme files.

---

## 6. Obsidian Wikilinks Plugin

Obsidian's `[[wikilink]]` syntax has no native Jekyll/kramdown support — requires a custom plugin. No fully "native" common ground exists between the two tools (Obsidian addresses by file path, Jekyll addresses by generated permalink); standard Markdown links get closer but still need a build-time path transform.

### `_plugins/wikilinks.rb` (final version, `baseurl`-aware)

```ruby
module Jekyll
  module WikilinkFilter
    def self.convert(content, site)
      baseurl = site.config['baseurl'] || ''

      content.gsub(/\[\[([^\]]+)\]\]/) do
        slug = $1.strip
        target = site.posts.docs.find { |doc| doc.basename_without_ext == slug }

        if target
          full_url = File.join(baseurl, target.url)
          "<a href=\"#{full_url}\" class=\"wikilink\">#{target.data['title'] || slug}</a>"
        else
          "<span class=\"wikilink-missing\" title=\"Note not found: #{slug}\">#{slug}</span>"
        end
      end
    end
  end

  Jekyll::Hooks.register [:posts, :pages], :post_render do |doc|
    doc.output = WikilinkFilter.convert(doc.output, doc.site)
  end
end
```

- Matches `[[filename]]` against post filenames (date-prefix and extension stripped via `basename_without_ext`).
- Unmatched links render as `<span class="wikilink-missing">` (styleable, e.g. red/dashed) instead of failing silently — makes broken links visible.
- `File.join(baseurl, target.url)` — required because `doc.url` does **not** auto-prepend `baseurl` inside plugins (unlike the `relative_url` Liquid filter). `File.join` safely avoids double/missing slashes and works whether `baseurl` is empty (local dev) or `/digitalgarden` (production).
- Only searches `site.posts` — extend with `site.collections['writing'].docs` if using the custom collection from §3.
- Plugins load once at container startup — **requires `docker compose restart`** after any edit, not hot-reload like posts.
- Verify: `docker compose exec jekyll bundle exec jekyll build --trace`, then inspect generated HTML `href` values in `_site/`.

### Obsidian-side settings (if using standard Markdown links instead)

**Settings → Files and Links** → set "New link format" to `Relative path to file`, turn off "Use [[Wikilinks]]". Still needs a plugin to rewrite `.md`-relative paths into real Jekyll permalinks — no zero-plugin solution exists either way.

---

## 7. Deployment

### Manual (SiteGround / GoDaddy / any static host)

```bash
docker compose exec jekyll bundle exec jekyll build
rsync -avz --delete _site/ user@yourhost.com:~/public_html/
```

- Build with `jekyll build`, not `jekyll serve` (dev-only).
- `_site/` is fully regenerated each build — never hand-edit its contents. Use `rsync --delete` (or equivalent "synchronize" mode in FTP clients like FileZilla) to avoid stale pages lingering after deleted posts.
- Set `url:` in `_config.yml` to the real production domain before building — `http://localhost:4000` leaking into `site.url` breaks RSS/canonical links.
- SSH access (SiteGround, some plans) → `rsync`. FTP-only (GoDaddy shared, cheaper tiers) → FTP client sync mode.

### GitHub Pages — native builder vs. GitHub Actions

**Native GH Pages builder** runs in `safe` mode: only whitelists a few plugins (`jekyll-feed`, `jekyll-seo-tag`, `jekyll-sitemap`, etc.). **Custom plugins in `_plugins/` (e.g. the wikilinks plugin) are silently skipped** — `[[wikilinks]]` would render as literal unprocessed text in production even though it works locally.

**Fix: GitHub Actions build + deploy** (required once using the custom plugin):

`.github/workflows/deploy.yml`:
```yaml
name: Build and Deploy Jekyll

on:
  push:
    branches: ["main"]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
      - name: Build site
        run: bundle exec jekyll build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: _site

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Repo settings: **Settings → Pages → Build and deployment → Source → "GitHub Actions"** (not "Deploy from a branch").

- Actions runs unrestricted `bundle exec jekyll build` — no `safe` mode, plugin runs fine.
- Push to `main` → auto build + deploy, no manual `rsync`.
- GitHub Actions runners are `x86_64` — relevant to the `bundle lock --add-platform x86_64-linux` step (§2) if developing on a different architecture (e.g. Apple Silicon/ARM) locally, so `Gemfile.lock` resolves correct native gems for the CI runner.
- If the build fails, check the **Actions tab logs** (not a local terminal error) — test with `--trace` locally before pushing.

---

## 8. `.gitignore`

```gitignore
# Jekyll build output
_site/
.jekyll-cache/
.jekyll-metadata
.sass-cache/

# Bundler (only relevant if bundling outside Docker on host)
vendor/
.bundle/

# Docker
docker-compose.override.yml

# Obsidian vault metadata
.obsidian/

# OS/editor cruft
.DS_Store
Thumbs.db
*.swp
.vscode/

# Env/secrets, if added later
.env
```

**Important exception: commit `Gemfile.lock`, do NOT ignore it.** It pins exact gem versions so GitHub Actions' `bundle install` reproduces the same environment as local Docker — ignoring it risks version drift between local and CI builds ("works on my machine").

**Open question:** whether `.obsidian/` even applies depends on whether the Obsidian vault and the Jekyll `_posts/`/`_writing/` folder are the same directory, or notes are copied/symlinked in from a separate vault.

---

## 9. Known Open Items / Decisions Pending

- [ ] Confirm `baseurl` in `_config.yml` is fixed to `/digitalgarden` (was `digitialgarden`, both typo and missing leading slash).
- [ ] Decide: toggle `--drafts` on/off vs. leave permanently on in `command:`.
- [ ] Decide: two-config split (`_config.yml` + `_config_production.yml`) for local vs. prod `url`, or manually edit before each build.
- [ ] Confirm whether Obsidian vault and Jekyll `_posts/` are the same folder (affects `.gitignore` and note-syncing workflow).
- [ ] Extend wikilinks plugin to support `[[note|display text]]` aliasing, if needed.
- [ ] Extend wikilinks plugin to also search `site.collections['writing']` if the custom collection from §3 is adopted.
- [ ] Run `docker compose exec jekyll bundle lock --add-platform x86_64-linux` before relying on GitHub Actions (x86_64 runners) for deploy, if developing locally on a non-x86_64 host (e.g. Apple Silicon).
