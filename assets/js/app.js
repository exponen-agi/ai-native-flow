/* Wiring: form to blueprint to page. No state outside the URL hash. */

const form = document.getElementById('answers');
const graphMount = document.getElementById('graph');
const detailMount = document.getElementById('detail');
let current = null;
let selectedId = null;

const KIND_LABEL = { ai: 'AI agent', human: 'Human role', gate: 'Control gate', system: 'Deterministic check', artifact: 'Shared artifact' };
const LANE_LABEL = Object.fromEntries(LANES.map(l => [l.id, l.label]));

function readForm() {
  const fd = new FormData(form);
  return {
    stage: fd.get('stage'),
    engineers: fd.get('engineers'),
    budget: fd.get('budget'),
    domain: fd.get('domain'),
    goal: fd.get('goal'),
    constraints: fd.getAll('constraints'),
    problem: (fd.get('problem') || '').trim()
  };
}

function writeHash(c) {
  const p = new URLSearchParams({
    stage: c.stage, eng: c.engineers, budget: c.budget, domain: c.domain, goal: c.goal
  });
  if (c.constraints.length) p.set('c', c.constraints.join(','));
  history.replaceState(null, '', '#' + p.toString());
}

function applyHash() {
  if (!location.hash.length) return;
  const p = new URLSearchParams(location.hash.slice(1));
  const set = (id, key) => {
    const v = p.get(key);
    const el = document.getElementById(id);
    if (v && el && [...el.options].some(o => o.value === v)) el.value = v;
  };
  set('stage', 'stage'); set('engineers', 'eng'); set('budget', 'budget');
  set('domain', 'domain'); set('goal', 'goal');
  const cs = (p.get('c') || '').split(',').filter(Boolean);
  form.querySelectorAll('input[name="constraints"]').forEach(i => { i.checked = cs.includes(i.value); });
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function artifactChips(list) {
  const box = el('div', 'chips-row');
  list.forEach(a => box.appendChild(el('code', 'artifact', ARTIFACT_LABELS[a] || a)));
  return box;
}

function renderSummary(b) {
  document.getElementById('tier-eyebrow').textContent = `Tier ${b.tier} of 4 · ${b.nodes.length} moving parts`;
  document.getElementById('sum-h').textContent = b.tierInfo.name;
  document.getElementById('tier-thesis').textContent = b.tierInfo.thesis;
  document.getElementById('tier-ceiling').textContent = b.tierInfo.ceiling;
  document.getElementById('stat-ai').textContent = b.counts.ai;
  document.getElementById('stat-human').textContent = b.counts.human;
  document.getElementById('stat-gate').textContent = b.counts.gate;
  document.getElementById('stat-weeks').innerHTML = `${b.horizon}<span class="unit">weeks</span>`;
  document.getElementById('read-goal').textContent = b.focus.line;
  document.getElementById('read-stage').textContent = b.stageNote;
  document.getElementById('read-budget').textContent = b.budgetNote;
  const echo = document.getElementById('read-problem');
  if (b.answers.problem) {
    echo.hidden = false;
    echo.textContent = 'You wrote: ' + b.answers.problem;
  } else { echo.hidden = true; }
}

function renderSpine(b) {
  const mount = document.getElementById('spine');
  mount.innerHTML = '';
  b.nodes.filter(n => n.lane === 'spine').forEach(n => {
    const btn = el('button', `spine-chip kind-${n.kind}`);
    btn.type = 'button';
    btn.dataset.id = n.id;
    btn.appendChild(el('span', 'spine-name', n.title));
    btn.appendChild(el('span', 'spine-sub', n.subtitle));
    btn.addEventListener('click', () => select(n.id));
    mount.appendChild(btn);
  });
}

function renderDetail(id) {
  const n = current.nodes.find(x => x.id === id);
  detailMount.innerHTML = '';
  if (!n) return;
  const head = el('header', 'detail-head');
  head.appendChild(el('span', `detail-kind kind-${n.kind}`, KIND_LABEL[n.kind]));
  head.appendChild(el('span', 'detail-lane', n.lane === 'spine' ? 'Read by every stage' : LANE_LABEL[n.lane]));
  detailMount.appendChild(head);
  detailMount.appendChild(el('h3', 'detail-title', n.title));
  detailMount.appendChild(el('p', 'detail-purpose', n.purpose));
  if (n.why) {
    const why = el('p', 'detail-why');
    why.appendChild(el('span', 'detail-why-label', 'Why it earns a place'));
    why.appendChild(document.createTextNode(n.why));
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
    p.appendChild(el('p', 'prompt-note', 'Indicative only. Rewrite it against your repository and your vocabulary before you rely on it.'));
    detailMount.appendChild(p);
  }
  if (n.in || n.out) {
    const flow = el('div', 'detail-flow');
    if (n.in) { const d = el('div'); d.appendChild(el('p', 'block-label', 'Reads')); d.appendChild(artifactChips(n.in)); flow.appendChild(d); }
    if (n.out) { const d = el('div'); d.appendChild(el('p', 'block-label', 'Writes')); d.appendChild(artifactChips(n.out)); flow.appendChild(d); }
    detailMount.appendChild(flow);
  }
}

function select(id) {
  selectedId = id;
  highlight(graphMount, id, current);
  document.querySelectorAll('.spine-chip').forEach(c => c.classList.toggle('is-selected', c.dataset.id === id));
  renderDetail(id);
}

function renderPhases(b) {
  const mount = document.getElementById('phases');
  mount.innerHTML = '';
  const titles = new Map(b.nodes.map(n => [n.id, n.title]));
  b.phases.forEach(p => {
    const li = el('li', 'phase');
    const head = el('div', 'phase-head');
    head.appendChild(el('p', 'phase-weeks', p.start === p.end ? `Week ${p.start}` : `Weeks ${p.start}–${p.end}`));
    head.appendChild(el('h3', 'phase-title', p.title));
    li.appendChild(head);
    li.appendChild(el('p', 'phase-goal', p.goal));
    const parts = el('div', 'phase-parts');
    p.items.forEach(id => {
      const btn = el('button', 'part-chip');
      btn.type = 'button';
      btn.textContent = titles.get(id) || id;
      btn.addEventListener('click', () => {
        select(id);
        document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
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

function briefMarkdown(b) {
  const c = b.answers;
  const label = id => (b.nodes.find(n => n.id === id) || {}).title || id;
  const lines = [];
  lines.push(`# AI-native flow blueprint`);
  lines.push('');
  lines.push(`**Tier ${b.tier} of 4 — ${b.tierInfo.name}.** ${b.tierInfo.thesis}`);
  lines.push('');
  lines.push(`Autonomy ceiling: ${b.tierInfo.ceiling}`);
  lines.push('');
  lines.push(`## Inputs`);
  lines.push(`- Stage: ${c.stage}`);
  lines.push(`- Code-facing people: ${c.engineers}`);
  lines.push(`- Monthly AI budget: ${c.budget}`);
  lines.push(`- What we build: ${c.domain}`);
  lines.push(`- Problem to solve: ${c.goal}`);
  lines.push(`- Constraints: ${c.constraints.length ? c.constraints.join(', ') : 'none stated'}`);
  if (c.problem) lines.push(`- In their words: ${c.problem}`);
  lines.push('');
  lines.push(`## Reading`);
  [b.focus.line, b.stageNote, b.budgetNote].forEach(t => { lines.push(t); lines.push(''); });
  lines.push(`## The flow`);
  LANES.forEach(lane => {
    const list = b.nodes.filter(n => n.lane === lane.id);
    if (!list.length) return;
    lines.push('');
    lines.push(`### ${lane.label} — ${lane.caption}`);
    list.forEach(n => {
      lines.push(`- **${n.title}** (${KIND_LABEL[n.kind]}) — ${n.purpose}`);
      if (n.out) lines.push(`  - writes: ${n.out.map(a => ARTIFACT_LABELS[a] || a).join(', ')}`);
    });
  });
  const spine = b.nodes.filter(n => n.lane === 'spine');
  if (spine.length) {
    lines.push('');
    lines.push(`### Read by every stage`);
    spine.forEach(n => lines.push(`- **${n.title}** — ${n.purpose}`));
  }
  lines.push('');
  lines.push(`## Rollout`);
  b.phases.forEach(p => {
    lines.push('');
    lines.push(`### Weeks ${p.start}–${p.end}: ${p.title}`);
    lines.push(p.goal);
    lines.push(`Parts: ${p.items.map(label).join(', ')}`);
    lines.push(`Done when: ${p.proof}`);
  });
  lines.push('');
  lines.push(`## Measurement`);
  lines.push('');
  lines.push(`| Stage | Leading | Lagging | Source |`);
  lines.push(`| --- | --- | --- | --- |`);
  b.metrics.forEach(m => lines.push(`| ${m.stage} | ${m.lead} | ${m.lag} | ${m.source} |`));
  lines.push('');
  lines.push(`## Failure patterns to watch`);
  b.risks.forEach(r => { lines.push(''); lines.push(`**${r.title}.** ${r.body}`); });
  lines.push('');
  lines.push(`---`);
  lines.push(`Generated by the AI-Native Flow Blueprint. Prompts in the interactive version are indicative and need rewriting against your own repository.`);
  return lines.join('\n');
}

function refinementPrompt(b) {
  const c = b.answers;
  return [
    'You are advising on an AI-native delivery flow. Below is a generated blueprint for a specific company.',
    'Pressure-test it against how this company actually works, then give me a revised version.',
    '',
    'Do these four things, in order:',
    '1. Name anything in the blueprint that will not survive contact with this company, and why.',
    '2. Name what is missing that their constraints demand.',
    '3. Rewrite the first two phases as a week-by-week plan with a named owner per item.',
    '4. Rewrite each indicative prompt in the vocabulary of their codebase and domain.',
    '',
    c.problem ? 'The problem in their own words: ' + c.problem : 'No free-text problem statement was given.',
    '',
    '--- BLUEPRINT ---',
    briefMarkdown(b)
  ].join('\n');
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
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    finish(ok);
  }
}

function render() {
  const answers = readForm();
  current = buildBlueprint(answers);
  writeHash(answers);
  renderSummary(current);
  renderGraph(current, graphMount, select);
  renderSpine(current);
  renderPhases(current);
  renderMetrics(current);
  renderRisks(current);
  const focus = current.nodes.some(n => n.id === current.focus.node)
    ? current.focus.node
    : current.nodes[0].id;
  select(focus);
}

form.addEventListener('submit', ev => {
  ev.preventDefault();
  render();
  document.querySelector('.summary').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('copy-brief').addEventListener('click', ev => copyText(briefMarkdown(current), ev.currentTarget, 'Brief copied'));
document.getElementById('copy-prompt').addEventListener('click', ev => copyText(refinementPrompt(current), ev.currentTarget, 'Prompt copied'));
document.getElementById('share').addEventListener('click', ev => copyText(location.href, ev.currentTarget, 'Link copied'));
document.getElementById('print').addEventListener('click', () => window.print());

applyHash();
render();
