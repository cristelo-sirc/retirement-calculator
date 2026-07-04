// tests/audit-conservation.test.js — ENGINE-AUDIT-PLAN.md Phase 2a (2026-07 audit)
// Master invariant (P2): conservation of money. At vol=0, for EVERY year of EVERY
// scenario in the feature matrix:
//   end = start*(1 + weighted return) + contributions - (rmd + totalWithdrawal) + windfall
// to <= $1, plus the start(i+1) == end(i) chain. This is the class of test that would
// have caught the 2026-06-27 contribution-accumulation bug.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFinancialEngine, auditParams, checkConservation, reconstructReturns } = require('./audit-helpers.js');

const eng = loadFinancialEngine();
const { simulatePath } = eng;

const close = (a, b, msg, tol = 0.01) =>
  assert.ok(Math.abs(a - b) < tol, `${msg}: expected ${b}, got ${a}`);

// ---- Feature matrix ---------------------------------------------------------------
const HOUSEHOLDS = {
  single: {},
  couple: (base) => ({
    spouseAge: base.currentAge - 4,
    spouseRetireAge: 65,
    spouseCurrentSalary: base.currentSalary > 0 ? Math.round(base.currentSalary * 0.6) : 0,
    spouseSavingsRate: base.userSavingsRate > 0 ? 0.08 : 0,
    spousePriorYearWages: base.currentSalary > 0 ? Math.round(base.currentSalary * 0.6) : 0,
    spousePreTaxBalance: base.userPreTaxBalance > 0 ? 200000 : 0,
    spouseRothBalance: base.userRothBalance > 0 ? 50000 : 0,
    spouseSS: 18000, spouseClaimAge: 67
  })
};

const LIFECYCLES = {
  saverFromZero: {
    currentAge: 30, retireAge: 65, endAge: 90,
    currentSalary: 120000, userSavingsRate: 0.20, userEmployerContributionRate: 0.05,
    userPriorYearWages: 120000,
    userPreTaxBalance: 0, userRothBalance: 0, taxableBalance: 0,
    lifestyleSpending: 60000, userSS: 30000, userClaimAge: 67
  },
  midCareer: {
    currentAge: 45, retireAge: 65, endAge: 92,
    currentSalary: 150000, userSavingsRate: 0.12, userEmployerContributionRate: 0.04,
    userPriorYearWages: 150000,
    userPreTaxBalance: 400000, userRothBalance: 80000, taxableBalance: 120000,
    lifestyleSpending: 80000, userSS: 36000, userClaimAge: 67
  },
  retired: {
    currentAge: 70, retireAge: 70, endAge: 95,
    currentSalary: 0, userSavingsRate: 0,
    userPreTaxBalance: 900000, userRothBalance: 200000, taxableBalance: 300000,
    lifestyleSpending: 90000, userSS: 40000, userClaimAge: 67
  }
};

const DESTS = ['pretax', 'roth', 'split'];
const HOUSING = {
  ownerWithPayoff: { housingType: 'own', mortgagePrincipal: 1800, mortgageLastAge: 72, propertyTax: 9000 },
  renter: { housingType: 'rent', monthlyRent: 2200 }
};
const TOGGLES = [
  ['windfall', (b) => ({ enableWindfall: true, windfallAmount: 200000, windfallAge: b.retireAge + 5 })],
  ['rothConv', (b) => ({ enableRothConversion: true, rothConversionAmount: 50000, rothConversionStartAge: b.retireAge, rothConversionEndAge: b.retireAge + 7 })],
  ['partTime', (b) => ({ enablePartTime: true, partTimeIncome: 20000, partTimeStartAge: b.retireAge, partTimeEndAge: b.retireAge + 5 })],
  ['guardrails', () => ({ enableGuardrails: true, guardrailCeiling: 0.06, guardrailFloor: 0.04, guardrailAdjustment: 0.10 })],
  ['slowGo', () => ({ enableSpendingReduction: true, spendingReductionAge: 78, spendingReductionPercent: 0.20 })]
];

function buildScenarios() {
  const scenarios = [];
  for (const [hhName, hh] of Object.entries(HOUSEHOLDS)) {
    for (const [lcName, lc] of Object.entries(LIFECYCLES)) {
      for (const dest of DESTS) {
        for (const [houseName, house] of Object.entries(HOUSING)) {
          for (let mask = 0; mask < (1 << TOGGLES.length); mask++) {
            let p = auditParams({
              ...lc,
              userSavingsDest: dest, spouseSavingsDest: dest,
              lifestyleInflation: 0.025, bracketGrowth: 0.02,
              healthcarePre65: 8000, healthcare65: 5000, healthcareInflation: 0.05,
              stockAllocation: 0.6, enableGlidePath: lcName !== 'retired',
              endingStockAllocation: 0.4,
              stockReturn: 0.06, bondReturn: 0.03, stockVol: 0, bondVol: 0,
              taxableGainRatio: 0.6, stateTaxRate: 0.05,
              ...house
            });
            if (hhName === 'couple') p = { ...p, ...HOUSEHOLDS.couple(p) };
            const names = [];
            for (let t = 0; t < TOGGLES.length; t++) {
              if (mask & (1 << t)) { p = { ...p, ...TOGGLES[t][1](p) }; names.push(TOGGLES[t][0]); }
            }
            scenarios.push({
              name: `${hhName}/${lcName}/${dest}/${houseName}/${names.join('+') || 'plain'}`,
              params: p
            });
          }
        }
      }
    }
  }
  return scenarios;
}

test('2a. conservation identity holds every year across the full feature matrix (vol=0)', () => {
  const scenarios = buildScenarios();
  assert.ok(scenarios.length >= 1000, `matrix size ${scenarios.length}`);
  const failures = [];
  for (const s of scenarios) {
    const result = simulatePath(s.params, 0);
    assert.equal(result.log.length, s.params.endAge - s.params.currentAge,
      `${s.name}: period count`);
    const v = checkConservation(result, s.params, 1);
    if (v.length) failures.push({ name: s.name, first: v[0], count: v.length });
  }
  assert.deepEqual(failures, [],
    `conservation violations in ${failures.length} scenarios; first: ${JSON.stringify(failures[0])}`);
});

test('2a. revealing extreme: $0 start, 50% savings rate — balance exceeds undiscounted contributions', () => {
  const p = auditParams({
    currentAge: 30, retireAge: 65, endAge: 66,
    currentSalary: 100000, userSavingsRate: 0.50, userPriorYearWages: 100000,
    userEmployerContributionRate: 0.05,
    lifestyleInflation: 0.025, stockReturn: 0.06, bondReturn: 0.03,
    stockAllocation: 0.6, lifestyleSpending: 40000, userSS: 30000, userClaimAge: 67
  });
  const result = simulatePath(p, 0);
  let contribSum = 0;
  for (const y of result.log) {
    contribSum += (y.employeeContribution || 0) + (y.employerContribution || 0);
  }
  assert.ok(contribSum > 900000, `expected ~35 years of capped contributions, got ${Math.round(contribSum)}`);
  const balAt65 = result.log[35 - 1].totalBal;
  assert.ok(balAt65 > contribSum,
    `balance at 65 (${Math.round(balAt65)}) must exceed undiscounted contributions (${Math.round(contribSum)})`);
  assert.ok(balAt65 > 1500000, `50% saver from $0 should be well past $1.5M, got ${Math.round(balAt65)}`);
});

test('2a. conservation also holds at vol>0 using seeded-RNG return reconstruction', () => {
  const p = auditParams({
    currentAge: 45, retireAge: 65, endAge: 92,
    currentSalary: 150000, userSavingsRate: 0.12, userPriorYearWages: 150000,
    userPreTaxBalance: 400000, userRothBalance: 80000, taxableBalance: 120000,
    lifestyleSpending: 80000, userSS: 36000, userClaimAge: 67,
    lifestyleInflation: 0.025, stockReturn: 0.07, bondReturn: 0.035,
    stockVol: 0.17, bondVol: 0.06, stockAllocation: 0.6,
    enableGlidePath: true, endingStockAllocation: 0.4,
    enableWindfall: true, windfallAmount: 150000, windfallAge: 70,
    taxableGainRatio: 0.6
  });
  for (const idx of [0, 1, 7, 42]) {
    const result = simulatePath(p, idx);
    const rets = reconstructReturns(eng, p, idx);
    result.log.forEach((y, i) => {
      if (y.isSolvent === false) return;
      const contrib = (y.employeeContribution || 0) + (y.employerContribution || 0);
      const windfall = (p.enableWindfall && y.age === p.windfallAge) ? p.windfallAmount : 0;
      const expected = y.startingBalance * (1 + rets[i]) + contrib - (y.rmd || 0) - (y.totalWithdrawal || 0) + windfall + (y.surplusBanked || 0);
      assert.ok(Math.abs(y.totalBal - expected) <= 1,
        `path ${idx} age ${y.age}: end ${y.totalBal} vs expected ${expected}`);
    });
  }
});

// FINDING C09 / F-SURPLUS -- FIXED (V19.5, per Cris's explicit go-ahead 2026-07-04):
// surplus household cash (RMD + SS beyond spending and taxes) is now banked into the
// taxable account instead of leaving the portfolio and vanishing. This test now pins
// the FIXED behavior; it previously pinned the discard bug (see git history / the
// V19.5 changelog for the prior assertion).
test('2a. surplus RMD/SS cash beyond spending is banked into taxable (F-SURPLUS fix, V19.5)', () => {
  const p = auditParams({
    currentAge: 76, retireAge: 76, endAge: 80,
    userPreTaxBalance: 3000000, userSS: 40000, userClaimAge: 67,
    lifestyleSpending: 30000, stockReturn: 0, bondReturn: 0, stockAllocation: 1
  });
  const result = simulatePath(p, 0);
  const y = result.log[0];
  assert.ok(y.rmd > 100000, `RMD on $3M at 76 should exceed $100k, got ${Math.round(y.rmd)}`);
  // Surplus = income-side cash (rmd + ss) minus outflow (spending + taxes); positive
  // surplus is now banked into taxable, so it DOES reappear in the balance:
  const surplus = y.rmd + y.ssIncome - y.spending - y.taxBill;
  assert.ok(surplus > 50000, `expected a large surplus, got ${Math.round(surplus)}`);
  close(y.surplusBanked, surplus, 'surplusBanked matches the computed surplus', 1);
  const expectedEndIfBanked = y.startingBalance - y.rmd + y.surplusBanked; // vol=0, no growth, no withdrawals
  assert.ok(Math.abs(y.totalBal - expectedEndIfBanked) <= 1,
    `end balance ${Math.round(y.totalBal)} vs ${Math.round(expectedEndIfBanked)} — surplus should be banked`);
});
