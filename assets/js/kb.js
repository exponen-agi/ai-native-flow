/* Knowledge base for the AI-Native Flow blueprint.
   Every node, gate and artifact the generator can place, with the rules that
   decide whether it belongs in a given company's flow.

   Sources distilled into these rules are listed in docs/METHOD.md.
   No network calls, no model calls: this file is the whole "intelligence". */

const LANES = [
  { id: 'intake',  label: 'Intake',   caption: 'Capture what is wanted' },
  { id: 'shape',   label: 'Shape',    caption: 'Spec, design, plan' },
  { id: 'build',   label: 'Build',    caption: 'Implement under guardrails' },
  { id: 'verify',  label: 'Verify',   caption: 'Prove it before a human looks' },
  { id: 'ship',    label: 'Ship',     caption: 'Layered review, one human gate' },
  { id: 'operate', label: 'Operate',  caption: 'Watch, diagnose, re-enter' }
];

const TIERS = {
  1: {
    name: 'Assisted artifact chain',
    thesis: 'One person and an agent per task. Every step still starts by hand, but nothing lives only in a chat window.',
    ceiling: 'Autonomy stops at the edit. You read every diff.'
  },
  2: {
    name: 'Guardrailed build',
    thesis: 'Policy becomes files the agent reads and hooks that stop it. Review becomes layered passes instead of one tired human.',
    ceiling: 'Agents act freely inside the repo, never past the merge gate.'
  },
  3: {
    name: 'Parallel and self-verifying',
    thesis: 'Each session proves its own work, so one person steers several streams and reviews artifacts rather than keystrokes.',
    ceiling: 'Production still needs a named human to authorize the release.'
  },
  4: {
    name: 'Governed autonomous loop',
    thesis: 'Deterministic triggers invoke agents with no person in the path. Findings re-enter as intent and the loop feeds itself.',
    ceiling: 'Humans hold judgment, risk acceptance and the production gate. Nothing else.'
  }
};

/* Predicate helpers used by node rules. c = the answers object. */
const eng = c => ({ none: 0, solo: 1, small: 4, large: 15 })[c.engineers];
const budget = c => ({ under200: 1, to2k: 2, to10k: 3, over10k: 4 })[c.budget];
const has = (c, k) => (c.constraints || []).includes(k);
const uiHeavy = c => ['saas', 'mobile', 'ecommerce'].includes(c.domain);

/* kind: ai | human | gate | system | artifact
   after: upstream node ids. Dropped nodes are bridged, so the chain never breaks.
   when(c, tier): include this node for these answers. Omit to always include. */
const NODES = [
  /* ---------------------------------------------------------------- INTAKE */
  {
    id: 'originator', lane: 'intake', kind: 'human', title: 'Originator',
    subtitle: 'anyone with the problem',
    purpose: 'Describes the problem in their own words. Support lead, founder, customer, engineer. No formal language, no template to learn, no product manager to book time with.',
    why: 'In the traditional flow an idea waits for someone else to write it up, and what reaches engineering is several handoffs from what the originator meant.',
    responsibility: 'Bring the problem, the people it hurts, and what better looks like. Correct the agent when it misreads you. Do not write the document yourself.',
    out: ['intent.md']
  },
  {
    id: 'intent-capture', lane: 'intake', kind: 'ai', title: 'Intent capture agent',
    subtitle: 'interviews, then writes intent.md',
    after: ['originator'],
    purpose: 'Interrogates the originator like a business analyst would, then writes the result to intent.md against your house template.',
    why: 'This is the cheapest place in the whole flow to fix a misunderstanding. An agent that keeps asking costs minutes; a wrong spec costs a sprint.',
    prompt: 'You are capturing intent, not solving it. Interview me about this problem one question at a time until you could brief a stranger: who is affected, what they cannot do today, what better looks like, what is explicitly out of scope, and which constraints are non-negotiable. Do not propose a solution or write any file until I say the picture is complete. Then write intent/<slug>.md using our template and list every open question you could not resolve.',
    out: ['intent.md']
  },
  {
    id: 'triage-agent', lane: 'intake', kind: 'ai', title: 'Backlog triage agent',
    subtitle: 'tags, sizes, ranks incoming intent',
    after: ['intent-capture'],
    when: (c, t) => t >= 2,
    purpose: 'Reads every open intent file, tags domain and size, flags duplicates, and proposes a ranked order for the product owner to accept or override.',
    why: 'Once anyone can file intent, volume rises. Triage is the work that used to consume refinement meetings.',
    prompt: 'Read every file in intent/ with status: draft. For each one output a single row: slug, one-line summary, area (frontend / backend / data / ops), size (S/M/L), type (bug / feature / debt), and a duplicate-of reference where two intents describe the same problem. Then propose a ranked order with one sentence of reasoning per item. Rank on customer pain and blast radius, not on how easy it looks.',
    in: ['intent.md']
  },
  {
    id: 'product-owner', lane: 'intake', kind: 'human', title: 'Product owner (DRI)',
    subtitle: 'accepts or closes. Named person, not a committee',
    after: ['triage-agent', 'intent-capture'],
    purpose: 'Decides which intent enters the flow. The accept is the commit, and that commit is the trigger for the next stage.',
    why: 'A single directly responsible individual is the thing most teams are missing. A committee turns a decision into a meeting series.',
    responsibility: 'Accept, close, or send back with a reason. Own the outcome of what you accept. Never accept an intent whose open questions would change the design.',
    in: ['intent.md'], out: ['intent.md']
  },
  {
    id: 'support-signal', lane: 'intake', kind: 'ai', title: 'Support signal agent',
    subtitle: 'tickets and calls to intent',
    when: (c, t) => c.goal === 'support-load' || (t >= 3 && c.goal === 'ops-cost'),
    purpose: 'Clusters support tickets, chat threads and call transcripts weekly, then writes the recurring ones up as intent files with volume evidence attached.',
    why: 'The most valuable intent in most companies is already written down by customers. It just never reaches the repository.',
    prompt: 'Read the last 30 days of support conversations. Cluster them by underlying cause, not by wording. For each cluster of five or more, write intent/<slug>.md containing the cause, the ticket count, three verbatim customer quotes, the handling time it consumes, and a proposed outcome. Skip clusters already covered by an open intent file.',
    out: ['intent.md']
  },

  /* ----------------------------------------------------------------- SHAPE */
  {
    id: 'spec-agent', lane: 'shape', kind: 'ai', title: 'Spec and design agent',
    subtitle: 'one session, policy applied while writing',
    after: ['product-owner'],
    purpose: 'Turns accepted intent into a requirements and design spec, with your brand, security, compliance and UX skills loaded as constraints, and every conflict flagged rather than silently resolved.',
    why: 'Requirements and design were separate phases for accountability, not speed. Collapsing them costs nothing when policy is applied while the spec is written instead of discovered in review weeks later.',
    prompt: 'Read intent/<slug>.md and produce spec.md: a requirements and design spec for integrating this into our existing codebase. Apply every skill available to you so the result conforms to our brand, security and UX standards. State each requirement so it can be tested. Call out clearly any area of concern, especially where two policies contradict each other and you cannot satisfy both. Do not resolve a policy conflict yourself.',
    in: ['intent.md'], out: ['spec.md']
  },
  {
    id: 'policy-owner', lane: 'shape', kind: 'human', title: 'Policy owner',
    subtitle: 'resolves flagged conflicts only',
    after: ['spec-agent'],
    when: (c, t) => has(c, 'regulated') || t >= 3,
    purpose: 'Security, legal, data protection or brand owner who answers the specific conflicts the spec flagged, before engineering sees it.',
    why: 'These are the escalations an analyst used to carry. Answering them at spec time is what keeps a security queue from forming behind the agents.',
    responsibility: 'Answer the flagged question, then write the answer back into the skill that failed to cover it, so the next spec does not ask again.',
    in: ['spec.md'], out: ['skills/']
  },
  {
    id: 'mock-agent', lane: 'shape', kind: 'ai', title: 'Interface mock agent',
    subtitle: 'mock from intent, hand to build',
    after: ['spec-agent'],
    when: (c, t) => uiHeavy(c),
    purpose: 'Produces a working mock straight from the intent so the product owner iterates on something visible before any implementation plan exists.',
    why: 'Front-end work is where a spec loses the most in translation. A mock is cheaper to argue with than a built screen.',
    prompt: 'From intent/<slug>.md and spec.md, build a static mock of the screens this change needs. Use our existing components and tokens only. Show the empty, loading, error and populated states of each screen. Annotate anything you had to invent because the spec did not say.',
    in: ['spec.md'], out: ['mock']
  },
  {
    id: 'plan-agent', lane: 'shape', kind: 'ai', title: 'Plan interrogator',
    subtitle: 'plan mode. Reads code, changes nothing',
    after: ['mock-agent', 'policy-owner', 'spec-agent'],
    purpose: 'Reads the codebase without editing it and writes plan.md: the files that change, the order of work, the risks, and the proof that will show it worked.',
    why: 'A plan is reviewable while changing course is still document editing. It is also the handoff format: the next session starts cold and knows nothing about this conversation.',
    prompt: 'Stay in plan mode. Read spec.md and the codebase, then write plan.md with four sections: Files that change (exact paths), Order of work (numbered, each step independently verifiable), Risks (what this could break, and the single riskiest step), Proof (the commands and checks that will demonstrate it works). Then tell me what you deliberately chose not to do and why. Write plan.md so an engineer who has never seen this conversation could implement it alone.',
    in: ['spec.md'], out: ['plan.md']
  },
  {
    id: 'orchestrator', lane: 'shape', kind: 'human', title: 'Engineer as orchestrator',
    subtitle: 'interrogates the plan, then accepts it',
    after: ['plan-agent'],
    when: c => eng(c) >= 1,
    purpose: 'Attacks the plan before any code exists, iterates it, then accepts. From here the job is steering and reviewing, not typing.',
    why: 'This is the role change that matters most for your engineers. Their leverage moves from writing the diff to specifying and judging it.',
    responsibility: 'Ask what breaks, which step is riskiest, and what was ruled out. Do not accept a plan you could not implement yourself from the file alone.',
    in: ['plan.md'], out: ['plan.md']
  },
  {
    id: 'delivery-partner', lane: 'shape', kind: 'human', title: 'Technical reviewer on retainer',
    subtitle: 'a few hours a month, on the gates only',
    after: ['plan-agent'],
    when: c => eng(c) === 0,
    purpose: 'With no engineer on staff, buy a small, recurring block of senior review time and spend it exclusively at the plan and merge gates.',
    why: 'Agents will happily build a thing that works and cannot be operated. Without one technical judge, the cost surfaces months later as a rewrite.',
    responsibility: 'Judge the plan and the release, not the keystrokes. Own the permission and backup setup. Say no to anything touching payments, personal data or auth without a second look.',
    in: ['plan.md']
  },

  /* ----------------------------------------------------------------- BUILD */
  {
    id: 'implementer', lane: 'build', kind: 'ai', title: 'Implementer',
    subtitle: 'one accepted plan, one pass',
    after: ['orchestrator', 'delivery-partner', 'plan-agent'],
    purpose: 'Executes the accepted plan, updating plan.md in the same commit wherever reality forces a departure from it.',
    why: 'With a solid plan the implementation is usually a single pass. When it is not, the plan was the problem.',
    prompt: 'Implement plan.md exactly. Work step by step in the stated order and run the proof commands after each step. If you must depart from the plan, stop, update plan.md in the same commit, and say what changed and why. Do not expand scope, do not refactor code the plan does not name, and do not bump dependency versions.',
    in: ['plan.md'], out: ['diff']
  },
  {
    id: 'test-first', lane: 'build', kind: 'ai', title: 'Failing test first',
    subtitle: 'for every bug, before the fix',
    after: ['implementer'],
    purpose: 'Reproduces the bug as a test, confirms it fails for the stated reason, and commits that test before any fix is written.',
    why: 'A test that existed before the fix, and that the agent could not rewrite, is the only durable proof the bug is gone.',
    prompt: 'Before fixing anything, write a test that reproduces this bug. Run it and show me it fails, and explain why it fails in terms of the defect. Commit the test on its own. Only then fix the code until the test passes, without editing the test file.',
    out: ['tests']
  },
  {
    id: 'parallel-fleet', lane: 'build', kind: 'ai', title: 'Parallel sessions',
    subtitle: 'one worktree per independent task',
    after: ['implementer'],
    when: (c, t) => t >= 3 && eng(c) >= 4,
    purpose: 'Two or three sessions, each in its own git worktree on its own branch, on tasks the plan shows are file-independent.',
    why: 'The ceiling is not the tooling, it is how many streams one person can review properly. Add a session only while review keeps up.',
    prompt: 'Split plan.md into tasks that touch disjoint sets of files. List which tasks can run in parallel and which must run in sequence because they share a file. For each parallel task give me the worktree command and the one-line brief that session needs to start cold.',
    out: ['diff']
  },
  {
    id: 'knowledge-curator', lane: 'build', kind: 'ai', title: 'Knowledge curator',
    subtitle: 'second mistake becomes a rule',
    after: ['implementer'],
    when: (c, t) => t >= 2,
    purpose: 'Watches for the corrections you keep repeating and turns each into a line in CLAUDE.md, keeping the file under a page.',
    why: 'Institutional knowledge stops living in people\'s heads and starts being read at the beginning of every session. This is the cheapest compounding asset in the flow.',
    prompt: 'Review the corrections I made in this session. For any mistake you have now made twice, propose the exact line to add to CLAUDE.md under "Things to get right", and propose one stale line to delete so the file stays under a page. Show the diff, do not apply it.',
    out: ['CLAUDE.md']
  },
  {
    id: 'ops-agent', lane: 'build', kind: 'ai', title: 'Operations automation agent',
    subtitle: 'connector work, not repository work',
    after: ['plan-agent'],
    when: c => c.domain === 'internal-ops' || eng(c) === 0,
    purpose: 'Does the work that never needed a codebase: reconciling spreadsheets, drafting the weekly pack, chasing exceptions, filing structured records into the systems you already own.',
    why: 'For a business whose bottleneck is back office rather than product, this is where the first real money is. It needs connectors and a written procedure, not a repository.',
    prompt: 'Here is the written procedure for this recurring task, and access to the systems it touches. Execute it for this period. Produce the output in the same format as last period, list every row where you had to make a judgment call, and stop and ask rather than guessing on anything involving money, a customer commitment, or personal data.',
    out: ['record']
  },

  /* ---------------------------------------------------------------- VERIFY */
  {
    id: 'feedback-loop', lane: 'verify', kind: 'system', title: 'Self-check harness',
    subtitle: 'one command to build, test, lint',
    after: ['implementer', 'test-first', 'parallel-fleet', 'ops-agent'],
    purpose: 'One command each for build, test and lint, with a healthy output example in CLAUDE.md, so a session can verify itself and fix its own mistakes before you see them.',
    why: 'This is the highest-leverage thing on the whole board and the cheapest to build. Without it, every agent output lands on a human, and that human is the bottleneck.',
    prompt: 'Wrap our verification into single commands (make build, make test, make lint) that exit non-zero on failure. Then add a Verifying your work section to CLAUDE.md listing each command with an example of healthy output, and the rule: run all three before reporting any task complete, paste the output, and if a test fails fix the code and never the test.',
    out: ['CLAUDE.md']
  },
  {
    id: 'verifier-subagent', lane: 'verify', kind: 'ai', title: 'Verifier subagent',
    subtitle: 'fresh context, reports only',
    after: ['feedback-loop'],
    when: (c, t) => t >= 2,
    purpose: 'A separate agent with its own context window runs the app, exercises the changed behaviour and its nearest neighbours, and reports what it saw without fixing anything.',
    why: 'The session that wrote the code carries the assumptions that produced it. A cold verdict catches what a self-review cannot.',
    prompt: 'Start the app. Exercise the behaviour plan.md says changed, plus the two nearest neighbouring flows. Report what you ran, what you saw, and anything that does not match plan.md. Attach screenshots for every UI state. Do not fix anything: report only.',
    in: ['diff']
  },
  {
    id: 'visual-check', lane: 'verify', kind: 'ai', title: 'Visual diff check',
    subtitle: 'screenshot against the approved mock',
    after: ['feedback-loop'],
    when: (c, t) => uiHeavy(c) && t >= 2,
    purpose: 'Drives a real browser, screenshots each state, compares against the approved mock and iterates until they match.',
    why: 'A UI change with no visual proof is unverified work. Two or three rounds is normal and each one should visibly improve.',
    prompt: 'Open the changed screens in a browser at 390px and 1280px. Screenshot every state. Compare each against the approved mock and list the differences in spacing, type, colour and behaviour. Fix the code, not the mock, then repeat until they match or you can explain why a difference is correct.',
    in: ['mock']
  },
  {
    id: 'test-lock', lane: 'verify', kind: 'gate', title: 'Test-file lock',
    subtitle: 'hook: no editing the test during a fix',
    after: ['feedback-loop'],
    when: (c, t) => t >= 2,
    purpose: 'A hook that blocks edits to test files while a fix task is running, so the agent cannot weaken the check on the code it is changing.',
    why: 'An agent under pressure to go green will edit the test. This is the one guardrail that keeps your suite honest.',
    enforces: 'Blocks writes to test paths during fix tasks. Exit code 2 with the reason, so the agent is told why.',
    in: ['tests']
  },
  {
    id: 'eval-suite', lane: 'verify', kind: 'ai', title: 'Eval suite',
    subtitle: '20 to 50 real tasks, run on config change',
    after: ['verifier-subagent', 'feedback-loop'],
    when: (c, t) => t >= 3,
    purpose: 'Regression tests for the configuration that steers your agents. Runs when CLAUDE.md, a skill or a hook changes, and on a nightly schedule.',
    why: 'Your prompt and policy files are now production configuration. A model swap or a skill edit can quietly halve your quality, and nothing else will tell you.',
    prompt: 'Take these 20 recent tasks and their accepted outcomes. For each, write an eval: the prompt, plus the checks that define acceptable (tests pass, lint clean, behaviour unchanged, policy followed). Wire them to run non-interactively in CI on any change under .claude/ or to CLAUDE.md, and nightly. Fail the check if the pass rate drops below the current baseline.',
    out: ['evals/']
  },

  /* ------------------------------------------------------------------ SHIP */
  {
    id: 'review-bugs', lane: 'ship', kind: 'ai', title: 'Review pass: defects',
    subtitle: 'logic, edge cases, regressions',
    after: ['verifier-subagent', 'visual-check', 'eval-suite', 'feedback-loop'],
    when: (c, t) => t >= 2,
    purpose: 'Reads the diff hunting for logic errors, broken edge cases and subtle regressions, and ranks each finding by severity.',
    why: 'Every pull request now gets an identical review, instead of a review whose quality depends on which human had capacity that afternoon.',
    prompt: 'Review this diff for defects only: logic errors, unhandled edge cases, race conditions, and regressions in behaviour the tests do not cover. For each finding give the file and line, what input triggers it, and what goes wrong. Rank by severity and mark anything cosmetic as a nit. Report at most five nits and summarise the rest as a count.',
    in: ['diff']
  },
  {
    id: 'review-security', lane: 'ship', kind: 'ai', title: 'Review pass: security',
    subtitle: 'injection, auth gaps, data in logs',
    after: ['verifier-subagent', 'eval-suite', 'feedback-loop'],
    when: (c, t) => t >= 2 || has(c, 'regulated'),
    purpose: 'A separate pass against your written security standard, so the security queue scales with agent output instead of with headcount.',
    why: 'Security teams are sized for human output. When agents multiply the diff, either the queue grows or code ships under-reviewed, and a regulated business can accept neither.',
    prompt: 'Review this diff against REVIEW.md, security pass only: authentication and authorization gaps, injection paths, secrets or personal data reaching logs or error messages, unvalidated input crossing a trust boundary, and new external egress. For each finding cite the rule it breaks and give the smallest safe fix.',
    in: ['diff']
  },
  {
    id: 'review-compliance', lane: 'ship', kind: 'ai', title: 'Review pass: intent match',
    subtitle: 'diff against spec.md and plan.md',
    after: ['verifier-subagent', 'feedback-loop'],
    when: (c, t) => t >= 2,
    purpose: 'Checks the merged diff against what was actually asked for, and flags scope the plan never authorised.',
    why: 'This is the pass only an artifact chain makes possible, and it is the one that catches quiet scope creep.',
    prompt: 'Compare this diff against spec.md and plan.md. List: requirements in the spec with no corresponding change, changes with no corresponding requirement, and departures from the stated order or approach that plan.md was not updated to reflect. State whether the change does what was asked, in one line, before the detail.',
    in: ['diff', 'spec.md', 'plan.md']
  },
  {
    id: 'code-owner', lane: 'ship', kind: 'human', title: 'Code owner',
    subtitle: 'judges intent and risk, not style',
    after: ['review-bugs', 'review-security', 'review-compliance', 'feedback-loop'],
    when: c => eng(c) >= 1,
    purpose: 'The human approval. Reads the ranked findings and the intent, and decides whether the risk is acceptable. Style, naming and anything CI enforces are out of scope.',
    why: 'Human attention moves up a level rather than away. The mechanical evidence is already attached, so the scarce judgment goes where only judgment works.',
    responsibility: 'Answer one question: does this do what was asked at a risk we accept? Re-request review after a push. Send any finding you disagree with back to REVIEW.md rather than arguing it twice.',
    in: ['diff']
  },
  {
    id: 'branch-protection', lane: 'ship', kind: 'gate', title: 'Branch protection',
    subtitle: 'the agent that wrote it cannot approve it',
    after: ['code-owner', 'review-bugs'],
    purpose: 'Everything an agent produces arrives as a pull request. No direct path to the default branch, for any identity.',
    why: 'Separation of duties survives intact, and it is the control every auditor asks about first. It is also a single settings page.',
    enforces: 'Required review from a code owner, required status checks, no force push, no self-approval.',
    in: ['diff']
  },
  {
    id: 'ci-judgment', lane: 'ship', kind: 'ai', title: 'Pipeline judgment steps',
    subtitle: 'triage the red build, draft the changelog',
    after: ['branch-protection'],
    when: (c, t) => t >= 3 && !has(c, 'no-ci'),
    purpose: 'Runs non-interactively inside the pipeline for the steps that need judgment rather than a script: triaging a failure, deciding flaky from real, writing the release note.',
    why: 'These are the steps that used to page a person. They are also the safest place to start with a non-interactive agent, because they are read-only.',
    prompt: 'Read the build log at out/build.log. Identify the most likely cause, state whether the failure looks flaky or real and what evidence supports that, and write a three-line summary for the pull request thread. Do not change any code.',
  },
  {
    id: 'prod-gate', lane: 'ship', kind: 'gate', title: 'Production approval hook',
    subtitle: 'the agent acts up to here and no further',
    after: ['branch-protection', 'ci-judgment'],
    when: (c, t) => t >= 2 || has(c, 'regulated'),
    purpose: 'A hook that inspects the action about to run and blocks a production deploy unless a named authorization is present, explaining the route to approval in its refusal.',
    why: 'This is the line that makes the rest of the autonomy acceptable to a board, an auditor or a customer\'s security questionnaire.',
    enforces: 'Pre-tool hook on shell commands. Blocks production deploys without a release authorization, logs every allow and block with a timestamp.'
  },
  {
    id: 'release-auth', lane: 'ship', kind: 'human', title: 'Release authorizer',
    subtitle: 'named human, per release',
    after: ['prod-gate'],
    when: (c, t) => t >= 3 || has(c, 'regulated'),
    purpose: 'The person who authorizes production. The agent prepares the release, rehearses the rollback and presents the evidence; this person says go.',
    why: 'Tier the autonomy by environment rather than by team. Development can be fully automatic while production stays a deliberate human act.',
    responsibility: 'Confirm the rollback was exercised, the gates passed, and the blast radius is understood. Authorize, or say what is missing.'
  },
  {
    id: 'rollback', lane: 'ship', kind: 'system', title: 'Rehearsed rollback',
    subtitle: 'one command, exercised in staging',
    after: ['release-auth', 'prod-gate', 'branch-protection'],
    when: (c, t) => t >= 3,
    purpose: 'A single rollback command that agents may call, proven regularly in staging rather than discovered during an incident.',
    why: 'The autonomous maintenance loop calls this path. It has to be the most rehearsed thing in your pipeline before you let anything invoke it unattended.',
    enforces: 'Rollback is a tool with a scope, not a runbook a human follows under pressure.'
  },

  /* --------------------------------------------------------------- OPERATE */
  {
    id: 'service-owner', lane: 'operate', kind: 'human', title: 'Service owner',
    subtitle: 'triages findings, does not start them',
    after: ['branch-protection', 'release-auth', 'rollback'],
    purpose: 'Holds the outcome of the running system. Works a queue of diagnosed findings each morning: fix now, schedule, or dismiss with a reason.',
    why: 'The shift is from starting investigations to judging them. Dismissals are not waste, they tune the detection thresholds.',
    responsibility: 'Clear the finding queue daily. Every dismissal carries a reason. Route anything product-facing to the product owner as intent.'
  },
  {
    id: 'chat-responder', lane: 'operate', kind: 'ai', title: 'First responder in chat',
    subtitle: 'lives in the incident channel',
    after: ['branch-protection'],
    when: (c, t) => t >= 2,
    purpose: 'Sits in your incident channel under its own identity. A 10pm message gets a first responder that reads logs, tests hypotheses in the thread and confirms when the metric is back to baseline.',
    why: 'The channel becomes the audit trail: request, diagnosis, human authorization and fix all stay where the incident was handled.',
    prompt: 'You are first responder on this channel. When an incident is reported: restate the symptom, check the dashboards and logs you have access to, and post your top two hypotheses with the evidence for each. Take no action that changes production. Ask for authorization by name, and when the metric returns to baseline say so with the number.',
    out: ['lessons.md']
  },
  {
    id: 'control-bands', lane: 'operate', kind: 'system', title: 'Control band watcher',
    subtitle: 'deterministic. 1σ logs, 2σ diagnoses, 3σ proposes',
    after: ['service-owner', 'rollback'],
    when: (c, t) => t >= 3,
    purpose: 'A version-controlled, unit-tested script watching one metric with a rolling baseline. Detection is entirely deterministic; the agent is invoked only once a band is breached, and the tier sets what it may do.',
    why: 'This is what makes the loop autonomous without making it unpredictable. No model decides whether something is wrong, only what to do about it.',
    enforces: 'Tiers in bands.yaml: 1σ log only, 2σ read-only diagnosis, 3σ propose a pull request or trigger a pre-approved runbook. Production access denied by managed settings.',
    out: ['bands.yaml']
  },
  {
    id: 'diagnosis-agent', lane: 'operate', kind: 'ai', title: 'Diagnosis agent',
    subtitle: 'writes findings back as intent.md',
    after: ['control-bands', 'chat-responder'],
    when: (c, t) => t >= 3,
    purpose: 'Invoked by a breach with no person in the path. Diagnoses read-only, and writes what it found as an intent file in the Intake format, which is how the loop closes.',
    why: 'A finding that arrives as intent re-enters the same governed pipeline as every other change. Nothing bypasses the gates just because a machine found it.',
    prompt: 'A control band was breached: here is the metric, the window and the deployments inside it. Diagnose read-only. Then write intent/<slug>.md in our standard format: the anomaly and its evidence, the probable cause with the code or config you believe is responsible, a proposed outcome, affected systems, and your open questions. Propose no fix outside the pull request route.',
    out: ['intent.md']
  },
  {
    id: 'security-scan', lane: 'operate', kind: 'ai', title: 'Scheduled codebase scan',
    subtitle: 'weekly, validated findings only',
    after: ['service-owner'],
    when: (c, t) => has(c, 'regulated') || t >= 3,
    purpose: 'Scheduled scanning of every connected repository on the most capable model available, with each finding validated and rated before anyone reads it.',
    why: 'A scan is a statement about one codebase under one model, and both halves go stale. Coverage should be dated from the last run, not from the first.',
    prompt: 'Scan this service for vulnerabilities an automated linter cannot see: broken authorization logic, trust-boundary assumptions, unsafe deserialization, and data classification leaks across layers. For each finding give a confidence rating and a proof-of-reachability argument. Bounded findings become a patch through review; anything architectural becomes intent/<slug>.md.',
    out: ['intent.md']
  },
  {
    id: 'learning-agent', lane: 'operate', kind: 'ai', title: 'Overnight learning agent',
    subtitle: 'yesterday\'s failures become tonight\'s pull requests',
    after: ['diagnosis-agent', 'service-owner'],
    when: (c, t) => t >= 4,
    purpose: 'Reads every interaction with your own internal agents and tools from the previous day, separates success from failure, and opens pull requests fixing the causes of failure so the same request works tomorrow.',
    why: 'This is the step that turns a set of agents into a system that improves while you sleep. It is also the last one to build: it needs every gate above it to exist first.',
    prompt: 'Read yesterday\'s agent sessions and tool invocations. Classify each as success or failure using the outcome signals available (retries, abandonment, explicit correction, permission errors, empty results). For each failure cause, identify the missing piece: a tool, an index, a permission, a skill line, or a prompt. Open one pull request per cause, smallest first, each with the failing case as a test. Do not merge.',
    out: ['diff']
  },
  {
    id: 'telemetry-loop', lane: 'operate', kind: 'ai', title: 'Product telemetry loop',
    subtitle: 'friction to experiment to decision',
    after: ['service-owner'],
    when: (c, t) => t >= 3 && ['ship-faster', 'ops-cost', 'support-load'].includes(c.goal) && c.domain !== 'services',
    purpose: 'Reads product analytics for the highest-friction step in a named funnel, proposes one experiment inside a written scope, and reports the result against the metric.',
    why: 'The same closed loop applied to the product rather than the pipeline. It needs an explicit scope document, or it will optimise the metric and damage the product.',
    prompt: 'Here are our funnel metrics and our product scope document. Find the step with the highest drop-off that the scope permits changing. Propose one experiment: the hypothesis, the change, the primary metric, the guardrail metrics that must not move, and the sample size needed. Implement it behind a flag as a pull request. Do not launch it.',
    out: ['intent.md']
  },
  {
    id: 'postmortem', lane: 'operate', kind: 'ai', title: 'Post-mortem to eval',
    subtitle: 'every incident leaves a permanent test',
    after: ['chat-responder', 'diagnosis-agent', 'service-owner'],
    when: (c, t) => t >= 2,
    purpose: 'Writes the incident record to a version-controlled lessons file that future investigations read, and converts the incident into a permanent case in the eval suite.',
    why: 'Post-mortem actions that never reach the codebase are the most common silent loss in maintenance. An eval is how a lesson stops depending on memory.',
    prompt: 'Write the post-mortem for this incident to lessons/<date>-<slug>.md: timeline with timestamps, what broke, why the existing checks missed it, and the change that prevents recurrence. Then write the eval case that would have caught it, and add it to the suite. Name no individual.',
    out: ['lessons.md', 'evals/']
  },

  /* --------------------------------------------------- SPINE: memory, policy */
  {
    id: 'artifact-home', lane: 'spine', kind: 'artifact', title: 'Artifact home',
    subtitle: 'intent/ in the product repo',
    purpose: 'One version-controlled place where intent, spec and plan live, next to the code derived from them. The commit history is the audit trail: who asked for what, what the agent produced, who approved it.',
    why: 'This is the first thing to build and it takes an afternoon. Everything else in the flow reads from or writes to it.',
    enforces: 'One named source of truth per artifact. Non-technical contributors commit through a connector, never through git.'
  },
  {
    id: 'claude-md', lane: 'spine', kind: 'artifact', title: 'CLAUDE.md',
    subtitle: 'what a new joiner needs on day one',
    purpose: 'Commands, conventions, architecture, and the mistakes your team sees most often. Under a page, at the repo root, reviewed like code.',
    why: 'Knowledge that used to sit in heads and wikis becomes a file read at the start of every session. Stale lines are worse than missing ones: they consume context and mislead.',
    prompt: 'Generate a starting CLAUDE.md from this repository, then cut it down to only what a new joiner needs on day one: build, test and lint commands with healthy output, the conventions that actually matter, the architecture in five lines, and a "Things to get right" list. Keep it under one page and tell me what you dropped.'
  },
  {
    id: 'skills', lane: 'spine', kind: 'artifact', title: 'Skills as policy',
    subtitle: 'institutional knowledge, applied consistently',
    when: (c, t) => t >= 2,
    purpose: 'Each policy that must be applied consistently, written once with a named owner, versioned, distributed centrally, and updated when the policy changes rather than when someone remembers it.',
    why: 'A skill is an advisory control: it makes the policy likely to be applied while the code is written. Findings that cite a policy should fall towards zero once it exists.',
    prompt: 'Take this policy document and write it as a skill: a SKILL.md whose frontmatter says exactly when it triggers and whose body says what to do, as numbered checks an agent can follow. Name the owner. Then test it: ask for the relevant task three different ways and confirm the skill loads each time.'
  },
  {
    id: 'hooks', lane: 'spine', kind: 'gate', title: 'Hooks',
    subtitle: 'the deterministic layer behind every skill',
    when: (c, t) => t >= 2,
    purpose: 'Scripts that run before or after an agent action and can allow, ask or block: protected paths, formatters, secret scanning, approval prompts.',
    why: 'A skill makes a violation rare, a hook makes it close to impossible. Any policy that must hold without exception needs one behind it.',
    enforces: 'Fast and scoped at build time. Heavy checks belong at commit or pull request. A block always explains itself and names the route to approval.'
  },
  {
    id: 'permissions', lane: 'spine', kind: 'gate', title: 'Managed settings',
    subtitle: 'the floor engineers cannot lower',
    when: (c, t) => t >= 3 || has(c, 'regulated'),
    purpose: 'Platform-owned configuration: secrets denied to the agent\'s tools, network egress on an allowlist, sandbox required to start, only approved hooks and tool servers, a minimum version floor.',
    why: 'Permissions govern the agent\'s file tools; the sandbox closes the gap a shell command leaves open. Every deny trades against capability, so tune it to the data classification of the repository.',
    enforces: 'No local file or command-line flag can widen the rules. Pre-approve the safe inner loop, or the deny list becomes prompt fatigue and someone turns it off.'
  },
  {
    id: 'review-md', lane: 'spine', kind: 'artifact', title: 'REVIEW.md',
    subtitle: 'what Important means here',
    when: (c, t) => t >= 2,
    purpose: 'The review policy: which passes run, what counts as important versus a nit, the nit cap, and what to skip because CI already enforces it.',
    why: 'Without a written threshold, agentic review produces volume and your team learns to ignore it. Tune it monthly by rating the findings.',
    prompt: 'Write REVIEW.md for this repository: the review passes we want, what qualifies as Important (would break behaviour, leak data, or breach a policy) versus a nit, a cap of five nits per review, and the paths to skip because CI or generated code covers them.'
  },
  {
    id: 'legacy-bridge', lane: 'spine', kind: 'artifact', title: 'Source-of-truth map',
    subtitle: 'one system per artifact, linked both ways',
    when: c => has(c, 'legacy-systems'),
    purpose: 'For every artifact the flow produces, name one authoritative system. Everything else holds a copy or a link. Markdown artifacts carry the record id; the record carries the commit reference.',
    why: 'Auditors and other teams already accept your existing tools, so the new flow has to fit around them. Two sources of truth with no link is the failure mode.',
    enforces: 'Linkage is the minimum bar. Declare one side authoritative per artifact type, and write the choice down.'
  },
  {
    id: 'spend-limit', lane: 'spine', kind: 'gate', title: 'Spend envelope',
    subtitle: 'budget as a control, not a surprise',
    purpose: 'A hard per-workspace spend limit, per-seat visibility, and one review each month asking which loop earned its tokens.',
    why: 'The advice to burn tokens rather than headcount only holds with a ceiling and a look at the bill. Autonomous loops are the line item that grows while nobody is watching.',
    enforces: 'Limit set centrally. Autonomous and scheduled jobs metered separately from interactive sessions, so a runaway loop is visible the next morning.'
  }
];

const ARTIFACT_LABELS = {
  'intent.md': 'intent.md',
  'spec.md': 'spec.md',
  'plan.md': 'plan.md',
  'CLAUDE.md': 'CLAUDE.md',
  'REVIEW.md': 'REVIEW.md',
  'skills/': 'skills/',
  'evals/': 'evals/',
  'bands.yaml': 'bands.yaml',
  'lessons.md': 'lessons/',
  diff: 'the diff',
  tests: 'tests',
  mock: 'approved mock',
  record: 'operational record'
};
