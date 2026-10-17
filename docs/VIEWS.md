# Views

What each tab of a generated blueprint shows, and how to read and use it. For the rules that decide
what appears in each view, see [METHOD.md](METHOD.md).

**In short:** you answer eight questions once, and the app draws the same plan five ways, then turns it
into work you can start. Rollout, Measure, Risks and Export sit beside them.

```
 answers ──▶ Company ─ Delivery ─ Tool stack ─ Learning loop ─ Who does what
   (8)         what      how one     which tool    how work       who does it,
               runs      idea ships  fills a slot  becomes        agent or
               as loops                            context        person
                                  │
                                  ▼
             Rollout ─ Measure ─ Risks ─ Export ─ Activate (start this week)
```

## The five views

| View | Answers |
| --- | --- |
| Company | Which functions run as loops, what signals feed them, which gates hold, where the outcome goes |
| Delivery | The product loop's internals: intent, spec, plan, build, verify, ship, operate |
| Tool stack | Which tool fills each slot at this stage, what it emits, and how that reaches the context store |
| Learning loop | Record, index, distill, serve, gate, improve: how work becomes context for the next session |
| Who does what | The same plan as a team: which pods are agents, which are people, and what travels between them |

All five are generated from the same answers and share one cross-view index, so a rollout phase
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

## Activate this plan

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

After activation, a compact scheduling link offers a call to discuss the plan and where to
start. It opens Google Calendar in a new tab; booking is optional and the plan remains available.
