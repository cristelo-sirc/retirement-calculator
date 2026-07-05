// V19.6 — Honest success scoring invariants.
// The headline reads "Chance of never running out." After V19.5's F-DEPLETED-WINDFALL
// fix, the end-state `solvent` flag CLEARS when a windfall revives a broke plan, so a
// path that spent years at $0 and later recovered was scored a success. V19.6 grades on
// the latching `everDepleted` flag instead. These executable checks prove:
//   1. `successOf` counts a broke-then-recovered path (everDepleted true, positive final
//      balance) as a FAILURE, and a never-dipped path as a SUCCESS.
//   2. The legacy goal still binds (never-broke but under goal => failure).
//   3. In the engine, `everDepleted` LATCHES: a path driven to $0 and then revived by a
//      windfall ends solvent with depletionAge cleared, yet everDepleted stays true and
//      firstDepletionAge records the original age.
//   4. compute()'s headline equals the everDepleted-based count on that same scenario, and
//      is strictly LOWER than the old solvent-based count would be (the whole point).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SEED_BASE = 0x5f3759df; // must match real-engine.js runPaths()

function loadEngineAndAdapter() {
  const engineSource = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'real-engine.js'), 'utf8')
    .replace('window.MockEngine = {',
      'window.__successOf = successOf; window.__depletionSummaryOf = depletionSummaryOf; '
      + 'window.__mapToReal = mapToReal; window.MockEngine = {');
  const emptyList = [];
  const document = {
    addEventListener() {}, getElementById() { return null; },
    querySelector() { return null; }, querySelectorAll() { return emptyList; },
    createElement() { return { style: {}, click() {}, setAttribute() {}, appendChild() {} }; },
    head: { appendChild() {} },
    body: { style: {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false; } } }
  };
  const window = {
    addEventListener() {}, innerWidth: 1280, innerHeight: 720, scrollY: 0,
    location: { origin: '', pathname: '', search: '' }, history: { replaceState() {} },
    URL: { createObjectURL() { return ''; }, revokeObjectURL() {} }, confirm() { return false; }
  };
  const context = {
    console, Math, Intl, Date, JSON, Promise, setTimeout, clearTimeout, URLSearchParams,
    Blob, document, window,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${engineSource}\n;window.simulatePath = simulatePath;`, context, { timeout: 20000 });
  vm.runInContext(adapterSource, context, { timeout: 20000 });
  return {
    engine: context.window.MockEngine,
    mapToReal: context.window.__mapToReal,
    successOf: context.window.__successOf,
    depletionSummaryOf: context.window.__depletionSummaryOf,
    simulatePath: context.window.simulatePath
  };
}

const { engine, mapToReal, successOf, depletionSummaryOf, simulatePath } = loadEngineAndAdapter();

test('successOf: broke-then-recovered path (positive final balance) scores as a FAILURE', () => {
  // A path that ends with money but hit $0 along the way must NOT count. This is the
  // exact case V19.5 recovery created and V19.6 fixes.
  assert.equal(successOf([{ everDepleted: true, solvent: true, finalBalance: 500000 }], 0), 0);
});

test('successOf: never-dipped path scores as a SUCCESS', () => {
  assert.equal(successOf([{ everDepleted: false, solvent: true, finalBalance: 500000 }], 0), 100);
});

test('successOf: legacy goal still binds — never-broke but under goal fails', () => {
  assert.equal(successOf([{ everDepleted: false, finalBalance: 100000 }], 200000), 0);
  assert.equal(successOf([{ everDepleted: false, finalBalance: 300000 }], 200000), 100);
});

test('successOf: mixed set counts only the never-depleted, goal-meeting paths', () => {
  const results = [
    { everDepleted: false, finalBalance: 400000 }, // success
    { everDepleted: true, finalBalance: 400000 },  // broke-then-recovered => fail
    { everDepleted: false, finalBalance: 0 },       // never broke, $0 end, goal 0 => success
    { everDepleted: true, finalBalance: 0 }          // fail
  ];
  assert.equal(successOf(results, 0), 50);
});

// Build a scenario guaranteed to go broke and then recover via a windfall, using zero
// volatility so the single path is deterministic and easy to reason about.
function brokeThenRecoverReal() {
  const m = engine.normalizeParams({
    hasPartner: false,
    currentAge: 60, retireAge: 60, endAge: 80,
    userPreTax: 100000, userRoth: 0, taxable: 0,
    spending: 120000,
    userSS: 0, ssClaimAge: 70,
    enableWindfall: true, windfallAmount: 3000000, windfallAge: 72
  }).params;
  const real = mapToReal(m, 1);
  real.stockVol = 0; real.bondVol = 0;         // deterministic single path
  return real;
}

test('engine: everDepleted LATCHES through a windfall recovery; firstDepletionAge records the original age', () => {
  const real = brokeThenRecoverReal();
  const res = simulatePath(real, 0);
  assert.equal(res.everDepleted, true, 'path went broke, so everDepleted must be true');
  assert.equal(res.firstDepletionAge != null, true, 'firstDepletionAge should be recorded');
  // The windfall at 72 revives it, so at the finish it is solvent again and depletionAge cleared...
  assert.equal(res.solvent, true, 'windfall should leave it solvent at the end');
  assert.equal(res.depletionAge, null, 'depletionAge clears on recovery (V19.5 behavior preserved)');
  // ...but everDepleted must NOT clear, and finalBalance is positive (recovered on paper).
  assert.equal(res.finalBalance > 0, true, 'recovered to a positive balance');
  // The old solvent-based test would have PASSED this ruinous path; the new one fails it.
  assert.equal(successOf([res], 0), 0, 'V19.6: broke-then-recovered scores as failure');
});

test('depletionSummaryOf: reports the share depleted and a median first-depletion age', () => {
  const results = [
    { everDepleted: false, firstDepletionAge: null },
    { everDepleted: true, firstDepletionAge: 62 },
    { everDepleted: true, firstDepletionAge: 66 },
    { everDepleted: true, firstDepletionAge: 70 }
  ];
  const d = depletionSummaryOf(results);
  assert.equal(d.everDepletedShare, 75);
  assert.equal(d.firstDepletionMedianAge, 66);
});

test('depletionSummaryOf: nothing depleted => share 0, no age', () => {
  const d = depletionSummaryOf([{ everDepleted: false, firstDepletionAge: null }]);
  assert.equal(d.everDepletedShare, 0);
  assert.equal(d.firstDepletionMedianAge, null);
});

test('compute(): headline equals the everDepleted-based count and is lower than the old solvent count', () => {
  // A real multi-path plan mirroring the reference finding: retire early, SS at 70, a
  // windfall that revives broke paths. The old solvent-based score would overstate safety.
  const params = {
    hasPartner: false,
    currentAge: 55, retireAge: 55, endAge: 90,
    userPreTax: 600000, userRoth: 0, taxable: 0,
    spending: 90000, userSS: 30000, ssClaimAge: 70,
    enableWindfall: true, windfallAmount: 1500000, windfallAge: 70,
    numPaths: 1500
  };
  const out = engine.compute(params);

  // Re-run the same deterministic paths to grade both ways independently.
  const m = engine.normalizeParams(params).params;
  const real = mapToReal(m, m.numPaths);
  real._solverDeterministic = true; real._solverSeedBase = SEED_BASE;
  const results = [];
  for (let i = 0; i < real.numPaths; i++) results.push(simulatePath(real, i));
  const goal = m.legacyGoal || 0;
  const newCount = Math.round(results.filter(r => !r.everDepleted && r.finalBalance >= goal).length / results.length * 100);
  const oldCount = Math.round(results.filter(r => r.solvent && r.finalBalance >= goal).length / results.length * 100);

  assert.equal(out.successRate, newCount, 'compute() headline uses the everDepleted rule');
  assert.equal(oldCount >= newCount, true, 'the old solvent rule can only be equal or more optimistic');
  assert.equal(newCount < oldCount, true, 'this scenario has broke-then-recovered paths, so honest score is strictly lower');
});
