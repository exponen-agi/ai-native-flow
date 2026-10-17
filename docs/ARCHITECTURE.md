# Architecture

How the code is organised and why it is built this way. For what each view shows, see
[VIEWS.md](VIEWS.md); for how the rules are derived, see [METHOD.md](METHOD.md); for running and
extending it, see [CONTRIBUTING.md](CONTRIBUTING.md).

**In short:** a static site (HTML, CSS and plain JavaScript) turns eight answers into a blueprint using
fixed rules. There is no server, no build step, no model call, no analytics and no cookies. It runs from
`file://`, from GitHub Pages, or from any static host.

## How an answer becomes a blueprint

```
 intake form (app.js)
        │  answers
        ▼
 profile.js ─── maps plain-language answers onto the rule segments
        │
        ▼
 engine.js ◀─── kb.js, kb-company.js   (the knowledge base)
   tier, node selection, bridging, metrics, risks
        │
        ▼
 engine-views.js ─── four lane views, tool picks, company rollout
        │
        ├──▶ graph.js     lane diagrams (Company, Delivery, Tool stack, Learning loop)
        ├──▶ network.js   Who does what
        └──▶ activate.js  roster, first week, checklist  (peek.js: side sheet for any part)
```

1. `profile.js` maps the plain-language answers (type, size, industry, journey stage) onto the segments the rules reason over.
2. `engine.js` derives the tier, selects the knowledge-base nodes whose `when` rule passes, bridges over excluded nodes, and computes metrics and risks.
3. `engine-views.js` builds the four lane views, picks a tool for each slot, and schedules the rollout.
4. The renderers draw the result. All views share one cross-view index, so a rollout phase can name a part from any view and clicking it opens that view with the part selected.

## Files

| File | Role |
| --- | --- |
| `index.html` | Page structure and the intake form |
| `assets/css/app.css` | Design tokens and every style, both themes |
| `assets/js/profile.js` | Business types and sizes, product journey stages and industries, with how each maps onto the rules |
| `assets/js/kb.js` | Delivery knowledge base: lanes, tiers, and every node with its inclusion rule |
| `assets/js/kb-company.js` | Company loops, the tool catalogue with fit rules, and the learning-loop stages |
| `assets/js/engine.js` | Tier derivation, node selection, edge bridging, delivery metrics and risks |
| `assets/js/engine-views.js` | Builds the four lane views, picks tools, schedules the company-wide rollout |
| `assets/js/graph.js` | Hand-rolled layered SVG renderer with path tracing, reused by all four lane views |
| `assets/js/network.js` | The "who does what" view: pods, wires, and hand-rolled pan and zoom |
| `assets/js/activate.js` | The activation step: the roster, the first week, and the switch-on checklist |
| `assets/js/peek.js` | The side sheet that opens any part of the plan without leaving the page being read |
| `assets/js/app.js` | Tabs, intake, detail panel, zoom and full screen, Markdown export, URL state |
| `docs/` | Method, views, architecture, contributing and landscape notes |

## Design decisions

### Why there is no LLM call

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
