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
  ai: 'AI agent', human: 'Human role', gate: 'Gate or policy',
  system: 'System or signal', artifact: 'Artifact or tool slot'
};
const ANSWER_LABEL = {
  stage: { solo: 'Solo', startup: 'Early startup', growth: 'Growth stage', smb: 'SMB', enterprise: 'Enterprise' },
  engineers: { none: 'No in-house devs', solo: '1–3 devs', small: '4–15 devs', large: '15+ devs' },
  budget: { under200: '<$200/mo', to2k: '$200–2k/mo', to10k: '$2–10k/mo', over10k: '$10k+/mo' },
  domain: { saas: 'SaaS', mobile: 'Mobile', ecommerce: 'E-commerce', 'data-ai': 'Data or AI', 'internal-ops': 'Internal ops', services: 'Services' },
  goal: { 'ship-faster': 'Ship faster', 'fewer-defects': 'Fewer defects', 'less-rework': 'Less rework', 'support-load': 'Support load', 'ops-cost': 'Ops cost', 'scale-without-hiring': 'Capacity' },
  constraints: { regulated: 'Regulated', 'legacy-systems': 'Legacy systems', 'no-ci': 'No CI', 'client-code': 'Client code' }
};

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function readForm() {
  const fd = new FormData(form);
  return {
    stage: fd.get('stage'), engineers: fd.get('engineers'), budget: fd.get('budget'),
    domain: fd.get('domain'), goal: fd.get('goal'),
    constraints: fd.getAll('constraints'),
    problem: (fd.get('problem') || '').trim()
  };
}

function writeHash(c) {
  const p = new URLSearchParams({
    stage: c.stage, eng: c.engineers, budget: c.budget, domain: c.domain, goal: c.goal, v: currentView
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
  set('stage', 'stage'); set('engineers', 'eng'); set('budget', 'budget');
  set('domain', 'domain'); set('goal', 'goal');
  const cs = (p.get('c') || '').split(',').filter(Boolean);
  form.querySelectorAll('input[name="constraints"]').forEach(i => { i.checked = cs.includes(i.value); });
  const v = p.get('v');
  if (v && (VIEW_META[v] || ['rollout', 'measure', 'risks', 'export'].includes(v))) currentView = v;
}

/* ------------------------------------------------------------------ header */

function renderChips(c) {
  const mount = document.getElementById('answer-chips');
  mount.innerHTML = '';
  const parts = [
    ANSWER_LABEL.stage[c.stage], ANSWER_LABEL.engineers[c.engineers], ANSWER_LABEL.budget[c.budget],
    ANSWER_LABEL.domain[c.domain], ANSWER_LABEL.goal[c.goal],
    ...c.constraints.map(k => ANSWER_LABEL.constraints[k])
  ];
  parts.forEach(p => mount.appendChild(el('span', 'answer-chip', p)));
}

function renderStrip(b) {
  document.getElementById('tier-n').textContent = `Tier ${b.tier} of 4`;
  document.getElementById('tier-name').textContent = b.tierInfo.name;
  document.getElementById('stat-ai').textContent = b.counts.ai;
  document.getElementById('stat-human').textContent = b.counts.human;
  document.getElementById('stat-gate').textContent = b.counts.gate;
  document.getElementById('stat-tool').textContent = b.counts.tool;
  document.getElementById('stat-weeks').innerHTML = `${b.horizon}<span class="unit">wk</span>`;
  document.getElementById('read-ceiling').textContent = b.tierInfo.thesis + ' Autonomy ceiling: ' + b.tierInfo.ceiling;
  document.getElementById('read-goal').textContent = b.focus.line;
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
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    finish(ok);
  }
}

function renderDetail(id) {
  const view = current.views[currentView];
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
      btn.addEventListener('click', () => { switchTab('stack'); select('tool-' + id); });
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
}

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
      btn.title = VIEW_META[entry.view].label + ' view';
      btn.addEventListener('click', () => { switchTab(entry.view); select(id); });
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

function renderMetrics(b) {
  const mount = document.getElementById('metrics');
  mount.innerHTML = '';
  b.metrics.forEach(m => {
    const tr = document.createElement('tr');
    [m.stage, m.lead, m.lag, m.source].forEach((v, i) => {
      const cell = document.createElement(i === 0 ? 'th' : 'td');
      if (i === 0) cell.scope = 'row';
      if (i === 3) cell.className = 'source';
      cell.textContent = v;
      tr.appendChild(cell);
    });
    mount.appendChild(tr);
  });
}

function renderRisks(b) {
  const mount = document.getElementById('risks');
  mount.innerHTML = '';
  b.risks.forEach(r => {
    const card = el('article', 'risk');
    card.appendChild(el('h3', 'risk-title', r.title));
    card.appendChild(el('p', 'risk-body', r.body));
    mount.appendChild(card);
  });
}

/* -------------------------------------------------------------------- tabs */

const PANELS = {
  company: 'panel-graph', delivery: 'panel-graph', stack: 'panel-graph', improve: 'panel-graph',
  rollout: 'panel-rollout', measure: 'panel-measure', risks: 'panel-risks', export: 'panel-export'
};

function switchTab(tab) {
  const panelId = PANELS[tab];
  Object.values(PANELS).forEach(id => { document.getElementById(id).hidden = true; });
  document.getElementById(panelId).hidden = false;
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.tab === tab)));
  document.getElementById(panelId).setAttribute('aria-labelledby', 'tab-' + tab);
  if (VIEW_META[tab]) renderView(tab);
  else currentView = currentView;
  writeHash(current.answers);
}

/* ------------------------------------------------------------------ export */

function briefMarkdown(b) {
  const c = b.answers;
  const L = [];
  L.push('# AI-native flow blueprint');
  L.push('');
  L.push(`**Tier ${b.tier} of 4 — ${b.tierInfo.name}.** ${b.tierInfo.thesis}`);
  L.push('');
  L.push(`Autonomy ceiling: ${b.tierInfo.ceiling}`);
  L.push('');
  L.push('## Inputs');
  L.push(`- Stage: ${ANSWER_LABEL.stage[c.stage]}`);
  L.push(`- Code-facing people: ${ANSWER_LABEL.engineers[c.engineers]}`);
  L.push(`- Monthly AI budget: ${ANSWER_LABEL.budget[c.budget]}`);
  L.push(`- What we build: ${ANSWER_LABEL.domain[c.domain]}`);
  L.push(`- Problem to solve: ${ANSWER_LABEL.goal[c.goal]}`);
  L.push(`- Constraints: ${c.constraints.length ? c.constraints.map(k => ANSWER_LABEL.constraints[k]).join(', ') : 'none stated'}`);
  if (c.problem) L.push(`- In their words: ${c.problem}`);
  L.push('');
  L.push('## Reading');
  [b.focus.line, b.stageNote, b.budgetNote].forEach(t => { L.push(t); L.push(''); });

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
  b.metrics.forEach(m => L.push(`| ${m.stage} | ${m.lead} | ${m.lag} | ${m.source} |`));
  L.push('');
  L.push('## Failure patterns to watch');
  b.risks.forEach(r => { L.push(''); L.push(`**${r.title}.** ${r.body}`); });
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
  switchTab(VIEW_META[currentView] || PANELS[currentView] ? currentView : 'company');
}

form.addEventListener('submit', ev => {
  ev.preventDefault();
  selected = {};
  render();
  intakeWrap.open = false;
});

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

document.getElementById('why-toggle').addEventListener('click', ev => {
  const why = document.getElementById('why');
  const open = why.hidden;
  why.hidden = !open;
  ev.currentTarget.setAttribute('aria-expanded', String(open));
});

document.getElementById('copy-brief').addEventListener('click', ev => copyText(briefMarkdown(current), ev.currentTarget, 'Brief copied'));
document.getElementById('copy-prompt').addEventListener('click', ev => copyText(refinementPrompt(current), ev.currentTarget, 'Prompt copied'));
document.getElementById('share').addEventListener('click', ev => copyText(location.href, ev.currentTarget, 'Link copied'));
document.getElementById('print').addEventListener('click', () => window.print());

applyHash();
render();
