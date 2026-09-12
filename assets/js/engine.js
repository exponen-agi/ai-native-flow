/* Deterministic blueprint generator. Same answers in, same flow out. */

function computeTier(c) {
  const e = eng(c), b = budget(c);
  let tier = 1;
  if (e >= 1 && b >= 2) tier = 2;
  if (e >= 4 && b >= 3) tier = 3;
  if ((e >= 15 || c.stage === 'enterprise') && b >= 3) tier = 4;
  if (c.stage === 'smb' && e === 0) tier = Math.min(tier, 1);
  if (has(c, 'no-ci')) tier = Math.min(tier, 2);
  return tier;
}

/* Regulated work does not lower the tier, it adds governance and time. */
function governanceWeight(c) {
  let w = 1;
  if (has(c, 'regulated')) w += 0.5;
  if (has(c, 'legacy-systems')) w += 0.25;
  if (c.stage === 'enterprise') w += 0.25;
  if (has(c, 'client-code')) w += 0.15;
  return w;
}

function selectNodes(c, tier, list) {
  return (list || NODES).filter(n => (n.when ? n.when(c, tier) : true));
}

/* Bridge over excluded nodes so a dropped step never breaks the chain. */
function buildEdges(nodes, list) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const kb = new Map((list || NODES).map(n => [n.id, n]));
  const resolve = (id, seen = new Set()) => {
    if (seen.has(id)) return [];
    seen.add(id);
    if (byId.has(id)) return [id];
    const src = kb.get(id);
    if (!src || !src.after) return [];
    return src.after.flatMap(p => resolve(p, seen));
  };
  const edges = [];
  const seen = new Set();
  for (const n of nodes) {
    if (!n.after) continue;
    for (const parent of n.after) {
      for (const from of resolve(parent)) {
        if (from === n.id) continue;
        const key = from + '>' + n.id;
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ from, to: n.id });
      }
    }
  }
  /* Keep only the strongest upstream link per lane pair, so the picture
     stays readable: drop an edge when a longer path already connects them. */
  const adj = new Map();
  edges.forEach(e => { if (!adj.has(e.from)) adj.set(e.from, []); adj.get(e.from).push(e.to); });
  const reachableSkipping = (from, to, viaLimit = 4) => {
    const stack = (adj.get(from) || []).filter(x => x !== to).map(x => [x, 1]);
    while (stack.length) {
      const [cur, d] = stack.pop();
      if (cur === to) return true;
      if (d >= viaLimit) continue;
      (adj.get(cur) || []).forEach(nx => stack.push([nx, d + 1]));
    }
    return false;
  };
  return edges.filter(e => !reachableSkipping(e.from, e.to));
}

const PHASE_LIBRARY = [
  {
    id: 'ground',
    title: 'Ground the artifact chain',
    weeks: [1, 2],
    goal: 'Intent stops living in chat windows and the agent stops guessing your conventions.',
    nodeIds: ['artifact-home', 'claude-md', 'originator', 'intent-capture', 'product-owner', 'feedback-loop', 'spend-limit'],
    proof: 'An idea from a non-engineer reaches a committed intent.md the same day, and one command builds, tests and lints the project.'
  },
  {
    id: 'shape',
    title: 'Make the plan the reviewable unit',
    weeks: [2, 4],
    goal: 'Nothing is implemented without a written plan a stranger could execute.',
    nodeIds: ['spec-agent', 'plan-agent', 'orchestrator', 'delivery-partner', 'implementer', 'test-first', 'ops-agent', 'branch-protection'],
    proof: 'Every merged change has a plan.md that matches it, and first-pass merge rate is rising.'
  },
  {
    id: 'guard',
    title: 'Encode policy, then enforce it',
    weeks: [3, 6],
    goal: 'Your standards become files the agent reads and hooks it cannot talk past.',
    nodeIds: ['skills', 'hooks', 'review-md', 'test-lock', 'verifier-subagent', 'visual-check', 'legacy-bridge', 'policy-owner'],
    proof: 'Review findings that cite a written policy fall towards zero, because the policy is applied while the code is written.'
  },
  {
    id: 'review',
    title: 'Layer the review, keep one human gate',
    weeks: [5, 9],
    goal: 'Every pull request gets identical passes; the human judges intent and risk only.',
    nodeIds: ['review-bugs', 'review-security', 'review-compliance', 'code-owner', 'prod-gate', 'chat-responder', 'postmortem'],
    proof: 'Time to first review is minutes, and defects caught before merge exceed those escaping to production.'
  },
  {
    id: 'scale',
    title: 'Run streams in parallel',
    weeks: [8, 13],
    goal: 'One engineer steers several sessions because each one verifies itself.',
    nodeIds: ['parallel-fleet', 'knowledge-curator', 'eval-suite', 'ci-judgment', 'permissions', 'release-auth', 'rollback'],
    proof: 'Concurrent sessions per engineer rise while rework rate holds flat. That flat line is the permission to add another.'
  },
  {
    id: 'close',
    title: 'Close the loop',
    weeks: [12, 20],
    goal: 'A deterministic trigger invokes an agent with no person in the path, and findings re-enter as intent.',
    nodeIds: ['control-bands', 'diagnosis-agent', 'service-owner', 'security-scan', 'telemetry-loop', 'support-signal', 'learning-agent'],
    proof: 'Time from a threshold breach to a triaged finding is measured in minutes, against the weeks an incident used to take to reach the backlog.'
  }
];

function buildPhases(c, tier, nodes) {
  const present = new Set(nodes.map(n => n.id));
  const w = governanceWeight(c);
  const teamDrag = eng(c) >= 15 ? 1.2 : eng(c) === 0 ? 1.15 : 1;
  let cursor = 1;
  const phases = [];
  for (const p of PHASE_LIBRARY) {
    const items = p.nodeIds.filter(id => present.has(id));
    if (!items.length) continue;
    const span = Math.max(1, Math.round((p.weeks[1] - p.weeks[0] + 1) * w * teamDrag));
    phases.push({
      ...p,
      items,
      start: cursor,
      end: cursor + span - 1
    });
    /* Phases overlap by design: the next one starts before the last finishes. */
    cursor += Math.max(1, Math.round(span * 0.7));
  }
  return phases;
}

const METRIC_LIBRARY = [
  { stage: 'Intake', lead: 'Hours from first conversation to a committed intent.md', lag: 'Share of intent files accepted rather than closed', source: 'git history of the intent home', minTier: 1 },
  { stage: 'Shape', lead: 'Elapsed time between the intent and spec commits', lag: 'Spec commits dated after the first plan commit, meaning requirements churned mid-build', source: 'two git timestamps', minTier: 1 },
  { stage: 'Build', lead: 'Share of changes that merge from the first implementation pass', lag: 'How often the merged diff still matches its plan.md', source: 'pull request metadata', minTier: 1 },
  { stage: 'Verify', lead: 'First-pass CI success rate on agent-written changes', lag: 'Change failure rate', source: 'CI system', minTier: 2 },
  { stage: 'Ship', lead: 'Time to first review, and review comments resolved without a human touching the branch', lag: 'Defects caught before merge versus escaping to production', source: 'pull request history and incident tracker', minTier: 2 },
  { stage: 'Scale', lead: 'Concurrent sessions per engineer while rework holds flat', lag: 'Changes merged per engineer per week, read alongside rework rate', source: 'session telemetry and pull request history', minTier: 3 },
  { stage: 'Operate', lead: 'Minutes from a threshold breach to a triaged finding', lag: 'Share of findings that become merged fixes, and repeat incidents of the same class', source: 'detection log and incident tracker', minTier: 3 },
  { stage: 'Cost', lead: 'Token spend per merged change, split interactive versus scheduled', lag: 'Delivery cost per change against the same quarter last year', source: 'workspace usage export', minTier: 1 }
];

function buildMetrics(tier) {
  return METRIC_LIBRARY.filter(m => m.minTier <= tier);
}

const RISK_LIBRARY = [
  {
    id: 'subscription',
    title: 'Buying seats and calling it adoption',
    body: 'A subscription handed to the tech team changes the build step and nothing else. The build step was never your constraint: the stages either side of it were. Spend the first month on the artifact home, CLAUDE.md and a one-command self-check, none of which need a bigger plan.',
    when: () => true
  },
  {
    id: 'gate-bottleneck',
    title: 'Keeping human-speed gates around a machine-speed build',
    body: 'When the diff arrives in hours and the approval committee meets on Tuesdays, your cycle time is Tuesday. Re-ask every gate: can this be a deterministic check, an adversarial model pass, or an artifact reviewed after the fact? Judgment, risk acceptance and the production gate stay human. Little else should.',
    when: (c, t) => t >= 2 || c.stage === 'enterprise'
  },
  {
    id: 'no-verify',
    title: 'Autonomy without a self-check',
    body: 'Turning on auto mode before the agent can run your tests just moves the mess downstream and makes a person read all of it. The self-check harness is the prerequisite for every tier above the first, and it is an afternoon of work.',
    when: () => true
  },
  {
    id: 'review-volume',
    title: 'Agentic review with no written threshold',
    body: 'Without REVIEW.md defining what Important means and capping nits, the passes produce volume and your team learns to scroll past them. Rate the findings monthly and cut what CI already enforces.',
    when: (c, t) => t >= 2
  },
  {
    id: 'test-weakening',
    title: 'Letting the fixer edit the test',
    body: 'An agent pushed to go green will weaken the check on the code it just changed. Lock test files during fix tasks with a hook, or reject any diff that touches a test alongside its own fix.',
    when: (c, t) => t >= 2
  },
  {
    id: 'two-truths',
    title: 'Two sources of truth with no link',
    body: 'Markdown in the repo and tickets in your existing tracker, each half-maintained, is worse than either alone. Name one authoritative system per artifact and make the other carry a reference to it.',
    when: c => has(c, 'legacy-systems')
  },
  {
    id: 'unbounded-spend',
    title: 'Unmetered autonomous loops',
    body: 'Scheduled and event-triggered jobs spend while nobody is in the room. Set a hard workspace limit before the first loop runs, meter scheduled work separately from interactive sessions, and review monthly which loop earned its tokens.',
    when: (c, t) => t >= 3
  },
  {
    id: 'no-engineer',
    title: 'Shipping customer-facing software with nobody technical accountable',
    body: 'Agents will produce something that works and cannot be operated, secured or recovered. Retain a few hours a month of senior review and spend all of it at the plan and release gates.',
    when: c => eng(c) === 0
  },
  {
    id: 'regulated-evidence',
    title: 'Treating the chat log as your audit trail',
    body: 'A session transcript is not evidence a regulator accepts. The commit chain is: who asked, what the agent produced, which policy version was in force, who approved. Make every stage end by committing an artifact, and forward session telemetry to the stack you already audit.',
    when: c => has(c, 'regulated')
  },
  {
    id: 'client-ip',
    title: 'Client code crossing boundaries',
    body: 'Delivery work means one client\'s context must never reach another\'s session. Separate workspaces per client, managed settings denying egress, and a written statement of which tools see client data. Get this in your contract language before it is in a questionnaire.',
    when: c => has(c, 'client-code')
  },
  {
    id: 'middle-layer',
    title: 'Adding an AI coordination layer on top of a human coordination layer',
    body: 'If status still routes through people who summarise for other people, the agents inherit a lossy input. Make the work legible instead: every decision leaves an artifact, and the summary is generated from artifacts rather than retyped.',
    when: (c, t) => eng(c) >= 15 || c.stage === 'enterprise'
  }
];

function buildRisks(c, tier) {
  return RISK_LIBRARY.filter(r => r.when(c, tier));
}

function budgetNote(c) {
  const map = {
    under200: 'Under $200 a month buys one or two serious seats. Spend it on one person who goes deep rather than five who dabble, and keep the whole flow at the assisted tier until that person can show the artifact chain working.',
    to2k: 'A few thousand a month covers a small team with real headroom for review passes in CI. Meter it now, before a scheduled job exists to hide in the total.',
    to10k: 'This is the range where parallel sessions and continuous evals stop being theoretical. Expect scheduled jobs to become a visible share of the bill and split that line out from day one.',
    over10k: 'At this level the autonomous loops dominate spend, not the people. Set a hard workspace limit, meter per loop, and review monthly which loop earned its tokens. An unmetered maintenance loop is the classic runaway.'
  };
  return map[c.budget];
}

function stageNote(c) {
  const map = {
    solo: 'Solo means no handoff losses to eliminate, so skip the coordination machinery and spend everything on the self-check harness. It is the only thing standing between you and reviewing every line yourself.',
    startup: 'Early stage is the cheapest moment to do this properly: no legacy process to unwind, no org chart to renegotiate. Decide the artifact conventions now and stop changing them, so the team and the agents work to one flow.',
    growth: 'Growth stage is where the gates start to hurt. Your build is already fast and your review, spec and release steps are not, so that is where the next quarter of work belongs.',
    smb: 'For a business whose product is not software, the first return is almost never in a repository. It is in the recurring back-office procedure nobody wants to own. Automate that under written procedure and human review before touching anything customer-facing.',
    enterprise: 'At enterprise scale the control objectives stay and the enforcement changes: skills for policy, hooks for what must always hold, managed settings as the floor, and the commit chain as evidence. Budget roughly double the calendar of a startup for the same tier.'
  };
  return map[c.stage];
}

const GOAL_FOCUS = {
  'ship-faster': { node: 'plan-agent', line: 'Cycle time is mostly waiting, not typing. Attack the plan and review gates first: a written plan cuts the rework that eats a sprint, and layered review passes cut the days a pull request sits.' },
  'fewer-defects': { node: 'feedback-loop', line: 'Defects fall when the agent can prove its own work. Build the self-check harness, then the failing-test-first rule, then the test-file lock. Review passes are third, not first.' },
  'less-rework': { node: 'intent-capture', line: 'Rework is almost always a requirements failure wearing an engineering costume. The intent interview and the flagged-conflict spec are where you fix it, weeks before any code exists.' },
  'support-load': { node: 'support-signal', line: 'Support load is intent that never reached the repository. Cluster the tickets into intent files with volume evidence, and let the ranking argue for itself.' },
  'ops-cost': { node: 'ops-agent', line: 'The cost is in the recurring procedure, not the product. Write the procedure down, run it with an agent under human review, and only then consider automating the review.' },
  'scale-without-hiring': { node: 'parallel-fleet', line: 'Capacity comes from parallel streams that verify themselves, not from faster typing. The honest ceiling is how many streams one person can review properly: add one only while rework holds flat.' }
};

function buildBlueprint(c) {
  const tier = computeTier(c);
  const nodes = selectNodes(c, tier);
  const edges = buildEdges(nodes);
  return {
    answers: c,
    tier,
    tierInfo: TIERS[tier],
    nodes,
    edges,
    phases: buildPhases(c, tier, nodes),
    metrics: buildMetrics(tier),
    risks: buildRisks(c, tier),
    budgetNote: budgetNote(c),
    stageNote: stageNote(c),
    focus: GOAL_FOCUS[c.goal],
    counts: {
      ai: nodes.filter(n => n.kind === 'ai').length,
      human: nodes.filter(n => n.kind === 'human').length,
      gate: nodes.filter(n => n.kind === 'gate' || n.kind === 'system').length
    },
    horizon: nodes.length ? Math.max(...buildPhases(c, tier, nodes).map(p => p.end)) : 0
  };
}
