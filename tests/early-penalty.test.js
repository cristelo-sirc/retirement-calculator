// tests/early-penalty.test.js — V19.23: early-withdrawal penalty and the Rule of 55 switch.
//
// What the release changed: the engine can charge the 10% additional tax on pre-tax
// retirement-account money taken before 59 1/2 (IRC 72(t)), per person, when the adapter
// flags that person (userEarlyPenalty / spouseEarlyPenalty). The adapter flags a person
// unless the Rule of 55 lets them off: see earlyPenaltyApplies in cover-app/real-engine.js.
//
// The one-time release gate (old engine vs new, 15 plan variants x 5,000 paths, identical
// when nobody is flagged) was run on 2026-11-16 and is recorded in CLAUDE.md. The tests
// below are the permanent part.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const H = require('./audit-helpers.js');

const eng = H.loadFinancialEngine();
const ad = H.loadAdapter();
const { auditParams } = H;
const plain = x => JSON.parse(JSON.stringify(x));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: expected ${b}, got ${a}`);
const row = (log, age) => log.find(y => y.age === age);

// ---------------------------------------------------------------- engine: nobody flagged

test('R55-1 nobody flagged: absent, false and undefined flags give identical output and no penalty', () => {
  const scenarios = [
    auditParams({ currentAge: 52, retireAge: 52, endAge: 80, userPreTaxBalance: 1500000, lifestyleSpending: 70000 }),
    auditParams({ currentAge: 50, retireAge: 54, endAge: 80, spouseAge: 48, spouseRetireAge: 53, currentSalary: 90000,
      userPreTaxBalance: 700000, spousePreTaxBalance: 600000, taxableBalance: 100000, lifestyleSpending: 80000,
      enableGuardrails: true, guardrailMinSpending: 0.75, stockVol: 0.17, bondVol: 0.06, stockAllocation: 0.6 }),
  ];
  for (const p of scenarios) {
    for (const idx of [0, 1, 2]) {
      const absent = eng.simulatePath(Object.assign({}, p), idx);
      const off = eng.simulatePath(Object.assign({}, p, { userEarlyPenalty: false, spouseEarlyPenalty: false }), idx);
      const undef = eng.simulatePath(Object.assign({}, p, { userEarlyPenalty: undefined, spouseEarlyPenalty: undefined }), idx);
      assert.deepEqual(plain(off), plain(absent));
      assert.deepEqual(plain(undef), plain(absent));
      assert.ok(absent.log.every(y => y.earlyPenalty === 0), 'no penalty is ever logged when nobody is flagged');
    }
  }
});

// ---------------------------------------------------------------- engine: hand-checked years

// Single, $1M pre-tax, $60,000 spending, no inflation, flat 6% growth. 2026 single filer:
// standard deduction 16,100; 10% to 12,400; 12% to 50,400; then 22%.
//   no penalty:   W = 60,000 + (0.12W - 2,180)             -> W = 65,704.55, tax  5,704.55
//   full penalty: W = 60,000 + (0.22W - 8,830) + 0.10W     -> W = 75,250.00, tax  7,725.00, penalty 7,525.00
//   half penalty: W = 60,000 + (0.22W - 8,830) + 0.05W     -> W = 70,095.89, tax  6,591.10, penalty 3,504.79
// The engine stops refining a year once its tax bill moves by under $1, so it lands within $2.
test('R55-2 hand-checked: full penalty under 59, half at 59, none from 60', () => {
  const p = auditParams({ currentAge: 55, retireAge: 55, endAge: 70, userPreTaxBalance: 1000000,
    lifestyleSpending: 60000, userEarlyPenalty: true });
  const log = eng.simulatePath(p, 0).log;
  for (const age of [55, 56, 57, 58]) {
    const y = row(log, age);
    near(y.wdPreTax, 75250.00, 2, `age ${age} withdrawal`);
    near(y.earlyPenalty, 7525.00, 2, `age ${age} penalty`);
    near(y.taxBill - y.earlyPenalty, 7725.00, 2, `age ${age} income tax`);
    near(y.earlyPenalty, 0.10 * y.wdPreTax, 0.005, `age ${age} penalty is 10% of the withdrawal`);
  }
  const y59 = row(log, 59);
  near(y59.wdPreTax, 70095.89, 2, 'age 59 withdrawal');
  near(y59.earlyPenalty, 3504.79, 2, 'age 59 penalty');
  near(y59.taxBill - y59.earlyPenalty, 6591.10, 2, 'age 59 income tax');
  near(y59.earlyPenalty, 0.05 * y59.wdPreTax, 0.005, 'age 59 penalty is 5% of the withdrawal');
  for (const age of [60, 61, 65, 69]) {
    const y = row(log, age);
    assert.equal(y.earlyPenalty, 0, `age ${age} has no penalty`);
    near(y.wdPreTax, 65704.55, 2, `age ${age} withdrawal`);
    near(y.taxBill, 5704.55, 2, `age ${age} tax`);
  }
});

test('R55-3 each person is charged on their own account, age and flag', () => {
  // User 57 with a small account (drained first: the older partner's pre-tax goes first),
  // partner 54 with a large one. Both flagged.
  const p = auditParams({ currentAge: 57, retireAge: 57, endAge: 70, spouseAge: 54, spouseRetireAge: 54,
    userPreTaxBalance: 40000, spousePreTaxBalance: 2000000, lifestyleSpending: 80000,
    userEarlyPenalty: true, spouseEarlyPenalty: true });
  const both = eng.simulatePath(p, 0).log;
  for (const y of both) {
    const partnerAge = y.age - 3;
    const expectedRate = partnerAge < 59 ? 0.10 : (partnerAge < 60 ? 0.05 : 0);
    if (y.age === 57) continue;   // the year both accounts are drawn is checked below
    near(y.earlyPenalty, expectedRate * y.wdPreTax, 0.01, `user ${y.age} / partner ${partnerAge}`);
  }
  // Only the user flagged: the first year charges the user's own withdrawal alone
  // (the whole $40,000 account plus a year of 6% growth), then nothing.
  const userOnly = eng.simulatePath(Object.assign({}, p, { spouseEarlyPenalty: false }), 0).log;
  near(userOnly[0].earlyPenalty, 0.10 * 40000 * 1.06, 0.01, 'user-only penalty in the first year');
  assert.ok(userOnly.slice(1).every(y => y.earlyPenalty === 0), 'no penalty once the flagged account is empty');
  // Only the partner flagged: the user's withdrawal is free, the partner's is charged.
  const partnerOnly = eng.simulatePath(Object.assign({}, p, { userEarlyPenalty: false }), 0).log;
  near(partnerOnly[0].earlyPenalty, 0.10 * (partnerOnly[0].wdPreTax - 40000 * 1.06), 0.01, 'partner-only penalty in the first year');
});

test('R55-4 Roth and taxable withdrawals and Roth conversions are never penalized', () => {
  const flagged = { userEarlyPenalty: true, spouseEarlyPenalty: true };
  const cases = [
    auditParams({ currentAge: 52, retireAge: 52, endAge: 59, taxableBalance: 2000000, lifestyleSpending: 70000 }),
    auditParams({ currentAge: 52, retireAge: 52, endAge: 59, userRothBalance: 2000000, lifestyleSpending: 70000 }),
    // Conversions run from pre-tax while the taxable account pays the bills.
    auditParams({ currentAge: 52, retireAge: 52, endAge: 59, taxableBalance: 2000000, userPreTaxBalance: 800000,
      lifestyleSpending: 70000, enableRothConversion: true, rothConversionAmount: 60000,
      rothConversionStartAge: 52, rothConversionEndAge: 58 }),
  ];
  for (const p of cases) {
    const on = eng.simulatePath(Object.assign({}, p, flagged), 0);
    assert.ok(on.log.every(y => y.wdPreTax === 0), 'scenario draws no discretionary pre-tax money');
    assert.ok(on.log.every(y => y.earlyPenalty === 0), 'so no penalty is charged');
    assert.deepEqual(plain(on), plain(eng.simulatePath(Object.assign({}, p), 0)));
  }
});

// ---------------------------------------------------------------- engine: cash identity

test('R55-5 household-cash identity holds with the penalty charged (it is part of the tax bill)', () => {
  let scenarios = 0, charged = 0;
  const bad = [];
  for (const b of [{ userPreTaxBalance: 1500000 }, { taxableBalance: 300000, userPreTaxBalance: 1200000 },
    { userPreTaxBalance: 700000, taxableBalance: 300000, userRothBalance: 500000 },
    { userPreTaxBalance: 600000, spousePreTaxBalance: 900000, spouseAge: 49, spouseRetireAge: 50 }])
    for (const sp of [50000, 90000, 150000])
      for (const inc of [{}, { pension: 20000, pensionAge: 52 }, { userSS: 30000, userClaimAge: 62 }])
        for (const cv of [{}, { enableRothConversion: true, rothConversionAmount: 80000, rothConversionStartAge: 53, rothConversionEndAge: 60 }])
          for (const st of [0, 0.05])
            for (const g of [{}, { enableGuardrails: true, guardrailCeiling: 0.06, guardrailFloor: 0.04, guardrailAdjustment: 0.10, guardrailMinSpending: 0.75 }]) {
              const p = auditParams(Object.assign({ currentAge: 52, retireAge: 52, endAge: 75, lifestyleSpending: sp,
                stateTaxRate: st, userEarlyPenalty: true, spouseEarlyPenalty: true,
                lifestyleInflation: 0.025, bracketGrowth: 0.025 }, b, inc, cv, g));
              const log = eng.simulatePath(p, 0).log;
              scenarios++;
              let pen = 0;
              for (let i = 0; i < log.length; i++) {
                const y = log[i];
                pen += y.earlyPenalty;
                if (y.isSolvent === false) continue;
                if (p.spouseAge > 0 && (p.spouseAge + i) < p.spouseRetireAge) continue;
                const sources = (y.ssIncome || 0) + (y.pensionIncome || 0) + (y.partTimeIncome || 0) + (y.wages || 0) + (y.rmd || 0) + (y.totalWithdrawal || 0);
                const uses = (y.spending || 0) + (y.taxBill || 0) + (y.surplusBanked || 0);
                if (Math.abs(sources - uses) > 2) bad.push({ age: y.age, diff: Math.round((sources - uses) * 100) / 100 });
              }
              if (pen > 0) charged++;
            }
  assert.equal(bad.length, 0, `unfunded years: ${JSON.stringify(bad.slice(0, 5))}`);
  assert.ok(charged > scenarios * 0.9, `the grid must exercise the penalty (${charged}/${scenarios})`);
});

// ---------------------------------------------------------------- engine: guardrail gauge

// The gauge is (this year's need + tax estimate + penalty estimate) / balance after growth.
// V19.23 keeps the penalty OUT of the carried tax estimate and estimates it from last year's
// pre-tax withdrawal at THIS year's rate. Each case pins the gauge to that formula from both
// sides: a ceiling 0.1% above it must not trim, a ceiling 0.1% below it must.
function gaugeCase(retireAge, checkAge, rateThisYear) {
  const base = auditParams({ currentAge: retireAge - 1, retireAge, endAge: 70, userPreTaxBalance: 1500000,
    lifestyleSpending: 60000, userEarlyPenalty: true, enableGuardrails: true,
    guardrailFloor: 0.001, guardrailAdjustment: 0.10, guardrailMinSpending: 0.5 });
  const free = eng.simulatePath(Object.assign({}, base, { guardrailCeiling: 0.99 }), 0).log;
  assert.ok(free.every(y => y.guardrailMult === 1), 'reference run never trims');
  const prev = row(free, checkAge - 1), cur = row(free, checkAge);
  const balance = cur.startingBalance * 1.06;
  const expected = (cur.spending + (prev.taxBill - prev.earlyPenalty) + prev.wdPreTax * rateThisYear) / balance;
  const carried = (cur.spending + prev.taxBill) / balance;   // what a naive carry-forward would use
  const above = eng.simulatePath(Object.assign({}, base, { guardrailCeiling: expected * 1.001 }), 0).log;
  const below = eng.simulatePath(Object.assign({}, base, { guardrailCeiling: expected * 0.999 }), 0).log;
  return { expected, carried, prev, above: row(above, checkAge).guardrailMult, below: row(below, checkAge).guardrailMult,
    earlierAbove: above.filter(y => y.age < checkAge).every(y => y.guardrailMult === 1),
    earlierBelow: below.filter(y => y.age < checkAge).every(y => y.guardrailMult === 1) };
}

test('R55-6 gauge counts the penalty at the full rate in a penalty year', () => {
  const g = gaugeCase(56, 57, 0.10);
  assert.ok(g.prev.earlyPenalty > 5000, 'the year before was a penalty year');
  assert.ok(g.earlierAbove && g.earlierBelow, 'no trim before the year under test');
  assert.equal(g.above, 1, 'ceiling just above the gauge: no trim');
  near(g.below, 0.9, 1e-9, 'ceiling just below the gauge: one trim');
});

test('R55-7 gauge counts half the penalty in the age-59 year', () => {
  const g = gaugeCase(58, 59, 0.05);
  assert.ok(g.prev.earlyPenalty > 5000, 'the year before was a full-penalty year');
  assert.ok(g.earlierAbove && g.earlierBelow, 'no trim before the year under test');
  assert.equal(g.above, 1, 'ceiling just above the gauge: no trim');
  near(g.below, 0.9, 1e-9, 'ceiling just below the gauge: one trim');
});

test('R55-8 gauge carries no penalty into the first penalty-free year', () => {
  const g = gaugeCase(59, 60, 0);
  assert.ok(g.prev.earlyPenalty > 2500, 'the year before was the half-penalty year');
  assert.ok(g.carried > g.expected * 1.02, 'a naive carry-forward would read clearly higher');
  assert.ok(g.earlierAbove && g.earlierBelow, 'no trim before the year under test');
  assert.equal(g.above, 1, 'ceiling just above the true gauge (and below the naive one): no trim');
  near(g.below, 0.9, 1e-9, 'ceiling just below the true gauge: one trim');
});

// ---------------------------------------------------------------- adapter: the Rule of 55 decision

test('R55-9 earlyPenaltyApplies: before 55 always charged, 55-59 follows the switch, 60+ never', () => {
  const f = ad.engine.earlyPenaltyApplies;
  for (const sw of [true, false, undefined]) {
    for (const age of [40, 50, 54]) assert.equal(f(sw, age), true, `retire ${age}, switch ${sw}`);
    for (const age of [60, 62, 67, 80]) assert.equal(f(sw, age), false, `retire ${age}, switch ${sw}`);
  }
  for (const age of [55, 56, 59]) {
    assert.equal(f(true, age), false, `retire ${age}, switch on`);
    assert.equal(f(undefined, age), false, `retire ${age}, switch missing counts as on`);
    assert.equal(f(false, age), true, `retire ${age}, switch off`);
  }
});

test('R55-10 mapToReal flags each person from their own switch and retirement age', () => {
  const norm = o => ad.engine.normalizeParams(Object.assign({}, ad.DEFAULTS, o)).params;
  let r = ad.mapToReal(norm({ currentAge: 50, retireAge: 55, spouseAge: 50, spouseRetireAge: 54 }), 500);
  assert.equal(r.userEarlyPenalty, false); assert.equal(r.spouseEarlyPenalty, true);
  r = ad.mapToReal(norm({ currentAge: 50, retireAge: 57, spouseAge: 50, spouseRetireAge: 58, penaltyFreeEarly: false }), 500);
  assert.equal(r.userEarlyPenalty, true); assert.equal(r.spouseEarlyPenalty, false);
  r = ad.mapToReal(norm({ hasPartner: false, currentAge: 50, retireAge: 52 }), 500);
  assert.equal(r.userEarlyPenalty, true); assert.equal(r.spouseEarlyPenalty, false, 'no partner, no partner flag');
  r = ad.mapToReal(norm({}), 500);   // the sample plan: both stop work at 65
  assert.equal(r.userEarlyPenalty, false); assert.equal(r.spouseEarlyPenalty, false);
});

test('R55-11 plans saved before V19.23 get the switch on, and keep their results at 55 or later', () => {
  const old = Object.assign({}, ad.DEFAULTS, { currentAge: 50, retireAge: 55, spouseAge: 50, spouseRetireAge: 56 });
  delete old.penaltyFreeEarly; delete old.spousePenaltyFreeEarly;
  const m = ad.engine.normalizeParams(old).params;
  assert.equal(m.penaltyFreeEarly, true); assert.equal(m.spousePenaltyFreeEarly, true);
  const real = ad.mapToReal(m, 200);
  const stripped = Object.assign({}, real); delete stripped.userEarlyPenalty; delete stripped.spouseEarlyPenalty;
  assert.deepEqual(plain(ad.runPaths(real)), plain(ad.runPaths(stripped)), 'identical to an engine that is never told about the penalty');
  // An untouched sample plan stored by an older version still reads as the sample plan.
  const oldSample = Object.assign({}, ad.DEFAULTS); delete oldSample.penaltyFreeEarly; delete oldSample.spousePenaltyFreeEarly;
  assert.deepEqual(plain(ad.engine.normalizeParams(oldSample).params), plain(ad.DEFAULTS));
});

test('R55-12 the switch changes the score only for someone who stops work at 55-59', () => {
  const score = o => { const m = ad.engine.normalizeParams(Object.assign({}, ad.DEFAULTS, { numPaths: 500 }, o)).params;
    return ad.successOf(ad.runPaths(ad.mapToReal(m, 500)), 0); };
  const early = { currentAge: 45, retireAge: 52, spouseAge: 45, spouseRetireAge: 52, spending: 80000, userPreTax: 1200000, spousePreTax: 600000 };
  assert.equal(score(Object.assign({ penaltyFreeEarly: true, spousePenaltyFreeEarly: true }, early)),
    score(Object.assign({ penaltyFreeEarly: false, spousePenaltyFreeEarly: false }, early)), 'before 55 the switch is inert');
  const late = { penaltyFreeEarly: false, spousePenaltyFreeEarly: false };
  assert.equal(score(late), score({}), 'at 60+ the switch is inert (sample plan)');
  const mid = { currentAge: 50, retireAge: 55, spouseAge: 50, spouseRetireAge: 55, spending: 100000, userPreTax: 1100000, spousePreTax: 500000 };
  assert.ok(score(Object.assign({}, mid, late)) < score(mid), 'at 55-59 turning it off lowers the score');
});

test('R55-13 the "Delay retirement" card scores the same plan that tapping it produces', () => {
  // Stops work at 54 (charged). Two years later is 56, where the Rule of 55 applies.
  const plan = Object.assign({}, ad.DEFAULTS, { numPaths: 500, currentAge: 48, retireAge: 54, spouseAge: 48, spouseRetireAge: 60,
    spending: 85000, userPreTax: 1300000, spousePreTax: 300000, taxable: 0, userRoth: 0, spouseRoth: 0 });
  const moves = ad.computeMoves(plan, null, { includeCombined: true });
  const delay = moves.moves.find(x => x.id === 'delay');
  assert.ok(delay, 'delay card is offered');
  const tapped = ad.engine.normalizeParams(Object.assign({}, plan, { retireAge: 56 })).params;
  const tappedReal = ad.mapToReal(tapped, 500);
  assert.equal(tappedReal.userEarlyPenalty, false, 'at 56 the rule applies');
  assert.equal(ad.mapToReal(ad.engine.normalizeParams(plan).params, 500).userEarlyPenalty, true, 'at 54 it does not');
  assert.equal(delay.rate, ad.successOf(ad.runPaths(tappedReal), 0), 'card rate equals the tapped plan');
  // "All together" = the three cards staged at once.
  const all = ad.engine.normalizeParams(Object.assign({}, plan, { retireAge: 56,
    spending: Math.round(plan.spending * 0.9 / 1000) * 1000, ssClaimAge: 70, spouseClaimAge: 70 })).params;
  assert.equal(moves.combined.rate, ad.successOf(ad.runPaths(ad.mapToReal(all, 500)), 0), 'combined rate equals the staged plan');
});

// ---------------------------------------------------------------- what Results says

function loadPenaltyLine() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'compass-cover.jsx'), 'utf8');
  const start = src.indexOf('function cvPenaltyLine');
  const end = src.indexOf('window.cvPenaltyLine = cvPenaltyLine;');
  assert.ok(start > 0 && end > start, 'cvPenaltyLine boundary should exist');
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src.slice(start, end) + '\n;globalThis.f = cvPenaltyLine;', ctx);
  return ctx.f;
}

test('R55-14 Results states which early-withdrawal assumption is in use', () => {
  const line = loadPenaltyLine();
  const res = o => { const m = ad.engine.normalizeParams(Object.assign({}, ad.DEFAULTS, { numPaths: 500 }, o)).params; return ad.engine.compute(m); };
  const H = '59½';
  assert.equal(line(res({})), null, 'sample plan (both stop at 65): nothing to say');
  assert.equal(res({}).earlyPenaltySummary, null);
  let r = res({ currentAge: 50, retireAge: 55, spouseAge: 50, spouseRetireAge: 55 });
  assert.deepEqual(plain(r.earlyPenaltySummary), { user: 'free', spouse: 'free' });
  assert.equal(line(r), `Assumes no 10% early-withdrawal penalty before ${H} (Rule of 55).`);
  r = res({ currentAge: 50, retireAge: 55, spouseAge: 50, spouseRetireAge: 53 });
  assert.deepEqual(plain(r.earlyPenaltySummary), { user: 'free', spouse: 'tooEarly' });
  assert.equal(line(r), `Counts the 10% early-withdrawal penalty on your partner’s pre-tax withdrawals before ${H}; yours are assumed penalty-free (Rule of 55).`);
  r = res({ currentAge: 50, retireAge: 56, spouseAge: 50, spouseRetireAge: 57, penaltyFreeEarly: false });
  assert.equal(line(r), `Counts the 10% early-withdrawal penalty on your pre-tax withdrawals before ${H}; your partner’s are assumed penalty-free (Rule of 55).`);
  r = res({ currentAge: 45, retireAge: 52, spouseAge: 45, spouseRetireAge: 53 });
  assert.equal(line(r), `Counts the 10% early-withdrawal penalty on both partners’ pre-tax withdrawals before ${H}.`);
  r = res({ currentAge: 45, retireAge: 52, spouseAge: 45, spouseRetireAge: 62 });
  assert.equal(line(r), `Counts the 10% early-withdrawal penalty on your pre-tax withdrawals before ${H}.`);
  r = res({ hasPartner: false, currentAge: 45, retireAge: 52 });
  assert.equal(line(r), `Counts the 10% early-withdrawal penalty on pre-tax withdrawals before ${H}.`);
  r = res({ hasPartner: false, currentAge: 50, retireAge: 57 });
  assert.equal(line(r), `Assumes no 10% early-withdrawal penalty before ${H} (Rule of 55).`);
});

// ---------------------------------------------------------------- the on-screen switch

test('R55-15 the edited screens still compile, and the switch is wired the same on both layouts', () => {
  // The site's own self-hosted compiler (vendor/), so this runs in CI, which installs nothing.
  const Babel = require(path.join(__dirname, '..', 'vendor', 'babel.min.js'));
  for (const f of ['retire-ui.jsx', 'compass-cover.jsx', 'cover-inputs.jsx', 'cover-mobile.jsx']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'cover-app', f), 'utf8');
    assert.doesNotThrow(() => Babel.transform(src, { presets: ['react'] }), `${f} compiles`);
  }
  for (const f of ['cover-inputs.jsx', 'cover-mobile.jsx']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'cover-app', f), 'utf8');
    for (const [key, age] of [['penaltyFreeEarly', 'params.retireAge'], ['spousePenaltyFreeEarly', 'params.spouseRetireAge']]) {
      const m = src.match(new RegExp(`\\{[^\\n]*${age} < 60 && <[CM]Toggle field="${key}"[^\\n]*lockedNote=\\{${age.replace('.', '\\.')} < 55 \\? window\\.FIELD_INFO\\.${key}\\.lockNote : null\\} />\\}`));
      assert.ok(m, `${f}: ${key} is shown below 60 and locked below 55`);
    }
    assert.ok(/cvPenaltyLine\(results\)/.test(fs.readFileSync(path.join(__dirname, '..', 'cover-app', f === 'cover-inputs.jsx' ? 'compass-cover.jsx' : f), 'utf8')), 'Results renders the line');
  }
});
