# ai-native-flow

A self-service blueprint generator for AI-native operations. A business answers six questions about
its stage, team, budget, domain, goal and constraints, and gets back a prescriptive operating model
across five views: the company as interacting loops, the delivery lifecycle inside it, the tool
ecosystem with the path each tool's data travels into the context layer, the learning loop that
turns recorded work back into context, and the same plan drawn as the working team that runs it.
Plus the order to build it in, the metrics to watch, and the failure patterns that match those
answers.

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
| `assets/js/kb.js` | Delivery knowledge base: lanes, tiers, and every node with its inclusion rule |
| `assets/js/kb-company.js` | Company loops, the tool catalogue with fit rules, and the learning-loop stages |
| `assets/js/engine.js` | Tier derivation, node selection, edge bridging, delivery metrics and risks |
| `assets/js/engine-views.js` | Builds the four lane views, picks tools, schedules the company-wide rollout |
| `assets/js/graph.js` | Hand-rolled layered SVG renderer with path tracing, reused by all four lane views |
| `assets/js/network.js` | The "who does what" view: pods, wires, and hand-rolled pan and zoom |
| `assets/js/activate.js` | The activation step: the roster, the first week, and the switch-on checklist |
| `assets/js/app.js` | Tabs, intake, detail panel, zoom and full screen, Markdown export, URL state |
| `docs/METHOD.md` | The rules in prose, and the sources behind them |

### The five views

| View | Answers |
| --- | --- |
| Company | Which functions run as loops, what signals feed them, which gates hold, where the outcome goes |
| Delivery | The product loop's internals: intent, spec, plan, build, verify, ship, operate |
| Tool stack | Which tool fills each slot at this stage, what it emits, and how that reaches the context store |
| Learning loop | Record, index, distill, serve, gate, improve: how work becomes context for the next session |
| Who does what | The same plan as a team: which pods are agents, which are people, and what travels between them |

All five are generated from the same six answers and share one cross-view index, so a rollout phase
can name a part from any view and clicking it opens that view with the part selected.

The first four are lane diagrams drawn by `graph.js`. Pointing at any box fades everything it does
not touch, so "what feeds this, and what does it feed" is answered by looking rather than by
clicking through each box in turn. Zoom is an explicit number with a fit setting, and the panel goes
full screen for a diagram that has outgrown the column.

**Who does what** is a different drawing of the same data, and it exists because the lane views
answer "what should happen" while nobody can tell from them who is actually doing it. Agents sit
along the top, the people who still decide sit below, and everything either sends passes through
the shared context in the middle. Each pod resolves to a real part of the generated blueprint, so
opening one lands on that part in the view that owns it, and the label on each wire names what
travels it. Drag to pan, and hold Ctrl or Cmd while scrolling to zoom — a plain wheel is left to
the page, because a canvas that swallows the scroll wheel is a canvas you cannot scroll past.

### Activate this plan

Every other section ends with the visitor holding a document, and a document is where most of these
plans stop. **Activate** is the step after that, reachable from the summary strip, the two-step
tracker under it, the export panel and its own tab. It re-reads the same blueprint as work somebody
has to start:

- **The roster.** The agent and people pods the plan resolves to, each naming what it sends, and
  each opening the part it stands for in the view that owns it. This is the network view's slot
  resolution reused rather than copied, so the roster and the map can never disagree.
- **Before you start.** Four decisions a person makes before any tool is bought: who owns the
  rollout, which part to start at, who clears each approval point, and which number gets looked at
  weekly. Each line is read off the tier, the goal focus, the gate count and the leading metric, so
  it changes with the answers.
- **The switch-on checklist.** The front of the rollout, cut at roughly six items so week one is a
  list somebody can finish. Ticking a box is deliberately not saved: the page stores nothing, and a
  checklist that half-remembers itself across reloads is worse than one that is honestly a working
  surface for this sitting. Copy it out as plain text instead.

Activation is a state of the sitting, not a stored fact. Opening the tab activates the plan exactly
as the button does, so there is no way to arrive at the panel and find it claiming otherwise, and
generating a new plan clears it — a plan nobody has read again has not been activated.

There is no booking step, no lead capture and nothing to sign up for. The step ends where the
visitor's own work begins.

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
