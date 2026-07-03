// V19.2 — Year-by-year table invariants.
// Loads the REAL engine plus the REAL adapter into one sandbox, runs compute(),
// and proves the table's promises with executable checks:
//   1. Average view rows reconcile exactly (the permanent engine spot-check):
//        end = start*(1+r) + contributions - withdrawals + windfall(that age)
//      where r = stockAlloc*stockReturn + (1-stockAlloc)*bondReturn (vol=0).
//   2. Rows chain: each row's end balance equals the next row's start balance.
//   3. Rough-view insolvency: the depletionAge equals the first insolvent row's
//      balanceAge, and rows exist for every simulated year.
//   4. Determinism: two computes produce identical Average rows.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEngineAndAdapter() {
  const engineSource = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'real-engine.js'), 'utf8')
    .replace('window.MockEngine = {', 'window.__mapToReal = mapToReal; window.MockEngine = {');
  const emptyList = [];
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return emptyList; },
    createElement() { return { style: {}, click() {}, setAttribute() {}, appendChild() {} }; },
    head: { appendChild() {} },
    body: { style: {}, appendChild() {}, classList: { add() {}, remove() {}, contains() { return false; } } }
  };
  const window = {
    addEventListener() {}, innerWidth: 1280, innerHeight: 720, scrollY: 0,
    location: { origin: '', pathname: '', search: '' },
    history: { replaceState() {} },
    URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
    confirm() { return false; }
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
  return { engine: context.window.MockEngine, mapToReal: context.window.__mapToReal };
}

const { engine, mapToReal } = loadEngineAndAdapter();

// Small path count keeps the test fast; the invariants are path-count independent.
const FAST = { numPaths: 500 };

function reconcile(view, real, m) {
  // Returns the largest absolute reconciliation error across solvent rows.
  let worst = 0;
  const rows = view.rows;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r.solvent) break; // identity holds up to (not including) post-depletion zeroing
    const ret = r.stockAlloc * real.stockReturn + (1 - r.stockAlloc) * real.bondReturn;
    const windfall = (m.enableWindfall && r.age === m.windfallAge) ? m.windfallAmount : 0;
    const expected = r.startBalance * (1 + ret) + r.contributions - r.withdrawals + windfall;
    worst = Math.max(worst, Math.abs(expected - r.endBalance));
  }
  return worst;
}

test('Average view: every solvent row reconciles to within $1 (DEFAULTS plan)', () => {
  const m = engine.normalizeParams({ ...engine.DEFAULTS, ...FAST }).params;
  const real = mapToReal(m, m.numPaths);
  const res = engine.compute(m);
  assert.ok(res.yearTables, 'yearTables missing from compute()');
  const avg = res.yearTables.average;
  assert.equal(avg.rows.length, m.endAge - m.currentAge, 'one row per elapsed year');
  assert.ok(reconcile(avg, real, m) <= 1, `worst reconciliation error ${reconcile(avg, real, m)} > $1`);
});

test('Average view reconciles with windfall + Roth conversions + glide path off', () => {
  const m = engine.normalizeParams({
    ...engine.DEFAULTS, ...FAST,
    enableWindfall: true, windfallAmount: 250000, windfallAge: 70,
    enableRothConversion: true, rothConversionAmount: 40000,
    rothConversionStartAge: 66, rothConversionEndAge: 70,
    enableGlidePath: false
  }).params;
  const real = mapToReal(m, m.numPaths);
  const res = engine.compute(m);
  assert.ok(reconcile(res.yearTables.average, real, m) <= 1);
});

test('rows chain: end balance equals next row start balance (all three views)', () => {
  const m = engine.normalizeParams({ ...engine.DEFAULTS, ...FAST }).params;
  const res = engine.compute(m);
  ['average', 'rough', 'strong'].forEach(k => {
    const rows = res.yearTables[k].rows;
    for (let i = 0; i + 1 < rows.length; i++) {
      if (!rows[i].solvent) break;
      assert.ok(Math.abs(rows[i].endBalance - rows[i + 1].startBalance) <= 1,
        `${k}: row ${rows[i].age} end != row ${rows[i + 1].age} start`);
    }
  });
});

test('insolvent storyline: depletionAge matches the first insolvent row', () => {
  // Overspend so even the steady run depletes.
  const m = engine.normalizeParams({ ...engine.DEFAULTS, ...FAST, spending: 400000 }).params;
  const res = engine.compute(m);
  const avg = res.yearTables.average;
  assert.notEqual(avg.depletionAge, null, 'expected the overspent steady run to deplete');
  const firstBroke = avg.rows.find(r => !r.solvent);
  assert.ok(firstBroke, 'no insolvent row despite depletionAge');
  assert.equal(firstBroke.balanceAge, avg.depletionAge);
  assert.ok(firstBroke.endBalance < 1, 'depletion row should end below $1');
  // Rough view (worst decile) must be at least as bad as strong (best decile).
  const finalOf = k => res.yearTables[k].finalBalance;
  assert.ok(finalOf('rough') <= finalOf('strong'));
});

test('determinism: identical plans produce identical Average rows', () => {
  const m = engine.normalizeParams({ ...engine.DEFAULTS, ...FAST }).params;
  const a = engine.compute(m).yearTables.average.rows;
  const b = engine.compute(m).yearTables.average.rows;
  assert.deepEqual(a, b);
});
