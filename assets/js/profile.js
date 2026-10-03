/* Who the business is and where it stands. The intake asks these in plain business
   language; the engine still reasons over a small set of segments, so each richer
   answer here maps down to one. Keys are what the URL stores. */

/* Business type and size. `segment` is the value the rules in kb.js, kb-company.js
   and engine.js read as c.stage; `people` is the headcount band shown back. */
const ORG_TYPES = {
  'solo':             { segment: 'solo',       short: 'Solo',                 people: 'just me' },
  'startup-early':    { segment: 'startup',    short: 'Early startup',        people: '2–10 people' },
  'startup-seed':     { segment: 'startup',    short: 'Seed–Series A startup', people: '11–50 people' },
  'startup-growth':   { segment: 'growth',     short: 'Growth startup',       people: '51–200 people' },
  'scaleup':          { segment: 'growth',     short: 'Scale-up',             people: '201–1,000 people' },
  'smb-small':        { segment: 'smb',        short: 'Small business',       people: 'up to 50 people' },
  'smb-medium':       { segment: 'smb',        short: 'Medium business',      people: '51–250 people' },
  'midmarket':        { segment: 'enterprise', short: 'Mid-market company',   people: '251–1,000 people' },
  'enterprise':       { segment: 'enterprise', short: 'Enterprise',           people: '1,001–10,000 people' },
  'enterprise-large': { segment: 'enterprise', short: 'Large enterprise',     people: '10,000+ people' }
};

/* Links shared before the intake asked about size carry only the old segment. */
const SEGMENT_TO_ORG = {
  solo: 'solo', startup: 'startup-seed', growth: 'startup-growth', smb: 'smb-small', enterprise: 'enterprise'
};

/* Where the offering is on the product journey. `phase` is what the rules read:
   pre (no product yet), build (building the first version), market (live and
   selling), established (a mature business improving or renewing itself). */
const JOURNEYS = {
  'idea':          { phase: 'pre',         short: 'Idea',
    note: 'At the idea stage there is nothing to automate yet except learning. Use AI to research the market and to turn every customer conversation into written evidence, and keep the delivery machinery light until someone has said yes to the problem.' },
  'discovery':     { phase: 'pre',         short: 'Discovery',
    note: 'In discovery the valuable output is evidence, not software. Record and summarise every customer interview, let an agent cluster what you hear, and hold off on anything that assumes you already know what to build.' },
  'problem-fit':   { phase: 'pre',         short: 'Problem–solution fit',
    note: 'You know the problem is real and are testing your answer to it. Cheap, throwaway prototypes and a written record of what each test proved are worth more here than any pipeline.' },
  'prototype':     { phase: 'build',       short: 'Prototype',
    note: 'A prototype is for learning, so optimise for how fast you can put a version in front of users and hear back. Write down what each round taught you, because that record becomes the spec for the real thing.' },
  'mvp':           { phase: 'build',       short: 'MVP',
    note: 'With a first version live, the new job is hearing clearly from early users. Capture every support conversation and sales call now, while the volume is small enough to read, and put the self-check in place before the codebase grows.' },
  'post-mvp':      { phase: 'market',      short: 'Post-MVP',
    note: 'Iterating with early paying customers is where rework is most expensive. Tie every change to a written request from a real customer, and let support and sales conversations rank the backlog.' },
  'product-fit':   { phase: 'market',      short: 'Product–market fit',
    note: 'Demand is steady, so the constraint moves from finding customers to serving them without the team becoming the bottleneck. This is the right moment to standardise how work is written down, before headcount makes it hard.' },
  'scale':         { phase: 'market',      short: 'Scaling',
    note: 'Scaling multiplies whatever process you already have, good or bad. Write the playbook before you hire into it, so new people and new agents learn the same way of working from day one.' },
  'established':   { phase: 'established', short: 'Established',
    note: 'An established business has the most recorded history to learn from and the most habits to unwind. Start with one recurring procedure that costs real money, prove it under a named owner, then widen.' },
  'reinventing':   { phase: 'established', short: 'Reinventing',
    note: 'Launching something new inside an established business means running two speeds at once. Give the new line its own lightweight flow and its own owner, and borrow only the approvals and data rules the core business cannot waive.' }
};

/* Business domain. `regulated` marks sectors where regulated or sensitive data is
   the norm; `note` is where AI is already paying its way in that sector. */
const INDUSTRIES = {
  'software':      { short: 'Software and SaaS',
    note: 'In software, the early wins are in support, onboarding and the build-review-release cycle itself.' },
  'ai-data':       { short: 'AI and data products',
    note: 'For an AI or data product, the discipline that pays is automated accuracy testing: every failure becomes a permanent test case.' },
  'it-services':   { short: 'IT and managed services',
    note: 'In IT and managed services, ticket triage, runbook automation and client reporting are where AI is taking on real volume.' },
  'cybersecurity': { short: 'Cybersecurity', regulated: true,
    note: 'In cybersecurity, AI is taking on alert triage, investigation summaries and compliance evidence, always behind a human decision.' },
  'retail':        { short: 'Retail and e-commerce',
    note: 'In retail and e-commerce, product content, customer service, demand forecasting and personalised merchandising are the proven starting points.' },
  'consumer':      { short: 'Consumer brands and D2C',
    note: 'For consumer brands, AI is paying off in content production, customer service and reading reviews and social feedback at scale.' },
  'hospitality':   { short: 'Food, hospitality and travel',
    note: 'In hospitality and travel, bookings and guest messaging, review responses, staff scheduling and dynamic pricing are the common first moves.' },
  'media':         { short: 'Media, entertainment and gaming',
    note: 'In media and entertainment, AI is taking on research, localisation, metadata and first drafts, with rights and attribution checked by a person.' },
  'marketing':     { short: 'Marketing and creative agencies',
    note: 'For agencies, AI is compressing briefs, first drafts, variations and reporting, which frees senior time for strategy and client judgment.' },
  'fintech':       { short: 'Banking, payments and fintech', regulated: true,
    note: 'In financial services, onboarding and identity checks, fraud and transaction review, and customer service are where AI is moving fastest, under strict audit.' },
  'insurance':     { short: 'Insurance', regulated: true,
    note: 'In insurance, claims intake and triage, document extraction and underwriting support are the leading uses, with a person on every decision that affects a customer.' },
  'accounting':    { short: 'Accounting, tax and audit', regulated: true,
    note: 'In accounting and tax, reconciliation, document extraction, month-end close and first-pass review are taking the most hours off the team.' },
  'legal':         { short: 'Legal services', regulated: true,
    note: 'In legal work, AI is drafting, reviewing contracts, doing research and summarising matters, with privilege and client confidentiality as hard limits.' },
  'consulting':    { short: 'Consulting and professional services',
    note: 'In consulting and professional services, research, proposal drafting, meeting notes and turning past work into reusable knowledge are the quickest wins.' },
  'real-estate':   { short: 'Real estate and property',
    note: 'In real estate, listing content, lead follow-up, tenant communications and lease and document review are the common starting points.' },
  'healthcare':    { short: 'Healthcare and digital health', regulated: true,
    note: 'In healthcare, clinical documentation, patient messaging, scheduling and billing and coding are where AI is easing the load, with clinicians keeping every clinical decision.' },
  'life-sciences': { short: 'Pharma, biotech and life sciences', regulated: true,
    note: 'In life sciences, literature and data review, regulatory document drafting and trial operations are the leading uses, under validated, audited processes.' },
  'manufacturing': { short: 'Manufacturing and industrial',
    note: 'In manufacturing, quality inspection, maintenance prediction, supplier documents and shop-floor knowledge capture are the proven first projects.' },
  'logistics':     { short: 'Logistics, supply chain and transport',
    note: 'In logistics, document processing, exception handling, customer updates and route and demand planning are where AI is carrying real volume.' },
  'energy':        { short: 'Energy, utilities and climate tech', regulated: true,
    note: 'In energy and utilities, asset monitoring, field-service support, customer service and regulatory reporting are the common starting points.' },
  'construction':  { short: 'Construction and engineering',
    note: 'In construction and engineering, bid and tender preparation, document control, site reporting and safety records are where time is being saved first.' },
  'agriculture':   { short: 'Agriculture and food production',
    note: 'In agriculture and food production, yield and demand planning, traceability records and supplier and compliance paperwork are the practical first uses.' },
  'automotive':    { short: 'Automotive and mobility',
    note: 'In automotive and mobility, service and warranty operations, parts and dealer support, and fleet data analysis are where AI is being put to work.' },
  'telecom':       { short: 'Telecommunications', regulated: true,
    note: 'In telecoms, customer service, network operations triage and churn prediction are the established uses.' },
  'education':     { short: 'Education and e-learning', regulated: true,
    note: 'In education, course content, tutoring support, marking assistance and student services are the fast-growing uses, with learner data handled carefully.' },
  'hr':            { short: 'HR, recruiting and staffing', regulated: true,
    note: 'In HR and recruiting, job descriptions, candidate screening support, onboarding and employee questions are the common starts, with a person on every hiring decision.' },
  'public':        { short: 'Public sector and government', regulated: true,
    note: 'In the public sector, casework summaries, correspondence drafting, policy research and citizen enquiries lead, under strict transparency and records rules.' },
  'nonprofit':     { short: 'Non-profit and social impact',
    note: 'For non-profits, grant writing, donor communications, impact reporting and volunteer coordination are where a small team gets the most back.' },
  'other':         { short: 'Other',
    note: 'Whatever the sector, the first return usually comes from the recurring task that costs the most hours and already has a written procedure.' }
};

const orgOf = c => ORG_TYPES[c.org] || ORG_TYPES[SEGMENT_TO_ORG[c.stage]] || ORG_TYPES['startup-seed'];
const journeyPhase = c => (JOURNEYS[c.journey] || JOURNEYS['product-fit']).phase;
const preProduct = c => journeyPhase(c) === 'pre';
const inMarket = c => ['market', 'established'].includes(journeyPhase(c));
const industryRegulated = c => !!(INDUSTRIES[c.industry] || {}).regulated;

/* The vocabulary each sector uses for the same parts. `who` replaces "customer" in
   every part's text and prompt, `work` names the recurring back-office procedures an
   operations agent takes on first, and `guard` is the data line a prompt must never
   cross. Deterministic on purpose: the same answers still give the same words. */
const DEFAULT_WORK = 'reconciliation, invoice chasing, the monthly pack and exception handling';
const INDUSTRY_TERMS = {
  'software':      { who: ['customer', 'customers'], work: 'subscription billing checks, usage reports, renewal chasing and access requests' },
  'ai-data':       { who: ['customer', 'customers'], work: 'data-quality checks, usage and cost reports, dataset access requests and model evaluation runs' },
  'it-services':   { who: ['client', 'clients'], work: 'ticket triage, patch and licence reports, client status reports and runbook steps',
    guard: 'client credentials and one client\'s systems data never reach another client\'s work' },
  'cybersecurity': { who: ['client', 'clients'], work: 'alert triage summaries, compliance evidence collection, vulnerability reports and access reviews',
    guard: 'client security findings and credentials stay inside the approved case system' },
  'retail':        { who: ['shopper', 'shoppers'], work: 'product listings, stock reconciliation, returns and refunds, and supplier invoices' },
  'consumer':      { who: ['customer', 'customers'], work: 'product content, review responses, retailer and distributor reports, and order exceptions' },
  'hospitality':   { who: ['guest', 'guests'], work: 'booking changes, guest messages, review responses, rota planning and supplier invoices' },
  'media':         { who: ['subscriber', 'subscribers'], work: 'metadata and tagging, rights and licensing checks, localisation and performance reports' },
  'marketing':     { who: ['client', 'clients'], work: 'campaign reports, briefs, asset variations, timesheets and client invoices',
    guard: 'one client\'s briefs, data and results never reach another client\'s work' },
  'fintech':       { who: ['customer', 'customers'], work: 'onboarding and identity checks, transaction review queues, reconciliations and regulatory reports',
    guard: 'account and payment data stay in approved systems, and no decision about a customer\'s money is made without a named person' },
  'insurance':     { who: ['policyholder', 'policyholders'], work: 'claims intake, document extraction, policy renewals and broker and bordereaux reports',
    guard: 'no claim or cover decision is made without a named person, and personal and health details stay in approved systems' },
  'accounting':    { who: ['client', 'clients'], work: 'bank reconciliations, receipt and invoice capture, month-end close checklists and tax return preparation',
    guard: 'client financial records stay in the practice systems, and every filing is signed off by a qualified person' },
  'legal':         { who: ['client', 'clients'], work: 'contract first review, matter summaries, time recording, conflict checks and court and filing deadlines',
    guard: 'privileged and confidential client material never leaves approved systems, and no advice goes out unreviewed' },
  'consulting':    { who: ['client', 'clients'], work: 'proposals, research packs, meeting notes, timesheets and client status reports',
    guard: 'one client\'s material never reaches another client\'s work' },
  'real-estate':   { who: ['client', 'clients'], work: 'listing copy, viewing and lead follow-up, tenant requests, lease review and rent reconciliation' },
  'healthcare':    { who: ['patient', 'patients'], work: 'referral letters, appointment scheduling, prior authorisations, clinical coding and billing',
    guard: 'patient health information stays in approved systems, and no clinical decision is made without a clinician' },
  'life-sciences': { who: ['customer', 'customers'], work: 'literature screening, regulatory document drafts, trial site paperwork and quality records',
    guard: 'patient and trial data stay in validated systems, and every regulated document is approved by a named person' },
  'manufacturing': { who: ['customer', 'customers'], work: 'purchase orders, supplier certificates, quality and inspection records, and maintenance logs' },
  'logistics':     { who: ['customer', 'customers'], work: 'proof-of-delivery checks, carrier invoice reconciliation, customs paperwork and delay notices' },
  'energy':        { who: ['customer', 'customers'], work: 'meter and billing exceptions, field-service reports, asset inspection records and regulatory returns',
    guard: 'customer account data and operational network data stay in approved systems' },
  'construction':  { who: ['client', 'clients'], work: 'tender documents, site diaries, variation and change orders, and safety records' },
  'agriculture':   { who: ['buyer', 'buyers'], work: 'traceability records, supplier and certification paperwork, yield reports and order confirmations' },
  'automotive':    { who: ['customer', 'customers'], work: 'service bookings, warranty claims, parts orders and dealer reports' },
  'telecom':       { who: ['subscriber', 'subscribers'], work: 'billing disputes, number porting, network incident summaries and regulatory reports',
    guard: 'subscriber data and call records stay in approved systems' },
  'education':     { who: ['learner', 'learners'], work: 'course materials, marking support, enrolment and admissions queries, and attendance reports',
    guard: 'learner records stay in approved systems, and grades are confirmed by a teacher' },
  'hr':            { who: ['candidate', 'candidates'], work: 'job descriptions, screening summaries, interview scheduling, onboarding packs and payroll queries',
    guard: 'candidate and employee data stay in approved systems, and no hiring decision is made without a person' },
  'public':        { who: ['citizen', 'citizens'], work: 'casework summaries, correspondence drafts, freedom-of-information requests and service reports',
    guard: 'personal data stays in approved systems, and no decision about a person is made without a named official' },
  'nonprofit':     { who: ['supporter', 'supporters'], work: 'grant applications, donor thank-yous, gift reconciliation and impact reports' },
  'other':         { who: ['customer', 'customers'] }
};

const industryTerms = c => INDUSTRY_TERMS[c.industry] || INDUSTRY_TERMS.other;

/* Rewrites one piece of generic text in this business's vocabulary. */
function localize(text, c) {
  if (typeof text !== 'string') return text;
  const t = industryTerms(c);
  const [one, many] = t.who;
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1);
  return text
    .replace(/\{work\}/g, t.work || DEFAULT_WORK)
    .replace(/\bCustomers\b/g, cap(many)).replace(/\bcustomers\b/g, many)
    .replace(/\bCustomer\b/g, cap(one)).replace(/\bcustomer\b/g, one);
}

/* One line of context that leads every indicative prompt, so a pasted prompt already
   knows what kind of business it is working for and what it must never do. */
function promptContext(c) {
  const t = industryTerms(c);
  const lower = w => w.charAt(0).toLowerCase() + w.slice(1);
  const org = c.org === 'solo' ? 'solo business' : lower(orgOf(c).short);
  const ind = INDUSTRIES[c.industry] || INDUSTRIES['other'];
  const who = `We are ${/^[aeiou]/.test(org) ? 'an' : 'a'} ${org} in ${lower(ind.short)}.`;
  const guard = t.guard || (has(c, 'regulated') ? 'regulated and personal data stays in approved systems' : '');
  return guard ? `${who} Hard limit: ${guard}.` : who;
}
