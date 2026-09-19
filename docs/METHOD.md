# Method

How the blueprint is derived, so a reader can argue with the rules rather than guess at them.

## The single idea

Treat the business as an intelligence layer with people at the edge, not as a company that owns some
AI tools. Every stage of work ends by committing an artifact the next stage can read, and the chain
of those artifacts is both the handoff format and the audit trail. Agents start cold and share no
memory, so an artifact is not documentation hygiene, it is the only way work survives a handoff.

Two consequences drive every rule here:

1. **The bottleneck moves.** When the build step collapses, the constraint becomes the steps either
   side of it: planning, review, release, and the governance that routes through weekly meetings.
2. **Controls have to change form, not disappear.** Reviewing every line by hand made sense when a
   person wrote every line. The control objective survives; the enforcement becomes a written policy
   the agent reads, a deterministic hook it cannot talk past, an adversarial model pass, and a human
   at the gates that need judgment.

## The four tiers

Tier is derived from code-facing headcount and budget, then capped by constraints. It describes how
much autonomy the flow can carry, not how good the company is.

| Tier | Name | Derivation |
| --- | --- | --- |
| 1 | Assisted artifact chain | Fewer than four code-facing people, or budget under $200/month |
| 2 | Guardrailed build | At least one code-facing person and budget above $200/month |
| 3 | Parallel and self-verifying | Four or more people and budget above $2,000/month |
| 4 | Governed autonomous loop | Fifteen or more people, or enterprise stage, with budget above $2,000/month |

Caps: no CI pipeline holds the flow at tier 2, because tiers 3 and 4 both run agents inside a
pipeline. A small business with nobody in house is held at tier 1 regardless of budget, because
autonomy without a technical reviewer produces software nobody can operate.

Regulated data does not lower the tier. It adds governance nodes (managed settings, approval gates,
scheduled scans, a policy owner in the spec loop) and multiplies the calendar by 1.5. Legacy systems
add a source-of-truth map and 1.25. Enterprise stage adds 1.25. Client codebases add 1.15.

## Five views over one set of answers

The delivery lifecycle is one function's internals, not the company. The views separate them:

- **Company.** Signals in, function loops, quality gates, action and record, learning. The loops
  cover product and delivery, support, demand, revenue, back office, hiring and leadership queries.
  Underneath sits the shared context: the index, the canon, the decision log, the agent context
  files, and retention rules where the data demands them.
- **Delivery.** The six lanes below, which are the product loop opened up.
- **Tool stack.** One slot per category, a starting recommendation scored against the answers, the
  alternatives kept visible, what each slot emits, and which of six collection mechanisms carries
  that data to the context store: connectors in session, event push, scheduled pull, warehouse sync,
  capture and transcribe, or authored by hand.
- **Learning loop.** Record, index, distill, serve, gate, improve. The recursive part: recorded work
  becomes canon on a schedule, canon becomes the context the next session loads, and failures become
  permanent test cases. The overnight self-repair agent sits at the end because it depends on every
  gate before it.
- **Who does what.** The same plan drawn as the team that runs it rather than as a lifecycle. The
  four views above answer what should happen; this one answers who does it and what they hand each
  other, which is the question people ask once they have read the plan and are deciding whether they
  can staff it. Five jobs are drawn as agent pods and three as people, each bound to whichever part
  of this blueprint fills that job — so a company with nobody in house gets a visibly different team
  from one with fifteen engineers, and the difference is the argument. Nothing is added to the
  knowledge base for it: if a slot has no part at these answers, it is left out.

## Six lanes and a spine

Lanes are the stages of work: Intake, Shape, Build, Verify, Ship, Operate. The spine holds what every
lane reads: the artifact home, `CLAUDE.md`, skills as policy, hooks, managed settings, `REVIEW.md`,
the source-of-truth map, and the spend envelope.

Each node declares `after` for its upstream links. Nodes excluded by the rules are bridged, so the
chain stays connected at every tier. The Operate lane loops back to Intake, because a diagnosed
finding re-enters the flow as the next `intent.md` rather than bypassing the gates.

## Rollout order

Eight phases spanning all four views, in dependency order rather than lane order, overlapping by
roughly 40 percent. Each ends in something demonstrable:

1. **Make the work legible.** Meeting capture, public channels by default, every action leaves an
   artifact, the artifact home, the decision log, a spend envelope, and retention rules where the
   data demands them. Nothing downstream works without the record.
2. **Run one loop end to end.** One function, one named owner, one written policy, one measured
   outcome, with a second model checking output before it leaves. Depth beats breadth here.
3. **Make the plan the reviewable unit.** Spec pass, plan mode as default, branch protection.
4. **Encode policy, then enforce it.** Skills with named owners, hooks behind what must always hold,
   the review policy, permissions and redaction at ingest.
5. **Index the record, distill the canon.** One searchable store, nightly and weekly distillation
   into short documents, a named canon owner reviewing diffs with citations, canon served as session
   context.
6. **Layer the review, keep one human gate.** Defect, security and intent-match passes; a code owner
   judging intent and risk; a production approval hook; incidents becoming permanent tests.
7. **Widen to the other functions.** The loops that were waiting on the record and the canon:
   demand, revenue, hiring, leadership queries, plus parallel delivery streams and continuous evals.
8. **Close the loops.** Deterministic control bands, diagnosis agents writing findings as intent,
   scheduled scans, hill-climbing experiments, and finally overnight self-repair.

The last phase is last for a reason: an autonomous improvement loop needs the record, the index, the
canon, the gates and the evals already in place.

## Measurement

Leading indicators move in weeks and say the change took. Lagging ones settle over a quarter and say
it was worth it. Every metric offered here already exists in a system the company owns: git
timestamps, pull request metadata, the CI system, the incident tracker, the usage export. Nothing
requires new instrumentation, because a measurement plan that needs a project never runs.

## Sources

- Anthropic, *The AI-Native SDLC Playbook* (August 2026). The six stages, the artifact chain
  (`intent.md`, `spec.md`, `plan.md`, diff, review findings, incident record), skills as advisory
  policy with hooks as deterministic enforcement, layered agentic review with `REVIEW.md`, continuous
  evals on agent configuration, managed settings as the floor, control bands with tiered response,
  and the per-stage leading and lagging indicators.
- Diana Hu, Y Combinator, *How To Build A Company With AI From The Ground Up* (May 2026). The
  company as a closed loop rather than an open one, making the organization queryable so every action
  leaves an artifact, software factories where humans own spec and tests, and the surviving roles:
  individual contributor, directly responsible individual, founder who still builds.
- Y Combinator Root Access, *Building And Structuring An AI Native Company* (August 2026). The AI
  loop as signals, policy, tools, quality gate and learning; the quality gate as a second adversarial
  model rather than a person; the worked example of an overnight agent that reads yesterday's failed
  interactions and opens pull requests; humans at the edge where the system meets reality.
- Rob Shocks, *Claude Code's new intent.md* (September 2026). Artifacts as the cold-start handoff
  between independent agents and subagents; permissions dialled in as the precondition for unattended
  work; standardise the convention and stop changing it.
- Field patterns from fractional CTO engagements: the subscription-as-strategy failure, two sources of
  truth with no link, review volume with no written threshold, and unmetered autonomous loops.

## Recursive improvement, concretely

The loop has six steps and each one has a failure mode:

| Step | What it does | Fails by |
| --- | --- | --- |
| Record | Transcripts, artifacts, telemetry, traces | Direct messages and undocumented calls |
| Index | One searchable store, permissions inherited, source and date on everything | Flattening permissions, or losing provenance |
| Distill | Scheduled synthesis into short documents, diffs with citations | Producing volume nobody reads |
| Serve | Canon loaded as session context, index retrieved for the long tail | Stale lines costing context and misleading |
| Gate | A named owner reviews the diff; evals run when the canon changes | A self-writing handbook with no reviewer |
| Improve | Failures become tests, causes become pull requests, findings re-enter as intent | Bypassing the normal gates because a machine found it |

The step most companies skip is distillation. Recording without it produces a swamp; the point is the
small set of documents an agent can actually read at the start of every task.

## What this tool deliberately does not do

- **Interpret prose.** The free-text problem statement is echoed and exported, never parsed. Rules run
  on structured answers so the output is reproducible.
- **Estimate cost per change.** Too dependent on model, context size and how often a loop fires. The
  blueprint prescribes a spend envelope and a monthly review instead of a number that would be wrong.
- **Replace the judgment call.** It names where a human belongs and what that human owns. It does not
  tell anyone what to decide.
- **Endorse products.** The named tools are common choices at each stage. Option notes stay
  functional rather than making feature claims, because the landscape moves faster than this page.
