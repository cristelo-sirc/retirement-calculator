// tests/sustainable-spending.test.js — V19.9 (B2) permanent invariants for the "Safe to spend"
// solver. The audit found it could report "$20,000 safe" for a 0/100 plan, cap the answer below
// its true maximum, and never verify the figure at the headline path count. The rebuilt solver:
//   • adaptively brackets (walks the floor down toward $0; expands the ceiling up while it passes),
//   • bisects at a fast sample, then VERIFIES at the full path count and steps down until it truly
//     clears the ~90% target,
//   • returns null ("unavailable") when NO spending level — down to $0 — reaches the target.
//
// Per Cris's V19.9 decision, the figure is a FAST ESTIMATE (bisection at the fast sample, labeled
// "~" / "estimate" in the UI) rather than a full-count-verified number — chosen to keep live
// recompute ~1s. So the core invariants are: (1) the returned figure lands NEAR the ~90% boundary
// (within sample noise), and clearly separates from a much-higher spend; (2) an infeasible plan
// returns null instead of a false $20k floor; (3) the ceiling expands above the old cap.

const test = require('node:test');
const assert = require('node:assert');
const { loadAdapter } = require('./audit-helpers.js');

const A = loadAdapter();
const ME = A.engine;
const TARGET = 90;

// Keep the suite fast; the solver logic is identical at any path count.
function withDefaults(o) { return Object.assign({}, ME.DEFAULTS, { numPaths: 1500 }, o); }

test('B2. estimate lands near the ~90% boundary and is a real maximum (not a false floor)', () => {
  const plans = [
    withDefaults({}),                                              // baseline couple
    withDefaults({ spending: 60000 }),                            // lower spend
    withDefaults({ hasPartner: false, ssBenefit: 30000, userPreTax: 900000, taxable: 100000 }),
  ];
  for (const p of plans) {
    const r = ME.compute(p);
    assert.notEqual(r.sustainableSpending, undefined, 'field present');
    if (r.sustainableSpending != null) {
      // The estimate re-scores near the target (allow sample noise vs the full headline count).
      const scored = ME.compute(Object.assign({}, p, { spending: r.sustainableSpending })).successRate;
      assert.ok(scored >= TARGET - 4, `safe-to-spend ${r.sustainableSpending} re-scored ${scored}, should be near ${TARGET}`);
      // And $20k above it should clearly fall below target — proving it's a maximum, not a floor.
      const above = ME.compute(Object.assign({}, p, { spending: r.sustainableSpending + 20000 })).successRate;
      assert.ok(above < TARGET, `spending +$20k scored ${above}, should drop below ${TARGET}`);
    }
  }
});

test('B2. infeasible plans report "unavailable" (null), never a false $20k floor', () => {
  // No assets, no income: nothing funds any spending, and every path is broke from year one.
  const noAssets = withDefaults({
    userPreTax: 0, userRoth: 0, spousePreTax: 0, spouseRoth: 0, taxable: 0,
    ssBenefit: 0, spouseSS: 0, pension: 0, spousePension: 0, salary: 0, spouseSalary: 0,
    hasPartner: false, currentAge: 65, retireAge: 66,
  });
  assert.equal(ME.compute(noAssets).sustainableSpending, null, 'no-assets plan is unavailable');

  // A legacy goal no spending level can reach on a modest portfolio.
  const poorBigGoal = withDefaults({
    userPreTax: 100000, userRoth: 0, spousePreTax: 0, spouseRoth: 0, taxable: 0,
    hasPartner: false, ssBenefit: 20000, legacyGoal: 5000000, currentAge: 65, retireAge: 66,
  });
  assert.equal(ME.compute(poorBigGoal).sustainableSpending, null, 'unreachable-goal plan is unavailable');
});

test('B2. the ceiling expands above the old max($80k, 2×spending) cap when the plan stays safe', () => {
  // High guaranteed income + low entered spending: the true safe level is well above the old cap.
  const highIncome = withDefaults({
    ssBenefit: 60000, spouseSS: 60000, pension: 60000, spousePension: 40000,
    spending: 40000, userPreTax: 500000,
  });
  const r = ME.compute(highIncome);
  const oldCap = Math.max(80000, 40000 * 2); // = 80000
  assert.ok(r.sustainableSpending != null && r.sustainableSpending > oldCap,
    `safe-to-spend ${r.sustainableSpending} should exceed the old ${oldCap} cap`);
});

test('B2. deterministic — same plan yields the same safe-to-spend every time', () => {
  const p = withDefaults({});
  assert.equal(ME.compute(p).sustainableSpending, ME.compute(p).sustainableSpending);
});
