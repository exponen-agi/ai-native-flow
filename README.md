# ai-native-flow

A self-service blueprint generator for AI-native delivery. A business answers six questions about
its stage, team, budget, domain, goal and constraints, and gets back a prescriptive flow: which
steps an AI agent owns, which stay human, where the control gates sit, the order to build it in,
and how to tell whether it worked.

**Live page:** `index.html` at the repository root. Nothing else is required to run it.

## Why it exists

Most AI adoption failures are not model failures. A company buys seats, hands them to the tech
team, and changes the one step that was never the bottleneck. The build step collapses to hours
while planning, review and release stay at human speed, so cycle time barely moves and nobody can
say why. This tool prescribes the flow around the code, not the tooling inside it.

## Architecture

Static by design. No server, no build step, no model call, no analytics, no cookies. It runs from
`file://`, from GitHub Pages, or from any static host.

| File | Role |
| --- | --- |
| `index.html` | Page structure and the intake form |
| `assets/css/app.css` | Design tokens and every style, both themes |
| `assets/js/kb.js` | Knowledge base: lanes, tiers, and every node with its inclusion rule |
| `assets/js/engine.js` | Deterministic generator: tier, node selection, edges, phases, metrics, risks |
| `assets/js/graph.js` | Hand-rolled layered SVG renderer and selection highlighting |
| `assets/js/app.js` | Form wiring, detail panel, Markdown export, URL state |
| `docs/METHOD.md` | The rules in prose, and the sources behind them |

### Why no LLM call

1. **Defensibility.** The same answers must produce the same blueprint every time, because this is
   advice someone acts on. A model would produce a different graph each run and could invent roles.
2. **No secret to leak.** A static page cannot hold an API key. Any model call needs a proxy, which
   means a server, a bill, rate limiting and abuse handling.
3. **Cost and operations.** Free hosting, zero maintenance, no cold starts.

The escape hatch keeps the upside without the backend: **Copy a prompt to refine it with your own
AI** exports the blueprint plus a critique instruction, which the visitor pastes into whichever
assistant they already pay for. The refinement happens on their account, not yours.

Consequence worth knowing: the free-text problem field cannot drive the graph, because interpreting
prose needs a model. Structured pickers drive the rules; the free text is echoed into the summary,
carried into the exported brief, and used in the refinement prompt.

### If you later want a backend

Only three things justify one, and none of them is generation: capturing leads, saving named
blueprints, and tracking which inputs people pick. All three fit Firebase Hosting plus one
Firestore collection, and none of them change the generator. Keep the engine static either way.

## Local use

```sh
python3 -m http.server 8000    # then open http://localhost:8000
```

Fonts load from Google Fonts; everything else is local, so it degrades to system fonts offline.

## Deploying to GitHub Pages

Settings → Pages → Build from branch → `main` / root. `.nojekyll` is present so the `assets/`
directory is served verbatim.

## Extending the knowledge base

Every element of the flow is one object in `assets/js/kb.js`:

```js
{
  id: 'review-security', lane: 'ship', kind: 'ai', title: 'Review pass: security',
  subtitle: 'injection, auth gaps, data in logs',
  after: ['verifier-subagent'],
  when: (c, t) => t >= 2 || has(c, 'regulated'),
  purpose: '...', why: '...', prompt: '...', in: ['diff']
}
```

- `kind` is `ai`, `human`, `gate`, `system` or `artifact`, and drives the colour and the fields shown.
- `when(answers, tier)` decides inclusion. Omit it to always include.
- `after` lists upstream ids. Excluded nodes are bridged automatically, so removing a step never
  breaks the chain.
- `lane: 'spine'` renders in the governance band beneath the graph instead of in a column.

Add a node, reload the page. There is nothing to rebuild.
