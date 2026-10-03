/* Wiring: one intake, four graph views, four content panels. State lives in the
   URL hash and nowhere else. */

const form = document.getElementById('intake-form');
const intakeWrap = document.getElementById('intake-wrap');
const graphMount = document.getElementById('graph');
const detailMount = document.getElementById('detail');
let current = null;
let currentView = 'company';
let selected = {};

const KIND_LABEL = {
  ai: 'Done by AI', human: 'Done by a person', gate: 'Approval or policy',
  system: 'A system or signal', artifact: 'A document or tool'
};
const ANSWER_LABEL = {
  engineers: { none: 'No tech staff', solo: '1–3 tech staff', small: '4–15 tech staff', large: '15+ tech staff' },
  budget: { under200: '<$200/mo', to2k: '$200–2k/mo', to10k: '$2–10k/mo', over10k: '$10k+/mo' },
  domain: { saas: 'Web software', mobile: 'Mobile app', ecommerce: 'Sells online', 'data-ai': 'AI or data product', hardware: 'Physical products', 'internal-ops': 'Runs operations', services: 'People-delivered services' },
  goal: { validate: 'Validate an idea', 'less-rework': 'Build the right thing', 'ship-faster': 'Launch faster', 'fewer-defects': 'Fewer mistakes', 'grow-revenue': 'Grow revenue', 'support-load': 'Easier support', 'ops-cost': 'Cheaper back office', decisions: 'Answers from our data', compliance: 'Compliance and risk', 'scale-without-hiring': 'Grow without hiring' },
  constraints: { regulated: 'Regulated data', 'legacy-systems': 'Legacy systems', 'no-ci': 'Manual releases', 'client-code': 'Client codebases' }
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function readForm() {
  const fd = new FormData(form);
  const org = fd.get('org');
  return {
    /* stage is the segment the rules reason over, derived from the type and size. */
    org, stage: ORG_TYPES[org].segment, journey: fd.get('journey'), industry: fd.get('industry'),
    engineers: fd.get('engineers'), budget: fd.get('budget'),
    domain: fd.get('domain'), goal: fd.get('goal'),
    constraints: fd.getAll('constraints'),
    problem: (fd.get('problem') || '').trim()
  };
}

function writeHash(c) {
  const p = new URLSearchParams({
    org: c.org, journey: c.journey, ind: c.industry,
    eng: c.engineers, budget: c.budget, domain: c.domain, goal: c.goal, v: currentView
  });
  if (c.constraints.length) p.set('c', c.constraints.join(','));
  history.replaceState(null, '', '#' + p.toString());
}

function applyHash() {
  if (!location.hash.length) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const set = (id, key) => {
    const v = p.get(key), e = document.getElementById(id);
    if (v && e && [...e.options].some(o => o.value === v)) e.value = v;
  };
  /* Older links carry only the segment; map it to the closest type and size. */
  if (!p.get('org') && SEGMENT_TO_ORG[p.get('stage')]) p.set('org', SEGMENT_TO_ORG[p.get('stage')]);
  set('org', 'org'); set('journey', 'journey'); set('industry', 'ind');
  set('engineers', 'eng'); set('budget', 'budget');
  set('domain', 'domain'); set('goal', 'goal');
  const cs = (p.get('c') || '').split(',').filter(Boolean);
  form.querySelectorAll('input[name="constraints"]').forEach(i => { i.checked = cs.includes(i.value); });
  const v = p.get('v');
  if (v && (VIEW_META[v] || ['network', 'rollout', 'measure', 'risks', 'export', 'activate'].includes(v))) currentView = v;
}

/* ------------------------------------------------------------------ header */

function renderChips(c) {
  const mount = document.getElementById('answer-chips');
  mount.innerHTML = '';
  const parts = [
    orgLabel(c), INDUSTRIES[c.industry].short, JOURNEYS[c.journey].short,
    ANSWER_LABEL.goal[c.goal], ANSWER_LABEL.engineers[c.engineers], ANSWER_LABEL.budget[c.budget],
    ...c.constraints.map(k => ANSWER_LABEL.constraints[k])
  ];
  parts.forEach(p => mount.appendChild(el('span', 'answer-chip', p)));
}

function orgLabel(c) {
  const o = ORG_TYPES[c.org];
  return `${o.short} (${o.people})`;
}

function renderStrip(b) {
  document.getElementById('tier-n').textContent = `Level ${b.tier} of 4`;
  document.getElementById('tier-name').textContent = b.tierInfo.name;
  document.getElementById('stat-ai').textContent = b.counts.ai;
  document.getElementById('stat-human').textContent = b.counts.human;
  document.getElementById('stat-gate').textContent = b.counts.gate;
  document.getElementById('stat-tool').textContent = b.counts.tool;
  document.getElementById('stat-weeks').innerHTML = `${b.horizon}<span class="unit">wk</span>`;
  document.getElementById('read-ceiling').textContent = b.tierInfo.thesis + ' How far AI can act alone: ' + b.tierInfo.ceiling;
  document.getElementById('read-goal').textContent = b.focus.line;
  document.getElementById('read-journey').textContent = b.journeyNote;
  document.getElementById('read-industry').textContent = b.industryNote;
  document.getElementById('read-stage').textContent = b.stageNote;
  document.getElementById('read-budget').textContent = b.budgetNote;
  const echo = document.getElementById('read-problem');
  echo.hidden = !b.answers.problem;
  if (b.answers.problem) echo.textContent = 'You wrote: ' + b.answers.problem;
}

/* ------------------------------------------------------------------ detail */

function artifactChips(list) {
  const box = el('div', 'chips-row');
  list.forEach(a => box.appendChild(el('code', 'artifact', ARTIFACT_LABELS[a] || a)));
  return box;
}

function copyText(text, btn, done) {
  const restore = btn.textContent;
  const finish = ok => {
    btn.textContent = ok ? done : 'Press Ctrl+C';
    setTimeout(() => { btn.textContent = restore; }, 1800);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => finish(true)).catch(() => finish(false));
  } else {
    const ta = document.createElement('textarea');
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.value = text;
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    finish(ok);
  }
}

function renderDetail(id) {
  renderNodeDetail(detailMount, current.views[currentView], id);
}

/* The reading of one part, into any mount. The diagram's side panel and the peek sheet
   on the activated plan share it, so a part reads the same wherever it is opened.
   `opts.afterPurpose` lets a caller add context under the summary, and `opts.onTool`
   decides what a tool chip does (the diagram jumps to the stack view; the sheet stays). */
function renderNodeDetail(mount, view, id, opts = {}) {
  const detailMount = mount;
  const n = view.nodes.find(x => x.id === id);
  detailMount.innerHTML = '';
  if (!n) return;
  const laneLabel = (view.lanes.find(l => l.id === n.lane) || {}).label || 'Shared context';

  const head = el('header', 'detail-head');
  head.appendChild(el('span', `detail-kind kind-${n.kind}`, KIND_LABEL[n.kind]));
  head.appendChild(el('span', 'detail-lane', laneLabel));
  detailMount.appendChild(head);
  detailMount.appendChild(el('h3', 'detail-title', n.title));
  detailMount.appendChild(el('p', 'detail-purpose', n.purpose));
  if (opts.afterPurpose) opts.afterPurpose(detailMount, n);

  if (n.options) {
    const box = el('div', 'detail-block');
    box.appendChild(el('p', 'block-label', 'Start with'));
    const best = el('p', 'pick-best');
    best.appendChild(el('strong', null, n.options.best.name));
    best.appendChild(document.createTextNode(' — ' + n.options.best.note));
    box.appendChild(best);
    if (n.options.alternatives.length) {
      box.appendChild(el('p', 'block-label', 'Or'));
      const ul = el('ul', 'pick-alts');
      n.options.alternatives.forEach(o => {
        const li = el('li');
        li.appendChild(el('strong', null, o.name));
        li.appendChild(document.createTextNode(' — ' + o.note));
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }
    box.appendChild(el('p', 'prompt-note', 'Common choices at your stage, not endorsements. The category and the data path are the durable parts.'));
    detailMount.appendChild(box);
  }

  if (n.why) {
    const why = el('p', 'detail-why');
    why.appendChild(el('span', 'detail-why-label', n.options ? 'What it emits' : 'Why it earns a place'));
    why.appendChild(document.createTextNode(n.why.replace(/^What it emits into the system: /, '')));
    detailMount.appendChild(why);
  }
  if (n.responsibility) {
    const r = el('div', 'detail-block');
    r.appendChild(el('p', 'block-label', 'What this person owns'));
    r.appendChild(el('p', 'block-body', n.responsibility));
    detailMount.appendChild(r);
  }
  if (n.enforces) {
    const g = el('div', 'detail-block');
    g.appendChild(el('p', 'block-label', 'What it enforces'));
    g.appendChild(el('p', 'block-body', n.enforces));
    detailMount.appendChild(g);
  }
  if (n.prompt) {
    const p = el('div', 'detail-block prompt-block');
    const lab = el('p', 'block-label', 'Indicative prompt');
    const copy = el('button', 'mini-btn', 'Copy');
    copy.type = 'button';
    copy.addEventListener('click', () => copyText(n.prompt, copy, 'Copied'));
    lab.appendChild(copy);
    p.appendChild(lab);
    p.appendChild(el('pre', 'prompt', n.prompt));
    p.appendChild(el('p', 'prompt-note', 'Indicative only. Rewrite it in your own vocabulary before you rely on it.'));
    detailMount.appendChild(p);
  }
  if (n.tools && n.tools.length) {
    const t = el('div', 'detail-block');
    t.appendChild(el('p', 'block-label', 'Runs on'));
    const row = el('div', 'chips-row');
    n.tools.forEach(id => {
      const pick = current.views.stack.picks.find(p => p.category.id === id);
      if (!pick) return;
      const btn = el('button', 'tool-chip', pick.category.label + ': ' + pick.best.name);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (opts.onTool) opts.onTool('tool-' + id);
        else { switchTab('stack'); select('tool-' + id); }
      });
      row.appendChild(btn);
    });
    if (row.childElementCount) { t.appendChild(row); detailMount.appendChild(t); }
  }
  if (n.in || n.out) {
    const flow = el('div', 'detail-flow');
    if (n.in) { const d = el('div'); d.appendChild(el('p', 'block-label', 'Reads')); d.appendChild(artifactChips(n.in)); flow.appendChild(d); }
    if (n.out) { const d = el('div'); d.appendChild(el('p', 'block-label', 'Writes')); d.appendChild(artifactChips(n.out)); flow.appendChild(d); }
    detailMount.appendChild(flow);
  }
}

function select(id) {
  selected[currentView] = id;
  highlight(graphMount, id, current.views[currentView]);
  const status = document.getElementById('graph-status');
  if (status) {
    const n = current.views[currentView].nodes.find(x => x.id === id);
    status.innerHTML = '';
    if (n) {
      status.appendChild(document.createTextNode('Selected: '));
      status.appendChild(el('strong', null, n.title));
    } else {
      status.textContent = 'Nothing selected';
    }
  }
  document.querySelectorAll('.spine-chip').forEach(c => c.classList.toggle('is-selected', c.dataset.id === id));
  renderDetail(id);
}

/* ------------------------------------------------------------------- views */

function renderSpine(view) {
  const wrap = document.getElementById('spine-wrap');
  const mount = document.getElementById('spine');
  const spine = view.nodes.filter(n => n.lane === 'spine');
  mount.innerHTML = '';
  wrap.hidden = !spine.length;
  spine.forEach(n => {
    const btn = el('button', `spine-chip kind-${n.kind}`);
    btn.type = 'button';
    btn.dataset.id = n.id;
    btn.appendChild(el('span', 'spine-name', n.title));
    btn.appendChild(el('span', 'spine-sub', n.subtitle));
    btn.addEventListener('click', () => select(n.id));
    mount.appendChild(btn);
  });
}

function renderStackTable(view) {
  const mount = document.getElementById('stack-table');
  mount.innerHTML = '';
  mount.appendChild(el('p', 'spine-label', 'Every slot at a glance, with the path its data travels'));
  const scroll = el('div', 'table-scroll');
  const table = el('table', 'metrics');
  const thead = el('thead');
  const hr = document.createElement('tr');
  ['Slot', 'Start with', 'Alternatives', 'Emits', 'Reaches context by'].forEach(h => {
    const th = el('th', null, h); hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);
  const tb = el('tbody');
  view.picks.forEach(p => {
    const tr = document.createElement('tr');
    const th = el('th', null, p.category.label); th.scope = 'row'; tr.appendChild(th);
    tr.appendChild(el('td', 'pick-cell', p.best.name));
    tr.appendChild(el('td', 'source', p.alternatives.map(a => a.name).join(', ') || '—'));
    tr.appendChild(el('td', null, p.category.emits));
    const mech = COLLECTION_NODES.find(n => n.id === p.category.collection);
    tr.appendChild(el('td', 'source', mech ? mech.title : 'it is the store'));
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  scroll.appendChild(table);
  mount.appendChild(scroll);
}

function renderView(id) {
  currentView = id;
  const view = current.views[id];
  document.getElementById('view-title').textContent = VIEW_META[id].label;
  document.getElementById('view-blurb').textContent = VIEW_META[id].blurb;
  renderGraph(view, graphMount, select);
  renderSpine(view);
  const stackTable = document.getElementById('stack-table');
  if (id === 'stack') { renderStackTable(view); stackTable.hidden = false; }
  else { stackTable.hidden = true; }
  const want = selected[id] && view.nodes.some(n => n.id === selected[id])
    ? selected[id]
    : (view.nodes.find(n => n.id === current.focus.node) ? current.focus.node : view.nodes[0].id);
  select(want);
  graphMount.scrollLeft = 0;
  markGraphOverflow();
}

/* On a phone or a narrow tablet the diagram bottoms out at its legibility floor and
   the box scrolls. A touch device shows no scrollbar until you already touch it, so
   say so in words -- but only when it is actually true at this size. */
function markGraphOverflow() {
  const over = graphMount.scrollWidth > Math.ceil(graphMount.getBoundingClientRect().width) + 1;
  document.getElementById('panel-graph').classList.toggle('graph-overflows', over);
}

let resizeTick;
window.addEventListener('resize', () => {
  clearTimeout(resizeTick);
  resizeTick = setTimeout(markGraphOverflow, 120);
}, { passive: true });

/* ------------------------------------------------------------ flat panels */

function renderPhases(b) {
  const mount = document.getElementById('phases');
  mount.innerHTML = '';
  b.phases.forEach(p => {
    const li = el('li', 'phase');
    const head = el('div', 'phase-head');
    head.appendChild(el('p', 'phase-weeks', p.start === p.end ? `Week ${p.start}` : `Weeks ${p.start}–${p.end}`));
    head.appendChild(el('h3', 'phase-title', p.title));
    li.appendChild(head);
    li.appendChild(el('p', 'phase-goal', p.goal));
    const parts = el('div', 'phase-parts');
    p.items.forEach(id => {
      const entry = b.index.get(id);
      if (!entry) return;
      const btn = el('button', `part-chip kind-${entry.node.kind}`, entry.node.title);
      btn.type = 'button';
      btn.title = 'Open on the ' + VIEW_META[entry.view].label + ' map';
      btn.addEventListener('click', () => showOnMap(id, 'rollout', 'Back to the rollout'));
      parts.appendChild(btn);
    });
    li.appendChild(parts);
    const proof = el('p', 'phase-proof');
    proof.appendChild(el('span', 'proof-label', 'Done when'));
    proof.appendChild(document.createTextNode(p.proof));
    li.appendChild(proof);
    mount.appendChild(li);
  });
}

let currentMetricFilter = 'all';

function renderMetrics(b) {
  const sc = computeOutcomeScorecard(b);
  
  // 1. Render Executive Scorecard
  const scoreMount = document.getElementById('measure-scorecard');
  if (scoreMount) {
    scoreMount.innerHTML = `
      <div class="m-card">
        <div class="m-card-top">
          <span class="m-kpi-val">${sc.flowScore}<span class="m-denom">/100</span></span>
          <span class="m-status-pill pill-auto">${sc.grade}</span>
        </div>
        <div class="m-kpi-lbl">Flow Automation &amp; Health Score</div>
        <p class="m-kpi-sub">Calculated from ${b.counts ? b.counts.ai : 12} AI steps, ${b.counts ? b.counts.human : 5} human gates, and Tier ${b.tier} autonomy ceilings.</p>
      </div>

      <div class="m-card">
        <div class="m-card-top">
          <span class="m-kpi-val">${sc.velMult}</span>
          <span class="m-status-pill pill-vel">${sc.cycleDrop} Faster</span>
        </div>
        <div class="m-kpi-lbl">Delivery Velocity Gain</div>
        <p class="m-kpi-sub">Intent-to-production latency compressed from weeks to hours by eliminating manual handoff queues.</p>
      </div>

      <div class="m-card">
        <div class="m-card-top">
          <span class="m-kpi-val">${sc.reworkDrop}</span>
          <span class="m-status-pill pill-shield">Pre-Merge Shield</span>
        </div>
        <div class="m-kpi-lbl">Defect &amp; Rework Reduction</div>
        <p class="m-kpi-sub">Automated verification harnesses and adversarial checks catch defects before they escape to customers.</p>
      </div>

      <div class="m-card">
        <div class="m-card-top">
          <span class="m-kpi-val">${sc.totalWeeklyHrs}<span class="m-denom"> hrs/wk</span></span>
          <span class="m-status-pill pill-roi">${sc.annualDollarsFormatted}/yr</span>
        </div>
        <div class="m-kpi-lbl">Team Capacity Returned</div>
        <p class="m-kpi-sub">Estimated ${sc.hrsPerPerson} hrs/person/wk across ${sc.teamSize} contributor${sc.teamSize > 1 ? 's' : ''} on routine drafting, triage, and review.</p>
      </div>
    `;
  }

  // 2. Wire Metric Filters
  const filterWrap = document.getElementById('measure-filters');
  if (filterWrap && !filterWrap.dataset.bound) {
    filterWrap.dataset.bound = 'true';
    filterWrap.querySelectorAll('.m-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        filterWrap.querySelectorAll('.m-filter').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        currentMetricFilter = btn.dataset.filter || 'all';
        applyMetricFilter(currentMetricFilter);
      });
    });
  }

  // 3. Render Metric Table Rows
  const tableMount = document.getElementById('metrics');
  if (tableMount) {
    tableMount.innerHTML = '';
    b.metrics.forEach(m => {
      const tr = document.createElement('tr');
      tr.className = `m-row ${m.goal ? 'is-goal-row' : ''}`;
      tr.dataset.category = m.category || (m.track && m.track.includes('ops') ? 'operations' : 'delivery');
      if (m.goal) tr.dataset.isGoal = 'true';

      // Col 1: Stage
      const tdStage = document.createElement('td');
      tdStage.className = 'col-stage';
      tdStage.innerHTML = `
        <div class="m-stage-wrap">
          <span class="m-stage-name">${m.stage}</span>
          ${m.goal ? '<span class="m-goal-pill">North Star Goal</span>' : ''}
          <span class="m-stage-sub">${m.category === 'operations' ? 'Operations' : m.category === 'governance' ? 'Governance' : 'Product & Delivery'}</span>
        </div>
      `;

      // Col 2: Leading Indicator (Signal)
      const tdLead = document.createElement('td');
      tdLead.className = 'col-lead';
      tdLead.innerHTML = `
        <div class="m-metric-card is-lead">
          <div class="m-card-hdr">
            <span class="m-badge lead-badge">Leading Signal</span>
            <span class="m-cadence">${m.leadCadence || 'Weekly'}</span>
          </div>
          <div class="m-title">${m.leadTitle || m.stage + ' Signal'}</div>
          <div class="m-target lead-tgt"><span class="tgt-lbl">Target:</span> <strong>${m.leadTarget || 'Within weeks'}</strong></div>
          <p class="m-desc">${m.leadDesc || m.lead}</p>
          ${m.leadFormula ? `<div class="m-formula"><span class="formula-lbl">Calculation:</span> <code>${m.leadFormula}</code></div>` : ''}
        </div>
      `;

      // Col 3: Lagging Indicator (Outcome)
      const tdLag = document.createElement('td');
      tdLag.className = 'col-lag';
      tdLag.innerHTML = `
        <div class="m-metric-card is-lag">
          <div class="m-card-hdr">
            <span class="m-badge lag-badge">Lagging Outcome</span>
            <span class="m-cadence">${m.lagCadence || 'Quarterly'}</span>
          </div>
          <div class="m-title">${m.lagTitle || m.stage + ' Outcome'}</div>
          <div class="m-target lag-tgt"><span class="tgt-lbl">Target:</span> <strong>${m.lagTarget || 'Quarterly settling'}</strong></div>
          <p class="m-desc">${m.lagDesc || m.lag}</p>
          ${m.lagFormula ? `<div class="m-formula"><span class="formula-lbl">Calculation:</span> <code>${m.lagFormula}</code></div>` : ''}
        </div>
      `;

      // Col 4: Source
      const tdSource = document.createElement('td');
      tdSource.className = 'col-source';
      tdSource.innerHTML = `
        <div class="m-source-wrap">
          <svg class="m-source-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          <span class="m-source-val">${m.source}</span>
        </div>
      `;

      tr.appendChild(tdStage);
      tr.appendChild(tdLead);
      tr.appendChild(tdLag);
      tr.appendChild(tdSource);
      tableMount.appendChild(tr);
    });

    applyMetricFilter(currentMetricFilter);
  }

  // 4. Initialize Interactive Simulator
  initMeasureCalculator(b, sc);
}

function applyMetricFilter(filter) {
  const rows = document.querySelectorAll('#metrics tr.m-row');
  rows.forEach(r => {
    if (filter === 'all') {
      r.hidden = false;
    } else if (filter === 'goal') {
      r.hidden = r.dataset.isGoal !== 'true';
    } else if (filter === 'delivery') {
      r.hidden = r.dataset.category !== 'delivery' && r.dataset.isGoal !== 'true';
    } else if (filter === 'operations') {
      r.hidden = r.dataset.category !== 'operations' && r.dataset.category !== 'governance';
    }
  });
}

function initMeasureCalculator(b, sc) {
  const teamInput = document.getElementById('calc-team-size');
  const rateInput = document.getElementById('calc-hourly-rate');
  const hoursInput = document.getElementById('calc-task-hours');
  if (!teamInput || !rateInput || !hoursInput) return;

  teamInput.value = sc.teamSize || 5;
  rateInput.value = 75;
  hoursInput.value = sc.hrsPerPerson || 12;

  const update = () => {
    const team = Math.max(1, parseInt(teamInput.value, 10) || 1);
    const rate = Math.max(10, parseFloat(rateInput.value) || 75);
    const hrs = Math.max(1, parseFloat(hoursInput.value) || 10);

    const annualHrs = Math.round(team * hrs * 50);
    const annualDollars = Math.round(annualHrs * rate);

    const c = b.answers || {};
    const bgtVal = typeof budget === 'function' ? budget(c) : 2;
    const monthlyToolSpend = bgtVal === 1 ? 150 : bgtVal === 2 ? 800 : bgtVal === 3 ? 3500 : 12000;
    const annualToolSpend = monthlyToolSpend * 12;
    const paybackWeeks = Math.max(0.4, ((annualToolSpend / Math.max(1, annualDollars)) * 52)).toFixed(1);
    const roiMult = Math.max(1, Math.round(annualDollars / Math.max(1, annualToolSpend)));

    const elHrs = document.getElementById('calc-annual-hours');
    const elDollars = document.getElementById('calc-annual-dollars');
    const elPayback = document.getElementById('calc-payback-weeks');
    const elRoi = document.getElementById('calc-roi-tag');

    if (elHrs) elHrs.textContent = annualHrs.toLocaleString();
    if (elDollars) elDollars.textContent = '$' + annualDollars.toLocaleString();
    if (elPayback) elPayback.textContent = paybackWeeks + ' wks';
    if (elRoi) elRoi.textContent = `Projected ${roiMult}x Annual ROI`;
  };

  if (!teamInput.dataset.bound) {
    teamInput.dataset.bound = 'true';
    [teamInput, rateInput, hoursInput].forEach(inp => inp.addEventListener('input', update));
  }
  update();
}

let currentRiskFilter = 'all';

function renderRisks(b) {
  const mount = document.getElementById('risks');
  const scMount = document.getElementById('risk-scorecard');
  const tbMount = document.getElementById('risk-toolbar');
  if (!mount) return;

  // 1. Calculate Scorecard
  const sc = b.riskScorecard || (typeof computeRiskScorecard === 'function'
    ? computeRiskScorecard(b.risks, b.answers, b.tier)
    : { total: b.risks.length, crit: 0, high: 0, med: 0, level: 'Active Risks', levelClass: 'warn', levelDesc: '', topCatLabel: 'Governance', mitigationRate: '100% Guarded' });

  // 2. Render Scorecard
  if (scMount) {
    scMount.innerHTML = '';

    // Card 1: Risk Level
    const c1 = el('div', 'm-card');
    const t1 = el('div', 'm-card-top');
    const v1 = el('div', 'm-kpi-val', sc.level);
    v1.style.fontSize = '20px';
    const p1 = el('span', `m-status-pill ${sc.levelClass === 'crit' ? 'pill-crit' : (sc.levelClass === 'warn' ? 'pill-shield' : 'pill-auto')}`, sc.crit > 0 ? `${sc.crit} Critical` : 'Controlled');
    t1.appendChild(v1);
    t1.appendChild(p1);
    c1.appendChild(t1);
    c1.appendChild(el('div', 'm-stat-title', 'Systemic Risk Exposure'));
    c1.appendChild(el('div', 'm-stat-desc', sc.levelDesc || 'Evaluated against team size, autonomy tier, and sector regulations.'));
    scMount.appendChild(c1);

    // Card 2: Failure Modes
    const c2 = el('div', 'm-card');
    const t2 = el('div', 'm-card-top');
    const v2 = el('div', 'm-kpi-val', `${sc.total}`);
    const d2 = el('span', 'm-denom', 'failure modes');
    v2.appendChild(document.createTextNode(' '));
    v2.appendChild(d2);
    const p2 = el('span', 'm-status-pill pill-vel', `${sc.high} High Severity`);
    t2.appendChild(v2);
    t2.appendChild(p2);
    c2.appendChild(t2);
    c2.appendChild(el('div', 'm-stat-title', 'Identified Failure Modes'));
    c2.appendChild(el('div', 'm-stat-desc', `${sc.crit} Critical · ${sc.high} High · ${sc.med} Moderate across your workflows.`));
    scMount.appendChild(c2);

    // Card 3: Dominant Category
    const c3 = el('div', 'm-card');
    const t3 = el('div', 'm-card-top');
    const v3 = el('div', 'm-kpi-val', sc.topCatLabel);
    v3.style.fontSize = '20px';
    const p3 = el('span', 'm-status-pill pill-shield', 'Top Vulnerability');
    t3.appendChild(v3);
    t3.appendChild(p3);
    c3.appendChild(t3);
    c3.appendChild(el('div', 'm-stat-title', 'Primary Risk Domain'));
    c3.appendChild(el('div', 'm-stat-desc', 'Area requiring the highest density of verification and guardrails.'));
    scMount.appendChild(c3);

    // Card 4: Blueprint Mitigation
    const c4 = el('div', 'm-card');
    const t4 = el('div', 'm-card-top');
    const v4 = el('div', 'm-kpi-val', '100%');
    const d4 = el('span', 'm-denom', 'covered');
    v4.appendChild(document.createTextNode(' '));
    v4.appendChild(d4);
    const p4 = el('span', 'm-status-pill pill-auto', 'Shield Active');
    t4.appendChild(v4);
    t4.appendChild(p4);
    c4.appendChild(t4);
    c4.appendChild(el('div', 'm-stat-title', 'Blueprint Safeguards'));
    c4.appendChild(el('div', 'm-stat-desc', 'Every failure mode is mapped to a specific artifact, hook, or gate.'));
    scMount.appendChild(c4);
  }

  // 3. Bind filter toolbar
  if (tbMount) {
    const chips = tbMount.querySelectorAll('[data-risk-filter]');
    chips.forEach(chip => {
      const val = chip.getAttribute('data-risk-filter');
      if (val === currentRiskFilter) {
        chip.classList.add('is-active');
        chip.classList.add('active');
      } else {
        chip.classList.remove('is-active');
        chip.classList.remove('active');
      }
      chip.onclick = () => {
        chips.forEach(c => { c.classList.remove('active'); c.classList.remove('is-active'); });
        chip.classList.add('active');
        chip.classList.add('is-active');
        currentRiskFilter = chip.getAttribute('data-risk-filter');
        renderRiskCards();
      };
    });
  }

  // 4. Render cards function
  function renderRiskCards() {
    mount.innerHTML = '';
    const filtered = b.risks.filter(r => {
      if (currentRiskFilter === 'all') return true;
      if (currentRiskFilter === 'critical') return (r.severityVal || r.severity) === 'critical';
      return r.category === currentRiskFilter;
    });

    if (filtered.length === 0) {
      const empty = el('div', 'risk-empty');
      empty.appendChild(el('h4', 'risk-empty-title', 'No risks in this category'));
      empty.appendChild(el('p', 'risk-empty-desc', 'Your current company answers, stage, and autonomy tier have low exposure in this specific category.'));
      mount.appendChild(empty);
      return;
    }

    filtered.forEach(r => {
      const sev = r.severityVal || r.severity || 'high';
      const card = el('article', `risk-card risk-${sev}`);

      // Header row
      const head = el('div', 'risk-head');
      const headLeft = el('div', 'risk-head-left');

      // Severity badge
      const badge = el('span', `risk-badge risk-badge-${sev}`);
      if (sev === 'critical') {
        badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Critical Severity`;
      } else if (sev === 'high') {
        badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> High Severity`;
      } else {
        badge.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Moderate Severity`;
      }
      headLeft.appendChild(badge);

      if (r.categoryLabel) {
        headLeft.appendChild(el('span', 'risk-cat-pill', r.categoryLabel));
      }
      head.appendChild(headLeft);

      if (r.triggerText) {
        const trig = el('span', 'risk-trigger-pill', `🎯 ${r.triggerText}`);
        head.appendChild(trig);
      }
      card.appendChild(head);

      // Card Title
      card.appendChild(el('h3', 'risk-card-title', r.title));

      // Business Impact Box
      const impactBox = el('div', 'risk-impact-box');
      const impactHead = el('div', 'risk-impact-header');
      impactHead.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> Business Impact &amp; Consequence:`;
      impactBox.appendChild(impactHead);
      impactBox.appendChild(el('p', 'risk-impact-text', r.impact || r.body));
      card.appendChild(impactBox);

      // Two-column Grid: The Failure Trap vs Blueprint Guardrail
      const grid = el('div', 'risk-grid');

      // Col 1: Pitfall
      const colTrap = el('div', 'risk-col risk-col-trap');
      const trapTitle = el('div', 'risk-col-title');
      trapTitle.innerHTML = `<span class="risk-col-icon">⚠️</span> The Failure Trap ("What happens")`;
      colTrap.appendChild(trapTitle);
      colTrap.appendChild(el('p', 'risk-col-text', r.trap || r.body));
      grid.appendChild(colTrap);

      // Col 2: Guardrail
      const colGuard = el('div', 'risk-col risk-col-guard');
      const guardTitle = el('div', 'risk-col-title');
      guardTitle.innerHTML = `<span class="risk-col-icon">🛡️</span> Blueprint Guardrail ("How to prevent it")`;
      colGuard.appendChild(guardTitle);
      colGuard.appendChild(el('p', 'risk-col-text', r.guardrail || 'Establish deterministic gates and verify intent at release.'));
      grid.appendChild(colGuard);

      card.appendChild(grid);
      mount.appendChild(card);
    });
  }

  renderRiskCards();
}

/* -------------------------------------------------------------------- tabs */

const PANELS = {
  company: 'panel-graph', delivery: 'panel-graph', stack: 'panel-graph', improve: 'panel-graph',
  network: 'panel-network',
  rollout: 'panel-rollout', measure: 'panel-measure', risks: 'panel-risks', export: 'panel-export',
  activate: 'panel-activate'
};

/* Pan/zoom controls for the network canvas, handed back by renderNetwork. The view is
   drawn on first open rather than on every generate: it is the one view that is not
   on screen when the answers change, and redrawing it would reset a pan nobody asked
   to lose. */
let netControls = null;
let netDirty = true;

function renderNetworkView() {
  const mount = document.getElementById('network');
  const panel = document.getElementById('net-panel');
  if (!mount || !panel) return;
  netControls = renderNetwork(current, mount, panel, id => {
    const entry = current.index.get(id);
    if (!entry) return;
    showOnMap(id, 'network', 'Back to who does what');
  });
  netDirty = false;
}

/* Activation is a state of this sitting, not a stored fact: opening the panel is what
   activates the plan, exactly as the button does, so there is no way to arrive at the
   panel and find it claiming otherwise. Generating a new plan clears it, because a plan
   nobody has read again has not been activated. */
let activated = false;
let activateDirty = true;

function renderActivateView() {
  const panel = document.getElementById('panel-activate');
  renderActivation(current, {
    openPart: (id, opener) => openPeek(id, {
      list: peekListIn(panel),
      opener,
      source: { tab: 'activate', label: 'Back to your activated plan' }
    })
  });
  activateDirty = false;
}

function setActivated(on) {
  activated = on;
  const step = document.getElementById('track-activate');
  const arrow = document.getElementById('track-arrow');
  const label = step.querySelector('.track-t');
  step.classList.toggle('is-live', on);
  step.classList.toggle('is-done', on);
  arrow.classList.toggle('is-waiting', !on);
  step.querySelector('.track-n').innerHTML = on ? '&check;' : '2';
  label.textContent = on ? '2. Activated' : 'Activate this plan';
  const actBtn = document.getElementById('activate-btn');
  if (actBtn) actBtn.textContent = on ? 'Back to the activated plan' : 'Activate this plan';
}

function activate() {
  setActivated(true);
  switchTab('activate');
  document.getElementById('panel-activate').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function switchTab(tab) {
  const panelId = PANELS[tab];
  /* The way back only makes sense while the visitor is still on the diagrams. */
  if (!VIEW_META[tab]) dropReturn();
  closePeek(false);
  Object.values(PANELS).forEach(id => { document.getElementById(id).hidden = true; });
  document.getElementById(panelId).hidden = false;
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
  document.getElementById(panelId).setAttribute('aria-labelledby', 'tab-' + tab);
  if (VIEW_META[tab]) renderView(tab);
  else if (tab === 'network' && netDirty) renderNetworkView();
  else if (tab === 'activate') {
    if (activateDirty) renderActivateView();
    if (!activated) setActivated(true);
  }
  writeHash(current.answers);
}

/* ------------------------------------------------------------------ export */

function briefMarkdown(b) {
  const c = b.answers;
  const L = [];
  L.push('# AI-native flow blueprint');
  L.push('');
  L.push(`**Level ${b.tier} of 4 — ${b.tierInfo.name}.** ${b.tierInfo.thesis}`);
  L.push('');
  L.push(`How far AI can act alone: ${b.tierInfo.ceiling}`);
  L.push('');
  L.push('## Inputs');
  L.push(`- Type and size of business: ${orgLabel(c)}`);
  L.push(`- Industry: ${INDUSTRIES[c.industry].short}`);
  L.push(`- What we mainly sell or deliver: ${ANSWER_LABEL.domain[c.domain]}`);
  L.push(`- Product journey stage: ${JOURNEYS[c.journey].short}`);
  L.push(`- Main problem to solve: ${ANSWER_LABEL.goal[c.goal]}`);
  L.push(`- Technical people in house: ${ANSWER_LABEL.engineers[c.engineers]}`);
  L.push(`- Monthly budget for AI tools: ${ANSWER_LABEL.budget[c.budget]}`);
  L.push(`- Constraints: ${c.constraints.length ? c.constraints.map(k => ANSWER_LABEL.constraints[k]).join(', ') : 'none stated'}`);
  if (c.problem) L.push(`- In their words: ${c.problem}`);
  L.push('');
  L.push('## Reading');
  [b.focus.line, b.journeyNote, b.industryNote, b.stageNote, b.budgetNote].forEach(t => { L.push(t); L.push(''); });

  Object.entries(b.views).forEach(([id, view]) => {
    L.push(`## ${VIEW_META[id].label} view`);
    L.push('');
    L.push(VIEW_META[id].blurb);
    view.lanes.forEach(lane => {
      const list = view.nodes.filter(n => n.lane === lane.id);
      if (!list.length) return;
      L.push('');
      L.push(`### ${lane.label} — ${lane.caption}`);
      list.forEach(n => {
        L.push(`- **${n.title}** (${KIND_LABEL[n.kind]}) — ${n.purpose}`);
        if (n.options) L.push(`  - start with: ${n.options.best.name}. Alternatives: ${n.options.alternatives.map(a => a.name).join(', ') || 'none'}`);
        if (n.out) L.push(`  - writes: ${n.out.map(a => ARTIFACT_LABELS[a] || a).join(', ')}`);
      });
    });
    const spine = view.nodes.filter(n => n.lane === 'spine');
    if (spine.length) {
      L.push('');
      L.push('### Shared context, read by every lane');
      spine.forEach(n => L.push(`- **${n.title}** — ${n.purpose}`));
    }
    L.push('');
  });

  L.push('## Rollout');
  b.phases.forEach(p => {
    L.push('');
    L.push(`### Weeks ${p.start}–${p.end}: ${p.title}`);
    L.push(p.goal);
    L.push(`Parts: ${p.items.map(id => (b.index.get(id) || { node: { title: id } }).node.title).join(', ')}`);
    L.push(`Done when: ${p.proof}`);
  });
  L.push('');
  L.push('## Measurement');
  L.push('');
  L.push('| Stage | Leading | Lagging | Source |');
  L.push('| --- | --- | --- | --- |');
  b.metrics.forEach(m => L.push(`| ${m.goal ? m.stage + ' (your goal)' : m.stage} | ${m.lead} | ${m.lag} | ${m.source} |`));
  L.push('');
  L.push('## Failure patterns to watch');
  L.push('Identified failure modes, contextual triggers, business impact, and prescribed blueprint guardrails:');
  b.risks.forEach(r => {
    const sev = (r.severityVal || r.severity || 'High').toUpperCase();
    L.push('');
    L.push(`### [${sev}] ${r.title}`);
    if (r.triggerText) L.push(`- **Contextual Trigger:** ${r.triggerText}`);
    if (r.impact) L.push(`- **Business Impact:** ${r.impact}`);
    if (r.trap) L.push(`- **The Failure Trap:** ${r.trap}`);
    if (r.guardrail) L.push(`- **Blueprint Guardrail:** ${r.guardrail}`);
    if (!r.trap && r.body) L.push(`- **Details:** ${r.body}`);
  });
  L.push('');
  L.push('---');
  L.push('Generated by the AI-Native Flow Blueprint. Named products are common choices, not endorsements. Prompts are indicative and need rewriting against your own systems.');
  return L.join('\n');
}

function refinementPrompt(b) {
  return [
    'You are advising on an AI-native operating model. Below is a generated blueprint for a specific company.',
    'Pressure-test it against how this company actually works, then give me a revised version.',
    '',
    'Do these five things, in order:',
    '1. Name anything in the blueprint that will not survive contact with this company, and why.',
    '2. Name what is missing that their constraints demand.',
    '3. Challenge the tool choices against what they already pay for, and say what to consolidate.',
    '4. Rewrite the first two rollout phases week by week, with a named owner per item.',
    '5. Rewrite each indicative prompt in the vocabulary of their domain and systems.',
    '',
    b.answers.problem ? 'The problem in their own words: ' + b.answers.problem : 'No free-text problem statement was given.',
    '',
    '--- BLUEPRINT ---',
    briefMarkdown(b)
  ].join('\n');
}

/* ------------------------------------------------------------------- boot */

function render() {
  const answers = readForm();
  current = buildFullBlueprint(answers);
  renderChips(answers);
  renderStrip(current);
  renderPhases(current);
  renderMetrics(current);
  renderRisks(current);
  netDirty = true;
  netControls = null;
  activateDirty = true;
  closePeek(false);
  dropReturn();
  setActivated(false);
  const netPanel = document.getElementById('net-panel');
  if (netPanel) { netPanel.hidden = true; netPanel.innerHTML = ''; }
  switchTab(VIEW_META[currentView] || PANELS[currentView] ? currentView : 'company');
}

let blueprintShown = false;

function showBlueprint() {
  blueprintShown = true;
  const area = document.getElementById('blueprint-area');
  const main = document.getElementById('blueprint-main');
  const genBtn = document.getElementById('generate-btn');
  const doneBtn = document.getElementById('done-btn');
  if (area) area.hidden = false;
  if (main) main.hidden = false;
  if (genBtn) genBtn.hidden = true;
  if (doneBtn) doneBtn.hidden = false;
  render();
}

function hideBlueprint() {
  blueprintShown = false;
  const area = document.getElementById('blueprint-area');
  const main = document.getElementById('blueprint-main');
  const genBtn = document.getElementById('generate-btn');
  const doneBtn = document.getElementById('done-btn');
  if (area) area.hidden = true;
  if (main) main.hidden = true;
  if (genBtn) genBtn.hidden = false;
  if (doneBtn) doneBtn.hidden = true;
  const answers = readForm();
  renderChips(answers);
  intakeWrap.open = true;
}

form.addEventListener('submit', ev => {
  ev.preventDefault();
  selected = {};
  showBlueprint();
  intakeWrap.open = false;
});

form.addEventListener('change', () => {
  if (blueprintShown) {
    render();
  } else {
    renderChips(readForm());
  }
});

const problemInput = document.getElementById('problem');
if (problemInput) {
  problemInput.addEventListener('input', () => {
    if (blueprintShown) {
      const echo = document.getElementById('read-problem');
      const val = problemInput.value.trim();
      if (echo) {
        echo.hidden = !val;
        echo.textContent = val ? 'You wrote: ' + val : '';
      }
    }
  });
}

const doneBtn = document.getElementById('done-btn');
if (doneBtn) {
  doneBtn.addEventListener('click', () => {
    intakeWrap.open = false;
  });
}

document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => switchTab(t.dataset.tab));
});
document.querySelector('.tabs').addEventListener('keydown', ev => {
  const tabs = [...document.querySelectorAll('.tab')];
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  const next = ev.key === 'ArrowRight' ? i + 1 : ev.key === 'ArrowLeft' ? i - 1 : -1;
  if (next < 0 || next >= tabs.length) return;
  ev.preventDefault();
  tabs[next].focus();
  switchTab(tabs[next].dataset.tab);
});

/* Zoom as a number the visitor can see and step, rather than a two-state toggle
   between "fit" and "natural". Fit stays the default and stays one click away,
   because on a phone it is the only setting that shows the whole shape. */
const GRAPH_ZOOMS = [0.7, 0.85, 1, 1.25, 1.5, 2];

function setGraphZoom(zoom) {
  applyZoom(graphMount, zoom);
  const out = document.getElementById('graph-zoom-level');
  if (out) out.textContent = zoom ? Math.round(zoom * 100) + '%' : 'Fit';
  markGraphOverflow();
}

function stepGraphZoom(dir) {
  const box = document.getElementById('graph');
  const now = Number(box.dataset.zoom || 0) || 0;
  /* Fit is not on the ladder, so stepping away from it starts from whatever it
     currently resolves to on this screen. */
  const from = now || (box.getBoundingClientRect().width / Number(box.dataset.naturalWidth || 1));
  let next = null;
  if (dir > 0) next = GRAPH_ZOOMS.find(z => z > from + 0.01);
  else next = [...GRAPH_ZOOMS].reverse().find(z => z < from - 0.01);
  setGraphZoom(next || (dir > 0 ? GRAPH_ZOOMS[GRAPH_ZOOMS.length - 1] : GRAPH_ZOOMS[0]));
}

document.getElementById('graph-zoom-in').addEventListener('click', () => stepGraphZoom(1));
document.getElementById('graph-zoom-out').addEventListener('click', () => stepGraphZoom(-1));
document.getElementById('graph-zoom-level').addEventListener('click', () => setGraphZoom(0));

/* Full screen is a fixed overlay rather than the Fullscreen API: nothing to permit,
   and the page keeps its scroll position underneath. */
const graphPanel = document.getElementById('panel-graph');
function setFullscreen(on) {
  graphPanel.classList.toggle('is-fullscreen', on);
  document.body.style.overflow = on ? 'hidden' : '';
  const btn = document.getElementById('graph-fullscreen');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? 'Leave full screen' : 'Full screen';
  markGraphOverflow();
}
document.getElementById('graph-fullscreen').addEventListener('click', ev => {
  setFullscreen(!graphPanel.classList.contains('is-fullscreen'));
  ev.currentTarget.blur();
});
document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape' && graphPanel.classList.contains('is-fullscreen')) setFullscreen(false);
});

document.getElementById('net-zoom-in').addEventListener('click', () => netControls && netControls.zoomIn());
document.getElementById('net-zoom-out').addEventListener('click', () => netControls && netControls.zoomOut());
document.getElementById('net-zoom-level').addEventListener('click', () => netControls && netControls.reset());

document.getElementById('why-toggle').addEventListener('click', ev => {
  const why = document.getElementById('why');
  const glossary = document.getElementById('glossary');
  const glossaryToggle = document.getElementById('glossary-toggle');
  const willOpen = why.hidden;
  why.hidden = !willOpen;
  ev.currentTarget.setAttribute('aria-expanded', String(willOpen));
  ev.currentTarget.classList.toggle('is-active', willOpen);
  if (willOpen && glossary && !glossary.hidden) {
    glossary.hidden = true;
    if (glossaryToggle) {
      glossaryToggle.setAttribute('aria-expanded', 'false');
      glossaryToggle.classList.remove('is-active');
    }
  }
});

document.getElementById('glossary-toggle').addEventListener('click', ev => {
  const glossary = document.getElementById('glossary');
  const why = document.getElementById('why');
  const whyToggle = document.getElementById('why-toggle');
  const willOpen = glossary.hidden;
  glossary.hidden = !willOpen;
  ev.currentTarget.setAttribute('aria-expanded', String(willOpen));
  ev.currentTarget.classList.toggle('is-active', willOpen);
  if (willOpen && why && !why.hidden) {
    why.hidden = true;
    if (whyToggle) {
      whyToggle.setAttribute('aria-expanded', 'false');
      whyToggle.classList.remove('is-active');
    }
  }
});

const actBtn = document.getElementById('activate-btn');
if (actBtn) actBtn.addEventListener('click', activate);
document.getElementById('activate-btn-export').addEventListener('click', activate);
document.getElementById('track-activate').addEventListener('click', activate);
document.getElementById('track-edit').addEventListener('click', () => {
  intakeWrap.open = true;
  intakeWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.getElementById('activate-map').addEventListener('click', () => switchTab('network'));
document.getElementById('activate-print').addEventListener('click', () => window.print());
document.getElementById('activate-copy').addEventListener('click', ev =>
  copyText(activationText(current), ev.currentTarget, 'Checklist copied'));

document.getElementById('copy-brief').addEventListener('click', ev => copyText(briefMarkdown(current), ev.currentTarget, 'Brief copied'));
document.getElementById('copy-prompt').addEventListener('click', ev => copyText(refinementPrompt(current), ev.currentTarget, 'Prompt copied'));
document.getElementById('share').addEventListener('click', ev => copyText(location.href, ev.currentTarget, 'Link copied'));
document.getElementById('print').addEventListener('click', () => window.print());

applyHash();
if (location.hash.length > 1) {
  showBlueprint();
  intakeWrap.open = false;
} else {
  hideBlueprint();
}

