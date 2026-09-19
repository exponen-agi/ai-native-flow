/* Hand-rolled layered SVG graph. Lanes are columns, work flows left to right,
   and the operate lane loops back to intake because that is the whole point. */

const GEO = { w: 202, h: 70, vgap: 20, lane: 250, head: 56, pad: 26, foot: 84 };

/* The diagram is drawn at a fixed natural size and then scaled to whatever width
   the page can give it. Below this fraction the node labels stop being readable,
   so the graph holds that size and its box scrolls sideways instead of shrinking
   further. Above 1 it would only bloat the type, so it never scales up. */
const MIN_SCALE = 0.66;

function wrap(text, max) {
  const words = String(text).split(' ');
  const lines = [];
  let cur = '';
  for (const word of words) {
    const next = cur ? cur + ' ' + word : word;
    if (next.length > max && cur) { lines.push(cur); cur = word; } else { cur = next; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}

function svgEl(name, attrs = {}) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

function layout(view) {
  const lanes = view.lanes;
  const laneNodes = lanes.map(l => view.nodes.filter(n => n.lane === l.id));
  const rows = Math.max(...laneNodes.map(n => n.length), 1);
  const pos = new Map();
  laneNodes.forEach((list, li) => {
    list.forEach((n, i) => {
      pos.set(n.id, {
        x: GEO.pad + li * GEO.lane,
        y: GEO.head + i * (GEO.h + GEO.vgap),
        lane: li, row: i, node: n
      });
    });
  });
  return {
    pos, laneNodes, rows, lanes,
    width: GEO.pad * 2 + (lanes.length - 1) * GEO.lane + GEO.w,
    height: GEO.head + rows * (GEO.h + GEO.vgap) + GEO.foot
  };
}

function edgePath(a, b) {
  const ax = a.x + GEO.w, ay = a.y + GEO.h / 2;
  const bx = b.x, by = b.y + GEO.h / 2;
  if (b.lane === a.lane) {
    /* same column: run down the left margin and back in */
    const cx = a.x - 13;
    return `M ${a.x} ${ay} C ${cx - 16} ${ay} ${cx - 16} ${by} ${b.x} ${by}`;
  }
  const dx = Math.max(28, (bx - ax) / 2);
  return `M ${ax} ${ay} C ${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}`;
}

function renderGraph(view, mount, onSelect) {
  const L = layout(view);
  mount.innerHTML = '';
  const svg = svgEl('svg', {
    viewBox: `0 0 ${L.width} ${L.height}`,
    width: L.width, height: L.height,
    role: 'group',
    'aria-label': 'Flow diagram, lanes: ' + L.lanes.map(l => l.label).join(', ')
  });

  const defs = svgEl('defs');
  ['edge', 'loop'].forEach(kind => {
    const m = svgEl('marker', {
      id: 'arrow-' + kind, viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse'
    });
    m.appendChild(svgEl('path', { d: 'M 0 1 L 9 5 L 0 9 z', class: 'arrow ' + kind }));
    defs.appendChild(m);
  });
  svg.appendChild(defs);

  /* lane headers and dividers */
  const laneLayer = svgEl('g', { class: 'lanes' });
  L.lanes.forEach((lane, i) => {
    const x = GEO.pad + i * GEO.lane;
    if (i > 0) {
      laneLayer.appendChild(svgEl('line', {
        x1: x - (GEO.lane - GEO.w) / 2, y1: 8, x2: x - (GEO.lane - GEO.w) / 2, y2: L.height - GEO.foot + 16,
        class: 'lane-rule'
      }));
    }
    const idx = svgEl('text', { x, y: 20, class: 'lane-index' });
    idx.textContent = String(i + 1).padStart(2, '0');
    const t = svgEl('text', { x: x + 22, y: 20, class: 'lane-title' });
    t.textContent = lane.label;
    const c = svgEl('text', { x, y: 38, class: 'lane-caption' });
    c.textContent = lane.caption;
    laneLayer.append(idx, t, c);
  });
  svg.appendChild(laneLayer);

  /* edges under nodes */
  const edgeLayer = svgEl('g', { class: 'edges' });
  view.edges.forEach(e => {
    const a = L.pos.get(e.from), b = L.pos.get(e.to);
    if (!a || !b) return;
    edgeLayer.appendChild(svgEl('path', {
      d: edgePath(a, b), class: 'edge', 'data-from': e.from, 'data-to': e.to,
      'marker-end': 'url(#arrow-edge)'
    }));
  });
  svg.appendChild(edgeLayer);

  /* the closing loop: the last lane's final node back to the first lane */
  const fromLane = L.laneNodes[L.lanes.findIndex(l => l.id === view.loopFrom)] || [];
  const toLane = L.laneNodes[L.lanes.findIndex(l => l.id === view.loopTo)] || [];
  if (fromLane.length && toLane.length) {
    const from = L.pos.get(fromLane[fromLane.length - 1].id);
    const to = L.pos.get(toLane[0].id);
    const baseY = L.height - GEO.foot + 44;
    const sx = from.x + GEO.w / 2, sy = from.y + GEO.h;
    const tx = to.x + GEO.w / 2, ty = to.y + GEO.h;
    const d = `M ${sx} ${sy} C ${sx} ${baseY} ${sx} ${baseY} ${sx - 40} ${baseY}
               L ${tx + 40} ${baseY} C ${tx} ${baseY} ${tx} ${baseY} ${tx} ${ty}`;
    svg.appendChild(svgEl('path', { d, class: 'edge loop', 'marker-end': 'url(#arrow-loop)' }));
    const label = svgEl('text', { x: (sx + tx) / 2, y: baseY - 10, class: 'loop-label' });
    label.textContent = view.loopLabel;
    svg.appendChild(label);
  }

  /* nodes */
  const nodeLayer = svgEl('g', { class: 'nodes' });
  view.nodes.forEach(n => {
    const p = L.pos.get(n.id);
    if (!p) return;
    const g = svgEl('g', {
      class: `node kind-${n.kind}`, transform: `translate(${p.x} ${p.y})`,
      tabindex: 0, role: 'button', 'data-id': n.id,
      'aria-label': `${n.title}. ${n.kind === 'ai' ? 'Done by AI' : n.kind === 'human' ? 'Done by a person' : n.kind === 'gate' ? 'Approval or policy' : 'A system or signal'}. ${n.subtitle}`
    });
    g.appendChild(svgEl('rect', { class: 'node-box', width: GEO.w, height: GEO.h, rx: 6 }));
    g.appendChild(svgEl('rect', { class: 'node-stripe', width: 4, height: GEO.h, rx: 1.5 }));
    const lines = wrap(n.title, 24);
    lines.forEach((line, i) => {
      const t = svgEl('text', { x: 16, y: lines.length === 1 ? 30 : 24 + i * 16, class: 'node-title' });
      t.textContent = line;
      g.appendChild(t);
    });
    const sub = svgEl('text', { x: 16, y: GEO.h - 14, class: 'node-sub' });
    sub.textContent = n.subtitle.length > 31 ? n.subtitle.slice(0, 30) + '…' : n.subtitle;
    g.appendChild(sub);
    const badge = svgEl('text', { x: GEO.w - 12, y: 18, class: 'node-kind', 'text-anchor': 'end' });
    badge.textContent = { ai: 'AI', human: 'YOU', gate: 'GATE', system: 'SYS', artifact: 'FILE' }[n.kind];
    g.appendChild(badge);

    const pick = () => onSelect(n.id);
    g.addEventListener('click', pick);
    g.addEventListener('keydown', ev => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); pick(); }
    });
    /* Hover traces without committing to it, so the chain can be followed by moving
       the mouse rather than by clicking through every box and reading each panel. */
    g.addEventListener('mouseenter', () => trace(mount, n.id, view));
    g.addEventListener('mouseleave', () => trace(mount, selectedId(mount), view));
    nodeLayer.appendChild(g);
  });
  svg.appendChild(nodeLayer);
  mount.appendChild(svg);
  /* Natural width is stashed on the box so the zoom control can size against it
     without re-running the layout. */
  mount.dataset.naturalWidth = L.width;
  applyZoom(mount, Number(mount.dataset.zoom || 0) || 0);
  return L;
}

/* The id the graph is currently selected on, read back off the DOM so hover can
   restore it on mouseleave without the caller threading state through. */
function selectedId(mount) {
  const sel = mount.querySelector('.node.is-selected');
  return sel ? sel.dataset.id : null;
}

/* Traces one part's immediate chain: what feeds it, what it feeds, and the edges
   between. Everything else fades rather than disappearing, because a box you can
   still see is a box you can still aim at.

   Immediate neighbours only, not the whole transitive chain: at four lanes deep
   every box ends up connected to every other one, and a picture where nothing is
   dimmed says nothing. */
function trace(mount, id, view) {
  const linked = new Set();
  const near = new Set(id ? [id] : []);
  if (id) {
    view.edges.forEach(e => {
      if (e.from === id) { linked.add(e.from + '>' + e.to); near.add(e.to); }
      else if (e.to === id) { linked.add(e.from + '>' + e.to); near.add(e.from); }
    });
  }

  mount.querySelectorAll('.node').forEach(g => {
    const on = near.has(g.dataset.id);
    g.classList.toggle('is-near', on);
    g.classList.toggle('is-dimmed', Boolean(id) && !on);
  });
  mount.querySelectorAll('.edge').forEach(p => {
    if (p.classList.contains('loop')) return;
    const on = linked.has(p.dataset.from + '>' + p.dataset.to);
    p.classList.toggle('is-linked', on);
    p.classList.toggle('is-dimmed', Boolean(id) && !on);
  });
  /* The closing loop belongs to the lanes at either end of it, not to one box. */
  const loop = mount.querySelector('.edge.loop');
  if (loop) {
    const node = id ? view.nodes.find(n => n.id === id) : null;
    const onLoop = Boolean(node) && (node.lane === view.loopFrom || node.lane === view.loopTo);
    loop.classList.toggle('is-linked', onLoop);
    loop.classList.toggle('is-dimmed', Boolean(id) && !onLoop);
  }
}

function highlight(mount, id, view) {
  mount.querySelectorAll('.node').forEach(g => {
    g.classList.toggle('is-selected', g.dataset.id === id);
  });
  trace(mount, id, view);
}

/* Zoom as an explicit number rather than a fit/natural toggle.
   0 means fit: scale to the column but never below the legibility floor, which is
   what makes the box scroll instead of shrinking the labels into decoration. */
function applyZoom(mount, zoom) {
  const natural = Number(mount.dataset.naturalWidth || 0);
  const svg = mount.querySelector('svg');
  if (!svg || !natural) return;
  mount.dataset.zoom = zoom;
  svg.style.height = 'auto';
  if (!zoom) {
    svg.style.width = '100%';
    svg.style.maxWidth = natural + 'px';
    svg.style.minWidth = Math.round(natural * MIN_SCALE) + 'px';
  } else {
    const w = Math.round(natural * zoom);
    svg.style.width = w + 'px';
    svg.style.maxWidth = 'none';
    svg.style.minWidth = w + 'px';
  }
}
