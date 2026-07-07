// tests/audit-adapter.test.js — ENGINE-AUDIT-PLAN.md Phase 2d (2026-07 audit)
// Adapter (cover-app/real-engine.js) scoring, unit contract, percentile selection,
// move deltas, year tables, and paycheck reconciliation beyond the defaults.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAdapter } = require('./audit-helpers.js');

const ad = loadAdapter();
const { engine, mapToReal, successOf, computeMoves, buildYearTables, tableRowsOf } = ad;

const close = (a, b, msg, tol = 0.01) =>
  assert.ok(Math.abs(a - b) < tol, `${msg}: expected ${b}, got ${a}`);

// The engine's collectInputs() contract (engine.js 1641-1730) — the single source of
// truth for param names. mapToReal must emit ONLY these names (it may omit some).
const ENGINE_PARAM_NAMES = new Set([
  'numPaths', 'currentAge', 'retireAge', 'endAge', 'spouseAge', 'spouseRetireAge',
  'userSS', 'userClaimAge', 'spouseSS', 'spouseClaimAge', 'enableSpousalBenefit',
  // V19.10: two part-time channels, one per partner (partTimeOwner retired)
  'enablePartTime', 'partTimeIncome', 'partTimeStartAge', 'partTimeEndAge',
  'spouseEnablePartTime', 'spousePartTimeIncome', 'spousePartTimeStartAge', 'spousePartTimeEndAge',
  'enableWindfall', 'windfallAmount', 'windfallAge',
  'userPreTaxBalance', 'userRothBalance', 'spousePreTaxBalance', 'spouseRothBalance',
  'taxableBalance', 'currentSalary', 'userSavingsRate', 'userEmployerContributionRate',
  'userPriorYearWages', 'userSavingsDest', 'userEmployerContributionDest',
  'spouseCurrentSalary', 'spouseSavingsRate', 'spouseEmployerContributionRate',
  'spousePriorYearWages', 'spouseSavingsDest', 'spouseEmployerContributionDest',
  'pension', 'pensionAge', 'spousePension', 'spousePensionAge',
  'enablePensionCOLA', 'enableSpousePensionCOLA',
  'enableRothConversion', 'rothConversionAmount', 'rothConversionStartAge', 'rothConversionEndAge',
  'lifestyleSpending', 'lifestyleInflation', 'enableSpendingReduction',
  'spendingReductionAge', 'spendingReductionPercent',
  'enableGuardrails', 'guardrailCeiling', 'guardrailFloor', 'guardrailAdjustment',
  'housingType', 'mortgagePrincipal', 'mortgageLastAge', 'propertyTax', 'monthlyRent',
  'healthcarePre65', 'healthcare65', 'healthcareInflation',
  'stockAllocation', 'enableGlidePath', 'endingStockAllocation',
  'stockReturn', 'stockVol', 'bondReturn', 'bondVol',
  'bracketGrowth', 'enableTCJASunset', 'stateTaxRate', 'taxableGainRatio'
]);

test('2d. mapToReal emits only engine-contract param names', () => {
  const m = engine.normalizeParams(engine.DEFAULTS).params;
  const real = mapToReal(m, 500);
  const unknown = Object.keys(real).filter(k => !ENGINE_PARAM_NAMES.has(k));
  assert.deepEqual([...unknown], [], `invented params: ${unknown.join(', ')}`);
});

test('2d. mapToReal unit contract: every % divided by 100 exactly once, ×12 only where monthly', () => {
  const m = engine.normalizeParams({
    ...engine.DEFAULTS,
    hasPartner: true,
    savingsRate: 12, employerContributionRate: 5,
    spouseSavingsRate: 6, spouseEmployerContributionRate: 3,
    inflation: 2.5, healthcareInflation: 5, bracketGrowth: 2.5,
    stockAllocation: 60, glidePathEndStock: 40,
    stockReturn: 7, bondReturn: 3.5, stockVol: 17, bondVol: 6,
    stateTaxRate: 5, taxableGainRatio: 60,
    guardrailCeiling: 6, guardrailFloor: 4, guardrailAdjustment: 10,
    spendingReductionPercent: 20,
    mortgagePayment: 1500, monthlyRent: 0, propertyTax: 9000,
    ssBenefit: 33600, spouseSS: 22800, pension: 12000,
    spending: 115000, healthcare: 8000, healthcare65: 5000
  }).params;
  const real = mapToReal(m, 500);
  // fractions (÷100 exactly once)
  close(real.userSavingsRate, 0.12, 'savingsRate');
  close(real.userEmployerContributionRate, 0.05, 'employer rate');
  close(real.spouseSavingsRate, 0.06, 'spouse savingsRate');
  close(real.lifestyleInflation, 0.025, 'inflation');
  close(real.healthcareInflation, 0.05, 'healthcare inflation');
  close(real.bracketGrowth, 0.025, 'bracket growth');
  close(real.stockAllocation, 0.60, 'stock allocation');
  close(real.endingStockAllocation, 0.40, 'glide end');
  close(real.stockReturn, 0.07, 'stock return');
  close(real.bondReturn, 0.035, 'bond return');
  close(real.stockVol, 0.17, 'stock vol');
  close(real.bondVol, 0.06, 'bond vol');
  close(real.stateTaxRate, 0.05, 'state rate');
  close(real.taxableGainRatio, 0.60, 'gain ratio');
  close(real.guardrailCeiling, 0.06, 'ceiling');
  close(real.guardrailFloor, 0.04, 'floor');
  close(real.guardrailAdjustment, 0.10, 'adjustment');
  close(real.spendingReductionPercent, 0.20, 'slow-go percent');
  // annual dollars pass through unscaled
  close(real.userSS, 33600, 'SS is annual');
  close(real.spouseSS, 22800, 'spouse SS is annual');
  close(real.pension, 12000, 'pension is annual');
  close(real.lifestyleSpending, 115000, 'spending is annual');
  close(real.propertyTax, 9000, 'property tax is annual');
  close(real.healthcarePre65, 8000, 'healthcare pre-65 annual');
  close(real.healthcare65, 5000, 'healthcare 65+ annual');
  // monthly fields stay monthly for the engine's own ×12
  close(real.mortgagePrincipal, 1500, 'mortgage payment stays monthly (engine ×12)');
});

test('2d. successOf: grades on everDepleted (never went broke), goal >= boundary, rounded', () => {
  // V19.6: successOf now counts a path only if it NEVER went broke (`everDepleted` false)
  // AND finishes >= the legacy goal. Previously it read the end-state `solvent` flag, which
  // clears when a windfall revives a broke plan (V19.5) — so a decade of destitution could
  // still score as success. These results carry both flags to prove the rule now reads
  // everDepleted: the fourth path is broke-then-recovered (everDepleted true, solvent true,
  // positive final balance) and must NOT count.
  const results = [
    { everDepleted: false, solvent: true, finalBalance: 100 },
    { everDepleted: false, solvent: true, finalBalance: 99.99 },
    { everDepleted: true, solvent: false, finalBalance: 0 },
    { everDepleted: true, solvent: true, finalBalance: 1000 }   // recovered, but went broke => fail
  ];
  assert.equal(successOf(results, 100), 25, 'only the never-broke path that ends >= goal counts');
  assert.equal(successOf(results, 0), 50, 'goal 0 counts every path that never went broke');
  assert.equal(successOf(results), 50, 'missing goal defaults to 0');
  assert.equal(successOf([{ everDepleted: false, finalBalance: 1 }, { everDepleted: false, finalBalance: 1 },
    { everDepleted: true, finalBalance: 0 }], 0), 67, 'percentage is rounded to an integer');
});

test('2d. percentile stories pick floor(n×0.10/0.90) of the sorted-results array', () => {
  const fake = (fb, i) => ({
    finalBalance: fb, solvent: true, depletionAge: null,
    log: [{ age: 60 + 0 * i, balanceAge: 61, startingBalance: fb, totalBal: fb, rmd: 0,
      totalWithdrawal: 0, ordIncome: 0, taxBill: 0, spending: 0, stockAlloc: 0.5,
      ssIncome: 0, pensionIncome: 0, partTimeIncome: 0, wages: 0,
      employeeContribution: 0, employerContribution: 0, inflation: 1, isSolvent: true }]
  });
  const sorted = Array.from({ length: 10 }, (_, i) => fake((i + 1) * 1000, i)); // 1000..10000 ascending
  const real = mapToReal(engine.normalizeParams(engine.DEFAULTS).params, 500);
  const tables = buildYearTables(Object.assign({}, real, { stockVol: 0, bondVol: 0 }), sorted);
  close(tables.rough.finalBalance, 2000, 'rough = index floor(10×0.10)=1');
  close(tables.strong.finalBalance, 10000, 'strong = index floor(10×0.90)=9');
});

test('2d. year-table rows: withdrawals column = rmd + discretionary; row fields carried for the identity', () => {
  const rows = tableRowsOf([{
    age: 75, balanceAge: 76, startingBalance: 500000, totalBal: 480000,
    rmd: 20325, totalWithdrawal: 15000, ordIncome: 40000, taxBill: 3000,
    spending: 50000, stockAlloc: 0.6, ssIncome: 30000, pensionIncome: 5000,
    partTimeIncome: 1000, wages: 0, employeeContribution: 0, employerContribution: 0,
    inflation: 1.2, isSolvent: true
  }]);
  close(rows[0].withdrawals, 35325, 'rmd + discretionary');
  close(rows[0].pensionOther, 6000, 'pension + part-time combined');
  close(rows[0].inflation, 1.2, 'cumulative inflation factor carried');
  assert.equal(rows[0].solvent, true);
});

test('2d. computeMoves: deterministic, deltas = rate - base, combined only when asked, SS move skipped at 70', () => {
  const params = { ...engine.DEFAULTS, numPaths: 500 };
  const a = computeMoves(params, null, { includeCombined: true });
  const b = computeMoves(params, null, { includeCombined: true });
  assert.deepEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), 'identical reruns');
  for (const mv of a.moves) {
    assert.equal(mv.delta, mv.rate - a.base, `${mv.id} delta arithmetic`);
  }
  assert.ok(a.combined && typeof a.combined.rate === 'number', 'combined present when requested');
  const noCombined = computeMoves(params, a.base, {});
  assert.equal(noCombined.combined, null, 'combined absent by default');
  assert.equal(noCombined.base, a.base, 'passed-in baseRate is reused');
  // V19.9 (A3): SS move eligibility is now PER-PARTNER. It is skipped only when every existing
  // partner already claims at 70 — not (as before) whenever the USER claims at 70, which hid the
  // move even though the spouse could still delay (and "all together" moved the spouse anyway).
  const bothAt70 = computeMoves({ ...params, hasPartner: true, ssClaimAge: 70, spouseClaimAge: 70 }, null, {});
  assert.ok(!bothAt70.moves.some(m => m.id === 'ss'), 'SS move skipped when BOTH partners claim at 70');
  const singleAt70 = computeMoves({ ...params, hasPartner: false, ssClaimAge: 70 }, null, {});
  assert.ok(!singleAt70.moves.some(m => m.id === 'ss'), 'SS move skipped for a single person at 70');
  const userAt70SpouseEarly = computeMoves({ ...params, hasPartner: true, ssClaimAge: 70, spouseClaimAge: 62 }, null, {});
  assert.ok(userAt70SpouseEarly.moves.some(m => m.id === 'ss'), 'SS move present when spouse still claims before 70');
});

test('2d. paycheck reconciliation: sources equal spending + taxes (≤$1/mo) on withdrawal-funded fixtures', () => {
  const fixtures = [
    { name: 'defaults', p: { ...engine.DEFAULTS, numPaths: 500 } },
    {
      name: 'single mid-career', p: {
        ...engine.DEFAULTS, numPaths: 500, hasPartner: false,
        currentAge: 45, retireAge: 65, endAge: 90, salary: 130000, priorYearWages: 130000,
        savingsRate: 15, userPreTax: 350000, userRoth: 60000, taxable: 80000,
        spending: 70000, ssBenefit: 30000, ssClaimAge: 67
      }
    },
    {
      name: 'renter couple, pensions', p: {
        ...engine.DEFAULTS, numPaths: 500, housingType: 'rent', monthlyRent: 2400,
        pension: 18000, spousePension: 9000, spending: 95000
      }
    }
  ];
  for (const f of fixtures) {
    const res = engine.compute(f.p);
    const pc = res.paycheck;
    const sources = pc.ss + pc.pension + pc.wages + pc.portfolio;
    const outflow = pc.spending + pc.taxes;
    close(pc.total, outflow, `${f.name}: total is spending+taxes`, 0.5);
    close(sources, outflow, `${f.name}: sources reconcile to outflow`, 1);
  }
});

// FINDING F-SURPLUS -- paycheck presentation. V19.5 banked surplus but the adapter NETTED it
// into the portfolio segment, which went NEGATIVE in surplus years and broke the bar (positive
// segments summed past 100%). V19.9 (B4) presents GROSS sources vs EXPLICIT uses: gross portfolio
// outflow (RMD + discretionary withdrawals, never negative) on the sources side, and leftover
// guaranteed income as a separate "saved back to portfolio" USE. The invariant becomes
//   gross sources == spending + taxes + saved
// (by the V19.9 household-cash identity), and the portfolio segment is always >= 0.
test('2d. F-SURPLUS: paycheck uses gross sources; portfolio >= 0; sources = spending+taxes+saved', () => {
  const res = engine.compute({
    ...engine.DEFAULTS, numPaths: 500, hasPartner: false,
    currentAge: 76, retireAge: 77, endAge: 90,
    salary: 0, savingsRate: 0, userPreTax: 3000000, userRoth: 0, taxable: 0,
    spending: 30000, ssBenefit: 40000, ssClaimAge: 67,
    healthcare: 0, healthcare65: 0, housingType: 'rent', monthlyRent: 0,
    stockVol: 0, bondVol: 0
  });
  const pc = res.paycheck;
  assert.ok(pc.portfolio >= -0.5, `portfolio segment must be >= 0, got ${pc.portfolio}`);
  assert.ok((pc.saved || 0) > 0.5, 'this RMD-heavy income-rich year should bank a surplus');
  const sources = pc.ss + pc.pension + pc.wages + pc.portfolio;
  const uses = pc.spending + pc.taxes + (pc.saved || 0);
  close(sources, uses, 'gross sources reconcile to spending + taxes + saved', 1);
});

// V19.7: the "How It Could Play Out" outcomes strip reads roughLegacy/strongLegacy
// (P10/P90 end balances) from compute(). They must (a) order rough <= median <= strong
// and (b) equal the final balances of the rough/strong year-table views EXACTLY (same
// percentile indices, same sorted results array), so the strip headline figures can
// never disagree with the year-by-year table. Additive fields — no scoring effect.
test('V19.7: compute() exposes rough/strong legacy matching yearTables, correctly ordered', () => {
  const res = engine.compute({ ...engine.DEFAULTS, numPaths: 2000 });
  assert.ok(res.roughLegacy <= res.medianLegacy, 'rough <= median');
  assert.ok(res.medianLegacy <= res.strongLegacy, 'median <= strong');
  assert.equal(res.roughLegacy, Math.max(0, res.yearTables.rough.finalBalance),
    'roughLegacy equals rough year-table final');
  assert.equal(res.strongLegacy, Math.max(0, res.yearTables.strong.finalBalance),
    'strongLegacy equals strong year-table final');
});

// V19.7: adding the outcomes fields must not move the score. DEFAULTS stays 64/100.
test('V19.7: DEFAULTS score unchanged (regression gate)', () => {
  assert.equal(engine.compute(engine.DEFAULTS).successRate, 64);
});
