# Mind & Matter — Handoff / Continuity Doc

> **Purpose:** Paste this entire file into a fresh Copilot chat (or share the
> file path) so a new agent can resume work without losing context.
> Last updated: 2026-07-29

---

## 1. Project at a glance

- **Site:** https://mindandmatter.co.in (live, HTTPS, custom domain)
- **Netlify fallback:** https://mind-and-matter-blog.netlify.app
- **GitHub repo:** https://github.com/mamunuj-debug/mind-and-matter (branch `main`)
- **Stack:** Static HTML/CSS/JS in `website/`, no build step. Decap CMS at `/admin/`.
- **Content:** 17 published posts in `website/data/posts.json` (Rainbows added 2026-07-22, at index 0)
- **Hosting:** Netlify auto-deploys on push to `main`
- **Email/Newsletter:** Resend (domain verified), audience `24f74a41-2f27-4edf-84b5-7fe92b8dada2`
- **CMS auth:** Netlify Identity + Git Gateway, owner logs in via GitHub
- **Domain registrar:** GoDaddy (DNS only — Website Builder disconnected)
- **Active PAT (2026-07-25):** stored in Copilot memory at `/memories/mind-and-matter.md` (never commit to repo — GitHub secret scanning will reject the push)
  Rotate at https://github.com/settings/tokens — classic, `repo` scope only

## 2. The single most important workaround

**Intel corporate proxy blocks `git push`.** It returns HTTP 403 from
`proxy-us.intel.com` even with a valid PAT. **Do not waste time debugging git.**

Push to GitHub via the GitHub Git Data API instead:
```sh
python3 _api_push.py <github_pat>
```
- Script lives at repo root: `_api_push.py`
- Uses `urllib.request` with proxy `http://proxy-dmz.intel.com:912`
- Auto-runs `tools/build_posts.py` first to regenerate per-post pages + sitemap
- Auto-discovers `website/post/*/index.html` via `glob`
- Static FILES list at top of script — extend if you add new top-level files

**Active PAT:** stored in Copilot memory under `mind-and-matter.md` (cross-workspace).
In a fresh chat, ask the assistant: *"What's the PAT for mind-and-matter?"*
- Owner: `mamunuj-debug`, scope: classic with `repo`
- If revoked: regenerate at https://github.com/settings/tokens (classic, `repo` scope only)
- **Never commit the PAT to the repo** — GitHub secret scanning will reject the push.

## 3. Repository layout

```
GHCP_WW17/                          (workspace root)
├── _api_push.py                    Deploy script (gitignored, do not commit)
├── HANDOFF.md                      This file
├── tools/
│   └── build_posts.py              Generates per-post HTML pages + sitemap.xml
└── website/                        Everything below this is what Netlify serves
    ├── _headers                    Security headers + CSP
    ├── robots.txt                  Sitemap declaration
    ├── sitemap.xml                 Auto-generated, do not hand-edit
    ├── index.html                  Homepage (Hero/Ticker/Latest/Featured/...)
    ├── style.css                   All styles
    ├── app.js                      Loads posts.json, renders cards, modal
    ├── 404.html
    ├── admin/
    │   ├── index.html              Decap CMS shell
    │   └── config.yml              CMS schema (must include coverImage field)
    ├── data/
    │   └── posts.json              Source of truth for all posts
    └── post/<slug>/index.html      Auto-generated per-post pages (do not hand-edit)
```

## 4. Content schema (`website/data/posts.json`)

Each post object has these fields:
```json
{
  "id": "unique-id",
  "title": "Post title",
  "slug": "auto-derived-from-title",     // optional, generator computes if absent
  "excerpt": "Short blurb shown on cards",
  "content": "Full body. Paragraphs separated by \\n\\n. Image syntax: ![alt](url)",
  "category": "Physics | Engineering | Space | ...",
  "date": "YYYY-MM-DD",
  "readTime": "5 min",
  "author": "Md Mamunuj Zaman",
  "coverImage": "https://upload.wikimedia.org/...",
  "published": true
}
```

**Image hosting:** Use Wikimedia Commons URLs. Unsplash hotlinks return 403.
- Find via Wikipedia API: `curl "https://en.wikipedia.org/api/rest_v1/page/summary/<TOPIC>"`

## 5. CSP / `_headers` rules that bit us before

Current `website/_headers` must contain (do not weaken):
- `img-src 'self' data: https:` — without `https:`, all Wikimedia images break
- `/admin/*` block needs `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://identity.netlify.com` AND `connect-src ... https://api.github.com` — Decap CMS won't load otherwise
- `frame-src https://identity.netlify.com` — Identity widget modal
- Homepage Identity widget script: `https://identity.netlify.com/v1/netlify-identity-widget.js`

## 6. Standard publish flow

1. Edit `website/data/posts.json` directly OR use `/admin/` CMS in browser
2. From workspace root: `python3 _api_push.py <PAT>`
3. Netlify rebuilds in ~60 sec
4. Verify: open https://mindandmatter.co.in/ and the new `/post/<slug>/` page

## 7. SEO infrastructure (Week 1 stack — DONE 2026-06-06)

- ✅ Per-post URLs at `/post/<slug>/` (17 pages, pre-rendered)
- ✅ Each page has full Open Graph + Twitter Card + JSON-LD `Article` + canonical
- ✅ Homepage has OG/Twitter meta + meta description
- ✅ `sitemap.xml` lists 18 URLs (homepage + 17 posts)
- ✅ `robots.txt` declares sitemap
- ✅ Google Search Console **Domain property** verified (DNS TXT)
- 🟡 GSC sitemap submitted as `https://mindandmatter.co.in/sitemap.xml`
  (status may show "could not be read" for hours; auto-flips to Success)
- ❌ Bing Webmaster Tools — pending (Import from GSC, 60 sec)
- ❌ Manual indexing requests for top 3 posts — pending (in GSC URL inspection)

## 7b. Homepage content (as of 2026-07-25)

- **Hero headline:** "From atoms to galaxies, / I turn complex science / into stories for everyone"
- **Hero sub:** "A quiet corner of the internet for people who love science that still feels like wonder."
- **About Author role:** "Engineer · Science Enthusiast"
- **About Author paragraph:** rewritten around chip design, bioengineering, climate science, physics, mathematics, space exploration. Goal: "make science more interesting and accessible to everyone."
- **Social share thumbnail:** `social-share-v3.png` with tagline "From atoms to space." (hand-edited from v2 PNG to preserve original design — do NOT re-render from SVG or colors will shift). OG/Twitter meta in `index.html` point to v3.
- **Topic cards** on homepage now FILTER the article grid instead of opening a single article. Clicking a topic:
  - Sets `currentTopicFilter` and re-renders the grid with only matching articles
  - Shows a colored "Showing: <Topic> (N) ✕" chip above the grid
  - Uses word-boundary regex matching so `ai` doesn't match `rain`
- **Topic counts** auto-update from articleData after posts.json loads
- **Published-essays counter** uses WeakMap-tracked timers to avoid races between the on-scroll animation and async posts.json update. Element gets a `published-count` class so the generic animator skips it.
- **Static placeholder articles** in `staticArticleData` (8 mock titles like "High-NA EUV", "Europa Clipper") are no longer merged into `articleData`. They remain in the source only as a fallback for the first paint. **6 of them are kept as writing candidates** — see `/memories/repo/mind-and-matter-post-ideas.md`.

### Hero glitch effect (2026-07-29)
- Originally the whole span "I turn complex science" had `.glitch` on it. On mobile, the span wrapped to 2 lines but the absolutely-positioned `::before` / `::after` pseudo-elements did not wrap the same way — words appeared under the wrong lines.
- **Current setup:** only the words **"complex science"** are wrapped in `<span class="glitch glitch-inline" data-text="complex science">` (see [index.html](website/index.html)). The `.glitch-inline` class forces `display: inline-block; white-space: nowrap;` so the phrase is always one unbreakable unit — the ghost text stays aligned on every viewport.
- **Gradient inheritance quirk:** `background: inherit` on the pseudo-elements does NOT reliably propagate the gradient through nested spans across browsers. Solution: `.hero-title .glitch-inline` and its `::before` / `::after` re-declare the gradient explicitly.
- **Animation:** 3s loop with TWO glitch bursts per cycle (at 42–48% and 94–98%), ±5px XY jitter, opacity `.6`. Definitely visible (much stronger than the original once-per-4s single-frame flash).

## 8. Pending / planned work

### Distribution (to drive first traffic)
- Submit EUV post to Hacker News (Show HN or just URL post)
  - URL: `https://mindandmatter.co.in/post/why-modern-chips-are-made-with-light-you-cannot-see/`
  - Best time: Tue–Thu 8–10am ET
- Cross-post to LinkedIn, ~2 paragraphs + link
- Newsletter blast via Resend (already wired)

### Nice-to-have improvements
- Update `website/app.js` so homepage modal does `history.pushState('/post/<slug>/')` so URL-bar shows the real post URL even when staying on the homepage
- Add a "Read on its own page →" link in the modal
- Analytics — pick one and signup: GoatCounter (free, open), Plausible ($9/mo), Cloudflare Web Analytics (free)
- Add per-post share buttons (Twitter intent, LinkedIn share, copy link)
- RSS feed (`feed.xml`) — useful for Feedly/HN distribution

### Content backlog (suggested next posts)
- Refer to existing 17 posts for tone calibration
- Cadence target: 4–5 posts/week (per newsletter perks copy)
- **6 writing candidates kept from the old static scaffold** (see `/memories/repo/mind-and-matter-post-ideas.md`):
  1. How High-NA EUV Could Decide the Future of Sub-2 nm Chips (Semiconductors)
  2. Why Advanced Packaging May Matter More Than Moore's Law (Semiconductors)
  3. Why Photonic Interconnects Could Save the AI Datacenter (AI & Compute)
  4. Solid-State Batteries Are Finally Facing the Right Question (Energy & Climate)
  5. Europa Clipper and the Most Important Ocean We Cannot See (Space Systems)
  6. CRISPR Diagnostics Are Quietly Becoming a Computing Story (Bioengineering)

## 9. Common gotchas / lessons learned

| Gotcha | Fix |
|---|---|
| `git push` 403 from Intel proxy | Use `_api_push.py` |
| Unsplash images 403 on hotlink | Use Wikimedia Commons URLs |
| Reddit `preview.redd.it` images hotlink-block | Use Wikimedia or Britannica CDN instead |
| CSP blocks images | Ensure `img-src` has `https:` |
| Decap CMS won't load at `/admin/` | Need `'unsafe-eval'` + `https://api.github.com` in `/admin/*` CSP |
| Emoji corruption when writing files | Use HTML entities, e.g. `&#x1F4E1;` |
| tcsh heredoc (`cat <<'EOF'`) hangs | Don't use heredocs; write a Python helper to `/tmp/` and exec |
| tcsh doesn't like `>&` for redirect | Use `>& /tmp/log.txt` explicitly with no ambiguous chaining |
| GoDaddy "Coming Soon" page hijacks domain | Must call GoDaddy support to disconnect Website Builder |
| GSC Domain property needs full sitemap URL | Submit `https://mindandmatter.co.in/sitemap.xml`, not just `sitemap.xml` |
| `replace_string_in_file` needs 3+ lines context | Always include surrounding lines for unique match |
| Substring matching in topic filters (`'ai'.includes` matched `rain`) | Use `\b<term>\b` regex with escapeRegExp |
| Multiple `setInterval` timers on same counter DOM node | Track timers in WeakMap; cancel previous before starting new |
| Social share PNG re-render from SVG shifts colors/fonts | Take the good PNG and paint over ONLY the tagline text; don't re-rasterize SVG |
| Social platforms cache OG image aggressively | Bump filename (v2 → v3) and update all `og:image` + `twitter:image` meta refs |
| Static articleData in app.js merged with managed posts inflated the count | Merge only `managedPosts` when posts.json loads; keep static array as first-paint fallback only |
| CSS glitch pseudo-elements misalign on mobile when the real text wraps | Use `.glitch-inline { display: inline-block; white-space: nowrap; }` on a short unbreakable phrase; re-declare gradient on the pseudo-elements (background inheritance is unreliable) |

## 10. Environment variables in Netlify

(Already set, only relevant if migrating hosting)
- `RESEND_API_KEY` — Resend API key for newsletter sends
- `RESEND_AUDIENCE_ID` = `24f74a41-2f27-4edf-84b5-7fe92b8dada2`
- `FROM_EMAIL` = `Mind & Matter <hello@mindandmatter.co.in>`

## 11. DNS (GoDaddy → Netlify)

- `A` `@` → `75.2.60.5`
- `CNAME` `www` → `apex-loadbalancer.netlify.com`
- TXT records: Netlify domain verification, Resend SPF/DKIM, Google Search Console
- ⚠️ Do NOT remove the GSC verification TXT record — it must persist

## 12. How to recover in a fresh chat

**Option A — same workspace (`/nfs/site/disks/zsc14.xne_irw.085/mdmamunu/GHCP_WW17`):**
1. Open Copilot chat
2. Paste: *"Read HANDOFF.md at the workspace root for full context on the Mind & Matter blog. We were working on [your current task]. Continue from there."*
3. Agent reads this file and resumes.

**Option B — different workspace / different machine:**
1. Make sure `_api_push.py` is present at the new workspace root with the same PAT
2. Clone the GitHub repo fresh: contents under `website/` are the source of truth
3. Copy `tools/build_posts.py` and `HANDOFF.md` from this workspace OR re-fetch from a backup tarball
4. In a fresh chat, paste this entire HANDOFF.md as context, then describe the current task

**Option C — total disaster (lost workspace, new machine):**
1. `git clone https://github.com/mamunuj-debug/mind-and-matter` (over personal network — works fine off Intel VPN)
2. Recreate `_api_push.py` (template at end of this file — Section 14)
3. Generate a new PAT at https://github.com/settings/tokens (classic, `repo` scope)
4. Continue normally

## 13. Quick verification commands

```sh
# Site reachable + key pages 200 OK
curl -sI https://mindandmatter.co.in/                                      | head -1
curl -sI https://mindandmatter.co.in/sitemap.xml                           | head -1
curl -sI https://mindandmatter.co.in/post/why-modern-chips-are-made-with-light-you-cannot-see/ | head -1

# Sitemap content
curl -s https://mindandmatter.co.in/sitemap.xml | head

# OG tags (paste into preview tester)
# https://www.opengraph.xyz/url/https%3A%2F%2Fmindandmatter.co.in%2F

# Local: regenerate post pages
python3 tools/build_posts.py

# Local: deploy (replace <PAT> with token from Copilot memory)
python3 _api_push.py <PAT>
```

## 14. `_api_push.py` template (in case it gets lost)

```python
#!/usr/bin/env python3
"""Push files to GitHub via Git Data API (Intel proxy blocks `git push`)."""
import sys, os, json, base64, glob, subprocess, urllib.request

if len(sys.argv) < 2:
    print("Usage: python3 _api_push.py <github_pat>"); sys.exit(1)

TOKEN  = sys.argv[1]
REPO   = "mamunuj-debug/mind-and-matter"
BRANCH = "main"
API    = f"https://api.github.com/repos/{REPO}"
MSG    = "deploy: latest changes"

print("Running tools/build_posts.py ...")
subprocess.check_call([sys.executable, "tools/build_posts.py"])

FILES = [
    "website/_headers", "website/robots.txt", "website/sitemap.xml",
    "website/social-share.png", "website/social-share-v2.png",
    "website/social-share-v3.png", "website/social-share.svg",
    "website/link.html",
    "website/data/posts.json", "website/index.html", "website/style.css",
    "website/app.js", "website/admin/config.yml",
]
FILES += sorted(glob.glob("website/post/*/index.html"))

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "Content-Type": "application/json",
    "User-Agent": "deploy-script",
}
proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY") \
        or "http://proxy-dmz.intel.com:912"
urllib.request.install_opener(urllib.request.build_opener(
    urllib.request.ProxyHandler({"https": proxy, "http": proxy})))
print(f"Using proxy: {proxy}")

def req(method, path, body=None):
    url = API + path if path.startswith("/") else path
    data = json.dumps(body).encode() if body else None
    r = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read())

blob_shas = {}
for f in FILES:
    content = base64.b64encode(open(f, "rb").read()).decode()
    resp = req("POST", "/git/blobs", {"content": content, "encoding": "base64"})
    blob_shas[f] = resp["sha"]
    print(f"  blob {f}  →  {resp['sha']}")

head     = req("GET", f"/git/ref/heads/{BRANCH}")
head_sha = head["object"]["sha"]
base_tree = req("GET", f"/git/commits/{head_sha}")["tree"]["sha"]
tree = req("POST", "/git/trees", {
    "base_tree": base_tree,
    "tree": [{"path": f, "mode": "100644", "type": "blob", "sha": s}
             for f, s in blob_shas.items()],
})
commit = req("POST", "/git/commits", {
    "message": MSG, "tree": tree["sha"], "parents": [head_sha],
})
req("PATCH", f"/git/refs/heads/{BRANCH}", {"sha": commit["sha"], "force": False})
print(f"\nDeployed commit {commit['sha']}  →  branch '{BRANCH}' updated.")
print("Netlify auto-deploy will run in ~1 minute.")
```

---

## 15. One-paragraph summary to paste into a new chat

> I'm building a personal science/tech blog called Mind & Matter at
> https://mindandmatter.co.in. It's a static site (HTML/CSS/JS) hosted on
> Netlify, content lives in `website/data/posts.json`, and there's a Decap CMS
> at `/admin/`. The repo is `mamunuj-debug/mind-and-matter` on GitHub, branch
> `main`. **Critical:** I'm on the Intel corporate network and `git push` is
> blocked by the proxy, so I deploy by running `python3 _api_push.py <PAT>` —
> that script uses the GitHub Git Data API and auto-runs
> `tools/build_posts.py` to regenerate per-post pages + sitemap.xml first.
> The full project state and all gotchas are in `HANDOFF.md` at the workspace
> root — please read it before suggesting changes.
