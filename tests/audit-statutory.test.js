// tests/audit-statutory.test.js — ENGINE-AUDIT-PLAN.md Phase 2b (2026-07 audit)
// P4: every expected value below is re-derived from PUBLISHED 2026 rules inside this
// file (IRS Rev. Proc. 2025-32, SSA 2026 COLA fact sheet, CMS 2026 premium notice),
// never from the engine's own constants. Where the engine diverges from the published
// rule, the test is marked { todo } and tagged as an audit FINDING — it documents the
// divergence without failing the suite until a fix is approved.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFinancialEngine, auditParams } = require('./audit-helpers.js');

const eng = loadFinancialEngine();
const {
  simulatePath, calculateWorkplaceContributions, calculateFederalOrdinaryTax,
  calculateTaxableSS, calculateCapGainsTax, calculateNIIT, calculateStateTax,
  calculateIRMAA, calculateSSBenefit, calculateSpousalBenefit,
  calculateOwnBenefitAtClaiming, determineSpousalBenefitRecipient, getDistributionPeriod
} = eng;

const close = (a, b, msg, tol = 0.01) =>
  assert.ok(Math.abs(a - b) < tol, `${msg}: expected ${b}, got ${a}`);

// ---- Published 2026 oracles (independent of engine.js) --------------------------
const ORACLE = {
  SD: { Single: 16100, MFJ: 32200 },
  BRACKETS: {
    Single: [[12400, .10], [50400, .12], [105700, .22], [201775, .24], [256225, .32], [640600, .35], [Infinity, .37]],
    MFJ: [[24800, .10], [100800, .12], [211400, .22], [403550, .24], [512450, .32], [768700, .35], [Infinity, .37]]
  },
  CG0: { Single: 49450, MFJ: 98900 },
  CG15: { Single: 545500, MFJ: 613700 },
  NIIT: { Single: 200000, MFJ: 250000 },
  IRMAA_T: { Single: [109000, 137000, 171000, 205000, 500000], MFJ: [218000, 274000, 342000, 410000, 750000] },
  // CMS 2026: Part B standard $202.90; tier premiums 1.4x/2.0x/2.6x/3.2x/3.4x
  // => monthly B surcharges 81.20/202.90/324.60/446.30/487.00.
  // Part D IRMAA adders: 14.50/37.50/60.40/83.30/91.00.
  // (V19.9: tier-4 B is 446.30 -> combined 529.60; the V19.5 446.40/529.70 was an error.)
  IRMAA_SURCHARGE: [95.70, 240.40, 385.00, 529.60, 578.00],
  SS_EARNINGS_LIMIT: 24480,     // under-FRA annual exempt amount, $1 per $2 over
  LIMIT_401K: 24500, CATCHUP: 8000, SUPER_CATCHUP: 11250,
  TOTAL_PLAN: 72000, COMP_LIMIT: 360000, ROTH_CATCHUP_WAGES: 150000,
  // IRS Uniform Lifetime Table (2022+), used for RMDs at the ages the plan names
  ULT: { 75: 24.6, 80: 20.2, 90: 12.2, 100: 6.4, 110: 3.5, 111: 3.4, 115: 2.9, 120: 2.0 }
};

function oracleOrdinaryTax(income, status) {
  let taxable = Math.max(0, income - ORACLE.SD[status]);
  let tax = 0, prev = 0;
  for (const [cap, rate] of ORACLE.BRACKETS[status]) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, cap) - prev) * rate;
    prev = cap;
  }
  return tax;
}

test('2b. federal ordinary tax matches an independently derived 2026 oracle (both statuses)', () => {
  const incomes = [0, 10000, 16100, 16101, 28500, 32200, 57000, 75000, 120000, 150000,
    236900, 250000, 300000, 435750, 544650, 656700, 800950, 1000000, 2500000];
  for (const status of ['Single', 'MFJ']) {
    for (const inc of incomes) {
      close(calculateFederalOrdinaryTax(inc, status, 1, 1), oracleOrdinaryTax(inc, status),
        `${status} ordinary tax at ${inc}`);
    }
  }
});

test('2b. taxable Social Security worksheet: 0/50/85 tiers against hand-built cases', () => {
  // MFJ hand-derived (IRS Pub 915 worksheet):
  close(calculateTaxableSS(40000, 12000, 'MFJ'), 0, 'provisional 32000 exactly: 0% tier');
  close(calculateTaxableSS(40000, 20000, 'MFJ'), 4000, 'prov 40000: min(half excess 4000, half SS)');
  close(calculateTaxableSS(20000, 33990, 'MFJ'), 5995, 'prov 43990: half-excess just under 50% cap');
  close(calculateTaxableSS(40000, 24000, 'MFJ'), 6000, 'prov 44000 exactly: tier-2 max 6000');
  // prov 80000: 0.85*(80000-44000)=30600 + min(half SS 20000, 6000)=6000 -> 36600, cap 0.85*40000=34000
  close(calculateTaxableSS(40000, 60000, 'MFJ'), 34000, 'prov 80000: capped at 85% of benefits');
  // just over tier 2: prov 44002 -> 0.85*2 + 6000 = 6001.70
  close(calculateTaxableSS(40000, 24002, 'MFJ'), 6001.70, 'prov 44002: 85% tier begins');
  // Single hand-derived:
  close(calculateTaxableSS(30000, 10000, 'Single'), 0, 'prov 25000 exactly: 0% tier');
  close(calculateTaxableSS(30000, 14000, 'Single'), 2000, 'prov 29000: half excess');
  close(calculateTaxableSS(30000, 19000, 'Single'), 4500, 'prov 34000 exactly: tier-2 max 4500');
  // prov 50000: 0.85*16000=13600+4500=18100; cap 0.85*30000=25500 -> 18100
  close(calculateTaxableSS(30000, 35000, 'Single'), 18100, 'prov 50000: 85% tier');
  close(calculateTaxableSS(10000, 500000, 'Single'), 8500, 'huge income: capped at 85%');
  close(calculateTaxableSS(0, 100000, 'MFJ'), 0, 'no SS income');
});

test('2b. capital gains stacking against 2026 thresholds', () => {
  // MFJ: ordinary 82200 (taxable 50000 after SD) leaves 48900 of 0% room; gains 60000
  // -> 48900 at 0%, 11100 at 15% = 1665
  close(calculateCapGainsTax(60000, 82200, 'MFJ', 1, 1), 1665, 'MFJ 0/15 split');
  // Single: ordinary 216100 (taxable 200000), gains 400000: 0 room in 0%;
  // 15% cap 545500-200000=345500 at 15% = 51825; 54500 at 20% = 10900 -> 62725
  close(calculateCapGainsTax(400000, 216100, 'Single', 1, 1), 62725, 'Single 15/20 split');
  close(calculateCapGainsTax(98900, 0, 'MFJ', 1, 1), 0, 'gains fill the whole 0% bracket');
  // V19.5 (F-CG-SD fix): with $0 ordinary income, the unused SD now shelters gains too
  // (taxable income 99000-32200=66800 < the 98900 zero-rate cap), so $99,000 of gains
  // is still fully $0 tax -- this is NOT the same case as "100 over the ceiling"
  // anymore. Use nonzero ordinary income (so the SD is already spoken for) to test the
  // true 0%-ceiling boundary: ord 40000 (taxable 7800), room0 = 98900-7800 = 91100.
  close(calculateCapGainsTax(99000, 0, 'MFJ', 1, 1), 0, 'unused SD now shelters these gains too (F-CG-SD fix)');
  close(calculateCapGainsTax(91200, 40000, 'MFJ', 1, 1), 15, '100 over the 0% ceiling (with ordinary income already using the SD)');
});

// FINDING F-CG-SD -- FIXED (V19.5): unused standard deduction now shelters capital
// gains. Real 2026 law: taxable income = ord + gains - SD, so with $0 ordinary income
// the first $32,200 (MFJ) of gains is not taxable income at all; the 0% bracket then
// covers the next $98,900.
test('2b. FIXED F-CG-SD: leftover standard deduction offsets gains', () => {
  // ord 0, gains 131,100 MFJ. Law: taxable 98,900 -> all inside 0% bracket -> $0.
  // Engine: (131100-98900)*15% = 4830.
  close(calculateCapGainsTax(131100, 0, 'MFJ', 1, 1), 0, 'gains sheltered by SD then 0% bracket');
});

test('2b. NIIT thresholds and lesser-of rule (both statuses)', () => {
  close(calculateNIIT(240000, 20000, 'MFJ'), 10000 * 0.038, 'MFJ: MAGI 260k, over by 10k < gains');
  close(calculateNIIT(100000, 20000, 'MFJ'), 0, 'MFJ under threshold');
  close(calculateNIIT(300000, 20000, 'MFJ'), 20000 * 0.038, 'MFJ: gains fully surtaxed');
  close(calculateNIIT(195000, 30000, 'Single'), 25000 * 0.038, 'Single: over by 25k < gains');
  close(calculateNIIT(200000, 0, 'Single'), 0, 'no investment income');
});

test('2b. state tax approximation: flat rate on ord+gains minus federal SD', () => {
  close(calculateStateTax(50000, 10000, 0.05, 'MFJ', 1), (50000 + 10000 - 32200) * 0.05, 'MFJ');
  close(calculateStateTax(10000, 0, 0.05, 'Single', 1), 0, 'below SD');
  close(calculateStateTax(100000, 0, 0, 'Single', 1), 0, 'zero rate');
});

test('2b. IRMAA: every 2026 tier boundary ±$1, both statuses', () => {
  for (const status of ['Single', 'MFJ']) {
    const T = ORACLE.IRMAA_T[status];
    // Engine's published-2026 surcharges (tier 4 corrected to $529.60 in V19.9; V19.5's $529.70 was wrong)
    const engineSurcharges = [95.70, 240.40, 385.00, 529.60, 578.00];
    close(calculateIRMAA(T[0] - 1, status, 1), 0, `${status} below first threshold`);
    close(calculateIRMAA(T[0], status, 1), 0, `${status} at first threshold (<= is base)`);
    for (let t = 0; t < 4; t++) {
      close(calculateIRMAA(T[t] + 1, status, 1), engineSurcharges[t] * 12, `${status} $1 into tier ${t + 1}`);
      // An exact interior threshold belongs to the LOWER tier (SSA "above $X" rule);
      // the top threshold (500k/750k) belongs to the top tier (SSA ">= $X" rule).
      close(calculateIRMAA(T[t + 1], status, 1), t < 3 ? engineSurcharges[t] * 12 : engineSurcharges[4] * 12,
        `${status} at threshold ${t + 1} boundary rule`);
    }
    // top tier: >= 500k/750k pays the max (engine uses < for the last comparison: correct)
    close(calculateIRMAA(T[4] - 1, status, 1), engineSurcharges[3] * 12, `${status} $1 under top tier`);
    close(calculateIRMAA(T[4], status, 1), engineSurcharges[4] * 12, `${status} exactly at top tier`);
  }
});

// FINDING F-IRMAA-T4 -- CORRECTED (V19.9): CMS 2026 tier-4 combined Part B + Part D
// surcharge is 446.30 + 83.30 = $529.60/mo. V19.5 changed this to $529.70 citing Part B
// 446.40, which was wrong per the official CMS 2026 fact sheet; V19.9 restores $529.60.
test('2b. F-IRMAA-T4: tier-4 surcharge matches CMS 2026 exactly ($529.60)', () => {
  close(calculateIRMAA(411000, 'MFJ', 1), ORACLE.IRMAA_SURCHARGE[3] * 12, 'MFJ tier 4 vs CMS');
});

test('2b. IRMAA inside simulatePath: 2-year MAGI lookback and per-person doubling', () => {
  // Retired MFJ couple, both 66 at start, big pre-tax withdrawals -> high MAGI.
  // Roth conversions in years 0-1 only push those years' MAGI into a higher tier;
  // years 2-3 must be charged from the LOOKED-BACK years-0/1 MAGI, not their own.
  const base = {
    currentAge: 66, retireAge: 66, endAge: 72, spouseAge: 66, spouseRetireAge: 66,
    userPreTaxBalance: 4000000, taxableBalance: 0, userRothBalance: 0,
    lifestyleSpending: 150000, stockReturn: 0, bondReturn: 0, stockAllocation: 1,
    lifestyleInflation: 0, bracketGrowth: 0, taxableGainRatio: 0
  };
  const withConv = simulatePath(auditParams({
    ...base,
    enableRothConversion: true, rothConversionAmount: 150000,
    rothConversionStartAge: 66, rothConversionEndAge: 67
  }), 0);
  const noConv = simulatePath(auditParams(base), 0);
  // Year 2 (age 68): lookback hits year-0 MAGI. With conversions year-0 MAGI is
  // ~150k higher -> higher IRMAA tier -> larger spending (IRMAA rides on totalNeed).
  const spendDiff2 = withConv.log[2].spending - noConv.log[2].spending;
  assert.ok(spendDiff2 > 1000,
    `age-68 spending must reflect the higher age-66 MAGI via lookback (diff ${Math.round(spendDiff2)})`);
  // Year 4 (age 70): lookback hits year-2 MAGI (conversions over) -> tiers realign.
  const spendDiff4 = Math.abs(withConv.log[4].spending - noConv.log[4].spending);
  assert.ok(spendDiff4 < 1000,
    `age-70 spending should realign once conversions leave the lookback window (diff ${Math.round(spendDiff4)})`);

  // Per-person doubling: same plan but spouse only 63 -> one covered person until
  // spouse turns 65 two years in. Spending 250k keeps MAGI above the 218k MFJ tier.
  const gap = simulatePath(auditParams({
    ...base, lifestyleSpending: 250000, spouseAge: 63, spouseRetireAge: 63
  }), 0);
  const irmaaOf = (run, i) => run.log[i].spending - 250000; // baseSpending is flat 250000
  assert.ok(irmaaOf(gap, 0) > 0, 'one covered partner already pays IRMAA');
  close(irmaaOf(gap, 2) / irmaaOf(gap, 0), 2, 'IRMAA doubles when the second partner reaches 65', 0.35);
});

// FINDING F-IRMAA-SKIP -- FIXED (V19.5): the tax convergence loop used to be able to
// converge on its FIRST pass (total tax change < $1 — e.g. a Roth-funded year with no
// ordinary income) and break BEFORE totalNeed was ever updated with IRMAA, so the
// household was never charged IRMAA that year even when the 2-year-lookback MAGI was
// far into the surcharge tiers. The loop now also requires totalNeed itself (which
// bakes in IRMAA) to have stabilized before it will converge.
test('2b. FIXED F-IRMAA-SKIP: Roth-funded years still carry IRMAA in spending', () => {
  const run = simulatePath(auditParams({
    currentAge: 66, retireAge: 66, endAge: 71, spouseAge: 66, spouseRetireAge: 66,
    userPreTaxBalance: 600000, userRothBalance: 2000000,
    lifestyleSpending: 100000, stockReturn: 0, bondReturn: 0, stockAllocation: 1,
    lifestyleInflation: 0, bracketGrowth: 0, taxableGainRatio: 0,
    enableRothConversion: true, rothConversionAmount: 300000,
    rothConversionStartAge: 66, rothConversionEndAge: 67
  }), 0);
  // Age 66 converts $300k + withdraws pre-tax (MAGI ~$521k, multi-pass convergence:
  // IRMAA IS charged that year). By 68 the pre-tax side is empty; spending is
  // Roth-funded, ordinary income is $0, tax converges on the first pass.
  assert.ok(run.log[0].spending > 100000 + 1000, 'conversion year carries IRMAA in spending');
  // Age 68 (i=2): lookback MAGI is age-66's (~$521k, tier-topping for two) even though
  // age 68 itself is fully Roth-funded and converges on the very first tax pass
  // (taxBill ~0, ordIncome $0) -- exactly the case that used to skip IRMAA entirely.
  // (Age 69's own lookback lands on age 67, whose MAGI is legitimately low here because
  // that year's discretionary withdrawal alone drained the remaining pre-tax balance,
  // leaving nothing left to convert -- so age 69 correctly owes no IRMAA; this test
  // only asserts the specific year the finding's repro was about.)
  const at68 = run.log.find(y => y.age === 68);
  assert.ok(at68.taxBill < 1, 'age 68 is Roth-funded: tax converges on the first pass');
  assert.ok(at68.spending > 100000 + 1000,
    `age 68: tax converged on pass 1 but IRMAA should still be charged (spending ${Math.round(at68.spending)})`);
});

test('2b. SS claiming 62–70: engine matches the two-tier formula and implementations agree', () => {
  const PIA = 24000, FRA = 67;
  const oracleFactor = (claimAge) => {
    const diff = claimAge - FRA;
    if (diff >= 0) return 1 + diff * 0.08;
    const m = -diff * 12;
    return m <= 36 ? 1 - m * (5 / 900) : 1 - 36 * (5 / 900) - (m - 36) * (5 / 1200);
  };
  for (let claim = 62; claim <= 70; claim++) {
    const expected = PIA * oracleFactor(claim);
    close(calculateSSBenefit(PIA, claim, claim, FRA, 0.028, 0, ORACLE.SS_EARNINGS_LIMIT),
      expected, `calculateSSBenefit at ${claim}`);
    close(calculateOwnBenefitAtClaiming(PIA, claim, FRA), expected, `own-at-claiming at ${claim}`);
  }
  // canonical anchors: 62 -> 70%, 64 -> 80%, 67 -> 100%, 70 -> 124%
  close(calculateSSBenefit(PIA, 62, 62, FRA, 0, 0, 1e9), PIA * 0.70, 'age 62 is 70%');
  close(calculateSSBenefit(PIA, 64, 64, FRA, 0, 0, 1e9), PIA * 0.80, 'age 64 is 80%');
  close(calculateSSBenefit(PIA, 70, 70, FRA, 0, 0, 1e9), PIA * 1.24, 'age 70 is 124%');
  // benefit is zero before claiming
  close(calculateSSBenefit(PIA, 67, 66, FRA, 0, 0, 1e9), 0, 'no benefit before claim age');
});

test('2b. spousal benefit: 50% cap, tiered early reduction, no delayed credits, recipient logic', () => {
  const HI = 40000;
  close(calculateSpousalBenefit(HI, 67, 67), 20000, 'spousal at FRA is exactly 50%');
  close(calculateSpousalBenefit(HI, 70, 67), 20000, 'spousal earns NO delayed credits');
  // 3 years early: 36 months at 25/36%/mo = 25% reduction
  close(calculateSpousalBenefit(HI, 64, 67), 20000 * 0.75, 'spousal at 64 is 75% of half');
  // 5 years early: 25% + 24 months * 5/12% = 35%
  close(calculateSpousalBenefit(HI, 62, 67), 20000 * 0.65, 'spousal at 62 is 65% of half');
  // Recipient selection: low-PIA spouse takes spousal when it beats own benefit
  const pick = determineSpousalBenefitRecipient(48000, 10000, 67, 67, 67, 67);
  assert.equal(pick.recipient, 'spouse');
  assert.equal(pick.higherPIA, 48000);
  const none = determineSpousalBenefitRecipient(30000, 28000, 67, 67, 67, 67);
  assert.equal(none.recipient, 'none', 'similar PIAs: nobody benefits from spousal');
  const notFiled = determineSpousalBenefitRecipient(48000, 10000, 67, 70, 67, 67);
  assert.equal(notFiled.recipient, 'none', 'no spousal until BOTH have filed');
  const userPick = determineSpousalBenefitRecipient(10000, 48000, 67, 67, 68, 67);
  assert.equal(userPick.recipient, 'user');
});

test('2b. SS earnings test at simulation year 0 (no inflation distortion)', () => {
  // claim 62 while earning 30,000 part-time; limit 24,480 -> reduction (5,520)/2 = 2,760
  close(calculateSSBenefit(10000, 62, 62, 67, 0.028, 30000, ORACLE.SS_EARNINGS_LIMIT),
    10000 * 0.70 - 2760, 'benefit reduced $1 per $2 over the exempt amount');
  // at/after FRA no reduction
  close(calculateSSBenefit(10000, 67, 67, 67, 0.028, 500000, ORACLE.SS_EARNINGS_LIMIT),
    10000, 'earnings test ends at FRA');
});

// FINDING F-SS-EARNTEST-INFL -- FIXED (V19.5): inside simulatePath the earnings-test
// reduction used to be computed in NOMINAL dollars (part-time income and limit are
// both × inflation) but subtracted from a TODAY'S-dollars benefit, with the difference
// then multiplied by inflation AGAIN -- double-inflating the reduction every year i > 0.
// calculateSSBenefit now takes the inflation multiplier and converts the reduction back
// to today's dollars before subtracting.
test('2b. FIXED F-SS-EARNTEST-INFL: earnings-test reduction is inflated exactly once', () => {
  const p = auditParams({
    currentAge: 62, retireAge: 62, endAge: 66,
    userPreTaxBalance: 1000000, lifestyleSpending: 40000,
    userSS: 20000, userClaimAge: 62,
    enablePartTime: true, partTimeIncome: 40000, partTimeStartAge: 62, partTimeEndAge: 66,
    lifestyleInflation: 0.10, // deliberately large to expose the distortion
    stockReturn: 0, bondReturn: 0, stockAllocation: 1, taxableGainRatio: 0
  });
  const run = simulatePath(p, 0);
  // Correct nominal benefit in year i: (PIA*0.70)*infl - (40000*infl - 24480*infl)/2
  //   = infl * (14000 - 7760) = infl * 6240.
  for (let i = 0; i < run.log.length; i++) {
    const infl = Math.pow(1.10, i);
    const expected = infl * (20000 * 0.70 - (40000 - 24480) / 2);
    close(run.log[i].ssIncome, expected, `year ${i} SS after earnings test`, 1);
  }
});

test('2b. RMD: Uniform Lifetime Table ages, zero before 75, forced when need is zero', () => {
  assert.equal(getDistributionPeriod(74), 0, 'no RMD at 74 (SECURE 2.0, born 1960+)');
  for (const age of [75, 80, 90, 100, 110]) {
    close(getDistributionPeriod(age), ORACLE.ULT[age], `ULT at ${age}`);
  }
  // RMD satisfied even when discretionary need is $0
  const run = simulatePath(auditParams({
    currentAge: 75, retireAge: 75, endAge: 77,
    userPreTaxBalance: 492000, lifestyleSpending: 0,
    stockReturn: 0, bondReturn: 0, stockAllocation: 1
  }), 0);
  close(run.log[0].rmd, 492000 / 24.6, 'RMD taken with zero spending need', 1);
  assert.equal(run.log[0].totalWithdrawal, 0, 'no discretionary withdrawal on top');
});

// FINDING F-RMD-110 -- FIXED (V19.5): IRS ULT continues past 110 (111 -> 3.4 ...
// 120+ -> 2.0); engine previously floored the divisor at 3.5, understating RMDs at
// very advanced ages. (The oracle's own 115 value was corrected from 3.0 to the
// verified 2.9 -- 26 CFR 1.401(a)(9)-9 Table 2 -- while fixing this finding.)
test('2b. FIXED F-RMD-110: divisor keeps falling beyond age 110', () => {
  close(getDistributionPeriod(115), ORACLE.ULT[115], 'ULT at 115');
  close(getDistributionPeriod(120), ORACLE.ULT[120], 'ULT at 120');
});

test('2b. contribution limits: 2026 values, age steps, inflation growth, Roth catch-up gate', () => {
  // age 64 reversion: super catch-up (60-63) reverts to the regular 8,000
  const age63 = calculateWorkplaceContributions(400000, 63, 1, 0, 'pretax', 'pretax', 1, 100000);
  const age64 = calculateWorkplaceContributions(400000, 64, 1, 0, 'pretax', 'pretax', 1, 100000);
  close(age63.employeeTotal, ORACLE.LIMIT_401K + ORACLE.SUPER_CATCHUP, 'age 63 super catch-up');
  close(age64.employeeTotal, ORACLE.LIMIT_401K + ORACLE.CATCHUP, 'age 64 reverts to 8,000');
  // 49 vs 50 boundary
  const age49 = calculateWorkplaceContributions(400000, 49, 1, 0, 'pretax', 'pretax', 1, 100000);
  const age50 = calculateWorkplaceContributions(400000, 50, 1, 0, 'pretax', 'pretax', 1, 100000);
  close(age49.employeeTotal, ORACLE.LIMIT_401K, 'no catch-up at 49');
  close(age50.employeeTotal, ORACLE.LIMIT_401K + ORACLE.CATCHUP, 'catch-up begins at 50');
  // all limits scale with the inflation multiplier
  const inflated = calculateWorkplaceContributions(1000000, 55, 1, 1, 'pretax', 'pretax', 1.5, 100000);
  close(inflated.employeeTotal, (ORACLE.LIMIT_401K + ORACLE.CATCHUP) * 1.5, 'employee limit × 1.5');
  close(inflated.employeeTotal + inflated.employerTotal,
    (ORACLE.TOTAL_PLAN + ORACLE.CATCHUP) * 1.5, 'annual additions × 1.5');
  // compensation cap: employer % applies to at most 360,000 × mult
  const comp = calculateWorkplaceContributions(1000000, 40, 0, 0.10, 'pretax', 'pretax', 1, 1000000);
  close(comp.employerTotal, ORACLE.COMP_LIMIT * 0.10, 'employer rate on capped compensation');
  // Roth catch-up gate rides prior-year wages ABOVE 150,000 × mult
  const gateAt = calculateWorkplaceContributions(200000, 55, 1, 0, 'pretax', 'pretax', 1, 150000);
  const gateOver = calculateWorkplaceContributions(200000, 55, 1, 0, 'pretax', 'pretax', 1, 150001);
  close(gateAt.forcedRothCatchup, 0, 'at exactly 150,000: not forced');
  close(gateOver.forcedRothCatchup, ORACLE.CATCHUP, '$1 over: catch-up forced to Roth');
  // gate threshold also inflates
  const gateInfl = calculateWorkplaceContributions(400000, 55, 1, 0, 'pretax', 'pretax', 2, 250000);
  close(gateInfl.forcedRothCatchup, 0, 'threshold doubles with inflation (250k < 300k)');
});

test('2b. prior-year wages: explicit value first year, modeled salary thereafter (engine loop)', () => {
  // Salary 160k, prior-year wages 100k: year 0 catch-up stays pre-tax;
  // year 1 prior wages = modeled salary (160k) > threshold -> forced Roth.
  const run = simulatePath(auditParams({
    currentAge: 55, retireAge: 58, endAge: 58,
    currentSalary: 160000, userSavingsRate: 0.25, userPriorYearWages: 100000,
    userSavingsDest: 'pretax', lifestyleInflation: 0,
    stockReturn: 0, bondReturn: 0, stockAllocation: 1
  }), 0);
  // year 0: 40k desired -> 24.5k regular + 8k catch-up, all pre-tax (prior wages 100k)
  close(run.log[0].employeeContribution, 32500, 'year-0 employee total at limit');
  // Detect Roth routing via ordinary income: Roth contributions stay in ordIncome.
  // year 0 ordIncome = salary - pretax 32.5k = 127.5k; year 1 = salary - 24.5k = 135.5k
  close(run.log[0].ordIncome, 160000 - 32500, 'year 0: all deferrals pre-tax');
  close(run.log[1].ordIncome, 160000 - 24500, 'year 1: catch-up forced to Roth (stays taxable)');
});
