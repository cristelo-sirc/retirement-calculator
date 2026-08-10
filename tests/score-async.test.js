// tests/score-async.test.js — V19.19
// scoreAsync() exists so the Welcome screen can show a live score without freezing the page
// for the ~7s a full compute() takes. It is only safe if it produces EXACTLY the number
// compute() would, for the same plan — otherwise Welcome and the Cover would disagree about
// the same plan, which is the cross-screen drift the V18.5 seeding fix eliminated.
//
// Chunking cannot change the result by construction (each path is seeded from SEED_BASE plus
// its own index), but "by construction" is an argument, not evidence. These are the evidence.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAdapter } = require('./audit-helpers.js');

const ad = loadAdapter();
const ME = ad.engine;
const DEFAULTS = ad.DEFAULTS;

const scoreOf = (params) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('scoreAsync never called back')), 120000);
  ME.scoreAsync(params, (r) => { clearTimeout(timer); resolve(r); });
});

// A small path count keeps the suite quick; the chunking logic is identical at any count,
// and one full-count case below proves it holds at the real 5,000.
const fast = (over) => ({ ...DEFAULTS, numPaths: 600, ...over });

test('scoreAsync matches compute() on the untouched defaults', async () => {
  const p = fast();
  const a = await scoreOf(p);
  const b = ME.compute(p);
  assert.equal(a.successRate, b.successRate);
  assert.equal(a.verdict, b.verdict);
  assert.equal(a.verdictWord, b.verdictWord);
});

test('scoreAsync matches compute() across a spread of plans', async () => {
  const cases = [
    fast({ currentAge: 58, spouseAge: 56, retireAge: 65 }),
    fast({ hasPartner: false, currentAge: 45, retireAge: 60, spending: 60000 }),
    fast({ currentAge: 62, retireAge: 63, spending: 200000 }),          // should score badly
    fast({ userPreTax: 4000000, spending: 60000 }),                     // should score well
    fast({ legacyGoal: 500000 }),                                       // non-zero goal path
    fast({ enableGuardrails: true }),
    fast({ enableGlidePath: false, stockAllocation: 100 }),
  ];
  for (const p of cases) {
    const a = await scoreOf(p);
    const b = ME.compute(p);
    assert.equal(a.successRate, b.successRate,
      `mismatch for ${JSON.stringify({ age: p.currentAge, spend: p.spending, goal: p.legacyGoal })}`);
  }
});

test('scoreAsync matches compute() at the real 5,000-path count', async () => {
  const p = { ...DEFAULTS, currentAge: 58, spouseAge: 56, retireAge: 65 };
  const a = await scoreOf(p);
  const b = ME.compute(p);
  assert.equal(a.numPaths, 5000);
  assert.equal(a.successRate, b.successRate);
});

test('scoreAsync is repeatable — same plan, same number, every time', async () => {
  const p = fast({ currentAge: 58 });
  const runs = [await scoreOf(p), await scoreOf(p), await scoreOf(p)];
  assert.equal(new Set(runs.map(r => r.successRate)).size, 1);
});

test('scoreAsync honours a legacy goal the same way compute() does', async () => {
  const withGoal = fast({ legacyGoal: 1000000 });
  const noGoal = fast({ legacyGoal: 0 });
  const a = await scoreOf(withGoal), b = await scoreOf(noGoal);
  assert.equal(a.successRate, ME.compute(withGoal).successRate);
  assert.ok(a.successRate <= b.successRate, 'a legacy goal cannot raise the score');
});

test('scoreAsync yields between slices rather than blocking straight through', async () => {
  // If it ran in one synchronous burst the callback would fire before any other queued
  // macrotask. A timer queued alongside it must get a turn first.
  let timerRan = false;
  const p = { ...DEFAULTS, numPaths: 3000 };
  const done = new Promise(resolve => ME.scoreAsync(p, resolve));
  setTimeout(() => { timerRan = true; }, 0);
  await done;
  assert.equal(timerRan, true, 'the main thread was never yielded');
});

test('cancelling stops the run and the callback never fires', async () => {
  let called = false;
  const cancel = ME.scoreAsync({ ...DEFAULTS, numPaths: 5000 }, () => { called = true; });
  cancel();
  await new Promise(r => setTimeout(r, 400));
  assert.equal(called, false);
});
