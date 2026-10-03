/* Builds the four views and the shared cross-view index. Deterministic. */

function pickTools(c, tier) {
  return TOOL_CATEGORIES
    .filter(cat => (cat.when ? cat.when(c, tier) : true))
    .map(cat => {
      const scored = cat.options
        .map((o, i) => ({ ...o, score: o.fit(c), order: i }))
        .sort((a, b) => (b.score - a.score) || (a.order - b.order));
      return { category: cat, best: scored[0], alternatives: scored.slice(1) };
    });
}

function toolNode(pick) {
  const { category: cat, best, alternatives } = pick;
  return {
    id: 'tool-' + cat.id,
    lane: cat.lane === 'collection-tools' ? 'collection' : cat.lane,
    kind: 'artifact',
    title: cat.label,
    subtitle: 'start with ' + best.name,
    purpose: cat.role,
    why: 'What it emits into the system: ' + cat.emits,
    options: { best, alternatives },
    collection: cat.collection,
    after: []
  };
}

function buildStackView(c, tier) {
  const picks = pickTools(c, tier);
  const tools = picks.map(toolNode);
  const consumers = selectNodes(c, tier, CONSUMER_NODES);
  const nodes = [...tools, ...COLLECTION_NODES, ...STORE_NODES, ...consumers];
  const rest = [...COLLECTION_NODES, ...STORE_NODES, ...CONSUMER_NODES];
  const edges = buildEdges([...COLLECTION_NODES, ...STORE_NODES, ...consumers], rest);
  tools.forEach(t => {
    if (t.collection && t.lane !== 'collection') edges.push({ from: t.id, to: t.collection });
    if (t.lane === 'store') edges.push({ from: t.id, to: 'store-index' });
    if (t.lane === 'collection') edges.push({ from: t.id, to: 'store-index' });
  });
  return {
    id: 'stack', lanes: STACK_LANES, nodes, edges, picks,
    loopLabel: 'consumers write back into the source tools',
    loopFrom: 'consumers', loopTo: 'sources'
  };
}

function buildCompanyView(c, tier) {
  const nodes = selectNodes(c, tier, COMPANY_NODES);
  return {
    id: 'company', lanes: COMPANY_LANES, nodes,
    edges: buildEdges(nodes, COMPANY_NODES),
    loopLabel: 'outcome becomes tomorrow\'s signal',
    loopFrom: 'learn', loopTo: 'signals'
  };
}

function buildImproveView(c, tier) {
  const nodes = selectNodes(c, tier, RSI_NODES);
  return {
    id: 'improve', lanes: RSI_LANES, nodes,
    edges: buildEdges(nodes, RSI_NODES),
    loopLabel: 'the improved system records its own next run',
    loopFrom: 'improve', loopTo: 'record'
  };
}

function buildDeliveryView(c, tier) {
  const nodes = selectNodes(c, tier, NODES);
  return {
    id: 'delivery', lanes: LANES, nodes,
    edges: buildEdges(nodes, NODES),
    loopLabel: 'every finding re-enters as the next intent.md',
    loopFrom: 'operate', loopTo: 'intake'
  };
}

const VIEW_META = {
  company: {
    label: 'Company',
    blurb: 'Every function of the business as a loop: signals in, work, gates, action, learning. Each loop writes to the shared context underneath.'
  },
  delivery: {
    label: 'Delivery',
    blurb: 'The internals of the product loop, the one function with a full lifecycle of its own, from intent through to production.'
  },
  stack: {
    label: 'Tool stack',
    blurb: 'The tools you already run, the path each one\'s data travels to reach the context store, and who reads it at the other end.'
  },
  improve: {
    label: 'Learning loop',
    blurb: 'How recorded work becomes context: record, index, distill, serve, gate, improve. This is the loop that makes every other loop better.'
  }
};

/* Cross-view index so a rollout phase can name a part from any view. */
function indexViews(views) {
  const idx = new Map();
  Object.entries(views).forEach(([viewId, view]) => {
    view.nodes.forEach(n => { if (!idx.has(n.id)) idx.set(n.id, { node: n, view: viewId }); });
  });
  return idx;
}

/* Company-wide rollout. Ordered by dependency, and it spans all four views. */
const COMPANY_PHASES = [
  {
    id: 'record',
    title: 'Make the work legible',
    weeks: [1, 3],
    goal: 'Stop losing the raw material. Nothing else here works until the record exists.',
    nodeIds: ['rec-artifacts', 'rec-meetings', 'rec-channels', 'artifact-home', 'agents-md',
              'brain-decisions', 'gate-spend', 'brain-retention', 'tool-meetings', 'tool-knowledge'],
    proof: 'Every recurring meeting is transcribed and filed, decisions leave a written record, and an idea from a non-engineer reaches a committed intent file the same day.',
    track: {
      ops: { proof: 'Every recurring meeting is transcribed and filed, decisions leave a written record, and each recurring task you want to hand to AI is written down step by step.' },
      explore: { title: 'Capture every conversation',
        goal: 'Before building anything, stop losing what customers tell you. Every interview and call is recorded, summarised and filed.',
        proof: 'Every customer conversation leaves a written summary, and you can count how many people described the same problem.' }
    }
  },
  {
    id: 'first-loop',
    title: 'Run one loop end to end',
    weeks: [2, 5],
    goal: 'One function, one named owner, one written policy, one measured outcome. Depth beats breadth here.',
    nodeIds: ['gate-dri', 'loop-support', 'loop-ops', 'loop-delivery', 'originator', 'intent-capture',
              'product-owner', 'feedback-loop', 'gate-adversary', 'spend-limit'],
    proof: 'One loop produces real output daily, a second model checks it before it leaves, and you can name the metric it moved.',
    track: {
      ops: { proof: 'One recurring procedure runs with AI every day or week, a second check reviews the output before it leaves, and you can name the hours or cost it saved.' },
      explore: { title: 'Run one learning loop end to end',
        goal: 'One question, one owner, one test, one measured answer. Depth beats breadth here.',
        proof: 'You have a written assumption, the evidence for and against it, and a decision on what to test next.' }
    }
  },
  {
    id: 'shape',
    title: 'Make the plan the reviewable unit',
    weeks: [3, 6],
    goal: 'Nothing gets implemented without a written plan a stranger could execute.',
    nodeIds: ['spec-agent', 'plan-agent', 'orchestrator', 'delivery-partner', 'implementer',
              'test-first', 'ops-agent', 'branch-protection', 'tool-source-control', 'tool-agent-ide', 'tool-pm'],
    proof: 'Every merged change has a plan that matches it, and first-pass merge rate is climbing.',
    track: {
      ops: { title: 'Write the procedure before automating it',
        goal: 'No task is handed to AI until a written procedure says what good output looks like and when to stop and ask.',
        proof: 'Each automated task has a procedure a new hire could follow, and the share of outputs accepted without rework is climbing.' },
      explore: { title: 'Write the brief before the prototype',
        goal: 'Nothing gets built, not even a throwaway prototype, without a short written brief of what it must prove.',
        proof: 'Every prototype has a brief saying what it tests, and each round of testing ends with a written result.' }
    }
  },
  {
    id: 'policy',
    title: 'Encode policy, then enforce it',
    weeks: [5, 9],
    goal: 'Standards become files the agents read and checks they cannot talk past.',
    nodeIds: ['skills', 'hooks', 'review-md', 'test-lock', 'verifier-agent', 'visual-check',
              'gate-policy', 'legacy-bridge', 'policy-owner', 'idx-permissions'],
    proof: 'Review findings that cite a written policy fall towards zero, because the policy is applied while the work is done.',
    track: {
      ops: { title: 'Turn the rules into checks',
        goal: 'Spending limits, data rules and approval thresholds become automatic checks the AI cannot skip.',
        proof: 'More exceptions are caught by a rule than by a person reading the output, and the share keeps rising.' },
      explore: { goal: 'The few rules that matter from day one, such as what data you keep and what you may promise, become files the AI reads.' }
    }
  },
  {
    id: 'canon',
    title: 'Index the record, distill the canon',
    weeks: [6, 11],
    goal: 'Turn the growing pile of transcripts and artifacts into the short documents every session reads.',
    nodeIds: ['idx-store', 'store-index', 'store-canon', 'brain-index', 'brain-canon', 'brain-context',
              'dis-nightly', 'dis-weekly', 'gate-canon', 'srv-context', 'srv-connectors', 'tool-warehouse'],
    proof: 'An agent answers a question from the indexed record with sources, and the canon is edited by diff rather than rewritten from memory.',
    track: {
      explore: { title: 'Turn the evidence into a playbook',
        goal: 'Distill interviews and test results into the short documents every session reads: the problem, the customer, and what you have learned.',
        proof: 'An agent answers "what have customers told us about this?" from the record, with sources.' }
    }
  },
  {
    id: 'review',
    title: 'Layer the review, keep one human gate',
    weeks: [8, 13],
    goal: 'Identical review passes on everything, with human attention on intent and risk.',
    nodeIds: ['review-bugs', 'review-security', 'review-compliance', 'code-owner', 'prod-gate',
              'chat-responder', 'postmortem', 'learn-eval', 'act-comms', 'tool-support'],
    proof: 'Time to first review is minutes, and defects caught before merge exceed those escaping to customers.',
    track: {
      ops: { title: 'Keep one human sign-off',
        goal: 'Automatic checks on every output, with human attention on exceptions, money and customers.',
        proof: 'Signing off an AI output takes minutes, and errors caught before they reach a customer or the books exceed those that escape.' }
    }
  },
  {
    id: 'scale',
    title: 'Widen to the other functions',
    weeks: [10, 16],
    goal: 'The loops that were waiting on the record and the canon can now run.',
    nodeIds: ['loop-demand', 'loop-revenue', 'loop-leadership', 'loop-hiring', 'sig-market',
              'parallel-fleet', 'knowledge-curator', 'eval-suite', 'ci-judgment', 'permissions',
              'release-auth', 'rollback', 'use-gtm', 'use-support', 'tool-crm', 'tool-analytics'],
    proof: 'More than one function runs a measured loop, and concurrent delivery streams rise while rework holds flat.',
    track: {
      ops: { proof: 'More than one function runs a measured loop, and hours spent on routine work keep falling without quality slipping.' }
    }
  },
  {
    id: 'autonomy',
    title: 'Close the loops',
    weeks: [14, 24],
    goal: 'Deterministic triggers invoke agents with no person in the path, and findings re-enter as intent.',
    nodeIds: ['control-bands', 'diagnosis-agent', 'service-owner', 'security-scan', 'telemetry-loop',
              'support-signal', 'learning-agent', 'learn-distill', 'learn-measure', 'learn-review',
              'gate-canon-eval', 'imp-selffix', 'imp-experiment', 'imp-feed', 'dis-monthly', 'srv-retrieval'],
    proof: 'A threshold breach becomes a triaged finding in minutes without anyone starting it, and the monthly review can say which loop earned its tokens.',
    track: {
      ops: { goal: 'Set triggers start AI tasks with no person in the path, and exceptions come back as fixes to the procedure.',
        proof: 'A missed threshold or failed task becomes a flagged exception within minutes without anyone starting it, and the monthly review can say which loop earned its cost.' }
    }
  }
];

const COMPANY_METRICS = [
  {
    id: 'legibility', stage: 'Legibility', category: 'governance',
    leadTitle: 'Meeting & Decision Filing Rate', leadTarget: '≥ 95% logged', leadCadence: 'Weekly',
    leadDesc: 'Share of recurring meetings and key decisions filed as searchable markdown artifacts.',
    leadFormula: '(Filed decision & meeting artifacts ÷ Total calendar events) × 100',
    lagTitle: 'Ad-hoc Context Interruptions', lagTarget: '-60% status pings', lagCadence: 'Quarterly',
    lagDesc: 'Questions answered from the context layer without interrupting or tapping a teammate.',
    lagFormula: 'Queries answered by AI assistant without human mention/escalation',
    source: 'Transcript archive & decision log', minTier: 1
  },
  {
    id: 'loops', stage: 'Loops', category: 'operations',
    leadTitle: 'Adversarial Gate Clearance', leadTarget: '≥ 80% pass on round 1', leadCadence: 'Per run',
    leadDesc: 'Loop outputs passing the adversarial model gate without human rejection or correction.',
    leadFormula: '(Outputs passing adversarial check first time ÷ Total loop runs) × 100',
    lagTitle: 'Automated Outcome Unit Cost', lagTarget: '-50% unit cost', lagCadence: 'Quarterly',
    lagDesc: 'Cost per completed workflow deliverable compared against the manual staff baseline.',
    lagFormula: '(Automated execution token spend ÷ Historical manual labor cost) × 100',
    source: 'Gate logs & usage export', minTier: 2
  },
  {
    id: 'canon', stage: 'Canon', category: 'governance',
    leadTitle: 'Canon Sync Latency', leadTarget: '< 48 hours', leadCadence: 'Weekly',
    leadDesc: 'Days between an operational practice change and the canon repository reflecting it.',
    leadFormula: 'Timestamp(canon PR merged) - Timestamp(policy change approved)',
    lagTitle: 'Repeat Procedural Errors', lagTarget: '< 1 repeat error / mo', lagCadence: 'Quarterly',
    lagDesc: 'Repeat mistakes, outdated answers, or compliance deviations on established topics.',
    lagFormula: 'Count of repeat compliance/procedural tickets logged',
    source: 'Canon repository history', minTier: 2
  },
  {
    id: 'evals', stage: 'Learning', category: 'governance',
    leadTitle: 'Failure-to-Eval Speed', leadTarget: '100% within 5 days', leadCadence: 'Continuous',
    leadDesc: 'Production defects or hallucinations converted into permanent automated eval test cases.',
    leadFormula: '(Eval cases created from postmortems ÷ Total postmortems) × 100',
    lagTitle: 'Self-Proposed Flow Improvements', lagTarget: '≥ 40% system-authored', lagCadence: 'Quarterly',
    lagDesc: 'Share of workflow and prompt optimizations suggested by learning loops rather than staff.',
    lagFormula: '(Learning agent improvement PRs merged ÷ Total workflow PRs) × 100',
    source: 'Eval suite & Git commit authorship', minTier: 3
  }
];

const COMPANY_RISKS = [
  {
    id: 'record-no-retention',
    title: 'Recording everything before deciding what you keep',
    severity: 'critical',
    category: 'compliance',
    categoryLabel: 'Data Protection & Privacy',
    trigger: () => 'Universal context risk across company operations',
    impact: 'Statutory privacy violations under GDPR/CCPA; unfulfillable Subject Access Requests (SARs) due to unindexed personal data in AI transcripts.',
    trap: 'Transcribing every customer interaction, call, and document without predefined retention schedules or automated PII scrubbing.',
    guardrail: 'Configure automated PII scrubbing at ingest time and enforce strict source-level retention expiration before vector indexing.',
    body: 'Transcribing every call and indexing every document collides with data protection the moment a subject access request or an audit arrives. Decide retention windows, redaction at ingest and per-source access before the corpus exists. Retrofitting redaction across a year of transcripts is brutal and sometimes impossible.',
    when: c => true
  },
  {
    id: 'canon-unowned',
    title: 'A canon nobody owns',
    severity: 'high',
    category: 'quality',
    categoryLabel: 'Knowledge Governance',
    trigger: (c, t) => `Triggered by: Autonomy Tier ${t} self-updating knowledge base`,
    impact: 'Knowledge drift and compounding hallucinations; agents and employees make costly operational mistakes based on stale or incorrect wiki edits.',
    trap: 'Letting an internal knowledge base or company handbook self-update without human sign-off and line-level citations.',
    guardrail: 'Appoint a single named human owner per document; require automated edits to arrive as pull requests with verified source citations.',
    body: 'A self-writing handbook with no named reviewer drifts toward answers that sound sure of themselves but are wrong, and people quietly stop trusting it. One owner per document, edits arriving as a diff with a citation per line, and a length somebody will actually read.',
    when: (c, t) => t >= 2
  },
  {
    id: 'tool-sprawl',
    title: 'Connector sprawl with no scope',
    severity: 'critical',
    category: 'compliance',
    categoryLabel: 'Security & Access',
    trigger: (c, t) => `Triggered by: Autonomy Tier ${t} multi-tool integration`,
    impact: 'Privilege escalation and unauthorized data exposure; an agent granted broad database or billing write-access triggers catastrophic unintended actions.',
    trap: 'Granting standing, long-lived read/write credentials to AI agents across production databases, billing platforms, and code repos.',
    guardrail: 'Enforce an explicit tool allowlist per role, require short-lived ephemeral credentials, and review access permissions monthly.',
    body: 'Every new connector widens what an agent can reach, and access granted for one task stays granted. Keep tool access an allowlist per role, use short-lived credentials, and review the list monthly. An agent with standing write access to your billing system is a question you do not want to answer twice.',
    when: (c, t) => t >= 2
  },
  {
    id: 'loop-no-dri',
    title: 'Loops without a named owner',
    severity: 'high',
    category: 'governance',
    categoryLabel: 'Operational Accountability',
    trigger: () => 'Applies to all scheduled company loops',
    impact: 'Silent loop failure and unmonitored queues; broken background workflows burn tokens while degrading customer-facing services.',
    trap: 'Deploying autonomous background loops governed by general committee consensus rather than a single accountable operator.',
    guardrail: 'Designate exactly one named Directly Responsible Individual (DRI) per loop with explicit authority to modify or terminate underperforming loops.',
    body: 'A loop with a committee behind it degrades silently: nobody clears the flagged queue, nobody updates the policy, and nobody switches it off when it stops earning. One name per loop, and a monthly review that is allowed to kill things.',
    when: c => true
  },
  {
    id: 'dashboard-theatre',
    title: 'Dashboards instead of a queryable record',
    severity: 'medium',
    category: 'governance',
    categoryLabel: 'Data & Telemetry',
    trigger: (c, t) => `Triggered by: Autonomy Tier ${t} operational tracking`,
    impact: 'Fragmented visibility and delayed incident response; disjointed SaaS dashboards prevent agents from diagnosing cross-loop bottlenecks.',
    trap: 'Relying on isolated third-party vendor dashboards that cannot be programmatically queried or synthesized by AI models.',
    guardrail: 'Stream operational telemetry and event logs into a centralized queryable data store (e.g. SQLite/Parquet) accessible to agents.',
    body: 'Data trapped in each vendor\'s dashboard cannot be joined, so the interesting questions stay unanswerable and people go back to asking each other. Export the few metrics that matter into one store where an agent can query across them.',
    when: (c, t) => t >= 2
  },
  {
    id: 'copy-the-org',
    title: 'Automating the org chart you already have',
    severity: 'high',
    category: 'velocity',
    categoryLabel: 'Organizational Topology',
    trigger: c => `Triggered by: ${c.stage || 'established'} organizational hierarchy`,
    impact: 'Solidifying organizational friction; expensive AI agents act as robotic status relays between silos without shortening lead time.',
    trap: 'Deploying agents to mirror existing department handoffs 1:1 instead of eliminating redundant intermediate coordination steps.',
    guardrail: 'Restructure work around end-to-end autonomous loops where humans inspect outputs at boundaries rather than relaying status in between.',
    body: 'Pointing agents at existing handoffs preserves the handoffs. The gain comes from removing the routing, not accelerating it: make the work legible and let people sit at the edges where judgment is needed, rather than in the middle relaying status.',
    when: c => eng(c) >= 15 || c.stage === 'enterprise' || c.stage === 'growth'
  }
];

/* The wording of a phase changes with the kind of plan, the goal and the sector, so two
   businesses that share a phase do not read the same sentence for different work. */
function phaseWording(p, c, track, focus, position) {
  const t = (p.track && p.track[track]) || {};
  let goal = t.goal || p.goal;
  if (p.id === 'record' && (has(c, 'regulated') || industryRegulated(c))) {
    goal += ' In your sector, agree what is kept, for how long and who may see it before recording starts.';
  }
  if (p.id === 'first-loop' && focus) {
    goal += ` For your goal, the loop to start with is "${focus.node.title}".`;
  }
  if (position === 0 && c.org === 'solo') {
    goal += ' Working alone, keep this to what you can set up in a few evenings.';
  }
  return { title: localize(t.title || p.title, c), goal: localize(goal, c), proof: localize(t.proof || p.proof, c) };
}

/* A part in this business's words: the sector's name for its customers and its own
   routine work, and a prompt that opens with who it is working for. The knowledge base
   stays generic; only the copy handed to the views is rewritten. */
const LOCAL_FIELDS = ['title', 'subtitle', 'purpose', 'why', 'responsibility', 'enforces', 'role', 'emits'];
function localizeNode(n, c) {
  const out = { ...n };
  LOCAL_FIELDS.forEach(f => { if (typeof n[f] === 'string') out[f] = localize(n[f], c); });
  if (typeof n.prompt === 'string') out.prompt = promptContext(c) + ' ' + localize(n.prompt, c);
  return out;
}

/* Wraps the delivery-only blueprint with the company-level views and content. */
function buildFullBlueprint(c) {
  const base = buildBlueprint(c);
  const tier = base.tier;
  const views = {
    company: buildCompanyView(c, tier),
    delivery: buildDeliveryView(c, tier),
    stack: buildStackView(c, tier),
    improve: buildImproveView(c, tier)
  };
  Object.values(views).forEach(v => { v.nodes = v.nodes.map(n => localizeNode(n, c)); });
  const index = indexViews(views);
  /* The goal's starting part, or the nearest stand-in these answers actually include. */
  const want = GOAL_FOCUS[c.goal];
  const focusId = [want.node, ...(want.alt || [])].find(id => index.has(id)) || want.node;

  const w = governanceWeight(c);
  const teamDrag = eng(c) >= 15 ? 1.2 : eng(c) === 0 ? 1.15 : 1;
  let cursor = 1;
  const phases = [];
  const track = planTrack(c);
  const focus = index.get(focusId);
  for (const p of COMPANY_PHASES) {
    const items = p.nodeIds.filter(id => index.has(id));
    if (!items.length) continue;
    const span = Math.max(1, Math.round((p.weeks[1] - p.weeks[0] + 1) * w * teamDrag));
    phases.push({ ...p, ...phaseWording(p, c, track, focus, phases.length), items, start: cursor, end: cursor + span - 1 });
    cursor += Math.max(1, Math.round(span * 0.6));
  }

  const counts = { ai: 0, human: 0, gate: 0, tool: views.stack.picks.length };
  Object.values(views).forEach(v => v.nodes.forEach(n => {
    if (n.id.startsWith('tool-')) return;
    if (n.kind === 'ai') counts.ai++;
    else if (n.kind === 'human') counts.human++;
    else if (n.kind === 'gate' || n.kind === 'system') counts.gate++;
  }));

  return {
    ...base,
    views, index, phases, counts,
    focus: { ...want, node: focusId, line: localize(want.line, c) },
    metrics: [...base.metrics, ...COMPANY_METRICS.filter(m => m.minTier <= tier)]
      .map(m => ({
        ...m,
        lead: localize(m.lead || `${m.leadTitle} (${m.leadTarget}) — ${m.leadDesc}`, c),
        lag: localize(m.lag || `${m.lagTitle} (${m.lagTarget}) — ${m.lagDesc}`, c)
      })),
    risks: (() => {
      const combined = [...COMPANY_RISKS.filter(r => r.when(c, tier)), ...base.risks]
        .map(r => ({
          ...r,
          title: localize(r.title, c),
          body: localize(r.body, c),
          impact: r.impact ? localize(r.impact, c) : (r.body || ''),
          trap: r.trap ? localize(r.trap, c) : '',
          guardrail: r.guardrail ? localize(r.guardrail, c) : '',
          triggerText: typeof r.trigger === 'function' ? r.trigger(c, tier) : (r.triggerText || r.trigger || 'Universal operational baseline'),
          severityVal: typeof r.severity === 'function' ? r.severity(c, tier) : (r.severityVal || r.severity || 'high')
        }));
      return combined;
    })(),
    riskScorecard: typeof computeRiskScorecard === 'function'
      ? computeRiskScorecard([...COMPANY_RISKS.filter(r => r.when(c, tier)), ...base.risks], c, tier)
      : null,
    stageNote: localize(base.stageNote, c),
    horizon: phases.length ? Math.max(...phases.map(p => p.end)) : 0
  };
}
