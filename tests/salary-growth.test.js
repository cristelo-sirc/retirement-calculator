// tests/salary-growth.test.js — V19.18 permanent invariants
// Per-person pre-retirement salary growth, independent of inflation.
//
// Contract under test:
//  1. Gross salary in year i = currentSalary * (1 + salaryGrowth)^i — inflation does
//     not move it (the V19.18 headline: pay raises are no longer welded to inflation).
//  2. 0% growth = unchanged dollar pay every working year.
//  3. Each partner compounds at their OWN rate.
//  4. Absent params (legacy DOM app / pre-V19.18 engine callers) fall back to
//     lifestyleInflation — byte-identical to the pre-V19.18 behavior.
//  5. Adapter migration: plans saved before the fields exist are seeded from the
//     plan's own saved inflation (clamped to the field's 0–10 range, disclosed edge),
//     idempotently; explicit values (including 0) are never overwritten.
//
// All engine runs are deterministic: vol = 0, no spending, no SS/pension, so the
// only moving parts are salary, contributions, and taxes.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFinancialEngine, loadAdapter, auditParams } = require('./audit-helpers.js');

const eng = loadFinancialEngine();
const ad = loadAdapter();

const close = (a, b, msg, tol = 0.01) =>
  assert.ok(Math.abs(a - b) < tol, `${msg}: expected ${b}, got ${a}`);

// Working-years slice of a path log (user solo, retire 65, start 50 => i = 0..14).
function workingYears(result) {
  return result.log.filter(y => y.age < 65);
}

test('V19.18: changing inflation does not change any year\'s gross salary or contributions', () => {
  const mk = infl => auditParams({
    currentSalary: 100000, userPriorYearWages: 100000, userSalaryGrowth: 0.03,
    userSavingsRate: 0.10, lifestyleInflation: infl, taxableBalance: 50000
  });
  const low = eng.simulatePath(mk(0.0), 0);
  const high = eng.simulatePath(mk(0.08), 0);
  const lowYears = workingYears(low), highYears = workingYears(high);
  assert.equal(lowYears.length, highYears.length, 'same number of working years');
  lowYears.forEach((y, i) => {
    const expectedGross = 100000 * Math.pow(1.03, i);
    const expectedContrib = expectedGross * 0.10;      // below caps for this fixture
    // wages logs NET salary (gross - employee contribution)
    close(y.wages, expectedGross - expectedContrib, `year ${i} net wages (infl 0)`, 1);
    close(highYears[i].wages, y.wages, `year ${i} wages must not move with inflation`, 1e-6);
    close(y.employeeContribution, expectedContrib, `year ${i} employee contribution`, 1);
    close(highYears[i].employeeContribution, y.employeeContribution,
      `year ${i} contribution must not move with inflation`, 1e-6);
  });
});

test('V19.18: 0% growth means unchanged dollar pay every working year, even with inflation on', () => {
  const result = eng.simulatePath(auditParams({
    currentSalary: 90000, userPriorYearWages: 90000, userSalaryGrowth: 0,
    userSavingsRate: 0, lifestyleInflation: 0.03, taxableBalance: 50000
  }), 0);
  workingYears(result).forEach((y, i) => {
    close(y.wages, 90000, `year ${i} pay should stay flat at $90,000`, 1e-6);
  });
});

test('V19.18: each partner compounds at their own rate, independently', () => {
  const mk = (uG, sG) => auditParams({
    spouseAge: 50, spouseRetireAge: 65,
    currentSalary: 100000, userPriorYearWages: 100000, userSalaryGrowth: uG,
    spouseCurrentSalary: 50000, spousePriorYearWages: 50000, spouseSalaryGrowth: sG,
    userSavingsRate: 0, spouseSavingsRate: 0, taxableBalance: 50000
  });
  const both = eng.simulatePath(mk(0.05, 0), 0);
  workingYears(both).forEach((y, i) => {
    close(y.wages, 100000 * Math.pow(1.05, i) + 50000,
      `year ${i} household wages = your 5% path + partner's flat pay`, 1);
  });
  // Changing ONLY the spouse's rate must shift the household by exactly the spouse delta.
  const spouseUp = eng.simulatePath(mk(0.05, 0.02), 0);
  workingYears(spouseUp).forEach((y, i) => {
    close(y.wages - workingYears(both)[i].wages, 50000 * (Math.pow(1.02, i) - 1),
      `year ${i} delta is the partner's raise alone`, 1);
  });
});

test('V19.18: absent growth params fall back to lifestyleInflation (pre-V19.18 behavior preserved)', () => {
  const base = {
    currentSalary: 120000, userPriorYearWages: 120000,
    userSavingsRate: 0.10, lifestyleInflation: 0.025, taxableBalance: 50000
  };
  const legacy = eng.simulatePath(auditParams(base), 0);   // no salaryGrowth keys at all
  const explicit = eng.simulatePath(auditParams({
    ...base, userSalaryGrowth: 0.025, spouseSalaryGrowth: 0.025
  }), 0);
  legacy.log.forEach((y, i) => {
    close(explicit.log[i].wages, y.wages, `year ${i} wages identical`, 1e-6);
    close(explicit.log[i].totalBal, y.totalBal, `year ${i} balance identical`, 1e-6);
  });
});

test('V19.18: migration seeds old plans from their saved inflation; explicit values survive', () => {
  const { normalizeParams, DEFAULTS } = ad.engine;
  // Old plan (no salaryGrowth keys) with a non-default inflation.
  const oldPlan = { ...DEFAULTS, inflation: 4.0 };
  delete oldPlan.salaryGrowth; delete oldPlan.spouseSalaryGrowth;
  const migrated = normalizeParams(oldPlan).params;
  assert.equal(migrated.salaryGrowth, 4.0, 'seeded from saved inflation');
  assert.equal(migrated.spouseSalaryGrowth, 4.0, 'spouse seeded from saved inflation');
  // Disclosed edge: saved inflation above the field's 0–10 range clamps to 10.
  const hot = normalizeParams({ ...oldPlan, inflation: 12 }).params;
  assert.equal(hot.salaryGrowth, 10, 'clamped to the field ceiling');
  // Idempotent: a second pass changes nothing.
  const again = normalizeParams(migrated).params;
  assert.deepEqual(again, migrated, 'migration is idempotent');
  // Explicit values — including the meaningful 0 ("flat dollar pay") — are never overwritten.
  const zero = normalizeParams({ ...DEFAULTS, inflation: 4.0, salaryGrowth: 0, spouseSalaryGrowth: 0 }).params;
  assert.equal(zero.salaryGrowth, 0, 'explicit 0 survives');
  assert.equal(zero.spouseSalaryGrowth, 0, 'explicit spouse 0 survives');
  // New plans start at the documented default.
  assert.equal(normalizeParams(DEFAULTS).params.salaryGrowth, 2.5, 'new-plan default');
  assert.equal(normalizeParams(DEFAULTS).params.spouseSalaryGrowth, 2.5, 'new-plan spouse default');
});

test('V19.18: adapter maps growth as a per-person fraction; singles zero the spouse rate', () => {
  const { normalizeParams, DEFAULTS } = ad.engine;
  const couple = ad.mapToReal(normalizeParams({ ...DEFAULTS, salaryGrowth: 3, spouseSalaryGrowth: 1.5 }).params, 500);
  close(couple.userSalaryGrowth, 0.03, 'user fraction');
  close(couple.spouseSalaryGrowth, 0.015, 'spouse fraction');
  const single = ad.mapToReal(normalizeParams({ ...DEFAULTS, hasPartner: false, salaryGrowth: 3 }).params, 500);
  close(single.spouseSalaryGrowth, 0, 'no partner, no spouse growth');
});
