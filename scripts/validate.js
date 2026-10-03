const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('--- Validating AI-Native Flow Project ---');

// 1. Check required entrypoints & assets
const requiredFiles = [
  'index.html',
  'assets/css/app.css',
  'assets/js/profile.js',
  'assets/js/kb.js',
  'assets/js/kb-company.js',
  'assets/js/engine.js',
  'assets/js/engine-views.js',
  'assets/js/graph.js',
  'assets/js/network.js',
  'assets/js/activate.js',
  'assets/js/peek.js',
  'assets/js/app.js'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`[ERROR] Missing required file: ${file}`);
    process.exit(1);
  }
}
console.log(`[PASS] All ${requiredFiles.length} core files present.`);

// 2. Syntax check JS files
const jsFiles = fs.readdirSync('assets/js').filter(f => f.endsWith('.js'));
for (const f of jsFiles) {
  const fullPath = path.join('assets/js', f);
  try {
    execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`[ERROR] Syntax error in ${fullPath}:`, err.message);
    process.exit(1);
  }
}
console.log(`[PASS] Syntax check passed on ${jsFiles.length} JavaScript files.`);

// 3. Engine verification test
try {
  const profile = fs.readFileSync('assets/js/profile.js', 'utf8');
  const kb = fs.readFileSync('assets/js/kb.js', 'utf8');
  const kbCompany = fs.readFileSync('assets/js/kb-company.js', 'utf8');
  const engine = fs.readFileSync('assets/js/engine.js', 'utf8');
  const engineViews = fs.readFileSync('assets/js/engine-views.js', 'utf8');

  // Evaluate in sandbox
  const vm = require('vm');
  const ctx = {
    console,
    Math,
    Date,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat
  };
  vm.createContext(ctx);
  vm.runInContext(profile + '\n' + kb + '\n' + kbCompany + '\n' + engine + '\n' + engineViews, ctx);

  const testCases = [
    { org: 'startup-seed', journey: 'product-fit', industry: 'software', domain: 'saas', goal: 'ship-faster', engineers: 'small', budget: 'to2k', constraints: [] },
    { org: 'enterprise-large', journey: 'established', industry: 'fintech', domain: 'services', goal: 'compliance', engineers: 'large', budget: 'over10k', constraints: ['regulated'] },
    { org: 'solo', journey: 'idea', industry: 'ecommerce', domain: 'ecommerce', goal: 'validate', engineers: 'none', budget: 'under200', constraints: [] }
  ];

  for (const tc of testCases) {
    const bp = ctx.buildFullBlueprint(tc);
    if (!bp || !bp.tier || !bp.metrics || bp.metrics.length === 0) {
      throw new Error(`Failed to generate full blueprint for ${tc.org}`);
    }
    const sc = ctx.computeOutcomeScorecard(bp);
    if (!sc || typeof sc.flowScore !== 'number') {
      throw new Error(`Failed to compute outcome scorecard for ${tc.org}`);
    }
    const rsc = ctx.computeRiskScorecard(bp.risks, tc, bp.tier);
    if (!rsc || typeof rsc.total !== 'number' || rsc.total === 0) {
      throw new Error(`Failed to compute risk scorecard for ${tc.org}`);
    }
    if (!bp.risks || bp.risks.length === 0 || !bp.risks[0].impact) {
      throw new Error(`Risks missing rich impact metadata for ${tc.org}`);
    }
  }

  console.log('[PASS] Blueprint engine, measurement, and risk simulations passed.');
} catch (err) {
  console.error('[ERROR] Engine validation failed:', err);
  process.exit(1);
}

console.log('--- All Build & Validation Checks Passed! ---');
