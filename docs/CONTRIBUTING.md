# Contributing

How to run the app, change what it recommends, and ship it. For how the code is organised, see
[ARCHITECTURE.md](ARCHITECTURE.md).

**In short:** there is no build step. Edit a file under `assets/js`, reload the page, and run
`npm test` before opening a pull request.

## Local use

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

Fonts load from Google Fonts (Geist and Inter); everything else is local, so it degrades to
system fonts offline.

## Deploying to GitHub Pages

Two supported routes. Pick one, they are mutually exclusive.

**GitHub Actions (this repository's setup).** Settings → Pages → Build and deployment → Source:
GitHub Actions. `.github/workflows/pages.yml` then publishes the repository root on every push to
`main`, after checking the entry point and that every script parses. The live URL appears on the
workflow run and under Settings → Pages.

**Deploy from a branch.** Settings → Pages → Source: Deploy from a branch → `main` / root. No
workflow needed; delete `.github/workflows/pages.yml` if you take this route.

`.nojekyll` is present either way, so the `assets/` directory is served verbatim rather than being
run through Jekyll.

Run `npm test` to check that every script parses and the blueprint engine still produces valid plans.

## Extending the knowledge base

Every element of the flow is one object in `assets/js/kb.js`:

```js
{
  id: 'review-security', lane: 'ship', kind: 'ai', title: 'Review pass: security',
  subtitle: 'injection, auth gaps, data in logs',
  after: ['verifier-agent'],
  when: (c, t) => t >= 2 || has(c, 'regulated'),
  purpose: '...', why: '...', prompt: '...', in: ['diff']
}
```

- `kind` is `ai`, `human`, `gate`, `system` or `artifact`, and drives the colour and the fields shown.
- `when(answers, tier)` decides inclusion. Omit it to always include.
- `after` lists upstream ids. Excluded nodes are bridged automatically, so removing a step never
  breaks the chain.
- `lane: 'spine'` renders in the shared-context band beneath the graph instead of in a column.
- Company loops, learning-loop stages and tool categories live in `kb-company.js` and follow the
  same shape. A tool category carries `options`, each with a `fit(answers)` score; the highest score
  becomes the recommendation and the rest stay visible as alternatives.

Add a node, reload the page. There is nothing to rebuild.

### On naming products

The tool catalogue names real products because a blueprint that says "a CRM" helps nobody. They are
common choices per stage, not endorsements, and the page says so twice. Keep option notes functional
(what it is good for, who it suits) rather than claims about features, because those age badly. The
durable content is the category, what it emits, and how that data reaches the context layer.
