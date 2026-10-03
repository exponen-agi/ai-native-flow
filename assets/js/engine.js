/* Deterministic blueprint generator. Same answers in, same flow out. */

function computeTier(c) {
  const e = eng(c), b = budget(c);
  let tier = 1;
  if (e >= 1 && b >= 2) tier = 2;
  if (e >= 4 && b >= 3) tier = 3;
  if ((e >= 15 || c.stage === 'enterprise') && b >= 3) tier = 4;
  if (c.stage === 'smb' && e === 0) tier = Math.min(tier, 1);
  if (has(c, 'no-ci')) tier = Math.min(tier, 2);
  /* Autonomy needs something live to act on. Before a product there is nothing to
     automate but learning; while building the first version, loops that run with no
     person in the path have no real traffic to learn from. */
  if (preProduct(c)) tier = Math.min(tier, 2);
  else if (journeyPhase(c) === 'build') tier = Math.min(tier, 3);
  return tier;
}

/* Regulated work does not lower the tier, it adds governance and time. */
function governanceWeight(c) {
  let w = 1;
  if (has(c, 'regulated')) w += 0.5;
  if (has(c, 'legacy-systems')) w += 0.25;
  if (c.stage === 'enterprise') w += 0.25;
  if (c.org === 'enterprise-large') w += 0.15;
  if (industryRegulated(c) && !has(c, 'regulated')) w += 0.15;
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
    nodeIds: ['artifact-home', 'agents-md', 'originator', 'intent-capture', 'product-owner', 'feedback-loop', 'spend-limit'],
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
    nodeIds: ['skills', 'hooks', 'review-md', 'test-lock', 'verifier-agent', 'visual-check', 'legacy-bridge', 'policy-owner'],
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
  {
    id: 'intake', track: ['product'], stage: 'Intake', category: 'delivery',
    leadTitle: 'Intent Filing Latency', leadTarget: '< 4 hours', leadCadence: 'Weekly',
    leadDesc: 'Elapsed hours from customer discussion to a committed, validated intent.md file.',
    leadFormula: 'Timestamp(intent.md commit) - Timestamp(customer discussion)',
    lagTitle: 'Accepted Intent Ratio', lagTarget: '≥ 85% accepted', lagCadence: 'Monthly',
    lagDesc: 'Share of intent files accepted into roadmap rather than dropped as invalid.',
    lagFormula: '(Accepted intent files ÷ Total drafted intent files) × 100',
    source: 'Git history of intent home', minTier: 1
  },
  {
    id: 'shape', track: ['product'], stage: 'Shape', category: 'delivery',
    leadTitle: 'Plan-to-Spec Convergence', leadTarget: '< 6 hours', leadCadence: 'Per feature',
    leadDesc: 'Elapsed duration between intent approval and complete spec.md + plan.md.',
    leadFormula: 'Timestamp(plan.md) - Timestamp(spec.md)',
    lagTitle: 'Spec Churn During Build', lagTarget: '< 5% post-plan churn', lagCadence: 'Quarterly',
    lagDesc: 'Spec commits dated after the first plan commit, revealing mid-build requirements churn.',
    lagFormula: '(Spec commits post-plan-commit ÷ Total spec commits) × 100',
    source: 'Git commit timestamps', minTier: 1
  },
  {
    id: 'build', track: ['product'], stage: 'Build', category: 'delivery',
    leadTitle: 'First-Pass Merge Rate', leadTarget: '≥ 75% clean merge', leadCadence: 'Continuous',
    leadDesc: 'Share of agent-authored pull requests merged from the first implementation pass.',
    leadFormula: '(PRs merged without rework pass ÷ Total agent PRs) × 100',
    lagTitle: 'Plan Fidelity Ratio', lagTarget: '≥ 92% plan match', lagCadence: 'Quarterly',
    lagDesc: 'How closely merged implementation matches its architectural plan.md.',
    lagFormula: '(Verified acceptance criteria ÷ Specified plan criteria) × 100',
    source: 'Pull request metadata', minTier: 1
  },
  {
    id: 'verify', track: ['product'], stage: 'Verify', category: 'delivery',
    leadTitle: 'First-Pass CI Success', leadTarget: '≥ 85% pass rate', leadCadence: 'Per PR',
    leadDesc: 'Rate at which agent-written code passes automated lint, test, and type-checks.',
    leadFormula: '(First-run passing CI builds ÷ Total agent CI builds) × 100',
    lagTitle: 'Change Failure Rate (DORA)', lagTarget: '< 5% failed changes', lagCadence: 'Quarterly',
    lagDesc: 'Percentage of changes to production that require hotfixes, rollbacks, or patches.',
    lagFormula: '(Deployments requiring remediation ÷ Total deployments) × 100',
    source: 'CI/CD pipeline logs', minTier: 2
  },
  {
    id: 'ship', track: ['product'], stage: 'Ship', category: 'delivery',
    leadTitle: 'Review Latency & Resolution', leadTarget: '< 30 min to review', leadCadence: 'Daily',
    leadDesc: 'Time to first review and automated resolution of review comments.',
    leadFormula: 'Timestamp(first human review) - Timestamp(PR opened)',
    lagTitle: 'Pre-Merge Defect Containment', lagTarget: '≥ 95% caught before merge', lagCadence: 'Quarterly',
    lagDesc: 'Defects caught during review passes versus escaping to live users.',
    lagFormula: '(Defects caught pre-merge ÷ Total defects discovered) × 100',
    source: 'Pull request history & Sentry', minTier: 2
  },
  {
    id: 'scale', track: ['product'], stage: 'Scale', category: 'delivery',
    leadTitle: 'Concurrent Sessions per Engineer', leadTarget: '≥ 3 active streams', leadCadence: 'Weekly',
    leadDesc: 'Active autonomous sessions overseen per engineer while rework holds flat.',
    leadFormula: 'Concurrent agent work sessions running per contributor',
    lagTitle: 'Throughput Multiplier', lagTarget: '2x–3x features merged/wk', lagCadence: 'Quarterly',
    lagDesc: 'Shipped and merged changes per team member, calibrated with rework rate.',
    lagFormula: 'Merged feature PRs per engineer per quarter vs baseline',
    source: 'Session telemetry & Git history', minTier: 3
  },
  {
    id: 'operate', track: ['product'], stage: 'Operate', category: 'delivery',
    leadTitle: 'Alert-to-Remediation Latency', leadTarget: '< 15 min triage', leadCadence: 'Per incident',
    leadDesc: 'Minutes from observability threshold breach to agent-triaged root cause finding.',
    leadFormula: 'Timestamp(triaged plan) - Timestamp(anomaly alert)',
    lagTitle: 'Repeat Incident Elimination', lagTarget: '0 repeat incident classes', lagCadence: 'Quarterly',
    lagDesc: 'Share of findings converted into permanent regression checks.',
    lagFormula: '(Repeated postmortem incident root causes in 90 days) = 0',
    source: 'Observability & incident tracker', minTier: 3
  },
  {
    id: 'cost', track: ['product'], stage: 'Cost', category: 'delivery',
    leadTitle: 'Token Spend per Merged Unit', leadTarget: '< $0.50 per merged PR', leadCadence: 'Monthly',
    leadDesc: 'AI model spend per completed change, split interactive vs scheduled background runs.',
    leadFormula: 'Total API token spend ÷ Merged pull requests',
    lagTitle: 'Cost per Shipped Feature', lagTarget: '-70% delivery cost', lagCadence: 'Quarterly',
    lagDesc: 'Total engineering cost per completed feature compared to pre-flow historical baseline.',
    lagFormula: '((Baseline Unit Cost - Current Unit Cost) ÷ Baseline) × 100',
    source: 'Workspace billing export & finance', minTier: 1
  },
  {
    id: 'cost-ops', track: ['ops', 'explore'], stage: 'Cost', category: 'operations',
    leadTitle: 'AI Spend per Completed Task', leadTarget: '< $0.25 / automated task', leadCadence: 'Monthly',
    leadDesc: 'Model spend per scheduled background routine, split interactive vs autonomous.',
    leadFormula: 'Total task token cost ÷ Completed automated tasks',
    lagTitle: 'Task Unit Cost vs Manual', lagTarget: '-75% cost per workflow run', lagCadence: 'Quarterly',
    lagDesc: 'Cost per recurring procedure run against manual employee hours.',
    lagFormula: '((Manual Task Cost - Automated Task Cost) ÷ Manual Task Cost) × 100',
    source: 'Tool usage & billing exports', minTier: 1
  },
  {
    id: 'procedures', track: ['ops'], stage: 'Procedures', category: 'operations',
    leadTitle: 'Documented Procedure Coverage', leadTarget: '≥ 85% procedures codified', leadCadence: 'Monthly',
    leadDesc: 'Share of recurring operational tasks with an executable markdown playbook.',
    leadFormula: '(Codified procedures in canon ÷ Total recurring operations) × 100',
    lagTitle: 'Exception Escalation Rate', lagTarget: '< 5% requiring person', lagCadence: 'Quarterly',
    lagDesc: 'Routine workflow runs that required manual intervention or escalation.',
    lagFormula: '(Runs with manual exceptions ÷ Total automated runs) × 100',
    source: 'Procedure library & run logs', minTier: 1
  },
  {
    id: 'learning', track: ['explore'], stage: 'Learning', category: 'operations',
    leadTitle: 'Idea-to-User Test Latency', leadTarget: '< 3 days to live test', leadCadence: 'Weekly',
    leadDesc: 'Days from raw product concept to interactive test deployed in front of real users.',
    leadFormula: 'Timestamp(live user test) - Timestamp(test brief committed)',
    lagTitle: 'Decision Conversion Rate', lagTarget: '≥ 90% documented decision', lagCadence: 'Monthly',
    lagDesc: 'Share of exploratory user tests that produced a signed-off decision in the log.',
    lagFormula: '(Tests with logged GO/NO-GO decision ÷ Total tests run) × 100',
    source: 'Test briefs & decision log', minTier: 1
  }
];

/* The number the stated goal is judged by. It leads the measurement table and is the
   one the activation step asks somebody to look at weekly. */
const GOAL_METRICS = {
  'validate': {
    id: 'goal-validate', stage: 'Evidence', category: 'goal',
    leadTitle: 'Customer Voice Capture', leadTarget: '≥ 5 calls / week', leadCadence: 'Weekly',
    leadDesc: 'Customer and discovery conversations automatically transcribed and clustered by problem.',
    leadFormula: 'Count(Synthesized Interviews in Context Store)',
    lagTitle: 'Validated Hypotheses / Month', lagTarget: '≥ 4 hypotheses resolved / mo', lagCadence: 'Monthly',
    lagDesc: 'Assumptions verified with real customer evidence before code or specs are written.',
    lagFormula: '(Confirmed + Rejected Assumptions) ÷ Active Experiments',
    source: 'Interview notes & decision log'
  },
  'less-rework': {
    id: 'goal-rework', stage: 'Fit', category: 'goal',
    leadTitle: 'Traced Intent Coverage', leadTarget: '100% of pull requests', leadCadence: 'Continuous',
    leadDesc: 'Every merged change traces directly to a verified customer intent file.',
    leadFormula: '(PRs with linked intent.md ÷ Total merged PRs) × 100',
    lagTitle: '90-Day Feature Churn / Removal', lagTarget: '< 5% of features reworked', lagCadence: 'Quarterly',
    lagDesc: 'Features built to accurate requirements that endure without emergency rewrites.',
    lagFormula: '(Features modified or deleted within 90d ÷ Total shipped) × 100',
    source: 'Work tracker & release notes'
  },
  'ship-faster': {
    id: 'goal-speed', stage: 'Speed', category: 'goal',
    leadTitle: 'Intent-to-Plan Latency', leadTarget: '< 8 hours', leadCadence: 'Per feature',
    leadDesc: 'Elapsed time from accepted problem intent to reviewed technical plan.',
    leadFormula: 'Timestamp(plan.md committed) - Timestamp(intent.md accepted)',
    lagTitle: 'Deployment Cycle Time', lagTarget: '-60% calendar days', lagCadence: 'Quarterly',
    lagDesc: 'Total calendar days elapsed from customer request to live production software.',
    lagFormula: '((Baseline Days - Current Days) ÷ Baseline) × 100',
    source: 'Work tracker (Linear/Jira) & release history'
  },
  'fewer-defects': {
    id: 'goal-defects', stage: 'Quality', category: 'goal',
    leadTitle: 'First-Pass Self-Check Success', leadTarget: '≥ 85% clean check', leadCadence: 'Per change',
    leadDesc: 'Autonomous verification passes before code reaches human review.',
    leadFormula: '(Agent runs passing test harness on first try ÷ Total runs) × 100',
    lagTitle: 'Customer-Reported Production Bugs', lagTarget: '-70% escapes to production', lagCadence: 'Monthly',
    lagDesc: 'Defects caught inside automated gates rather than discovered by users.',
    lagFormula: '(P1/P2 production incidents ÷ Total releases) vs Q0 baseline',
    source: 'Pipeline results & support tickets'
  },
  'grow-revenue': {
    id: 'goal-revenue', stage: 'Revenue', category: 'goal',
    leadTitle: 'Sales Follow-up Turnaround', leadTarget: '< 2 hours post-call', leadCadence: 'Daily',
    leadDesc: 'Time to synthesize call notes, update CRM fields, and draft tailored follow-up.',
    leadFormula: 'Timestamp(Follow-up sent) - Timestamp(Call completed)',
    lagTitle: 'Opportunity Win Rate & Velocity', lagTarget: '+35% win rate, -25% sales cycle', lagCadence: 'Quarterly',
    lagDesc: 'Higher conversion and faster close cycles through relentless follow-up precision.',
    lagFormula: '(Won Opportunities ÷ Total Pipeline) & Average Days to Close',
    source: 'CRM & call recordings'
  },
  'support-load': {
    id: 'goal-support', stage: 'Support', category: 'goal',
    leadTitle: 'Autonomous Context Resolution', leadTarget: '≥ 65% first-contact resolution', leadCadence: 'Weekly',
    leadDesc: 'Customer questions answered accurately from official canon documents without human escalation.',
    leadFormula: '(Queries answered from context without escalation ÷ Total tickets) × 100',
    lagTitle: 'Support Hours per Customer', lagTarget: '-50% hours per customer account', lagCadence: 'Quarterly',
    lagDesc: 'Scale user base without proportional customer operations headcount.',
    lagFormula: 'Total human support hours logged ÷ Total active customer accounts',
    source: 'Support desk (Zendesk/Intercom)'
  },
  'ops-cost': {
    id: 'goal-ops-cost', stage: 'Operations', category: 'goal',
    leadTitle: 'Procedure Execution Latency', leadTarget: '-75% elapsed execution time', leadCadence: 'Per run',
    leadDesc: 'Time required to complete recurring back-office workflows under policy gates.',
    leadFormula: '((Manual run baseline mins - Agent run mins) ÷ Manual baseline) × 100',
    lagTitle: 'Cost Per Recurring Workflow Run', lagTarget: '-60% unit operational cost', lagCadence: 'Monthly',
    lagDesc: 'Drastic reduction in routine operational overhead compared to manual staffing.',
    lagFormula: '(Token spend + Review time) vs Baseline manual timesheet cost',
    source: 'Procedure run logs & timesheets'
  },
  'decisions': {
    id: 'goal-decisions', stage: 'Answers', category: 'goal',
    leadTitle: 'Cited Answers from Context Store', leadTarget: '≥ 80% answered with citations', leadCadence: 'Weekly',
    leadDesc: 'Company queries answered from indexed artifacts without tapping a colleague.',
    leadFormula: '(Queries resolved with repo citations ÷ Total internal questions) × 100',
    lagTitle: 'Executive Decision Velocity', lagTarget: '3x faster time to decision', lagCadence: 'Monthly',
    lagDesc: 'Leadership reviews decide immediately because evidence is pre-compiled.',
    lagFormula: 'Average days from topic introduction to signed-off decision in log',
    source: 'Query agent log & decision registry'
  },
  'compliance': {
    id: 'goal-compliance', stage: 'Compliance', category: 'goal',
    leadTitle: 'Preemptive Policy Block Rate', leadTarget: '100% blocked before commit', leadCadence: 'Continuous',
    leadDesc: 'Prohibited actions and privacy breaches stopped mechanically by hooks.',
    leadFormula: '(Violations stopped by hooks & gates ÷ Total attempted policy violations) × 100',
    lagTitle: 'Zero Audit Deficiencies & Evidence Speed', lagTarget: '0 material findings, < 1 day evidence', lagCadence: 'Semi-annual',
    lagDesc: 'Every artifact and execution trace forms an immutable compliance trail.',
    lagFormula: 'Total audit exceptions found & Hours to furnish compliance trail',
    source: 'Policy check logs & audit records'
  },
  'scale-without-hiring': {
    id: 'goal-scale', stage: 'Capacity', category: 'goal',
    leadTitle: 'Concurrent Streams per Contributor', leadTarget: '3–5 active concurrent sessions', leadCadence: 'Weekly',
    leadDesc: 'Team members orchestrating multiple parallel streams rather than typing one.',
    leadFormula: 'Active agent sessions managed simultaneously per person while rework < 5%',
    lagTitle: 'Output / Revenue per Full-Time Head', lagTarget: '+50% output per head', lagCadence: 'Quarterly',
    lagDesc: 'Business scale decoupled from linear hiring requirements.',
    lagFormula: '(Completed engineering/ops units ÷ Total team headcount) vs Prior year',
    source: 'Work tracker & finance reporting'
  }
};

function buildMetrics(c, tier) {
  const track = planTrack(c);
  const goalObj = GOAL_METRICS[c.goal] || GOAL_METRICS['validate'];
  const list = [
    { ...goalObj, goal: true },
    ...METRIC_LIBRARY.filter(m => m.minTier <= tier && (!m.track || m.track.includes(track)))
  ];
  return list.map(m => ({
    ...m,
    lead: m.lead || `${m.leadTitle} (${m.leadTarget}) — ${m.leadDesc}`,
    lag: m.lag || `${m.lagTitle} (${m.lagTarget}) — ${m.lagDesc}`
  }));
}

/* Dynamic scoring metrics calculated deterministically from the generated plan. */
function computeOutcomeScorecard(b) {
  const c = b.answers || {};
  const tier = b.tier || 1;
  const e = typeof eng === 'function' ? eng(c) : 4;
  const teamSize = e >= 15 ? 25 : e >= 4 ? 7 : e >= 1 ? 2 : 1;
  const counts = b.counts || { ai: 12, human: 5, gate: 6, tool: 4 };
  const aiSteps = counts.ai || 8;
  const totalNodes = Math.max(1, (counts.ai || 0) + (counts.human || 0) + (counts.gate || 0));
  const autoRatio = Math.min(0.85, aiSteps / totalNodes);

  // 1. Flow Readiness Score (0-100)
  const tierBase = tier === 1 ? 60 : tier === 2 ? 72 : tier === 3 ? 84 : 92;
  const autoBonus = Math.round(autoRatio * 16);
  const toolBonus = Math.min(8, Math.round((counts.tool || 3) * 1.5));
  const govPenalty = has(c, 'legacy-systems') ? -4 : 0;
  const flowScore = Math.min(96, Math.max(52, tierBase + autoBonus + toolBonus + govPenalty));
  const grade = flowScore >= 85 ? 'High Autonomy' : flowScore >= 72 ? 'Balanced Flow' : 'Foundational';

  // 2. Velocity Acceleration
  const velMult = tier === 1 ? '1.8x' : tier === 2 ? '2.8x' : tier === 3 ? '4.2x' : '5.8x';
  const cycleDrop = tier === 1 ? '45%' : tier === 2 ? '60%' : tier === 3 ? '72%' : '80%';

  // 3. Expected Defect / Rework Shield
  const reworkDrop = tier === 1 ? '40%' : tier === 2 ? '55%' : tier === 3 ? '70%' : '82%';

  // 4. Hours Saved & Financial Leverage
  const hrsPerPerson = tier === 1 ? 8 : tier === 2 ? 12 : tier === 3 ? 16 : 20;
  const totalWeeklyHrs = hrsPerPerson * teamSize;
  const annualHrs = totalWeeklyHrs * 50;
  const annualDollars = annualHrs * 75;
  const paybackWeeks = tier === 1 ? '2.5 wks' : tier === 2 ? '3.5 wks' : tier === 3 ? '5.0 wks' : '6.5 wks';

  return {
    flowScore,
    grade,
    velMult,
    cycleDrop,
    reworkDrop,
    hrsPerPerson,
    teamSize,
    totalWeeklyHrs,
    annualHrs,
    annualDollarsFormatted: '$' + annualDollars.toLocaleString(),
    paybackWeeks
  };
}

const RISK_LIBRARY = [
  {
    id: 'subscription',
    title: 'Buying seats and calling it adoption',
    severity: 'high',
    category: 'velocity',
    categoryLabel: 'Adoption & Velocity',
    trigger: c => `Universal baseline for ${c.stage || 'all'} stages`,
    impact: 'Zero cycle-time reduction despite rising tooling spend; developer output accelerates code writing, but features still queue at human planning and review.',
    trap: 'Handing AI subscriptions to developers without altering the surrounding workflow. Build speed jumps, but planning, review, and release remain human-paced.',
    guardrail: 'Mandate AGENTS.md instructions, an artifact repository, and a single-command self-check harness before expanding seat licenses.',
    body: 'A subscription handed to the tech team changes the build step and nothing else. The build step was never your constraint: the stages either side of it were. Spend the first month on the artifact home, the agent instructions file (AGENTS.md or CLAUDE.md) and a one-command self-check, none of which need a bigger plan.',
    when: () => true
  },
  {
    id: 'gate-bottleneck',
    title: 'Keeping human-speed gates around a machine-speed build',
    severity: 'critical',
    category: 'velocity',
    categoryLabel: 'Throughput & Gates',
    trigger: (c, t) => `Triggered by: Autonomy Tier ${t} / ${c.stage || 'organization'} review rhythm`,
    impact: 'Diffs delivered in hours sit in review queues for days; weekly sign-off meetings wipe out 80%+ of machine build acceleration.',
    trap: 'Diffs arrive in hours, but change advisory boards and sign-off committees still meet weekly on Tuesdays.',
    guardrail: 'Replace committee meetings with deterministic CI checks and post-merge automated sampling; reserve human gates strictly for high-impact production releases.',
    body: 'When the diff arrives in hours and the approval committee meets on Tuesdays, your cycle time is Tuesday. Re-ask every gate: can this be a deterministic check, an adversarial model pass, or an artifact reviewed after the fact? Judgment, risk acceptance and the production gate stay human. Little else should.',
    when: (c, t) => t >= 2 || c.stage === 'enterprise'
  },
  {
    id: 'no-verify',
    title: 'Autonomy without a self-check',
    severity: 'critical',
    category: 'quality',
    categoryLabel: 'Quality & Verification',
    trigger: (c, t) => `Prerequisite for Autonomy Tier ${t}`,
    impact: 'Catastrophic defect leakage; reviewers waste 60%+ of their time triaging hallucinated imports, broken tests, and syntax failures.',
    trap: 'Allowing agents to edit and commit files before giving them the capability to run and pass automated test suites locally.',
    guardrail: 'Enforce a single-command self-check harness (`npm test` / CI script) that every agent must run and pass before opening a PR.',
    body: 'Letting the agent act without asking before the agent can run your tests just moves the mess downstream and makes a person read all of it. The self-check harness is the prerequisite for every tier above the first, and it is an afternoon of work.',
    when: () => true
  },
  {
    id: 'review-volume',
    title: 'Agentic review with no written threshold',
    severity: 'high',
    category: 'quality',
    categoryLabel: 'Quality & Review',
    trigger: (c, t) => `Triggered by: Tier ${t} automated review passes`,
    impact: 'Review alert fatigue; engineers learn to skim or ignore automated feedback, missing critical architectural flaws.',
    trap: 'AI reviewers flood pull requests with dozens of minor stylistic nitpicks without a calibrated threshold of what is actually a blocker.',
    guardrail: 'Establish REVIEW.md defining an explicit severity threshold, capping nitpicks, and delegating style strictly to deterministic linters.',
    body: 'Without REVIEW.md defining what Important means and capping nits, the passes produce volume and your team learns to scroll past them. Rate the findings monthly and cut what CI already enforces.',
    when: (c, t) => t >= 2
  },
  {
    id: 'test-weakening',
    title: 'Letting the fixer edit the test',
    severity: 'critical',
    category: 'quality',
    categoryLabel: 'Integrity & Verification',
    trigger: (c, t) => `Triggered by: Tier ${t} automated bugfix loops`,
    impact: 'Quiet erosion of the test suite; production regressions slip through because tests were rewritten to match buggy behavior.',
    trap: 'Agents tasked with fixing failing tests rewrite test assertions rather than fixing the underlying software defects.',
    guardrail: 'Deploy Git pre-commit hooks and CI policies that lock test files during bugfix workflows, strictly rejecting diffs that alter test assertions.',
    body: 'An agent under pressure to make every check pass will weaken the check on the code it just changed. Lock test files during fix tasks with a hook, or reject any diff that touches a test alongside its own fix.',
    when: (c, t) => t >= 2
  },
  {
    id: 'two-truths',
    title: 'Two sources of truth with no link',
    severity: 'high',
    category: 'governance',
    categoryLabel: 'System Architecture',
    trigger: () => 'Triggered by: Legacy systems constraint',
    impact: 'Spec drift and duplicate work; half the team builds against Jira while agents build against Git Markdown, producing fragmented software.',
    trap: 'Maintaining requirements in both external project trackers and repository Markdown without bidirectional automated links.',
    guardrail: 'Designate repo Markdown as the single authoritative source for specifications, embedding canonical tracker ticket links in frontmatter.',
    body: 'Markdown in the repo and tickets in your existing tracker, each half-maintained, is worse than either alone. Name one authoritative system per artifact and make the other carry a reference to it.',
    when: c => has(c, 'legacy-systems')
  },
  {
    id: 'unbounded-spend',
    title: 'Unmetered autonomous loops',
    severity: 'high',
    category: 'cost',
    categoryLabel: 'Cost & API Spend',
    trigger: (c, t) => `Triggered by: Tier ${t} background scheduled loops`,
    impact: 'Runaway API bills; recursive agent retry loops and unmonitored cron jobs consume thousands of dollars in tokens overnight.',
    trap: 'Event-triggered and scheduled background loops executing without hard session token budgets or retry timeouts.',
    guardrail: 'Configure hard monthly workspace spend limits, separate keys for interactive vs scheduled tasks, and automatic circuit breakers after 3 retries.',
    body: 'Scheduled and event-triggered jobs spend while nobody is in the room. Set a hard workspace limit before the first loop runs, meter scheduled work separately from interactive sessions, and review monthly which loop earned its tokens.',
    when: (c, t) => t >= 3
  },
  {
    id: 'no-engineer',
    title: 'Shipping customer-facing software with nobody technical accountable',
    severity: 'critical',
    category: 'governance',
    categoryLabel: 'Technical Accountability',
    trigger: () => 'Triggered by: 0 Technical Headcount',
    impact: 'Unmaintainable, insecure software in production; zero internal capability to diagnose or recover from severe service outages.',
    trap: 'Founders shipping AI-generated code directly to customers without an accountable technical architect verifying security and resilience.',
    guardrail: 'Retain a fractional senior engineer dedicated strictly to plan-stage architectural review and release-gate approval.',
    body: 'Agents will produce something that works and cannot be operated, secured or recovered. Retain a few hours a month of senior review and spend all of it at the plan and release gates.',
    when: c => eng(c) === 0
  },
  {
    id: 'regulated-evidence',
    title: 'Treating the chat log as your audit trail',
    severity: 'critical',
    category: 'compliance',
    categoryLabel: 'Compliance & Audit',
    trigger: () => 'Triggered by: Regulated industry constraint',
    impact: 'Statutory audit failure and regulatory penalties; external compliance auditors reject informal AI chat logs as evidence.',
    trap: 'Relying on ephemeral AI chat sessions as compliance proof rather than immutable, version-controlled audit trails.',
    guardrail: 'Require cryptographic commit chains documenting prompt intent, policy version, generated diff, and authorized human sign-off.',
    body: 'A session transcript is not evidence a regulator accepts. The commit chain is: who asked, what the agent produced, which policy version was in force, who approved. Make every stage end by committing an artifact, and forward session telemetry to the stack you already audit.',
    when: c => has(c, 'regulated')
  },
  {
    id: 'client-ip',
    title: 'Client code crossing boundaries',
    severity: 'critical',
    category: 'compliance',
    categoryLabel: 'Data Isolation & IP',
    trigger: () => 'Triggered by: Client code / multi-tenant constraint',
    impact: 'Severe breach of NDA and IP leakage; proprietary client algorithms or data leak into shared vector context or model training logs.',
    trap: 'Sharing single model sessions, unified vector stores, or tool environments across multiple distinct client engagements.',
    guardrail: 'Enforce strictly isolated workspaces per client, zero-data-retention (ZDR) vendor agreements, and automated egress blocking.',
    body: 'Delivery work means one client\'s context must never reach another\'s session. Separate workspaces per client, managed settings denying egress, and a written statement of which tools see client data. Get this in your contract language before it is in a questionnaire.',
    when: c => has(c, 'client-code')
  },
  {
    id: 'middle-layer',
    title: 'Adding an AI coordination layer on top of a human coordination layer',
    severity: 'high',
    category: 'governance',
    categoryLabel: 'Organizational Velocity',
    trigger: c => `Triggered by: ${c.eng || '15+'} engineering headcount / ${c.stage || 'growth'} stage`,
    impact: 'Compounded friction and lossy communication; teams spend more time managing and reconciling AI summaries than executing.',
    trap: 'Layering AI summarization bots on top of human managers who already relay status reports up and down the hierarchy.',
    guardrail: 'Make work legible at the source: generate operational status directly from Git commits and artifact diffs rather than re-reporting.',
    body: 'If status still routes through people who summarise for other people, the agents inherit a lossy input. Make the work legible instead: every decision leaves an artifact, and the summary is generated from artifacts rather than retyped.',
    when: (c, t) => eng(c) >= 15 || c.stage === 'enterprise'
  }
];

RISK_LIBRARY.push(
  {
    id: 'premature-automation',
    title: 'Automating a product nobody has asked for yet',
    severity: 'high',
    category: 'velocity',
    categoryLabel: 'Product Validation',
    trigger: c => `Triggered by: ${c.journey || 'early'} stage product journey`,
    impact: 'High capital burn building the wrong thing at record speed; automated pipelines cement unvalidated assumptions.',
    trap: 'Over-engineering delivery pipelines and agent loops before customer problem discovery and market fit are confirmed.',
    guardrail: 'Focus AI tooling on user research synthesis, rapid interview extraction, and disposable prototypes; keep pipelines lightweight.',
    body: 'Before customers have confirmed the problem, a polished pipeline makes it cheaper to build the wrong thing, faster. Spend AI on research, interview summaries and throwaway prototypes, and keep the delivery machinery to the self-check and a written record of what each test proved.',
    when: c => preProduct(c) || c.journey === 'prototype'
  },
  {
    id: 'scale-unwritten',
    title: 'Hiring into a process nobody wrote down',
    severity: 'high',
    category: 'governance',
    categoryLabel: 'Process & Scaling',
    trigger: c => `Triggered by: Scaling phase (${c.journey || 'scale'})`,
    impact: 'Fractured engineering culture and divergent code quality as new hires and AI agents follow differing tribal norms.',
    trap: 'Scaling team size and agent adoption when core operating standards exist only in senior engineers\' heads.',
    guardrail: 'Codify all engineering playbooks and architecture standards in repo markdown; configure onboarding agents to query verified documentation.',
    body: 'Scaling multiplies whatever you already do. If the way work gets done lives in a few people\'s heads, every new hire and every new agent learns a different version of it. Write the playbook first and make onboarding read from it.',
    when: c => c.journey === 'scale' || c.journey === 'product-fit'
  },
  {
    id: 'two-speed',
    title: 'Holding the new venture to the old approval chain',
    severity: 'high',
    category: 'velocity',
    categoryLabel: 'Corporate Agility',
    trigger: () => 'Triggered by: Reinventing journey inside established company',
    impact: 'Total stagnation; new innovative AI business lines are choked by slow, legacy enterprise procurement and review gates.',
    trap: 'Subjecting an agile, exploratory AI initiative to the same change-control boards designed for legacy core infrastructure.',
    guardrail: 'Establish an autonomous innovation sandbox with independent release authority, inheriting only mandatory legal and security baselines.',
    body: 'A new product line inside an established business dies of approvals meant for the core. Give it its own owner and a lighter flow, and carry over only the data and compliance rules that genuinely cannot be waived.',
    when: c => c.journey === 'reinventing'
  },
  {
    id: 'sector-rules',
    title: 'Assuming your sector\'s rules stop at people',
    severity: 'critical',
    category: 'compliance',
    categoryLabel: 'Sector Compliance',
    trigger: c => `Triggered by: ${c.industry || 'regulated'} industry regulatory standards`,
    impact: 'Regulatory fines and liability for unexplainable automated decisions affecting customers or personal data.',
    trap: 'Assuming that regulatory duties on transparency, fairness, and consumer protection do not apply to automated agent decisions.',
    guardrail: 'Establish mandatory human-in-the-loop signoff for customer-impacting outputs, with clear audit logs explaining decision rationales.',
    body: 'Rules on privacy, record keeping and fair treatment in your sector apply to work done by AI exactly as they apply to staff. Confirm what data each tool may see, keep a record of what the AI did and who approved it, and check sector guidance on automated decisions before any customer-facing use.',
    when: c => industryRegulated(c) && !has(c, 'regulated')
  }
);

function buildRisks(c, tier) {
  return RISK_LIBRARY.filter(r => r.when(c, tier)).map(r => ({
    ...r,
    triggerText: typeof r.trigger === 'function' ? r.trigger(c, tier) : (r.trigger || 'Universal operational baseline'),
    severityVal: typeof r.severity === 'function' ? r.severity(c, tier) : (r.severity || 'high')
  }));
}

function computeRiskScorecard(risks, c, tier) {
  const list = risks || [];
  const total = list.length;
  let crit = 0, high = 0, med = 0;
  const catCounts = {};

  list.forEach(r => {
    const sev = r.severityVal || r.severity || 'high';
    if (sev === 'critical') crit++;
    else if (sev === 'high') high++;
    else med++;

    const cat = r.category || 'governance';
    catCounts[cat] = (catCounts[cat] || 0) + 1;
  });

  let topCat = 'governance';
  let maxCount = 0;
  for (const [k, v] of Object.entries(catCounts)) {
    if (v > maxCount) {
      maxCount = v;
      topCat = k;
    }
  }

  const catLabels = {
    governance: 'Governance & Team',
    velocity: 'Throughput & Gates',
    quality: 'Quality & Verification',
    cost: 'Cost & API Spend',
    compliance: 'Compliance & IP'
  };

  const isReg = c && ((c.constraints && c.constraints.includes('regulated')) || (typeof industryRegulated === 'function' && industryRegulated(c)));
  let level = 'Moderate Exposure';
  let levelClass = 'warn';
  let levelDesc = 'Standard operational failure modes requiring disciplined guardrails.';
  if (crit >= 3 || isReg) {
    level = 'High Exposure';
    levelClass = 'crit';
    levelDesc = 'Strict regulatory, data isolation, or verification guardrails required.';
  } else if (crit === 0 && high <= 3) {
    level = 'Controlled Flow';
    levelClass = 'info';
    levelDesc = 'Low systemic complexity; focus on basic self-checks and DRI assignment.';
  }

  return {
    total,
    crit,
    high,
    med,
    level,
    levelClass,
    levelDesc,
    topCat,
    topCatLabel: catLabels[topCat] || 'Governance & Team',
    mitigationRate: '100% Guarded'
  };
}

function budgetNote(c) {
  const map = {
    under200: 'Under $200 a month buys one or two serious seats. Spend it on one person who goes deep rather than five who dabble, and keep the whole flow at the assisted tier until that person can show the artifact chain working.',
    to2k: 'A few thousand a month covers a small team with real headroom for review passes in CI. Meter it now, before a scheduled job exists to hide in the total.',
    to10k: 'This is the range where parallel sessions and continuous evals stop being theoretical. Expect scheduled jobs to become a visible share of the bill and split that line out from day one.',
    over10k: 'At this level the autonomous loops dominate spend, not the people. Set a hard workspace limit, meter per loop, and review monthly which loop earned its tokens. An unmetered maintenance loop is the classic way this goes wrong.'
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

function journeyNote(c) {
  const j = JOURNEYS[c.journey] || JOURNEYS['product-fit'];
  return j.note || '';
}

function industryNote(c) {
  const ind = INDUSTRIES[c.industry] || INDUSTRIES['software'];
  const flag = ind.regulated && !has(c, 'regulated')
    ? ' Most businesses in this sector handle regulated or sensitive data. If yours does, tick that box so the plan adds the checks and records it needs.'
    : '';
  return (ind.note || '') + flag;
}

const GOAL_FOCUS = {
  'validate': { node: 'sig-market', line: 'Validation is an evidence problem, not a building problem. Record every customer conversation, let an agent cluster what people actually said, and write down what would have to be true for the idea to work. Build only what the next test needs.' },
  'grow-revenue': { node: 'loop-revenue', line: 'Revenue leaks where records go stale and follow-up waits. Let an agent prepare every call, draft the follow-up and update the CRM from the recording, then point the demand loop at the objections you hear most.' },
  'decisions': { node: 'loop-leadership', line: 'Good answers come from a record, not from asking around. Capture meetings and decisions first, put them in one searchable store, then give one agent read access and a rule to cite its sources.' },
  'compliance': { node: 'gate-policy', line: 'Compliance holds when a rule is enforced by a check rather than remembered by a person. Write the rules down, turn the ones that must never bend into automatic blocks, and make every step leave a record an auditor can follow.' },
  'ship-faster': { node: 'plan-agent', line: 'Cycle time is mostly waiting, not typing. Attack the plan and review gates first: a written plan cuts the rework that eats a sprint, and layered review passes cut the days a pull request sits.' },
  'fewer-defects': { node: 'feedback-loop', line: 'Defects fall when the agent can prove its own work. Build the self-check harness, then the failing-test-first rule, then the test-file lock. Review passes are third, not first.' },
  'less-rework': { node: 'intent-capture', line: 'Rework is almost always a requirements failure wearing an engineering costume. The intent interview and the flagged-conflict spec are where you fix it, weeks before any code exists.' },
  'support-load': { node: 'support-signal', line: 'Support load is intent that never reached the repository. Cluster the tickets into intent files with volume evidence, and let the ranking argue for itself.' },
  'ops-cost': { node: 'ops-agent', alt: ['loop-ops'], line: 'The cost is in the recurring procedure, not the product. Write the procedure down, run it with an agent under human review, and only then consider automating the review.' },
  'scale-without-hiring': { node: 'parallel-fleet', alt: ['feedback-loop'], line: 'Capacity comes from parallel streams that verify themselves, not from faster typing. The honest ceiling is how many streams one person can review properly: add one only while rework holds flat.' }
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
    metrics: buildMetrics(c, tier),
    risks: buildRisks(c, tier),
    budgetNote: budgetNote(c),
    stageNote: stageNote(c),
    journeyNote: journeyNote(c),
    industryNote: industryNote(c),
    focus: GOAL_FOCUS[c.goal],
    counts: {
      ai: nodes.filter(n => n.kind === 'ai').length,
      human: nodes.filter(n => n.kind === 'human').length,
      gate: nodes.filter(n => n.kind === 'gate' || n.kind === 'system').length
    },
    horizon: nodes.length ? Math.max(...buildPhases(c, tier, nodes).map(p => p.end)) : 0
  };
}
