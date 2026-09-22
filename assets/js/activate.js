/* The activation step: the plan as something switched on rather than something read.

   Every other panel ends with the visitor holding a document. A document is where
   most of these plans stop, so this one ends with a roster, a checklist and a first
   week — the smallest set of commitments that turns a blueprint into work somebody
   is doing on Monday.

   Nothing here invents content. The roster is the same slot resolution the network
   view draws (reused from network.js, not copied), the checklist is the first
   rollout phases, and the first week is read off the tier, the goal focus and the
   leading metric already in the blueprint. Activation is a change of framing backed
   by the visitor's own answers, not a second engine. */

/* The pods the plan resolves to, in the same order the map draws them. */
function activationRoster(blueprint) {
  const index = blueprint.index;
  const hubId = HUB_IDS.find(id => index.has(id)) || null;
  return {
    agents: resolveSlots(AGENT_SLOTS, index, 5),
    humans: resolveSlots(HUMAN_SLOTS, index, 3),
    hub: hubId ? { nodeId: hubId, node: index.get(hubId).node } : null
  };
}

/* The checklist is the front of the rollout, not all of it: enough phases to reach
   six things to do, so week one is a list somebody can finish rather than a plan to
   read again. The rollout tab still holds the whole sequence. */
function activationChecklist(blueprint) {
  const out = [];
  for (const phase of blueprint.phases) {
    const items = phase.items
      .map(id => ({ id, entry: blueprint.index.get(id) }))
      .filter(x => x.entry)
      .map(x => ({
        id: x.id,
        title: x.entry.node.title,
        why: x.entry.node.purpose || '',
        kind: x.entry.node.kind,
        view: VIEW_META[x.entry.view] ? VIEW_META[x.entry.view].label : x.entry.view
      }));
    if (!items.length) continue;
    out.push({ phase, items });
    if (out.reduce((n, g) => n + g.items.length, 0) >= 6) break;
  }
  return out;
}

/* Four commitments that have to be made by a person before any of the above starts.
   Each one is read off the blueprint, so they change with the answers. */
/* The strip counts gates and system signals together as one size cue. A sentence about
   who clears what cannot: a signal is not a checkpoint, so this counts the real ones. */
function approvalCount(blueprint) {
  const seen = new Set();
  Object.values(blueprint.views).forEach(v => v.nodes.forEach(n => {
    if (n.kind === 'gate') seen.add(n.id);
  }));
  return seen.size;
}

function activationSteps(blueprint) {
  const firstPhase = blueprint.phases[0];
  const focusEntry = blueprint.index.get(blueprint.focus.node);
  const leading = (blueprint.metrics.find(m => m.lead) || {});
  return [
    {
      title: 'Put one name on it',
      body: 'One person owns this rollout and is allowed to stop it. A group that agrees in ' +
        'principle owns nothing, and this is the failure that kills the most of these plans ' +
        'before week three.'
    },
    {
      title: 'Start where it pays',
      body: (focusEntry ? `Start at "${focusEntry.node.title}". ` : '') + blueprint.focus.line
    },
    {
      title: 'Agree the approval points first',
      body: (() => {
        const gates = approvalCount(blueprint);
        return `Your plan has ${gates} point${gates === 1 ? '' : 's'} where work stops until somebody ` +
          `or something clears it. Write down who clears each one before the first agent runs, not ` +
          `after. How far AI can act alone at this level: ${blueprint.tierInfo.ceiling}`;
      })()
    },
    {
      title: 'Put the first review in the calendar',
      body: (leading.lead
        ? `Look at "${leading.lead}" (from ${leading.source}) weekly. `
        : 'Pick one leading number and look at it weekly. ') +
        `If it has not moved by week ${firstPhase ? firstPhase.end : 4}, change the plan rather than ` +
        'waiting out the timeline.'
    }
  ];
}

function actEl(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function rosterItem(pod, kind, onOpenPart) {
  const li = actEl('li', `roster-item kind-${kind}`);
  const btn = actEl('button', 'roster-btn');
  btn.type = 'button';
  btn.title = 'Open this part of the plan';
  const head = actEl('span', 'roster-head');
  head.appendChild(actEl('span', 'roster-label', pod.label));
  head.appendChild(actEl('span', 'roster-title', pod.node.title));
  btn.appendChild(head);
  btn.appendChild(actEl('span', 'roster-caption', pod.caption));
  btn.addEventListener('click', () => onOpenPart(pod.nodeId));
  li.appendChild(btn);
  if (pod.carries) {
    const carries = actEl('p', 'roster-carries');
    carries.appendChild(actEl('span', 'carries-label', 'Sends'));
    carries.appendChild(document.createTextNode(pod.carries));
    li.appendChild(carries);
  }
  return li;
}

/* Renders the whole panel. `handlers` carries the two things only the page knows:
   how to open a part in the view that owns it, and how to reach the full map. */
function renderActivation(blueprint, handlers) {
  const roster = activationRoster(blueprint);
  const agentMount = document.getElementById('roster-agents');
  const humanMount = document.getElementById('roster-humans');
  const hubMount = document.getElementById('roster-hub');
  const listMount = document.getElementById('activate-checklist');
  const stepMount = document.getElementById('first-week');
  if (!agentMount || !humanMount || !listMount || !stepMount) return;

  agentMount.innerHTML = '';
  humanMount.innerHTML = '';
  roster.agents.forEach(a => agentMount.appendChild(rosterItem(a, 'agent', handlers.openPart)));
  roster.humans.forEach(h => humanMount.appendChild(rosterItem(h, 'human', handlers.openPart)));

  document.getElementById('roster-agents-count').textContent =
    `${roster.agents.length} of these run without you once they are set up`;
  document.getElementById('roster-humans-count').textContent =
    `${roster.humans.length} places where a person still decides`;

  hubMount.innerHTML = '';
  if (roster.hub) {
    const btn = actEl('button', 'hub-btn');
    btn.type = 'button';
    btn.appendChild(actEl('span', 'hub-label', 'Shared memory'));
    btn.appendChild(actEl('span', 'hub-title', roster.hub.node.title));
    btn.appendChild(actEl('span', 'hub-note', 'Everything above reads from here and writes back to it. ' +
      'Set this up first: the rest is worth little without it.'));
    btn.addEventListener('click', () => handlers.openPart(roster.hub.nodeId));
    hubMount.appendChild(btn);
  }

  /* Ticking a box is deliberately not saved anywhere. The page stores nothing, and a
     checklist that half-remembers itself across reloads is worse than one that is
     honestly a working surface for this sitting. */
  listMount.innerHTML = '';
  const groups = activationChecklist(blueprint);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const progress = document.getElementById('check-progress');
  const tally = () => {
    const done = listMount.querySelectorAll('input:checked').length;
    progress.textContent = `${done} of ${total} done`;
    progress.classList.toggle('is-complete', done === total && total > 0);
  };

  groups.forEach(group => {
    const li = actEl('li', 'check-group');
    const head = actEl('div', 'check-group-head');
    head.appendChild(actEl('span', 'check-weeks',
      group.phase.start === group.phase.end ? `Week ${group.phase.start}` : `Weeks ${group.phase.start}–${group.phase.end}`));
    head.appendChild(actEl('h4', 'check-group-title', group.phase.title));
    li.appendChild(head);
    li.appendChild(actEl('p', 'check-group-goal', group.phase.goal));

    const ul = actEl('ul', 'check-items');
    group.items.forEach(item => {
      const row = actEl('li', `check-item kind-${item.kind}`);
      const label = actEl('label', 'check-label');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.addEventListener('change', () => {
        row.classList.toggle('is-done', box.checked);
        tally();
      });
      label.appendChild(box);
      label.appendChild(actEl('span', 'check-title', item.title));
      label.appendChild(actEl('span', 'check-view', item.view));
      row.appendChild(label);
      if (item.why) row.appendChild(actEl('p', 'check-why', item.why));
      const open = actEl('button', 'mini-btn', 'Open in the plan');
      open.type = 'button';
      open.addEventListener('click', () => handlers.openPart(item.id));
      row.appendChild(open);
      ul.appendChild(row);
    });
    li.appendChild(ul);
    li.appendChild((() => {
      const proof = actEl('p', 'check-proof');
      proof.appendChild(actEl('span', 'proof-label', 'Done when'));
      proof.appendChild(document.createTextNode(group.phase.proof));
      return proof;
    })());
    listMount.appendChild(li);
  });
  tally();

  stepMount.innerHTML = '';
  activationSteps(blueprint).forEach(step => {
    const li = actEl('li', 'week-step');
    li.appendChild(actEl('h4', 'week-title', step.title));
    li.appendChild(actEl('p', 'week-body', step.body));
    stepMount.appendChild(li);
  });
}

/* The checklist as plain text, for the tracker or document the visitor already uses. */
function activationText(blueprint) {
  const lines = [];
  lines.push('Switch-on checklist');
  lines.push('');
  /* No counts line here on purpose. The strip above the tabs already carries the size of
     the plan, and repeating a rounded-up version of it next to the precise number in step
     three would just raise a question the checklist cannot answer. */
  lines.push(`Level ${blueprint.tier} of 4 — ${blueprint.tierInfo.name}, over about ${blueprint.horizon} weeks`);
  lines.push('');
  lines.push('Before you start');
  activationSteps(blueprint).forEach((s, i) => {
    lines.push(`${i + 1}. ${s.title}`);
    lines.push(`   ${s.body}`);
  });
  lines.push('');
  activationChecklist(blueprint).forEach(group => {
    const weeks = group.phase.start === group.phase.end
      ? `Week ${group.phase.start}` : `Weeks ${group.phase.start}–${group.phase.end}`;
    lines.push(`${group.phase.title} (${weeks})`);
    lines.push(group.phase.goal);
    group.items.forEach(item => lines.push(`[ ] ${item.title} (${item.view})`));
    lines.push(`Done when: ${group.phase.proof}`);
    lines.push('');
  });
  lines.push('Everything after this is in the rollout section of the blueprint.');
  return lines.join('\n');
}
