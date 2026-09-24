/* Reading a part without leaving the page you are reading it from.

   The activated plan is a list of things to do, and every item on it is a box in one
   of the diagrams. Sending the visitor to that diagram for every item turned reading
   the list into a round trip per line: jump, read, find the way back, find your place.
   So a part opens in a sheet over the plan instead, with the same reading the diagram
   gives it, plus the one thing the diagram adds: where it sits in the flow and what
   is either side of it. The full map is still one click away for anyone who wants the
   whole picture, and when they go, a pill brings them back to the exact spot.

   The sheet is a side drawer on a wide screen and a bottom sheet on a phone. It keeps
   no state of its own beyond this sitting. */

const peekEl = document.getElementById('peek');
const peekBody = document.getElementById('peek-body');
const peekBackdrop = document.getElementById('peek-backdrop');
const peekState = { list: [], id: null, trail: [], opener: null, source: null };

/* Buttons that open a part carry data-peek-id. The sheet steps through them in page
   order, once each, so "next" means the next line of the plan rather than the next
   box of some diagram the visitor is not looking at. */
function peekListIn(root) {
  const ids = [];
  root.querySelectorAll('[data-peek-id]').forEach(b => {
    if (!ids.includes(b.dataset.peekId)) ids.push(b.dataset.peekId);
  });
  return ids;
}

function openPeek(id, opts = {}) {
  if (!current.index.has(id)) return;
  peekState.list = opts.list || [id];
  peekState.trail = [];
  peekState.source = opts.source || null;
  if (!peekEl.hidden) { renderPeek(id); return; }
  peekState.opener = opts.opener
    || document.querySelector(`[data-peek-id="${CSS.escape(id)}"]`)
    || document.activeElement;
  peekEl.hidden = false;
  peekBackdrop.hidden = false;
  document.body.classList.add('peek-open');
  /* One frame hidden-then-shown so the slide-in transition has a start state. */
  requestAnimationFrame(() => {
    peekEl.classList.add('is-open');
    peekBackdrop.classList.add('is-open');
  });
  renderPeek(id);
  peekEl.focus({ preventScroll: true });
}

function closePeek(restoreFocus = true) {
  if (peekEl.hidden) return;
  peekEl.classList.remove('is-open');
  peekBackdrop.classList.remove('is-open');
  document.body.classList.remove('peek-open');
  markPeeking(null);
  const done = () => { peekEl.hidden = true; peekBackdrop.hidden = true; };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else setTimeout(done, 220);
  const opener = peekState.opener;
  peekState.id = null;
  if (restoreFocus && opener && document.contains(opener)) opener.focus({ preventScroll: true });
}

function markPeeking(id) {
  document.querySelectorAll('[data-peek-id]').forEach(b => {
    const row = b.closest('.roster-item, .check-item, .hub-row') || b;
    row.classList.toggle('is-peeking', b.dataset.peekId === id);
  });
}

/* A neighbour opened from inside the sheet is a detour, not a step along the list:
   the back arrow retraces it, and the list position is kept for when they return. */
function peekDetour(id) {
  if (peekState.id) peekState.trail.push(peekState.id);
  renderPeek(id);
}

function peekStep(dir) {
  const list = peekState.list;
  if (list.length < 2) return;
  const at = list.indexOf(peekState.id);
  /* Off the list after a detour: step from where the detour started. */
  const from = at >= 0 ? at : list.indexOf(peekState.trail[0]);
  const next = list[(Math.max(from, 0) + dir + list.length) % list.length];
  peekState.trail = [];
  renderPeek(next);
}

function peekChip(nodeId, view) {
  const n = view.nodes.find(x => x.id === nodeId);
  if (!n) return null;
  const b = el('button', `peek-chip kind-${n.kind}`, n.title);
  b.type = 'button';
  b.title = KIND_LABEL[n.kind];
  b.addEventListener('click', () => peekDetour(nodeId));
  return b;
}

/* What the diagram shows about a box that a list cannot: which stage of the flow it
   belongs to, and what comes in and goes out of it. Immediate neighbours only, for
   the same reason the diagram only traces those. */
function peekContext(view, n) {
  const box = el('section', 'peek-where');
  box.setAttribute('aria-label', 'Where it sits in the flow');
  box.appendChild(el('p', 'block-label', 'Where it sits in the flow'));

  if (n.lane === 'spine') {
    box.appendChild(el('p', 'peek-spine', 'Shared context: every stage below reads from it.'));
  }
  const rail = el('ol', 'peek-rail');
  view.lanes.forEach(l => {
    const li = el('li', l.id === n.lane ? 'is-here' : null, l.label);
    if (l.id === n.lane) li.setAttribute('aria-current', 'step');
    rail.appendChild(li);
  });
  box.appendChild(rail);

  const from = view.edges.filter(e => e.to === n.id).map(e => peekChip(e.from, view)).filter(Boolean);
  const to = view.edges.filter(e => e.from === n.id).map(e => peekChip(e.to, view)).filter(Boolean);
  if (from.length || to.length) {
    const flow = el('div', 'peek-flow');
    const col = (label, chips, empty) => {
      const d = el('div', 'peek-flow-col');
      d.appendChild(el('span', 'peek-flow-label', label));
      const row = el('div', 'peek-chips');
      if (chips.length) chips.forEach(c => row.appendChild(c));
      else row.appendChild(el('span', 'peek-none', empty));
      d.appendChild(row);
      return d;
    };
    flow.appendChild(col('Comes after', from, 'Starts the flow'));
    flow.appendChild(el('span', 'peek-flow-arrow', '→'));
    flow.appendChild(col('Hands on to', to, 'Ends the flow'));
    box.appendChild(flow);
  }
  return box;
}

function renderPeek(id) {
  const entry = current.index.get(id);
  if (!entry) return;
  peekState.id = id;
  const view = current.views[entry.view];
  const meta = VIEW_META[entry.view];

  document.getElementById('peek-crumb').textContent = `${meta.label} flow`;
  const back = document.getElementById('peek-back');
  back.hidden = !peekState.trail.length;

  const at = peekState.list.indexOf(id);
  const steps = document.getElementById('peek-steps');
  steps.hidden = peekState.list.length < 2;
  document.getElementById('peek-count').textContent = at >= 0
    ? `${at + 1} of ${peekState.list.length}` : 'Detour';

  renderNodeDetail(peekBody, view, id, {
    afterPurpose: (mount, n) => mount.appendChild(peekContext(view, n)),
    onTool: toolId => { if (current.index.has(toolId)) peekDetour(toolId); }
  });
  const title = peekBody.querySelector('.detail-title');
  if (title) title.id = 'peek-title';

  document.getElementById('peek-map').textContent = `See it on the ${meta.label} map`;
  peekBody.scrollTop = 0;
  markPeeking(id);
}

/* ------------------------------------------------------------ the way back */

/* Anyone who does go to the full map gets a pill that returns them to where they were:
   the same tab, the same scroll position, and for the plan the same part reopened.
   It stays while they look around the diagrams, and goes once they leave them. */
const returnPill = document.getElementById('return-pill');
let returnTo = null;

function offerReturn(tab, label, after) {
  returnTo = { tab, y: window.scrollY, after };
  returnPill.querySelector('.return-label').textContent = label;
  returnPill.hidden = false;
  requestAnimationFrame(() => returnPill.classList.add('is-open'));
}

function dropReturn() {
  returnTo = null;
  returnPill.classList.remove('is-open');
  returnPill.hidden = true;
}

function goBack() {
  const r = returnTo;
  if (!r) return;
  dropReturn();
  switchTab(r.tab);
  window.scrollTo({ top: r.y, behavior: 'instant' });
  if (r.after) r.after();
}

/* Open a part on its full map, from whichever flat panel the visitor was reading. */
function showOnMap(id, fromTab, label, after) {
  const entry = current.index.get(id);
  if (!entry) return;
  switchTab(entry.view);
  select(id);
  offerReturn(fromTab, label, after);
  document.getElementById('panel-graph').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* -------------------------------------------------------------------- wiring */

returnPill.querySelector('button').addEventListener('click', goBack);
document.getElementById('peek-close').addEventListener('click', () => closePeek());
peekBackdrop.addEventListener('click', () => closePeek());
document.getElementById('peek-back').addEventListener('click', () => {
  const prev = peekState.trail.pop();
  if (prev) renderPeek(prev);
});
document.getElementById('peek-prev').addEventListener('click', () => peekStep(-1));
document.getElementById('peek-next').addEventListener('click', () => peekStep(1));
document.getElementById('peek-map').addEventListener('click', () => {
  const id = peekState.id;
  const list = peekState.list;
  const source = peekState.source;
  closePeek(false);
  if (!source) return;
  showOnMap(id, source.tab, source.label, () => openPeek(id, { list, source, opener: null }));
});

peekEl.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') { ev.preventDefault(); closePeek(); return; }
  const typing = ev.target.closest('input, textarea, select');
  if (!typing && (ev.key === 'ArrowDown' || ev.key === 'ArrowRight')) {
    ev.preventDefault(); peekStep(1); return;
  }
  if (!typing && (ev.key === 'ArrowUp' || ev.key === 'ArrowLeft')) {
    ev.preventDefault(); peekStep(-1); return;
  }
  /* Keep Tab inside the sheet while it is open. */
  if (ev.key === 'Tab') {
    const focusables = [...peekEl.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])')]
      .filter(x => !x.hidden && x.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (ev.shiftKey && (document.activeElement === first || document.activeElement === peekEl)) {
      ev.preventDefault(); last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault(); first.focus();
    }
  }
});
