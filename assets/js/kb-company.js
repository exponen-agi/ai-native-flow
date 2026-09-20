/* Company-level knowledge base: the three views that sit around the delivery
   lifecycle. Every function of the business as a loop, the tool ecosystem with
   the paths data travels, and the recursive improvement cycle that turns
   recorded work back into context. */

/* =================================================================== COMPANY */

const COMPANY_LANES = [
  { id: 'signals', label: 'Signals in',   caption: 'What the business learns each day' },
  { id: 'loops',   label: 'Function loops', caption: 'Where the work happens' },
  { id: 'gates',   label: 'Quality gates', caption: 'What must hold before it lands' },
  { id: 'actions', label: 'Action and record', caption: 'Systems that change reality' },
  { id: 'learn',   label: 'Learning',      caption: 'Outcome back into the system' }
];

const COMPANY_NODES = [
  /* -------------------------------------------------------------- signals */
  {
    id: 'sig-product', lane: 'signals', kind: 'system', title: 'Product telemetry',
    subtitle: 'events, funnels, errors',
    tools: ['analytics', 'observability'],
    purpose: 'Every meaningful action in the product emits an event with a stable name, so behaviour is a queryable fact rather than an opinion in a meeting.',
    why: 'A loop cannot close without an outcome signal. Telemetry is what tells you whether the last change helped, and it is the input the product improvement loop runs on.',
    out: ['events']
  },
  {
    id: 'sig-support', lane: 'signals', kind: 'system', title: 'Support conversations',
    subtitle: 'tickets, chats, calls',
    tools: ['support', 'comms'],
    purpose: 'Every customer conversation lands in one searchable place with the product area tagged, including the ones that arrive by email or in a shared channel.',
    why: 'This is the highest-density source of product truth in most companies, and the one most often trapped in an inbox nobody can query.',
    out: ['transcripts', 'tickets']
  },
  {
    id: 'sig-revenue', lane: 'signals', kind: 'system', title: 'Sales and revenue signals',
    subtitle: 'calls, pipeline, churn, billing',
    tools: ['crm', 'meetings', 'finance'],
    purpose: 'Call recordings, deal stages, win and loss reasons, expansion and churn events, all captured against the account rather than in a rep\'s notebook.',
    why: 'Loss reasons and objection patterns are the roadmap input that almost never reaches the roadmap. Recorded calls make them countable.',
    out: ['transcripts', 'crm-records']
  },
  {
    id: 'sig-delivery', lane: 'signals', kind: 'system', title: 'Delivery telemetry',
    subtitle: 'commits, CI, incidents, agent sessions',
    tools: ['source-control', 'ci', 'observability', 'ai-eval'],
    purpose: 'Pull request metadata, CI outcomes, incident records and agent session traces, exported rather than left in each tool\'s own dashboard.',
    why: 'This is how you measure whether the AI-native delivery flow is actually working, and it is the input the overnight improvement agent reads.',
    out: ['delivery-metrics', 'session-traces']
  },
  {
    id: 'sig-internal', lane: 'signals', kind: 'system', title: 'Meetings and decisions',
    subtitle: 'transcribed, then summarised',
    tools: ['meetings', 'comms', 'knowledge'],
    purpose: 'Every recurring meeting is recorded and transcribed, and every decision leaves a short written record naming the decision, the owner and the reasoning.',
    why: 'If it was not recorded, it did not happen as far as the system is concerned. Direct messages and undocumented calls are where organisational memory goes to die.',
    out: ['transcripts', 'decision-log']
  },
  {
    id: 'sig-market', lane: 'signals', kind: 'ai', title: 'Market and competitor watch',
    subtitle: 'scheduled, summarised, filed',
    when: (c, t) => t >= 2,
    tools: ['automation', 'knowledge'],
    purpose: 'A scheduled agent reads the sources you would read if you had the time, and files a short weekly digest with what changed and what it implies for the roadmap.',
    why: 'Competitor and category movement is the one signal class that never arrives by itself. A schedule beats intention.',
    prompt: 'Weekly market watch. Check these named sources for changes since your last digest: competitor changelogs and pricing pages, the two subreddits and one forum where our buyers talk, and funding or acquisition news in our category. Write a digest of at most one page: what changed, what it means for us, and what it would change in our roadmap if true. Mark anything you could not verify from a primary source as unconfirmed.',
    out: ['digest']
  },
  {
    id: 'sig-people', lane: 'signals', kind: 'system', title: 'People signals',
    subtitle: 'hiring, onboarding, capacity',
    when: c => eng(c) >= 4 || c.stage === 'enterprise',
    tools: ['knowledge', 'identity'],
    purpose: 'Candidate pipeline, onboarding completion, and where new joiners get stuck, kept as records rather than as a recruiter\'s spreadsheet.',
    why: 'Onboarding friction is the most reliable indicator that your written context is inadequate. New joiners fail wherever the agents will also fail.',
    out: ['records']
  },

  /* ---------------------------------------------------------------- loops */
  {
    id: 'loop-delivery', lane: 'loops', kind: 'ai', title: 'Product and delivery loop',
    subtitle: 'see the Delivery view for its internals',
    after: ['sig-product', 'sig-support', 'sig-delivery'],
    tools: ['agent-ide', 'source-control', 'pm'],
    purpose: 'Intent becomes spec, plan, diff, review and release. This is the one loop with a full lifecycle of its own, drawn in the Delivery view.',
    why: 'Every other loop eventually asks this one for a change. It is the loop that turns a finding into shipped behaviour.',
    in: ['events', 'tickets'], out: ['diff', 'release']
  },
  {
    id: 'loop-support', lane: 'loops', kind: 'ai', title: 'Support loop',
    subtitle: 'draft, resolve, escalate, cluster',
    after: ['sig-support'],
    tools: ['support', 'knowledge'],
    purpose: 'An agent drafts every reply from your documented answers, resolves what is unambiguous under a written policy, escalates the rest with the context already assembled, and clusters the week into recurring causes.',
    why: 'Support is where AI pays fastest in most businesses, and the cluster report is the highest-quality roadmap input you will ever get for free.',
    prompt: 'Draft a reply to this conversation using only our documented answers and this customer\'s history. If the answer is not documented, do not invent it: say what you would need, assemble the context, and escalate to the named owner. Tag the conversation with the product area and the underlying cause, not the wording the customer used.',
    in: ['tickets'], out: ['replies', 'cluster-report']
  },
  {
    id: 'loop-demand', lane: 'loops', kind: 'ai', title: 'Demand loop',
    subtitle: 'content, campaigns, site, measured',
    when: c => c.domain !== 'internal-ops',
    after: ['sig-market', 'sig-revenue'],
    tools: ['crm', 'analytics', 'knowledge'],
    purpose: 'Positioning and proof turn into content and campaigns from one written source, and every asset carries the tracking that says whether it worked.',
    why: 'Marketing output without attribution is the purest open loop in a company: expensive, confident and unmeasured.',
    prompt: 'Using our positioning document, ICP notes and the objection library, draft this asset. Every claim must trace to a proof point in those documents, and you must list any claim you could not support. Include the tracking parameters from our convention and state the single metric that will say whether this worked.',
    in: ['digest'], out: ['assets']
  },
  {
    id: 'loop-revenue', lane: 'loops', kind: 'ai', title: 'Revenue loop',
    subtitle: 'research, prep, follow-up, hygiene',
    when: c => ['saas', 'data-ai', 'services', 'ecommerce'].includes(c.domain),
    after: ['sig-revenue'],
    tools: ['crm', 'meetings'],
    purpose: 'Account research before the call, a brief built from the transcript history, follow-up drafted within the hour, and the record updated from the recording rather than from memory.',
    why: 'Sales data rots because updating it is unpaid work. When the agent writes the record from the transcript, the pipeline becomes trustworthy enough to reason over.',
    prompt: 'Read the transcript of this call and our CRM record for the account. Write three things: a follow-up email in our voice that addresses the objections actually raised, the fields to update on the record with the evidence line for each, and the single reason this deal will be won or lost. Do not update anything the transcript does not support.',
    out: ['crm-records', 'brief']
  },
  {
    id: 'loop-ops', lane: 'loops', kind: 'ai', title: 'Back-office loop',
    subtitle: 'reconcile, chase, report, file',
    after: ['sig-revenue'],
    tools: ['finance', 'automation', 'knowledge'],
    purpose: 'The recurring procedures nobody wants to own: reconciliation, invoice chasing, the monthly pack, exception handling, each run against a written procedure with a human on the exceptions only.',
    why: 'For a business whose product is not software, this is where the first real money is, and it needs connectors and a written procedure rather than a repository.',
    prompt: 'Run this documented procedure for the current period. Produce the output in the same format as last period. List every row where you made a judgment call, with the rule you applied. Stop and ask rather than guessing on anything involving money moving, a customer commitment, or personal data.',
    out: ['records', 'pack']
  },
  {
    id: 'loop-hiring', lane: 'loops', kind: 'ai', title: 'Hiring and onboarding loop',
    subtitle: 'screen, brief, ramp, capture',
    when: c => eng(c) >= 4 || c.stage === 'enterprise',
    after: ['sig-people'],
    tools: ['knowledge', 'identity'],
    purpose: 'Role briefs and screening rubrics from one written standard, and an onboarding path where every question a new joiner asks becomes a line in the written context.',
    why: 'Onboarding a person and onboarding an agent are the same problem: both need the context written down. Doing one well gives you the other.',
    prompt: 'This new joiner asked a question that our written context did not answer. Draft the answer from the sources you can reach, mark what you had to infer, and propose the exact lines to add to the onboarding guide and to the repository context file so nobody asks again.',
    out: ['onboarding-guide']
  },
  {
    id: 'loop-leadership', lane: 'loops', kind: 'ai', title: 'Leadership query loop',
    subtitle: 'ask the company a question',
    when: (c, t) => t >= 2,
    after: ['sig-product', 'sig-revenue', 'sig-delivery', 'sig-internal'],
    tools: ['warehouse', 'knowledge'],
    purpose: 'One agent with read access across the indexed record answers the questions that used to need a status roll-up: what shipped, what customers asked for, where the pipeline stalls, what we decided and why.',
    why: 'This is what replaces human information routing. Middle coordination exists because nobody could query the company; once it is queryable, the summary is generated rather than retyped.',
    prompt: 'Answer from the indexed record only, and show your sources. If the record cannot answer the question, say so and name exactly what is not being captured. Never estimate a number that a system of record could give exactly.',
    in: ['events', 'crm-records', 'delivery-metrics'], out: ['answer']
  },

  /* ---------------------------------------------------------------- gates */
  {
    id: 'gate-adversary', lane: 'gates', kind: 'gate', title: 'Second AI double-check',
    subtitle: 'a second AI reviews the first, not a person',
    after: ['loop-support', 'loop-demand', 'loop-revenue', 'loop-ops', 'loop-delivery', 'loop-leadership'],
    purpose: 'A second AI checks the first one\'s work against a written standard for that task: unsupported claims, suspicious instructions hidden in customer text, missing sources, wrong tone, anything the standard rules out.',
    why: 'Put a person on every approval and the work stops the moment nobody is at their desk. Using a second AI as the check is what lets this run around the clock.',
    enforces: 'Runs on every loop output before it leaves the building. Failures return to the loop with the rule cited, and repeat failures become a policy line rather than a reminder.'
  },
  {
    id: 'gate-policy', lane: 'gates', kind: 'gate', title: 'Rules and compliance check',
    subtitle: 'a fixed, automatic check for what must never happen',
    after: ['gate-adversary'],
    when: (c, t) => has(c, 'regulated') || has(c, 'client-code') || t >= 2,
    purpose: 'Automatic checks for the rules that can never bend: personal data leaving where it should stay, a claim that is not allowed to be made, a promise above a set amount, one client\'s information reaching another client.',
    why: 'A written rule makes a violation rare. Only a hard, automatic check makes it nearly impossible, and that is what a regulator or a customer\'s due-diligence questionnaire actually asks about.',
    enforces: 'Blocks rather than warns. Every allow and block logged with a timestamp and the rule that fired.'
  },
  {
    id: 'gate-dri', lane: 'gates', kind: 'human', title: 'One person in charge',
    subtitle: 'one named person owns each result',
    after: ['gate-adversary', 'gate-policy'],
    purpose: 'Each repeating task has exactly one person accountable for its outcome, who approves what the checks flagged and owns that task\'s written rules.',
    why: 'A committee turns a quick decision into a series of meetings. Naming one owner is the single most useful change in this entire plan.',
    responsibility: 'Own the outcome, not the keystrokes. Keep your loop\'s policy current, clear the flagged queue daily, and decide anything the gates could not.'
  },
  {
    id: 'gate-spend', lane: 'gates', kind: 'gate', title: 'Spending and access limits',
    subtitle: 'a set budget and a list of what each task may touch',
    after: ['gate-dri'],
    purpose: 'A hard monthly spending cap, always-on automated tasks tracked separately from work a person is actively watching, and a central list of exactly which tools each task is allowed to use.',
    why: 'It is cheaper to pay for more AI use than to hire more people, but only with a ceiling and a monthly look at what each task is costing. An unwatched scheduled task is the classic way costs quietly run away.',
    enforces: 'Scheduled and event-triggered work cannot exceed its own budget line. Access changes leave an audit record.'
  },

  /* --------------------------------------------------------------- actions */
  {
    id: 'act-product', lane: 'actions', kind: 'system', title: 'Product and repository',
    subtitle: 'the change itself',
    after: ['gate-dri', 'gate-spend'],
    tools: ['source-control', 'ci'],
    purpose: 'Merged code, released behaviour, and infrastructure changes: the actions that alter what customers experience.',
    why: 'Nothing an agent proposes reaches customers except through this path, which is why the delivery gates are where the strictest controls live.',
    in: ['diff']
  },
  {
    id: 'act-customer', lane: 'actions', kind: 'system', title: 'Customer-facing systems',
    subtitle: 'replies, emails, site, invoices',
    after: ['gate-dri', 'gate-spend'],
    tools: ['support', 'crm', 'finance'],
    purpose: 'Everything that speaks to a customer in your name: support replies, campaign sends, proposals, invoices, the website.',
    why: 'These carry your reputation and have the weakest natural gates, so they need the adversarial pass and the policy check more than the code path does.',
    in: ['replies', 'assets']
  },
  {
    id: 'act-records', lane: 'actions', kind: 'system', title: 'Systems of record',
    subtitle: 'tracker, CRM, ledger, wiki',
    after: ['gate-dri'],
    tools: ['pm', 'crm', 'finance', 'knowledge'],
    purpose: 'The tools your business already runs on, updated as a side effect of the work rather than as somebody\'s end-of-week chore.',
    why: 'Name one system as the source of truth per artifact type and link the rest to it. Two half-maintained records with no link is worse than either alone.',
    in: ['records', 'crm-records']
  },
  {
    id: 'act-comms', lane: 'actions', kind: 'system', title: 'Working channels',
    subtitle: 'where people and agents meet',
    after: ['gate-dri'],
    tools: ['comms'],
    purpose: 'Agents post into the channels people already watch, under their own identity, so a request, its diagnosis, the human authorization and the outcome all stay in one thread.',
    why: 'The channel becomes the audit trail, and it is the cheapest place for a person to steer an agent without learning a new tool.',
    out: ['transcripts']
  },

  /* -------------------------------------------------------------- learning */
  {
    id: 'learn-measure', lane: 'learn', kind: 'system', title: 'Outcome measurement',
    subtitle: 'did the change move the metric',
    after: ['act-product', 'act-customer', 'act-records'],
    purpose: 'Each loop declares the one metric it moves and the guardrails that must not move, measured against the baseline it had before the change.',
    why: 'Without this the company is an open loop: decisions are made, executed, and never checked, so nothing compounds.',
    out: ['outcome']
  },
  {
    id: 'learn-distill', lane: 'learn', kind: 'ai', title: 'Summary-writing agent',
    subtitle: 'turns raw recordings into the playbook',
    after: ['learn-measure', 'act-comms'],
    purpose: 'On a schedule, reads the period\'s transcripts, outcomes and decisions, and proposes edits to the written playbook: the answer library, the objection list, the procedures, the context files.',
    why: 'Recording everything produces a pile nobody can use. This summarizing step is what turns that pile into the small set of documents an AI can actually read before starting a task.',
    prompt: 'Read this period\'s transcripts, decisions and outcome metrics. Propose edits to the canon as a diff, not prose: lines to add, lines to change, and lines now contradicted by evidence and due for deletion. Cite the source for every proposed line. Where two sources disagree, surface the disagreement instead of picking a winner.',
    in: ['transcripts', 'outcome'], out: ['canon-diff']
  },
  {
    id: 'learn-eval', lane: 'learn', kind: 'ai', title: 'Failure to permanent test',
    subtitle: 'every miss becomes a case',
    after: ['learn-measure'],
    when: (c, t) => t >= 2,
    purpose: 'Every incident, wrong answer and escaped defect becomes a case in the eval suite for the loop that produced it, so the lesson stops depending on memory.',
    why: 'Your prompts, policies and context files are production configuration. Evals are the only regression test they will ever have.',
    prompt: 'Turn this failure into an eval case: the exact input, the output that was wrong, the check that defines acceptable, and the smallest change to the loop\'s policy or context that would have prevented it. Add it to that loop\'s suite.',
    out: ['evals']
  },
  {
    id: 'learn-review', lane: 'learn', kind: 'human', title: 'Monthly loop review',
    subtitle: 'which loop earned its tokens',
    after: ['learn-distill', 'learn-eval'],
    purpose: 'One short meeting per month: per loop, what it produced, what it cost, its eval pass rate, and the decision to widen it, tighten it or switch it off.',
    why: 'Loops rot silently. Without a scheduled look, you find out from the bill or from a customer, and by then the trust is spent.',
    responsibility: 'Stop or fix a task that is not earning its cost. Approve the playbook changes the summarizing agent proposed. Adjust the spending limit.'
  },

  /* ------------------------------------------------- company brain (spine) */
  {
    id: 'brain-index', lane: 'spine', kind: 'artifact', title: 'Queryable index',
    subtitle: 'one place the whole record is searchable',
    purpose: 'Transcripts, documents, tickets, records and metrics, indexed with permissions preserved, so an agent can retrieve the relevant slice instead of being handed everything.',
    why: 'You cannot pump a hundred thousand hours of recording into a context window. The index plus the distilled canon is what makes recall possible at all.'
  },
  {
    id: 'brain-canon', lane: 'spine', kind: 'artifact', title: 'The playbook ("canon")',
    subtitle: 'answers, positioning, procedures, policies',
    purpose: 'The small set of authoritative documents the loops read: answer library, positioning and proof, objection handling, written procedures, policies, metric definitions.',
    why: 'This is the company brain in practice. Not a model, a maintained set of documents that both a person and an agent can read and act on.'
  },
  {
    id: 'brain-decisions', lane: 'spine', kind: 'artifact', title: 'Decision log',
    subtitle: 'what we chose, why, who owns it',
    purpose: 'One append-only record of consequential decisions: the choice, the reasoning, the owner, the date, and what would change our mind.',
    why: 'Reasoning is the first thing lost and the most expensive to rebuild. It is also what stops an agent re-opening a settled question every quarter.'
  },
  {
    id: 'brain-context', lane: 'spine', kind: 'artifact', title: 'Agent context files',
    subtitle: 'CLAUDE.md, skills, role briefs',
    purpose: 'The per-repository and per-function instructions the agents load at the start of every session, versioned and reviewed like code.',
    why: 'This is where the canon becomes operational. A policy nobody loads is a policy nobody follows.'
  },
  {
    id: 'brain-retention', lane: 'spine', kind: 'gate', title: 'Retention and redaction',
    subtitle: 'what is kept, for how long, visible to whom',
    when: c => has(c, 'regulated') || has(c, 'client-code') || c.stage === 'enterprise',
    purpose: 'Recording everything collides with data protection unless retention windows, redaction of sensitive fields and per-source access rules are decided up front.',
    why: 'This is the one place where record everything needs a lawyer in the room. Decide it before the corpus exists, because retrofitting redaction across a year of transcripts is brutal.',
    enforces: 'Retention window per source, personal and payment data redacted at ingest, consent captured where required, access inherited from the source system.'
  }
];

/* ============================================================ IMPROVEMENT */

const RSI_LANES = [
  { id: 'record',  label: 'Record',   caption: 'If it is not captured it did not happen' },
  { id: 'index',   label: 'Index',    caption: 'Make it retrievable, keep permissions' },
  { id: 'distill', label: 'Distill',  caption: 'Volume into canon, on a schedule' },
  { id: 'serve',   label: 'Serve',    caption: 'Canon becomes session context' },
  { id: 'gate',    label: 'Gate',     caption: 'Nothing enters canon unchecked' },
  { id: 'improve', label: 'Improve',  caption: 'Change the system, not the reminder' }
];

const RSI_NODES = [
  {
    id: 'rec-meetings', lane: 'record', kind: 'system', title: 'Meeting capture',
    subtitle: 'recorded, transcribed, attributed',
    tools: ['meetings'],
    purpose: 'Recurring meetings, customer calls and office hours recorded and transcribed with speakers separated, under a stated consent practice.',
    why: 'The single highest-value corpus most companies are not keeping. Speaker attribution is what later makes it possible to ask how a specific person answers a specific question.',
    out: ['transcripts']
  },
  {
    id: 'rec-channels', lane: 'record', kind: 'gate', title: 'Public channels by default',
    subtitle: 'move work out of direct messages',
    tools: ['comms'],
    purpose: 'Work discussion happens in channels an agent can read. Direct messages stay for genuinely personal matters, not for decisions.',
    why: 'A decision in a direct message is invisible to the system that is supposed to learn from it. This is a norm, not a tool, and it is the cheapest change here.',
    enforces: 'Written norm, reinforced by asking people to restate decisions in channel. Retention and access follow the workspace policy.'
  },
  {
    id: 'rec-artifacts', lane: 'record', kind: 'gate', title: 'Every action leaves an artifact',
    subtitle: 'the rule everything else rests on',
    purpose: 'Each stage of work ends by writing something down: an intent file, a decision record, a call summary, a procedure run log, an incident record.',
    why: 'This is the load-bearing rule of the whole blueprint. Without it there is nothing to index, nothing to distill, and no way for the next agent to start where the last one stopped.',
    enforces: 'No stage is done until its artifact exists. Templates make it cheap; a gate makes it real.',
    out: ['artifacts']
  },
  {
    id: 'rec-telemetry', lane: 'record', kind: 'system', title: 'Telemetry and traces',
    subtitle: 'product, delivery, agent sessions',
    tools: ['analytics', 'observability', 'ai-eval'],
    purpose: 'Product events, pipeline outcomes and agent session traces exported to somewhere you can query, not just viewed in each vendor\'s dashboard.',
    why: 'Agent traces are the input for improving the agents themselves. Without them you are tuning prompts on vibes.',
    out: ['events', 'session-traces']
  },
  {
    id: 'idx-store', lane: 'index', kind: 'system', title: 'One searchable store',
    subtitle: 'documents, transcripts, records, metrics',
    after: ['rec-meetings', 'rec-channels', 'rec-artifacts', 'rec-telemetry'],
    tools: ['warehouse', 'knowledge'],
    purpose: 'A single index across sources with source, date and owner on every item, and structured metrics in a warehouse alongside it.',
    why: 'Retrieval quality is mostly a metadata problem. Without source and date on every item, an agent cannot tell current truth from last year\'s.',
    in: ['transcripts', 'artifacts'], out: ['index']
  },
  {
    id: 'idx-permissions', lane: 'index', kind: 'gate', title: 'Permissions and redaction at ingest',
    subtitle: 'inherit access, strip what must not be kept',
    after: ['idx-store'],
    purpose: 'Access rules inherited from the source system, sensitive fields redacted as data arrives, retention windows applied per source.',
    why: 'An index that flattens permissions is a data breach with a search box. Redacting at ingest is far cheaper than retrofitting it later.',
    enforces: 'No item is queryable more widely than it was in its source. Personal and payment data redacted before storage.'
  },
  {
    id: 'dis-nightly', lane: 'distill', kind: 'ai', title: 'Nightly synthesis',
    subtitle: 'yesterday into proposed canon edits',
    after: ['idx-permissions', 'idx-store'],
    purpose: 'Reads the day\'s new material and proposes small diffs to the canon, with a citation per line.',
    why: 'Small and frequent beats a quarterly rewrite. A nightly diff is reviewable in minutes; a quarterly one never gets read.',
    prompt: 'Read everything indexed since your last run. Propose canon edits as a diff with a citation per line: additions, changes, and lines now contradicted by newer evidence. Keep it under 20 lines. If nothing material happened, say so and propose nothing.',
    out: ['canon-diff']
  },
  {
    id: 'dis-weekly', lane: 'distill', kind: 'ai', title: 'Weekly cluster and pattern pass',
    subtitle: 'what repeated, what is trending',
    after: ['idx-store'],
    purpose: 'Clusters the week\'s conversations, failures and questions by underlying cause, and writes the recurring ones up as intent for the delivery loop.',
    why: 'One customer complaint is an anecdote. The same cause forty times is a roadmap item, and only a clustering pass makes that visible.',
    prompt: 'Cluster this week\'s support conversations, agent failures and internal questions by underlying cause rather than wording. For each cluster of five or more, write it up in our intent format with the count, three verbatim quotes and the handling cost. Skip clusters already covered by open intent.',
    out: ['intent.md', 'cluster-report']
  },
  {
    id: 'dis-monthly', lane: 'distill', kind: 'ai', title: 'Monthly canon rewrite',
    subtitle: 'the living handbook',
    after: ['dis-nightly'],
    when: (c, t) => t >= 3,
    purpose: 'Regenerates the long-form guides from the accumulated record: the internal handbook, the answer library, the onboarding guide, each rewritten rather than patched.',
    why: 'Patched documents drift into contradiction. A periodic regeneration from the source record is how the handbook stays current instead of becoming folklore.',
    prompt: 'Regenerate this guide from the indexed record of the last quarter rather than editing the current text. Keep the structure. Where current practice contradicts the existing guide, follow the practice and list every such change separately so a human can confirm it was intended.',
    out: ['canon']
  },
  {
    id: 'srv-context', lane: 'serve', kind: 'artifact', title: 'Canon as session context',
    subtitle: 'loaded at the start, not searched for',
    after: ['dis-nightly', 'dis-weekly', 'dis-monthly'],
    purpose: 'The distilled canon is what agents load at the start of a task: context files in the repository, skills per policy, role briefs per function.',
    why: 'This is the step that closes the loop. Recording and distilling change nothing until the output is what the next session reads before it acts.',
    in: ['canon'], out: ['context']
  },
  {
    id: 'srv-retrieval', lane: 'serve', kind: 'system', title: 'Retrieval for the long tail',
    subtitle: 'what the canon cannot hold',
    after: ['srv-context'],
    when: (c, t) => t >= 2,
    purpose: 'Everything too specific for the canon stays in the index and is retrieved on demand: this account\'s history, this incident last year, this clause in that contract.',
    why: 'Canon is for what every session needs. Retrieval is for what one session needs. Confusing the two produces either a bloated context file or an agent that knows nothing specific.',
    in: ['index']
  },
  {
    id: 'srv-connectors', lane: 'serve', kind: 'system', title: 'Tools as the agent\'s hands',
    subtitle: 'connectors, scoped per role',
    after: ['srv-context'],
    tools: ['automation', 'identity'],
    purpose: 'Each loop\'s agent gets exactly the tool access its written role needs, through connectors rather than pasted credentials, on an allowlist owned centrally.',
    why: 'Context without tools produces advice. Tools without scope produce incidents. The scope is what makes the loop safe to leave running.',
    enforces: 'Per-role allowlist, short-lived credentials, no standing production access, every call logged to the agent identity rather than to a person.'
  },
  {
    id: 'gate-canon', lane: 'gate', kind: 'human', title: 'Canon owner approves',
    subtitle: 'a diff, reviewed like code',
    after: ['dis-nightly', 'dis-monthly', 'srv-context'],
    purpose: 'Proposed canon changes arrive as a reviewable diff with citations, and a named owner per document accepts, edits or rejects.',
    why: 'A self-writing handbook with no reviewer converges on confident nonsense. The citation requirement is what makes the review fast enough to actually happen.',
    responsibility: 'Review the diff, not the corpus. Reject any line without a source. Keep your document under the length someone will actually read.'
  },
  {
    id: 'gate-canon-eval', lane: 'gate', kind: 'gate', title: 'Regression check on context change',
    subtitle: 'evals run when the canon moves',
    after: ['gate-canon'],
    when: (c, t) => t >= 3,
    purpose: 'The eval suite runs whenever a context file, skill or policy changes, and a drop in pass rate blocks the change.',
    why: 'The context files steer every loop. Changing them without a regression test is shipping to production without CI.',
    enforces: 'Pass-rate threshold as a merge check on the canon repository, results logged for comparison over time.'
  },
  {
    id: 'imp-selffix', lane: 'improve', kind: 'ai', title: 'Overnight self-repair',
    subtitle: 'yesterday\'s failures, tonight\'s fixes',
    after: ['gate-canon', 'gate-canon-eval'],
    when: (c, t) => t >= 4,
    purpose: 'Reads yesterday\'s agent sessions, separates success from failure, finds the cause of each failure, and opens a pull request per cause: a missing tool, an index, a permission, a canon line, a prompt.',
    why: 'This is the step that makes the system improve while nobody is working. It is deliberately last: it needs the record, the index, the canon, the gates and the evals already in place.',
    prompt: 'Read yesterday\'s sessions and tool calls. Classify each as success or failure using the signals available: retries, abandonment, explicit correction, permission errors, empty results. Group failures by cause. Open one pull request per cause, smallest first, each with the failing case added as a test. Do not merge anything.',
    out: ['diff']
  },
  {
    id: 'imp-experiment', lane: 'improve', kind: 'ai', title: 'Small, tested experiments',
    subtitle: 'propose a change, test it, keep it or drop it',
    after: ['gate-canon'],
    when: (c, t) => t >= 3,
    purpose: 'Against a written scope and one primary metric with guardrails, an agent proposes a change, implements it behind a flag, and the result decides whether it stays.',
    why: 'With a measurable outcome you can climb: propose, test, keep the wins, discard the rest, repeat. It only works with the scope written down, or the metric gets optimised and the product gets damaged.',
    prompt: 'Here is the scope document, the primary metric and the guardrail metrics that must not move. Propose one experiment: hypothesis, change, sample size needed, and the decision rule in advance. Implement it behind a flag as a pull request. Do not launch it.',
    out: ['diff']
  },
  {
    id: 'imp-feed', lane: 'improve', kind: 'system', title: 'Back in as intent',
    subtitle: 'findings re-enter the normal flow',
    after: ['imp-selffix', 'imp-experiment', 'gate-canon'],
    purpose: 'Every improvement, wherever it came from, re-enters through the same intake as any other change: written as intent, triaged by the owner, through the same gates.',
    why: 'Nothing bypasses the gates because a machine found it. This is what keeps an autonomous loop auditable rather than a second, unofficial way to change production.',
    out: ['intent.md']
  }
];

/* =================================================================== STACK */

const STACK_LANES = [
  { id: 'sources',    label: 'Source tools',  caption: 'Where work already happens' },
  { id: 'collection', label: 'Collection',    caption: 'How data reaches the system' },
  { id: 'store',      label: 'Context store', caption: 'Index plus canon' },
  { id: 'consumers',  label: 'Consumers',     caption: 'Agents and people who read it' }
];

/* Options are common choices, not endorsements. `fit` scores against the
   answers; the highest score becomes the starting recommendation and the rest
   stay visible as alternatives. Descriptions stay functional on purpose. */
const TOOL_CATEGORIES = [
  {
    id: 'source-control', label: 'Source control', lane: 'sources',
    role: 'Holds the code and, in this blueprint, the artifact chain and the agent context files beside it.',
    emits: 'Commits, pull requests, review threads, timestamps. The audit trail of who asked for what and who approved it.',
    collection: 'col-api',
    options: [
      { name: 'GitHub', note: 'Largest agent and action ecosystem', fit: c => 3 },
      { name: 'GitLab', note: 'Self-managed option when the repository cannot leave your network', fit: c => (has(c, 'regulated') ? 3 : 1) },
      { name: 'Azure DevOps', note: 'Where the organisation is already Microsoft-centric', fit: c => (c.stage === 'enterprise' ? 2 : 0) },
      { name: 'Bitbucket', note: 'Where Atlassian tooling is already the standard', fit: c => 0 }
    ]
  },
  {
    id: 'agent-ide', label: 'Coding agents', lane: 'sources',
    role: 'Where engineers and agents do the delivery work. Expect to run more than one and to change your mind.',
    emits: 'Session traces, token spend, tool calls. The raw material for improving the agents themselves.',
    collection: 'col-api',
    options: [
      { name: 'Claude Code', note: 'Terminal and CI agent, hooks and skills for policy as code', fit: c => 3 },
      { name: 'Cursor', note: 'Editor-first, strong for engineers who want an IDE loop', fit: c => 2 },
      { name: 'Codex CLI', note: 'Terminal agent, alternative model family', fit: c => 1 },
      { name: 'Antigravity', note: 'Agent-first IDE, newer and moving fast', fit: c => 1 },
      { name: 'OpenCode', note: 'Open source, model-agnostic, self-hostable', fit: c => (has(c, 'regulated') ? 2 : 0) },
      { name: 'GitHub Copilot', note: 'Where procurement is already through GitHub', fit: c => (c.stage === 'enterprise' ? 1 : 0) }
    ]
  },
  {
    id: 'pm', label: 'Work tracking', lane: 'sources',
    role: 'Holds the work items. Decide whether it or the repository is authoritative for intent, and link the other way.',
    emits: 'Items, states, cycle time, assignment history.',
    collection: 'col-mcp',
    options: [
      { name: 'Linear', note: 'Fast, opinionated, good API. Common startup default', fit: c => (['solo', 'startup', 'growth'].includes(c.stage) ? 3 : 1) },
      { name: 'Jira', note: 'Where traceability requirements or other teams already depend on it', fit: c => (c.stage === 'enterprise' || has(c, 'regulated') ? 3 : 0) },
      { name: 'ClickUp', note: 'Work plus docs in one place, common in non-engineering teams', fit: c => (c.stage === 'smb' ? 3 : 1) },
      { name: 'Notion', note: 'Where the wiki is already Notion and the backlog is small', fit: c => (c.stage === 'solo' ? 2 : 1) },
      { name: 'GitHub Issues and Projects', note: 'One fewer tool, and the artifact chain sits beside it', fit: c => (c.stage === 'solo' || budget(c) === 1 ? 3 : 1) },
      { name: 'Asana', note: 'Where non-engineering functions drive the process', fit: c => (c.stage === 'smb' ? 1 : 0) }
    ]
  },
  {
    id: 'knowledge', label: 'Knowledge and docs', lane: 'sources',
    role: 'Home of the canon: procedures, policies, positioning, answers, the decision log.',
    emits: 'Documents with edit history, and the canon the loops read.',
    collection: 'col-mcp',
    options: [
      { name: 'Notion', note: 'Structured databases plus docs, strong API and connector', fit: c => (['startup', 'growth', 'solo'].includes(c.stage) ? 3 : 1) },
      { name: 'Confluence', note: 'Where the organisation already audits documentation there', fit: c => (c.stage === 'enterprise' ? 3 : 0) },
      { name: 'Microsoft 365 and SharePoint', note: 'Where the company already lives in Office and Teams', fit: c => (c.stage === 'enterprise' || c.stage === 'smb' ? 2 : 0) },
      { name: 'Google Workspace', note: 'Docs and Drive, lowest friction for small teams', fit: c => (c.stage === 'smb' || c.stage === 'solo' ? 3 : 2) },
      { name: 'Markdown in the repository', note: 'For anything agents must read every session. Reviewed like code', fit: c => 3 }
    ]
  },
  {
    id: 'design', label: 'Design and prototyping', lane: 'sources',
    role: 'Where intent becomes something visible before it becomes something built.',
    emits: 'Mocks and prototypes that the build stage verifies against.',
    collection: 'col-mcp',
    when: c => uiHeavy(c) || c.domain === 'data-ai',
    options: [
      { name: 'Figma', note: 'Design system of record, with agent access to files and components', fit: c => 3 },
      { name: 'Lovable', note: 'Prompt to working web prototype, good for testing a flow with users', fit: c => (['solo', 'startup'].includes(c.stage) ? 2 : 1) },
      { name: 'Claude artifacts or Claude Design', note: 'Mock straight from the intent file, iterated in the same session', fit: c => 2 },
      { name: 'v0', note: 'Component-level generation against a design system', fit: c => 1 },
      { name: 'Google AI Studio', note: 'Fast multimodal prototyping and model comparison', fit: c => (c.domain === 'data-ai' ? 2 : 0) }
    ]
  },
  {
    id: 'crm', label: 'CRM and pipeline', lane: 'sources',
    role: 'Accounts, deals, and the reasons things are won and lost. Agent-updated from transcripts rather than by hand.',
    emits: 'Deal stages, win and loss reasons, activity history, revenue signals.',
    collection: 'col-mcp',
    when: c => c.domain !== 'internal-ops',
    options: [
      { name: 'HubSpot', note: 'Common where marketing and sales share one system', fit: c => (['startup', 'growth', 'smb'].includes(c.stage) ? 3 : 1) },
      { name: 'Salesforce', note: 'Where the sales process is already codified there', fit: c => (c.stage === 'enterprise' ? 3 : 0) },
      { name: 'Zoho', note: 'Cost-sensitive, broad suite for smaller businesses', fit: c => (c.stage === 'smb' && budget(c) <= 2 ? 3 : 0) },
      { name: 'Attio', note: 'Flexible data model, API-first, popular with early teams', fit: c => (['solo', 'startup'].includes(c.stage) ? 2 : 0) },
      { name: 'Pipedrive', note: 'Simple pipeline management for a small sales team', fit: c => (c.stage === 'smb' ? 1 : 0) }
    ]
  },
  {
    id: 'support', label: 'Support desk', lane: 'sources',
    role: 'Every customer conversation in one queryable place, tagged by underlying cause.',
    emits: 'Conversations, resolution time, cause tags. The richest product signal you own.',
    collection: 'col-webhook',
    when: c => c.domain !== 'internal-ops',
    options: [
      { name: 'Intercom', note: 'Conversations plus help centre, strong API', fit: c => (['startup', 'growth'].includes(c.stage) ? 3 : 1) },
      { name: 'Zendesk', note: 'Where support is a larger organised function', fit: c => (c.stage === 'enterprise' || c.stage === 'smb' ? 2 : 1) },
      { name: 'Pylon', note: 'Built for support that happens in shared customer channels', fit: c => (c.domain === 'saas' || c.domain === 'data-ai' ? 2 : 0) },
      { name: 'Plain or Freshdesk', note: 'Lighter alternatives for a small queue', fit: c => (budget(c) <= 2 ? 1 : 0) },
      { name: 'A shared inbox with labels', note: 'Adequate below roughly 20 conversations a week, if labels are enforced', fit: c => (c.stage === 'solo' ? 2 : 0) }
    ]
  },
  {
    id: 'comms', label: 'Working channels', lane: 'sources',
    role: 'Where people and agents meet. Agents post under their own identity so the thread is the audit trail.',
    emits: 'Channel history, decisions, incident threads.',
    collection: 'col-mcp',
    options: [
      { name: 'Slack', note: 'Widest agent and connector support', fit: c => (c.stage === 'enterprise' ? 2 : 3) },
      { name: 'Microsoft Teams', note: 'Where the organisation is already Microsoft-centric', fit: c => (c.stage === 'enterprise' || c.stage === 'smb' ? 3 : 0) },
      { name: 'Discord', note: 'Where the community is the primary channel', fit: c => 0 }
    ]
  },
  {
    id: 'meetings', label: 'Meeting capture', lane: 'sources',
    role: 'Recording and transcription with speakers separated. The corpus everything else distills from.',
    emits: 'Transcripts, summaries, action items, speaker attribution.',
    collection: 'col-transcribe',
    options: [
      { name: 'Granola', note: 'Notes from the meeting plus your own typing, low friction', fit: c => (['solo', 'startup', 'growth'].includes(c.stage) ? 3 : 1) },
      { name: 'Zoom or Teams built-in recording', note: 'Already licensed, already approved, nothing new to procure', fit: c => (c.stage === 'enterprise' || c.stage === 'smb' ? 3 : 2) },
      { name: 'Fireflies or Otter', note: 'Cross-platform capture with a searchable archive', fit: c => 2 },
      { name: 'Self-hosted transcription', note: 'Where recordings cannot leave your infrastructure', fit: c => (has(c, 'regulated') ? 2 : 0) }
    ]
  },
  {
    id: 'analytics', label: 'Product analytics', lane: 'sources',
    role: 'Behavioural events and funnels. The outcome signal for anything customer-facing.',
    emits: 'Events, funnels, retention, session replays.',
    collection: 'col-warehouse',
    when: c => c.domain !== 'services',
    options: [
      { name: 'PostHog', note: 'Events, replay and flags together, self-hostable', fit: c => (['startup', 'growth', 'solo'].includes(c.stage) ? 3 : 1) },
      { name: 'Amplitude or Mixpanel', note: 'Deeper behavioural analysis for a larger product org', fit: c => (c.stage === 'enterprise' || c.stage === 'growth' ? 2 : 0) },
      { name: 'GA4', note: 'Site-level measurement, weak for product events', fit: c => (c.domain === 'ecommerce' ? 2 : 0) }
    ]
  },
  {
    id: 'warehouse', label: 'Warehouse and index', lane: 'store',
    role: 'One place structured metrics and indexed text live together, so a question can be answered across sources.',
    emits: 'The queryable record itself.',
    collection: null,
    options: [
      { name: 'Postgres', note: 'Enough for most companies below serious scale, and you probably run one already', fit: c => (budget(c) <= 2 ? 3 : 2) },
      { name: 'BigQuery', note: 'Serverless, pay per query, easy scheduled loads', fit: c => (budget(c) >= 3 ? 3 : 1) },
      { name: 'Snowflake or Databricks', note: 'Where a data team and governance requirements already exist', fit: c => (c.stage === 'enterprise' ? 3 : 0) },
      { name: 'DuckDB or MotherDuck', note: 'Analytical work without standing infrastructure', fit: c => (['solo', 'startup'].includes(c.stage) ? 1 : 0) }
    ]
  },
  {
    id: 'observability', label: 'Observability', lane: 'sources',
    role: 'Errors, slow response times and release health. The signal that automatic safety thresholds watch.',
    emits: 'Error rates, traces, deploy markers, alerts.',
    collection: 'col-webhook',
    when: (c, t) => t >= 2,
    options: [
      { name: 'Sentry', note: 'Errors and releases, quick to wire up', fit: c => (['startup', 'growth', 'solo'].includes(c.stage) ? 3 : 1) },
      { name: 'Datadog', note: 'Broad coverage where operations is a funded function', fit: c => (c.stage === 'enterprise' ? 3 : 0) },
      { name: 'Grafana with Prometheus', note: 'Self-hosted, and the metrics store the safety-threshold checks query', fit: c => (has(c, 'regulated') ? 2 : 1) }
    ]
  },
  {
    id: 'ci', label: 'Pipeline', lane: 'sources',
    role: 'Where non-interactive agents run: review passes, evals, scheduled loops, deploys.',
    emits: 'Run outcomes, durations, failure logs, deployment records.',
    collection: 'col-api',
    when: c => !has(c, 'no-ci'),
    options: [
      { name: 'GitHub Actions', note: 'Same place as the code, simplest path to scheduled agent jobs', fit: c => 3 },
      { name: 'GitLab CI', note: 'Where the repository is GitLab', fit: c => (has(c, 'regulated') ? 2 : 0) },
      { name: 'Self-hosted runners', note: 'Where jobs must run inside your network', fit: c => (has(c, 'regulated') || has(c, 'client-code') ? 2 : 0) }
    ]
  },
  {
    id: 'automation', label: 'Orchestration', lane: 'collection-tools',
    role: 'Connects tools, runs scheduled loops, and moves data between systems without a person copying it.',
    emits: 'Run history and the integration surface itself.',
    collection: null,
    options: [
      { name: 'MCP connectors', note: 'The agent uses the tool directly in-session, read and write', fit: c => 3 },
      { name: 'n8n', note: 'Self-hostable workflow automation, good for scheduled loops', fit: c => (has(c, 'regulated') || budget(c) >= 2 ? 2 : 1) },
      { name: 'Zapier or Make', note: 'Fastest path when nobody wants to maintain a runner', fit: c => (c.stage === 'smb' ? 3 : 1) },
      { name: 'Scheduled jobs in CI', note: 'Version-controlled, reviewed, and free if you already have a pipeline', fit: c => (!has(c, 'no-ci') ? 2 : 0) }
    ]
  },
  {
    id: 'ai-eval', label: 'Agent evaluation', lane: 'sources',
    role: 'Regression testing and tracing for the loops themselves, since prompts and policies are production configuration.',
    emits: 'Pass rates, traces, per-loop cost.',
    collection: 'col-api',
    when: (c, t) => t >= 3,
    options: [
      { name: 'Eval scripts in your pipeline', note: 'Start here: real tasks, expected outcomes, run on config change', fit: c => 3 },
      { name: 'Langfuse', note: 'Open source tracing and evaluation, self-hostable', fit: c => (has(c, 'regulated') ? 2 : 1) },
      { name: 'Braintrust or LangSmith', note: 'Managed evaluation and dataset tooling', fit: c => (budget(c) >= 3 ? 2 : 0) }
    ]
  },
  {
    id: 'identity', label: 'Identity and access', lane: 'store',
    role: 'Who and what may see each source. Agent access inherits from it rather than sitting beside it.',
    emits: 'Access records and the permission model the index must respect.',
    collection: null,
    options: [
      { name: 'Google Workspace', note: 'Already the identity provider for most small companies', fit: c => (['solo', 'startup', 'growth', 'smb'].includes(c.stage) ? 3 : 1) },
      { name: 'Microsoft Entra', note: 'Where the organisation is Microsoft-centric', fit: c => (c.stage === 'enterprise' || c.stage === 'smb' ? 2 : 0) },
      { name: 'Okta', note: 'Where access review is an audited process', fit: c => (c.stage === 'enterprise' || has(c, 'regulated') ? 2 : 0) }
    ]
  },
  {
    id: 'finance', label: 'Billing and finance', lane: 'sources',
    role: 'Revenue events and the ledger. The outcome signal that is hardest to argue with.',
    emits: 'Charges, churn, margin, spend including your own AI spend.',
    collection: 'col-api',
    when: c => c.domain !== 'internal-ops' || c.stage === 'smb',
    options: [
      { name: 'Stripe', note: 'Billing events as a first-class data source', fit: c => (c.domain === 'saas' || c.domain === 'ecommerce' ? 3 : 1) },
      { name: 'QuickBooks or Xero', note: 'The ledger most small and medium businesses already run', fit: c => (c.stage === 'smb' ? 3 : 1) },
      { name: 'NetSuite', note: 'Where finance process is already codified there', fit: c => (c.stage === 'enterprise' ? 2 : 0) }
    ]
  }
];

/* How data actually travels. Each source names one primary mechanism. */
const COLLECTION_NODES = [
  {
    id: 'col-mcp', lane: 'collection', kind: 'system', title: 'Connectors in session',
    subtitle: 'the agent reads and writes directly',
    purpose: 'The agent uses the tool while it works: reads the ticket, writes the record, files the document. No copy of the data is needed because the tool is the source of truth.',
    why: 'This is the first mechanism to reach for. It keeps one source of truth and removes the sync you would otherwise have to maintain.',
    enforces: 'Access scoped per role, short-lived credentials, every call attributed to the agent identity.'
  },
  {
    id: 'col-webhook', lane: 'collection', kind: 'system', title: 'Event push',
    subtitle: 'the tool tells you when something happens',
    purpose: 'Webhooks fire on the events that should trigger work: a ticket opened, an error spiking, a deploy finished, a deal closed.',
    why: 'This is what makes a loop react in minutes rather than at the next scheduled run. It is also how a deterministic trigger invokes an agent with no person in the path.'
  },
  {
    id: 'col-api', lane: 'collection', kind: 'system', title: 'Scheduled pull',
    subtitle: 'nightly or hourly export',
    purpose: 'A scheduled job pulls what changed and lands it in the store: pull request metadata, session traces, run outcomes, pipeline history.',
    why: 'Cheap, restartable, and adequate for anything that does not need to react instantly. Most metrics belong here.'
  },
  {
    id: 'col-warehouse', lane: 'collection', kind: 'system', title: 'Warehouse sync',
    subtitle: 'high-volume structured data',
    purpose: 'Event and revenue data land in the warehouse in their native shape, and metric definitions live beside them in version control.',
    why: 'Volume and history belong in a warehouse, not in a context window. The agent queries it rather than reading it.'
  },
  {
    id: 'col-transcribe', lane: 'collection', kind: 'system', title: 'Capture and transcribe',
    subtitle: 'speech and screens into text',
    purpose: 'Meetings, calls and screen recordings become transcripts with speakers separated, then get summarised and filed against the account or project they belong to.',
    why: 'Unrecorded conversation is the largest category of lost organisational knowledge. This is the mechanism that turns it into an asset.'
  },
  {
    id: 'col-manual', lane: 'collection', kind: 'gate', title: 'Written by hand, on purpose',
    subtitle: 'decisions, intent, procedures',
    purpose: 'Some artifacts are authored rather than collected: the decision record, the intent file, the written procedure, the policy.',
    why: 'These carry the reasoning no telemetry can reconstruct. Keeping them short and templated is what keeps them getting written.'
  }
];

const STORE_NODES = [
  {
    id: 'store-index', lane: 'store', kind: 'artifact', title: 'The index',
    subtitle: 'everything retrievable, permissions intact',
    after: ['col-mcp', 'col-webhook', 'col-api', 'col-warehouse', 'col-transcribe', 'col-manual'],
    purpose: 'Searchable across sources with source, date and owner on every item, and access inherited from where it came from.',
    why: 'Retrieval quality is mostly a metadata problem. Source and date are what let an agent tell current truth from last year\'s.'
  },
  {
    id: 'store-canon', lane: 'store', kind: 'artifact', title: 'The playbook ("canon")',
    subtitle: 'the short documents every session reads',
    after: ['store-index'],
    purpose: 'Distilled from the index on a schedule: answers, procedures, positioning, policies, context files, the decision log.',
    why: 'The index is for the long tail, the canon is for what everyone needs every time. Confusing the two produces bloated context or an ignorant agent.'
  }
];

const CONSUMER_NODES = [
  {
    id: 'use-coding', lane: 'consumers', kind: 'ai', title: 'Delivery agents',
    subtitle: 'read context files and the plan',
    after: ['store-canon'],
    purpose: 'Load the repository context files and skills at session start, then read the intent, spec and plan for the task at hand.',
    why: 'This is why the canon has to be short and current: it is loaded on every single session, and a stale line costs context and misleads.'
  },
  {
    id: 'use-gtm', lane: 'consumers', kind: 'ai', title: 'Go-to-market agents',
    subtitle: 'positioning, proof, objections',
    after: ['store-canon'],
    when: c => c.domain !== 'internal-ops',
    purpose: 'Draft from the positioning document, the proof library and the objection list, with account history retrieved per conversation.',
    why: 'Marketing and sales output drifts off-message when each person keeps their own version. One canon is what makes the voice consistent.'
  },
  {
    id: 'use-support', lane: 'consumers', kind: 'ai', title: 'Support agent',
    subtitle: 'documented answers, customer history',
    after: ['store-canon'],
    when: c => c.domain !== 'internal-ops',
    purpose: 'Answers from the documented answer library plus this customer\'s history, and escalates anything the canon does not cover.',
    why: 'The refusal to answer from outside the canon is the feature, not a limitation. It is what keeps a confident wrong answer off a customer\'s screen.'
  },
  {
    id: 'use-ops', lane: 'consumers', kind: 'ai', title: 'Operations agents',
    subtitle: 'written procedures, scoped tools',
    after: ['store-canon'],
    purpose: 'Run the recurring procedures against their written version, with tool access limited to the systems that procedure names.',
    why: 'A procedure in someone\'s head cannot be run by an agent or audited by anyone. Writing it down is most of the work.'
  },
  {
    id: 'use-people', lane: 'consumers', kind: 'human', title: 'People asking questions',
    subtitle: 'the company, queryable',
    after: ['store-index', 'store-canon'],
    purpose: 'Anyone asks the record directly instead of requesting a status update: what shipped, what customers asked for, what we decided and why.',
    why: 'This is the payoff that removes human information routing, and the reason to make the record legible in the first place.'
  }
];
