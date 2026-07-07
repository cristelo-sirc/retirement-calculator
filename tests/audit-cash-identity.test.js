// tests/audit-cash-identity.test.js — V19.9 (B1) permanent invariant.
//
// The household-CASH identity, distinct from the portfolio-conservation identity in
// audit-conservation.test.js. Portfolio conservation only proves the chosen withdrawal was
// deducted correctly; it stays true even when the tax loop stops before converging. THIS test
// proves the year is actually FUNDED: for every fully-retired, solvent year,
//
//     guaranteed income + portfolio withdrawals  ==  spending(+IRMAA) + taxes + surplus banked
//
// i.e. (ss + pension + part-time + wages + RMD + discretionary withdrawals)
//        == (spending field, which already includes IRMAA) + taxBill + surplusBanked
//
// Before V19.9 the tax convergence loop hard-stopped after 5 passes, so a tax-heavy year (e.g. a
// large Roth conversion) could leave thousands of dollars of spending/tax unfunded while the path
// was still marked solvent. Raising the pass cap so the loop runs to real convergence makes this
// identity hold to within ~$1. This test is the lens that was missing when that bug shipped.

const test = require('node:test');
const assert = require('node:assert');
const { loadFinancialEngine, auditParams } = require('./audit-helpers.js');

const eng = loadFinancialEngine();
const TOL = 2; // declared rounding tolerance ($). Real residual at convergence is sub-$1.

// Check every fully-retired, solvent row of one simulated path.
function cashViolations(p) {
  const r = eng.simulatePath(p, 0);
  const out = [];
  for (let i = 0; i < r.log.length; i++) {
    const y = r.log[i];
    if (y.isSolvent === false) continue;
    const userRetired = y.age >= p.retireAge;
    const spouseRetired = !p.hasPartner || ((p.spouseAge + i) >= p.spouseRetireAge);
    if (!userRetired || !spouseRetired) continue;      // only fully-retired years
    const sources = (y.ssIncome || 0) + (y.pensionIncome || 0) + (y.partTimeIncome || 0)
      + (y.wages || 0) + (y.rmd || 0) + (y.totalWithdrawal || 0);
    const uses = (y.spending || 0) + (y.taxBill || 0) + (y.surplusBanked || 0);
    const diff = sources - uses;
    if (Math.abs(diff) > TOL) out.push({ age: y.age, diff: Math.round(diff * 100) / 100 });
  }
  return out;
}

// A grid of fully-retired scenarios (vol 0, deterministic) spanning the conditions that stress
// the tax loop: account mix, spending level, guaranteed-income level, Roth conversions, partner,
// and a state tax rate.
function grid() {
  const scenarios = [];
  const balances = [
    { userPreTaxBalance: 1000000 },
    { taxableBalance: 1000000 },
    { userPreTaxBalance: 500000, taxableBalance: 300000, userRothBalance: 200000 },
  ];
  const spends = [60000, 120000, 200000];
  const incomes = [
    { userSS: 30000 },
    { userSS: 40000, pension: 20000 },
    { userSS: 60000, pension: 60000 },   // high guaranteed income (surplus years)
  ];
  const conversions = [
    {},
    { enableRothConversion: true, rothConversionAmount: 250000, rothConversionStartAge: 65, rothConversionEndAge: 68 },
  ];
  const states = [0, 0.05];
  for (const b of balances)
    for (const sp of spends)
      for (const inc of incomes)
        for (const cv of conversions)
          for (const st of states) {
            scenarios.push(auditParams(Object.assign({
              currentAge: 65, retireAge: 65, endAge: 85,
              userClaimAge: 65, pensionAge: 65,
              lifestyleSpending: sp, stateTaxRate: st,
              healthcare65: 0,
            }, b, inc, cv)));
          }
  // A couple, both retired, with a conversion — exercises the per-spouse retirement filter.
  scenarios.push(auditParams({
    currentAge: 66, retireAge: 65, endAge: 88,
    hasPartner: true, spouseAge: 66, spouseRetireAge: 65,
    userPreTaxBalance: 800000, spousePreTaxBalance: 400000, taxableBalance: 200000,
    userSS: 36000, userClaimAge: 65, spouseSS: 24000, spouseClaimAge: 65,
    lifestyleSpending: 150000,
    enableRothConversion: true, rothConversionAmount: 300000, rothConversionStartAge: 66, rothConversionEndAge: 70,
  }));
  return scenarios;
}

test('B1. household-cash identity holds for every fully-retired solvent year across the grid', () => {
  const scenarios = grid();
  let checked = 0;
  const allViolations = [];
  for (const p of scenarios) {
    const v = cashViolations(p);
    checked++;
    if (v.length) allViolations.push({ spend: p.lifestyleSpending, state: p.stateTaxRate,
      conv: !!p.enableRothConversion, rows: v.slice(0, 3) });
  }
  assert.equal(allViolations.length, 0,
    `${allViolations.length}/${checked} scenarios had unfunded years: ` + JSON.stringify(allViolations.slice(0, 5)));
});

test('B1. the audit repro ($1M pre-tax, $200k spend, $500k conversion) is funded to <$1', () => {
  const p = auditParams({
    currentAge: 65, retireAge: 65, endAge: 85,
    userPreTaxBalance: 1000000, userSS: 40000, userClaimAge: 65,
    pension: 20000, pensionAge: 65,
    enableRothConversion: true, rothConversionAmount: 500000, rothConversionStartAge: 65, rothConversionEndAge: 66,
    lifestyleSpending: 200000, healthcare65: 0,
  });
  const r = eng.simulatePath(p, 0);
  const y = r.log[0];
  const sources = (y.ssIncome || 0) + (y.pensionIncome || 0) + (y.rmd || 0) + (y.totalWithdrawal || 0);
  const uses = (y.spending || 0) + (y.taxBill || 0) + (y.surplusBanked || 0);
  assert.ok(Math.abs(sources - uses) < 1, `first-year shortfall ${(sources - uses).toFixed(2)} should be <$1`);
});
