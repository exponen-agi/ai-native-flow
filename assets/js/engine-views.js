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
    label: 'The company',
    blurb: 'Each part of the business as a loop that runs and improves: what it learns each day, who does the work, what has to be checked, what changes, and what you learn back. Everything writes to the shared knowledge underneath.'
  },
  delivery: {
    label: 'Building software',
    blurb: 'What happens inside the product loop, from someone having an idea to it running for customers. This is the one part with a full lifecycle of its own.'
  },
  stack: {
    label: 'Tools and data',
    blurb: 'The tools you already pay for, how each one\'s information travels into a single place the AI can read, and who reads it at the other end. Start with what you have.'
  },
  improve: {
    label: 'Getting better',
    blurb: 'How today\'s work becomes tomorrow\'s knowledge: record it, make it findable, boil it down, feed it back in, check it, improve. This is what makes every other loop get better instead of staying flat.'
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
    nodeIds: ['rec-artifacts', 'rec-meetings', 'rec-channels', 'artifact-home', 'claude-md',
              'brain-decisions', 'gate-spend', 'brain-retention', 'tool-meetings', 'tool-knowledge'],
    proof: 'Every recurring meeting is transcribed and filed, decisions leave a written record, and an idea from a non-engineer reaches a committed intent file the same day.'
  },
  {
    id: 'first-loop',
    title: 'Run one loop end to end',
    weeks: [2, 5],
    goal: 'One function, one named owner, one written policy, one measured outcome. Depth beats breadth here.',
    nodeIds: ['gate-dri', 'loop-support', 'loop-ops', 'loop-delivery', 'originator', 'intent-capture',
              'product-owner', 'feedback-loop', 'gate-adversary', 'spend-limit'],
    proof: 'One loop produces real output daily, a second model checks it before it leaves, and you can name the metric it moved.'
  },
  {
    id: 'shape',
    title: 'Make the plan the reviewable unit',
    weeks: [3, 6],
    goal: 'Nothing gets implemented without a written plan a stranger could execute.',
    nodeIds: ['spec-agent', 'plan-agent', 'orchestrator', 'delivery-partner', 'implementer',
              'test-first', 'ops-agent', 'branch-protection', 'tool-source-control', 'tool-agent-ide', 'tool-pm'],
    proof: 'Every merged change has a plan that matches it, and first-pass merge rate is climbing.'
  },
  {
    id: 'policy',
    title: 'Encode policy, then enforce it',
    weeks: [5, 9],
    goal: 'Standards become files the agents read and checks they cannot talk past.',
    nodeIds: ['skills', 'hooks', 'review-md', 'test-lock', 'verifier-subagent', 'visual-check',
              'gate-policy', 'legacy-bridge', 'policy-owner', 'idx-permissions'],
    proof: 'Review findings that cite a written policy fall towards zero, because the policy is applied while the work is done.'
  },
  {
    id: 'canon',
    title: 'Index the record, distill the canon',
    weeks: [6, 11],
    goal: 'Turn the growing pile of transcripts and artifacts into the short documents every session reads.',
    nodeIds: ['idx-store', 'store-index', 'store-canon', 'brain-index', 'brain-canon', 'brain-context',
              'dis-nightly', 'dis-weekly', 'gate-canon', 'srv-context', 'srv-connectors', 'tool-warehouse'],
    proof: 'An agent answers a question from the indexed record with sources, and the canon is edited by diff rather than rewritten from memory.'
  },
  {
    id: 'review',
    title: 'Layer the review, keep one human gate',
    weeks: [8, 13],
    goal: 'Identical review passes on everything, with human attention on intent and risk.',
    nodeIds: ['review-bugs', 'review-security', 'review-compliance', 'code-owner', 'prod-gate',
              'chat-responder', 'postmortem', 'learn-eval', 'act-comms', 'tool-support'],
    proof: 'Time to first review is minutes, and defects caught before merge exceed those escaping to customers.'
  },
  {
    id: 'scale',
    title: 'Widen to the other functions',
    weeks: [10, 16],
    goal: 'The loops that were waiting on the record and the canon can now run.',
    nodeIds: ['loop-demand', 'loop-revenue', 'loop-leadership', 'loop-hiring', 'sig-market',
              'parallel-fleet', 'knowledge-curator', 'eval-suite', 'ci-judgment', 'permissions',
              'release-auth', 'rollback', 'use-gtm', 'use-support', 'tool-crm', 'tool-analytics'],
    proof: 'More than one function runs a measured loop, and concurrent delivery streams rise while rework holds flat.'
  },
  {
    id: 'autonomy',
    title: 'Close the loops',
    weeks: [14, 24],
    goal: 'Deterministic triggers invoke agents with no person in the path, and findings re-enter as intent.',
    nodeIds: ['control-bands', 'diagnosis-agent', 'service-owner', 'security-scan', 'telemetry-loop',
              'support-signal', 'learning-agent', 'learn-distill', 'learn-measure', 'learn-review',
              'gate-canon-eval', 'imp-selffix', 'imp-experiment', 'imp-feed', 'dis-monthly', 'srv-retrieval'],
    proof: 'A threshold breach becomes a triaged finding in minutes without anyone starting it, and the monthly review can say which loop earned its tokens.'
  }
];

const COMPANY_METRICS = [
  { stage: 'Legibility', lead: 'Share of recurring meetings and decisions that leave a filed artifact', lag: 'Questions answered from the record without interrupting a person', source: 'transcript archive and decision log', minTier: 1 },
  { stage: 'Loops', lead: 'Loop outputs passing the adversarial gate first time', lag: 'Cost per loop outcome, against the manual baseline', source: 'gate logs and the usage export', minTier: 2 },
  { stage: 'Canon', lead: 'Days between a practice changing and the canon reflecting it', lag: 'Repeat questions and repeat mistakes on the same topic', source: 'canon repository history', minTier: 2 },
  { stage: 'Learning', lead: 'Failures converted into a permanent eval case within a week', lag: 'Share of improvements the system proposed rather than a person', source: 'eval suite and pull request authorship', minTier: 3 }
];

const COMPANY_RISKS = [
  {
    id: 'record-no-retention',
    title: 'Recording everything before deciding what you keep',
    body: 'Transcribing every call and indexing every document collides with data protection the moment a subject access request or an audit arrives. Decide retention windows, redaction at ingest and per-source access before the corpus exists. Retrofitting redaction across a year of transcripts is brutal and sometimes impossible.',
    when: c => true
  },
  {
    id: 'canon-unowned',
    title: 'A canon nobody owns',
    body: 'A self-writing handbook with no named reviewer converges on confident nonsense, and people quietly stop trusting it. One owner per document, edits arriving as a diff with a citation per line, and a length somebody will actually read.',
    when: (c, t) => t >= 2
  },
  {
    id: 'tool-sprawl',
    title: 'Connector sprawl with no scope',
    body: 'Every new connector widens what an agent can reach, and access granted for one task stays granted. Keep tool access an allowlist per role, use short-lived credentials, and review the list monthly. An agent with standing write access to your billing system is a question you do not want to answer twice.',
    when: (c, t) => t >= 2
  },
  {
    id: 'loop-no-dri',
    title: 'Loops without a named owner',
    body: 'A loop with a committee behind it degrades silently: nobody clears the flagged queue, nobody updates the policy, and nobody switches it off when it stops earning. One name per loop, and a monthly review that is allowed to kill things.',
    when: c => true
  },
  {
    id: 'dashboard-theatre',
    title: 'Dashboards instead of a queryable record',
    body: 'Data trapped in each vendor\'s dashboard cannot be joined, so the interesting questions stay unanswerable and people go back to asking each other. Export the few metrics that matter into one store where an agent can query across them.',
    when: (c, t) => t >= 2
  },
  {
    id: 'copy-the-org',
    title: 'Automating the org chart you already have',
    body: 'Pointing agents at existing handoffs preserves the handoffs. The gain comes from removing the routing, not accelerating it: make the work legible and let people sit at the edges where judgment is needed, rather than in the middle relaying status.',
    when: c => eng(c) >= 15 || c.stage === 'enterprise' || c.stage === 'growth'
  }
];

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
  const index = indexViews(views);

  const w = governanceWeight(c);
  const teamDrag = eng(c) >= 15 ? 1.2 : eng(c) === 0 ? 1.15 : 1;
  let cursor = 1;
  const phases = [];
  for (const p of COMPANY_PHASES) {
    const items = p.nodeIds.filter(id => index.has(id));
    if (!items.length) continue;
    const span = Math.max(1, Math.round((p.weeks[1] - p.weeks[0] + 1) * w * teamDrag));
    phases.push({ ...p, items, start: cursor, end: cursor + span - 1 });
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
    metrics: [...base.metrics, ...COMPANY_METRICS.filter(m => m.minTier <= tier)],
    risks: [...COMPANY_RISKS.filter(r => r.when(c, tier)), ...base.risks],
    horizon: phases.length ? Math.max(...phases.map(p => p.end)) : 0
  };
}
