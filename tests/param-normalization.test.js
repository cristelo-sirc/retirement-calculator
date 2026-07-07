// tests/param-normalization.test.js — V19.9 (B3).
//
// The shell now normalizes EVERY params write at one shared boundary (setParams), so the value
// the user sees, the value persisted to localStorage, the value written to a saved file, and the
// value the engine computes on are all identical. Previously cross-field rules ran only inside a
// private copy in compute(), so the form could show current age 65 / retirement 65 while the
// engine silently used retirement 66.
//
// Two properties make that guarantee hold, and both are tested here:
//   1. normalizeParams is IDEMPOTENT — normalizing an already-normalized state is a no-op. This is
//      what lets the shell store norm.params AND have compute() (which also normalizes) agree.
//   2. A contradictory edit is actually corrected (dependent field moves), and compute()'s
//      results.params equals the shell's normalized state exactly.

const test = require('node:test');
const assert = require('node:assert');
const { loadAdapter } = require('./audit-helpers.js');

const A = loadAdapter();
const ME = A.engine;

test('B3. normalizeParams is idempotent (no drift between stored state and engine state)', () => {
  const cases = [
    ME.DEFAULTS,
    Object.assign({}, ME.DEFAULTS, { currentAge: 65, retireAge: 65 }),          // age collision
    Object.assign({}, ME.DEFAULTS, { retireAge: 90, endAge: 88 }),              // end before retire
    Object.assign({}, ME.DEFAULTS, { hasPartner: true, spouseAge: 70, spouseRetireAge: 65 }),
    Object.assign({}, ME.DEFAULTS, { stockAllocation: 250, numPaths: 99999999 }), // out of range
  ];
  for (const raw of cases) {
    const once = ME.normalizeParams(raw).params;
    const twice = ME.normalizeParams(once).params;
    assert.deepEqual(twice, once, 'normalizing twice equals normalizing once');
  }
});

test('B3. a contradictory edit is corrected, and compute().params equals the normalized state', () => {
  // Raise current age to collide with retirement age; retirement must move ahead of it.
  const edited = Object.assign({}, ME.DEFAULTS, { currentAge: 65, retireAge: 65 });
  const norm = ME.normalizeParams(edited);
  assert.ok(norm.params.retireAge > norm.params.currentAge, 'retirement age corrected ahead of current age');
  assert.ok(norm.notes.includes('retireAge'), 'the change is reported in notes (so the UI can tell the user)');

  // What the engine computes on (results.params) must equal what the shell would store.
  const results = ME.compute(edited);
  assert.deepEqual(results.params, norm.params, 'results.params === shell-normalized params');
});

test('B3. an already-consistent edit produces no adjustment notes (banner stays hidden)', () => {
  const clean = Object.assign({}, ME.DEFAULTS, { spending: 100000 });
  const norm = ME.normalizeParams(clean);
  assert.equal(norm.notes.length, 0, 'a valid edit reports nothing to adjust');
});
