// V19.3 — Move-delta unification invariants.
// Loads the REAL engine plus the REAL adapter and proves the promises behind the
// single computeMoves() source that now feeds BOTH the Results move cards and the
// Try Changes comparison bars:
//   1. Exactness: computeMoves' own base run equals compute()'s headline successRate
//      (deterministic solver RNG => a re-run of the same plan is identical), so
//      passing the headline in as baseRate is a pure optimization, not an estimate.
//   2. One source: rate - base === delta for every move, and the combined run is
//      only present when asked for.
//   3. Determinism: two calls produce identical moves.
//   4. compute() no longer carries a separate levers list (the old proportional
//      sample that caused the +17-vs-+19 mismatch is gone).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadEngineAndAdapter() {
  const engineSource = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'real-engine.js'), 'utf8');
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
  return context.window.MockEngine;
}

const engine = loadEngineAndAdapter();

// Small path count keeps the test fast; the invariants are path-count independent.
const FAST = { numPaths: 500 };

test('computeMoves base equals compute() headline (baseRate reuse is exact, not an estimate)', () => {
  const m = { ...engine.DEFAULTS, ...FAST };
  const res = engine.compute(m);
  const own = engine.computeMoves(m);                       // computes its own base run
  const reused = engine.computeMoves(m, res.successRate);   // reuses the headline
  assert.equal(own.base, res.successRate, 'independent base run must match the headline');
  assert.deepEqual(
    own.moves.map(x => [x.id, x.rate, x.delta]),
    reused.moves.map(x => [x.id, x.rate, x.delta]),
    'moves must be identical whether or not the base is reused'
  );
});

test('every move satisfies rate - base === delta; combined only when requested', () => {
  const m = { ...engine.DEFAULTS, ...FAST };
  const res = engine.compute(m);
  const noCombo = engine.computeMoves(m, res.successRate);
  assert.equal(noCombo.combined, null);
  const withCombo = engine.computeMoves(m, res.successRate, { includeCombined: true });
  assert.ok(withCombo.combined && typeof withCombo.combined.rate === 'number');
  assert.equal(withCombo.combined.delta, withCombo.combined.rate - withCombo.base);
  for (const mv of withCombo.moves) {
    assert.equal(mv.delta, mv.rate - withCombo.base, `${mv.id}: delta must be rate - base`);
    assert.ok(mv.title && mv.detail && mv.note, `${mv.id}: display fields present`);
  }
  // SS move skipped once already claiming at 70 (nothing to move).
  const at70 = engine.computeMoves({ ...m, ssClaimAge: 70, spouseClaimAge: 70 }, null);
  assert.ok(!at70.moves.some(x => x.id === 'ss'));
});

test('computeMoves is deterministic (same plan, same numbers, every time)', () => {
  const m = { ...engine.DEFAULTS, ...FAST };
  const a = engine.computeMoves(m, null, { includeCombined: true });
  const b = engine.computeMoves(m, null, { includeCombined: true });
  assert.deepEqual(a, b);
});

test('compute() no longer returns a separate levers list', () => {
  const res = engine.compute({ ...engine.DEFAULTS, ...FAST });
  assert.equal(res.levers, undefined, 'the old proportional levers sample must be gone');
});
