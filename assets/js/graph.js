/* Hand-rolled layered SVG graph. Lanes are columns, work flows left to right,
   and the operate lane loops back to intake because that is the whole point. */

const GEO = { w: 198, h: 64, vgap: 22, lane: 246, head: 56, pad: 26, foot: 84 };

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

function layout(blueprint) {
  const laneNodes = LANES.map(l => blueprint.nodes.filter(n => n.lane === l.id));
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
    pos, laneNodes, rows,
    width: GEO.pad * 2 + (LANES.length - 1) * GEO.lane + GEO.w,
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

function renderGraph(blueprint, mount, onSelect) {
  const L = layout(blueprint);
  mount.innerHTML = '';
  const svg = svgEl('svg', {
    viewBox: `0 0 ${L.width} ${L.height}`,
    width: L.width, height: L.height,
    role: 'group', 'aria-label': 'Your AI-native delivery flow, six lanes from intake to operate'
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
  LANES.forEach((lane, i) => {
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
  blueprint.edges.forEach(e => {
    const a = L.pos.get(e.from), b = L.pos.get(e.to);
    if (!a || !b) return;
    edgeLayer.appendChild(svgEl('path', {
      d: edgePath(a, b), class: 'edge', 'data-from': e.from, 'data-to': e.to,
      'marker-end': 'url(#arrow-edge)'
    }));
  });
  svg.appendChild(edgeLayer);

  /* the closing loop: last operate node back to the first intake node */
  const operate = L.laneNodes[5], intake = L.laneNodes[0];
  if (operate.length && intake.length) {
    const from = L.pos.get(operate[operate.length - 1].id);
    const to = L.pos.get(intake[0].id);
    const baseY = L.height - GEO.foot + 44;
    const sx = from.x + GEO.w / 2, sy = from.y + GEO.h;
    const tx = to.x + GEO.w / 2, ty = to.y + GEO.h;
    const d = `M ${sx} ${sy} C ${sx} ${baseY} ${sx} ${baseY} ${sx - 40} ${baseY}
               L ${tx + 40} ${baseY} C ${tx} ${baseY} ${tx} ${baseY} ${tx} ${ty}`;
    svg.appendChild(svgEl('path', { d, class: 'edge loop', 'marker-end': 'url(#arrow-loop)' }));
    const label = svgEl('text', { x: (sx + tx) / 2, y: baseY - 10, class: 'loop-label' });
    label.textContent = 'every finding re-enters as the next intent.md';
    svg.appendChild(label);
  }

  /* nodes */
  const nodeLayer = svgEl('g', { class: 'nodes' });
  blueprint.nodes.forEach(n => {
    const p = L.pos.get(n.id);
    if (!p) return;
    const g = svgEl('g', {
      class: `node kind-${n.kind}`, transform: `translate(${p.x} ${p.y})`,
      tabindex: 0, role: 'button', 'data-id': n.id,
      'aria-label': `${n.title}. ${n.kind === 'ai' ? 'AI agent' : n.kind === 'human' ? 'Human role' : n.kind === 'gate' ? 'Control gate' : 'System'}. ${n.subtitle}`
    });
    g.appendChild(svgEl('rect', { class: 'node-box', width: GEO.w, height: GEO.h, rx: 3 }));
    g.appendChild(svgEl('rect', { class: 'node-stripe', width: 4, height: GEO.h, rx: 1.5 }));
    const lines = wrap(n.title, 24);
    lines.forEach((line, i) => {
      const t = svgEl('text', { x: 16, y: lines.length === 1 ? 28 : 23 + i * 15, class: 'node-title' });
      t.textContent = line;
      g.appendChild(t);
    });
    const sub = svgEl('text', { x: 16, y: GEO.h - 15, class: 'node-sub' });
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
    nodeLayer.appendChild(g);
  });
  svg.appendChild(nodeLayer);
  mount.appendChild(svg);
  return L;
}

function highlight(mount, id, blueprint) {
  mount.querySelectorAll('.node').forEach(g => {
    g.classList.toggle('is-selected', g.dataset.id === id);
  });
  const linked = new Set();
  blueprint.edges.forEach(e => {
    if (e.from === id || e.to === id) { linked.add(e.from + '>' + e.to); }
  });
  mount.querySelectorAll('.edge').forEach(p => {
    const key = p.dataset.from + '>' + p.dataset.to;
    p.classList.toggle('is-linked', linked.has(key));
  });
}
