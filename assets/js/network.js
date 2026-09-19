/* The network view: the blueprint as a working team rather than a diagram.

   Every other view answers "what should happen". This one answers "who does it and
   what do they send each other" — the question people actually ask once they have
   read the plan. Agents run the repeated work along the top, the people who still
   decide sit below, and everything either sends passes through one shared memory in
   the middle. The label on each wire names what travels it.

   Bound to the generated blueprint, not decorative: every pod resolves to a real part
   of this blueprint, so opening one lands on that part in the view that owns it.

   Pan and zoom are hand-rolled on purpose. A zoom library is the only dependency this
   page would have, and it would cost more than the forty lines below. */

const NET = {
  w: 1000, h: 500,
  hub: { x: 500, y: 250, r: 48 },
  agentR: 28,
  humanR: 30,
  agentPos: [
    { x: 130, y: 78 }, { x: 315, y: 62 }, { x: 500, y: 54 },
    { x: 685, y: 62 }, { x: 870, y: 78 }
  ],
  humanPos: [{ x: 180, y: 398 }, { x: 500, y: 408 }, { x: 820, y: 398 }],
  minK: 0.75,
  maxK: 2.5
};

/* Stroke icons on a 24 grid, one array of path data each. Drawn rather than imported
   so the page keeps working with no network and nothing to load. */
const NET_ICONS = {
  listens: ['M4 15v-3a8 8 0 0 1 16 0v3', 'M4 15h3v6H5a1 1 0 0 1-1-1z', 'M20 15h-3v6h2a1 1 0 0 0 1-1z'],
  plans: ['M9 3h6v3H9z', 'M15 4.5h2a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1h2', 'M9 11h6', 'M9 15h4'],
  builds: ['M8 6 3 12l5 6', 'M16 6l5 6-5 6'],
  checks: ['M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
  watches: ['M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z'],
  decides: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M15.5 8.5l-2 5-5 2 2-5z'],
  team: ['M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M22 20v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  approves: ['M5 11h14v10H5z', 'M8 11V7a4 4 0 0 1 8 0v4'],
  memory: ['M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z', 'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6', 'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6']
};

/* Each slot names a job in plain words and lists the blueprint parts that can fill it,
   best first. A slot with no match at these answers is simply left out. */
const AGENT_SLOTS = [
  { ids: ['intent-capture', 'support-signal', 'originator'], label: 'Listens',
    caption: 'turns a problem into a written brief', carries: 'the brief', icon: 'listens' },
  { ids: ['spec-agent', 'plan-agent', 'triage-agent'], label: 'Plans',
    caption: 'writes the plan before anything is built', carries: 'the plan', icon: 'plans' },
  { ids: ['implementer', 'ops-agent', 'parallel-fleet'], label: 'Builds',
    caption: 'does the work the plan describes', carries: 'the work', icon: 'builds' },
  { ids: ['verifier-subagent', 'feedback-loop', 'visual-check'], label: 'Checks',
    caption: 'proves it works before you look', carries: 'proof it works', icon: 'checks' },
  { ids: ['review-security', 'review-bugs', 'diagnosis-agent', 'learning-agent'], label: 'Watches',
    caption: 'catches problems and reports back', carries: 'what went wrong', icon: 'watches' }
];

const HUMAN_SLOTS = [
  { ids: ['product-owner', 'originator', 'gate-dri'], label: 'You',
    caption: 'decide what is worth doing', carries: 'what matters', icon: 'decides' },
  { ids: ['orchestrator', 'delivery-partner', 'knowledge-curator'], label: 'Team',
    caption: 'steers the agents, checks the result', carries: 'steering', icon: 'team' },
  { ids: ['policy-owner', 'code-owner', 'prod-gate', 'service-owner', 'release-auth'], label: 'Final say',
    caption: 'nothing ships without a person', carries: 'approval', icon: 'approves' }
];

const HUB_IDS = ['store-canon', 'store-index', 'artifact-home', 'claude-md', 'brain-context'];

/* Cuts on a word boundary, because a label that ends mid-word ("Spec and design
   age…") costs more in confusion than the two characters it saved. */
function shorten(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return (space > max * 0.5 ? cut.slice(0, space) : cut).replace(/[\s:,;.-]+$/, '') + '…';
}

function netSvg(name, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function netEl(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

/* First slot id that this blueprint actually contains, so the picture is always the
   visitor's own plan and never a stock illustration. */
function resolveSlots(slots, index, limit) {
  const out = [];
  const used = new Set();
  for (const slot of slots) {
    const id = slot.ids.find(i => index.has(i) && !used.has(i));
    if (!id) continue;
    used.add(id);
    out.push({ ...slot, nodeId: id, node: index.get(id).node });
    if (out.length >= limit) break;
  }
  return out;
}

/* A cubic as four points, so the same definition draws the wire and places the label
   that names what travels it. Hardcoding the label position instead is what makes a
   diagram drift out of true the first time the layout changes. */
function curve(p0, p1, p2, p3) {
  return {
    d: `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`,
    at(t) {
      const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, e = t * t * t;
      return {
        x: a * p0.x + b * p1.x + c * p2.x + e * p3.x,
        y: a * p0.y + b * p1.y + c * p2.y + e * p3.y
      };
    }
  };
}

function iconGroup(name, x, y, size, cls) {
  const g = netSvg('g', {
    class: 'net-icon ' + (cls || ''),
    transform: `translate(${x - size / 2} ${y - size / 2}) scale(${size / 24})`
  });
  (NET_ICONS[name] || []).forEach(d => g.appendChild(netSvg('path', { d })));
  return g;
}

/* A rounded label sitting on a wire, naming what that wire carries. */
function wireLabel(point, text, cls) {
  const g = netSvg('g', { class: 'net-flow ' + cls });
  const width = Math.max(58, text.length * 6.2 + 18);
  g.appendChild(netSvg('rect', {
    x: point.x - width / 2, y: point.y - 9, width, height: 18, rx: 9, class: 'net-flow-box'
  }));
  const t = netSvg('text', { x: point.x, y: point.y + 3.5, class: 'net-flow-text' });
  t.textContent = text;
  g.appendChild(t);
  return g;
}

/* Pan with a drag, zoom with the buttons or ctrl/cmd + wheel. A plain wheel is left
   alone deliberately: this canvas sits partway down a long page, and a diagram that
   swallows the scroll wheel is a diagram you cannot scroll past. */
function attachPanZoom(svg, inner, onChange) {
  let k = 1, x = 0, y = 0;
  let dragging = false, lastX = 0, lastY = 0, moved = false;

  const apply = () => {
    inner.setAttribute('transform', `translate(${x} ${y}) scale(${k})`);
    if (onChange) onChange(k);
  };

  const zoomTo = (next, cx, cy) => {
    const clamped = Math.min(NET.maxK, Math.max(NET.minK, next));
    if (clamped === k) return;
    /* Keep whatever is under the cursor under the cursor. */
    x = cx - (cx - x) * (clamped / k);
    y = cy - (cy - y) * (clamped / k);
    k = clamped;
    apply();
  };

  const toLocal = ev => {
    const r = svg.getBoundingClientRect();
    return {
      cx: (ev.clientX - r.left) / r.width * NET.w,
      cy: (ev.clientY - r.top) / r.height * NET.h
    };
  };

  svg.addEventListener('wheel', ev => {
    if (!ev.ctrlKey && !ev.metaKey) return;
    ev.preventDefault();
    const { cx, cy } = toLocal(ev);
    zoomTo(k * (ev.deltaY < 0 ? 1.12 : 0.89), cx, cy);
  }, { passive: false });

  svg.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    dragging = true; moved = false;
    lastX = ev.clientX; lastY = ev.clientY;
  });

  svg.addEventListener('pointermove', ev => {
    if (!dragging) return;
    const r = svg.getBoundingClientRect();
    const dx = (ev.clientX - lastX) / r.width * NET.w;
    const dy = (ev.clientY - lastY) / r.height * NET.h;
    if (!moved && Math.hypot(ev.clientX - lastX, ev.clientY - lastY) > 3) {
      /* Capture only once this is a real drag. Capturing on pointerdown would make
         the SVG the target of the click that follows, so every tap on a pod would be
         swallowed by the canvas and nothing would ever open. */
      moved = true;
      svg.setPointerCapture(ev.pointerId);
      svg.classList.add('is-panning');
    }
    lastX = ev.clientX; lastY = ev.clientY;
    x += dx; y += dy;
    apply();
  });

  const endDrag = ev => {
    if (!dragging) return;
    dragging = false;
    svg.classList.remove('is-panning');
    if (moved) {
      try { svg.releasePointerCapture(ev.pointerId); } catch (e) { /* already gone */ }
    }
  };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  /* On a phone the whole picture squeezed into 340px is a picture of nothing, so it
     opens zoomed to a legible size and centred on the shared memory. Panning, which
     this canvas already does, is how you reach the rest. */
  const box = svg.getBoundingClientRect();
  const start = { k: 1, x: 0, y: 0 };
  if (box.width && box.width < 640) {
    start.k = Math.min(NET.maxK, 640 / box.width);
    start.x = NET.w / 2 - NET.hub.x * start.k;
    start.y = NET.h / 2 - NET.hub.y * start.k;
  }
  k = start.k; x = start.x; y = start.y;
  apply();

  return {
    zoomIn: () => zoomTo(k * 1.25, NET.w / 2, NET.h / 2),
    zoomOut: () => zoomTo(k * 0.8, NET.w / 2, NET.h / 2),
    reset: () => { k = start.k; x = start.x; y = start.y; apply(); },
    /* A click that ended a pan is not a click on a pod. */
    wasDrag: () => moved
  };
}

/* Renders the whole view: canvas plus the panel under it. Returns the pan/zoom
   controls so the toolbar buttons can drive them. */
function renderNetwork(blueprint, mount, panel, onOpenPart) {
  const index = blueprint.index;
  const agents = resolveSlots(AGENT_SLOTS, index, 5);
  const humans = resolveSlots(HUMAN_SLOTS, index, 3);
  const hubId = HUB_IDS.find(id => index.has(id)) || null;
  const hubNode = hubId ? index.get(hubId).node : null;

  /* With fewer than five agents the row centres rather than leaving a gap on the right. */
  const step = NET.agentPos[1].x - NET.agentPos[0].x;
  const shift = (NET.agentPos.length - agents.length) * step * 0.5;
  const agentPts = NET.agentPos.slice(0, agents.length).map(p => ({ x: p.x + shift, y: p.y }));
  const humanPts = NET.humanPos.slice(0, humans.length);

  mount.innerHTML = '';
  const svg = netSvg('svg', {
    class: 'net-svg',
    viewBox: `0 0 ${NET.w} ${NET.h}`,
    role: 'group',
    'aria-label': 'Your agents, your people and the shared memory between them'
  });

  const defs = netSvg('defs');
  const glow = netSvg('radialGradient', { id: 'net-hub-glow' });
  glow.appendChild(netSvg('stop', { offset: '0%', 'stop-color': 'currentColor', 'stop-opacity': '0.22' }));
  glow.appendChild(netSvg('stop', { offset: '100%', 'stop-color': 'currentColor', 'stop-opacity': '0' }));
  defs.appendChild(glow);
  svg.appendChild(defs);

  const inner = netSvg('g', { class: 'net-stage' });
  svg.appendChild(inner);

  const wireLayer = netSvg('g', { class: 'net-wires' });
  const flowLayer = netSvg('g', { class: 'net-flows' });
  const nodeLayer = netSvg('g', { class: 'net-nodes' });
  inner.append(wireLayer, flowLayer, nodeLayer);

  const wiresById = new Map();
  const addWire = (id, c, cls, delay) => {
    const g = netSvg('g', { class: 'net-wire ' + cls, 'data-wire': id });
    g.appendChild(netSvg('path', { class: 'net-wire-line', d: c.d }));
    const pulse = netSvg('path', { class: 'net-pulse', d: c.d });
    pulse.style.animationDelay = delay + 's';
    g.appendChild(pulse);
    wireLayer.appendChild(g);
    if (!wiresById.has(id)) wiresById.set(id, []);
    wiresById.get(id).push(g);
    return c;
  };

  /* Agents feed the shared memory. */
  agents.forEach((a, i) => {
    const p = agentPts[i];
    const c = curve(
      { x: p.x, y: p.y + NET.agentR },
      { x: p.x, y: p.y + 80 },
      { x: NET.hub.x, y: NET.hub.y - 110 },
      { x: NET.hub.x, y: NET.hub.y - NET.hub.r }
    );
    addWire(a.nodeId, c, 'kind-agent', i * 0.35);
    flowLayer.appendChild(wireLabel(c.at(0.42), a.carries, 'kind-agent'));
  });

  /* The shared memory feeds the people. */
  humans.forEach((h, i) => {
    const p = humanPts[i];
    const side = Math.sign(NET.hub.x - p.x);
    const c = curve(
      { x: NET.hub.x, y: NET.hub.y + NET.hub.r * 0.7 },
      { x: NET.hub.x - side * 120, y: NET.hub.y + 60 },
      { x: p.x, y: p.y - 60 },
      { x: p.x, y: p.y - NET.humanR }
    );
    addWire(h.nodeId, c, 'kind-human', 0.5 + i * 0.4);
    flowLayer.appendChild(wireLabel(c.at(0.58), h.carries, 'kind-human'));
  });

  /* Two cross links, so people and agents visibly talk to each other and not only
     through the middle. */
  if (agents.length && humans.length) {
    const a = agentPts[0], p = humanPts[0];
    addWire(agents[0].nodeId, curve(
      { x: a.x - 14, y: a.y + NET.agentR },
      { x: a.x - 90, y: a.y + 110 },
      { x: p.x - 70, y: p.y - 110 },
      { x: p.x - 14, y: p.y - NET.humanR }
    ), 'kind-agent is-cross', 1.1);
  }
  if (agents.length > 1 && humans.length > 1) {
    const a = agentPts[agentPts.length - 1], p = humanPts[humanPts.length - 1];
    addWire(agents[agents.length - 1].nodeId, curve(
      { x: a.x + 14, y: a.y + NET.agentR },
      { x: a.x + 90, y: a.y + 110 },
      { x: p.x + 70, y: p.y - 110 },
      { x: p.x + 14, y: p.y - NET.humanR }
    ), 'kind-agent is-cross', 1.6);
  }

  let selectedId = null;

  const setFocus = id => {
    nodeLayer.querySelectorAll('.net-node').forEach(g => {
      g.classList.toggle('is-selected', g.dataset.id === id);
    });
    wiresById.forEach((list, wireId) => {
      list.forEach(g => g.classList.toggle('is-linked', !!id && wireId === id));
    });
    svg.classList.toggle('has-focus', !!id);
  };

  /* The panel under the canvas. It answers the two questions a pod raises: what does
     this one actually do, and what does it read and write. */
  const showPanel = item => {
    panel.innerHTML = '';
    panel.hidden = false;

    const head = netEl('div', 'net-panel-head');
    const badge = netEl('span', 'net-panel-kind kind-' + item.kind,
      item.kind === 'agent' ? 'Run by AI'
        : item.kind === 'human' ? 'Run by a person'
          : 'Everything written down');
    head.appendChild(badge);

    const close = netEl('button', 'mini-btn', 'Close');
    close.type = 'button';
    close.addEventListener('click', () => {
      panel.hidden = true;
      selectedId = null;
      setFocus(null);
    });
    head.appendChild(close);
    panel.appendChild(head);

    panel.appendChild(netEl('h3', 'net-panel-title', item.node ? item.node.title : item.label));
    panel.appendChild(netEl('p', 'net-panel-sub', item.caption));
    if (item.node && item.node.purpose) {
      panel.appendChild(netEl('p', 'net-panel-purpose', item.node.purpose));
    }

    const grid = netEl('div', 'net-panel-grid');

    const workBlock = netEl('div', 'detail-block');
    workBlock.appendChild(netEl('p', 'block-label', 'How this works with the rest'));
    workBlock.appendChild(netEl('p', 'block-body',
      item.kind === 'agent'
        ? 'Runs the repeated work on its own, and writes what it did to the shared memory. A person still sees the result before it reaches a customer.'
        : item.kind === 'human'
          ? 'Sets the direction, reads what the agents produced, and decides the cases nobody wrote a rule for.'
          : 'Every agent reads from here before it starts and writes back when it finishes, so the next session begins where the last one stopped.'));
    grid.appendChild(workBlock);

    const node = item.node;
    if (node && (node.in || node.out)) {
      const flow = netEl('div', 'detail-block');
      flow.appendChild(netEl('p', 'block-label', 'What it reads and writes'));
      const row = netEl('div', 'chips-row');
      (node.in || []).forEach(a => {
        row.appendChild(netEl('code', 'artifact', 'reads ' + (ARTIFACT_LABELS[a] || a)));
      });
      (node.out || []).forEach(a => {
        row.appendChild(netEl('code', 'artifact', 'writes ' + (ARTIFACT_LABELS[a] || a)));
      });
      flow.appendChild(row);
      grid.appendChild(flow);
    }

    if (node && node.tools && node.tools.length && blueprint.views.stack.picks) {
      const tools = netEl('div', 'detail-block');
      tools.appendChild(netEl('p', 'block-label', 'Runs on'));
      const row = netEl('div', 'chips-row');
      node.tools.forEach(id => {
        const pick = blueprint.views.stack.picks.find(p => p.category.id === id);
        if (!pick) return;
        row.appendChild(netEl('code', 'artifact', pick.category.label + ': ' + pick.best.name));
      });
      if (row.childElementCount) { tools.appendChild(row); grid.appendChild(tools); }
    }

    panel.appendChild(grid);

    if (node && onOpenPart) {
      const open = netEl('button', 'btn', 'Open this in the full plan');
      open.type = 'button';
      open.addEventListener('click', () => onOpenPart(item.nodeId));
      panel.appendChild(open);
    }
  };

  const addPod = (item, p, radius, kindClass) => {
    const g = netSvg('g', {
      class: `net-node ${kindClass}`,
      'data-id': item.nodeId,
      tabindex: 0,
      role: 'button',
      'aria-label': `${item.label}: ${item.caption}. ${item.node ? item.node.title + '.' : ''}`
    });

    g.appendChild(netSvg('circle', { class: 'net-ring', cx: p.x, cy: p.y, r: radius }));
    g.appendChild(netSvg('circle', { class: 'net-disc', cx: p.x, cy: p.y, r: radius }));
    g.appendChild(iconGroup(item.icon, p.x, p.y - 7, 19));

    const label = netSvg('text', { x: p.x, y: p.y + 14, class: 'net-label' });
    label.textContent = item.label;
    g.appendChild(label);

    if (item.node) {
      const role = netSvg('g', { class: 'net-role' });
      const title = shorten(item.node.title, 21);
      const width = Math.max(90, title.length * 6.4 + 18);
      role.appendChild(netSvg('rect', {
        class: 'net-role-box', x: p.x - width / 2, y: p.y + radius + 7, width, height: 20, rx: 10
      }));
      const rt = netSvg('text', { x: p.x, y: p.y + radius + 21, class: 'net-role-text' });
      rt.textContent = title;
      role.appendChild(rt);
      g.appendChild(role);
    }

    const pick = () => {
      selectedId = item.nodeId;
      setFocus(item.nodeId);
      showPanel(item);
    };
    g.addEventListener('click', () => { if (!controls.wasDrag()) pick(); });
    g.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
    });
    nodeLayer.appendChild(g);
  };

  /* Shared memory, drawn before the pods so its glow sits underneath them. */
  const hubItem = {
    nodeId: hubId || 'shared-memory',
    label: 'Shared memory',
    caption: 'everything your business has written down',
    kind: 'hub',
    icon: 'memory',
    node: hubNode
  };
  const hubG = netSvg('g', {
    class: 'net-node kind-hub',
    'data-id': hubItem.nodeId,
    tabindex: 0,
    role: 'button',
    'aria-label': 'Shared memory: everything your business has written down'
  });
  hubG.appendChild(netSvg('circle', {
    class: 'net-glow', cx: NET.hub.x, cy: NET.hub.y, r: NET.hub.r * 2.2, fill: 'url(#net-hub-glow)'
  }));
  hubG.appendChild(netSvg('circle', { class: 'net-ring', cx: NET.hub.x, cy: NET.hub.y, r: NET.hub.r }));
  hubG.appendChild(netSvg('circle', { class: 'net-disc', cx: NET.hub.x, cy: NET.hub.y, r: NET.hub.r }));
  hubG.appendChild(iconGroup('memory', NET.hub.x, NET.hub.y - 17, 20));
  ['Shared', 'memory'].forEach((line, i) => {
    const t = netSvg('text', { x: NET.hub.x, y: NET.hub.y + 4 + i * 14, class: 'net-label' });
    t.textContent = line;
    hubG.appendChild(t);
  });
  const hubPick = () => {
    selectedId = hubItem.nodeId;
    setFocus(hubItem.nodeId);
    showPanel(hubItem);
  };
  hubG.addEventListener('click', () => { if (!controls.wasDrag()) hubPick(); });
  hubG.addEventListener('keydown', ev => {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); hubPick(); }
  });
  nodeLayer.appendChild(hubG);

  agents.forEach((a, i) => addPod({ ...a, kind: 'agent' }, agentPts[i], NET.agentR, 'kind-agent'));
  humans.forEach((h, i) => addPod({ ...h, kind: 'human' }, humanPts[i], NET.humanR, 'kind-human'));

  mount.appendChild(svg);
  panel.hidden = true;

  const controls = attachPanZoom(svg, inner, k => {
    const out = document.getElementById('net-zoom-level');
    if (out) out.textContent = Math.round(k * 100) + '%';
  });
  return controls;
}
