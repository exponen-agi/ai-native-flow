# Agent instructions

## Peer repository: keep it in sync

This repo and [`cloudbloqavi/exponenlabs-landing`](https://github.com/cloudbloqavi/exponenlabs-landing)
are the same application with different purposes:

| | `exponen-agi/ai-native-flow` (this repo) | `cloudbloqavi/exponenlabs-landing` |
| --- | --- | --- |
| Purpose | Standalone, open-source blueprint generator; may become its own product | The AI-Native Business Deployment tool inside the ExponenLabs site: engages visitors, supports business goals, improves SEO/GEO |
| Owns | The planner itself: `index.html`, `assets/css/app.css`, `assets/js/*.js`, `docs/` | Site integration: routing, metadata, JSON-LD, sitemap, `llms.txt`, OG images, analytics, CTAs, branding |

The landing repo generates its copy of the planner from this repo with
`scripts/sync-ai-native-flow.mjs`, which reads `index.html`, `assets/css/app.css` and
`assets/js/*.js`. Keep those landmarks intact (the masthead section, the site footer, the script tags),
or the sync will fail.

### Rule

Whenever you change one of the two repos, decide whether the same or a related change belongs in
the other. If it does, make it there too and open a PR (or equivalent change request) in the peer
repo, so the two do not drift. Do this without being asked, and link the two PRs to each other.

### How to decide

- **Planner behaviour, content, rules, copy, bug fixes, accessibility, visual design of the tool:**
  these are made here, then pulled into the landing repo by running its sync script
  (`node scripts/sync-ai-native-flow.mjs <path-to-this-repo>`) and committing the regenerated files there.
- **Open-source-only concerns (do not port to the landing repo):** standalone README, GitHub Pages setup,
  licensing, and anything that exists only to run from `file://`.
- **Site-only concerns (do not port here):** SEO/GEO work (sitemap, XML, structured data, `llms.txt`),
  analytics and utm tracking, conversion CTAs, ExponenLabs branding, and business messaging. If you
  find a planner defect while working in the landing repo, fix it here and re-sync.
- **Mixed change:** split it. Port the shared part, keep the specific part in its own repo.
- If the change needs a business or product call you cannot make from the code, say so in the PR
  rather than guessing.

### Checklist for every change

1. Does it touch the planner? If yes, it needs a matching PR in the landing repo (re-sync).
2. Could the same defect or improvement apply to the peer? Check, and state the answer in the PR description
   ("Peer repo: PR link / not applicable because ...").
3. Run `node scripts/validate.js` before pushing.
4. Respect each repo's customizations; sync must never overwrite site-specific or open-source-specific content.
