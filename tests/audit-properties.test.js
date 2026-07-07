// tests/audit-properties.test.js — ENGINE-AUDIT-PLAN.md Phase 2c (2026-07 audit)
// Directional/metamorphic truths that need no external oracle, run at full determinism
// (P5: hunt with extremes). { todo } tests document audit FINDINGS without failing the
// suite until a fix is approved.

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFinancialEngine, auditParams } = require('./audit-helpers.js');

const eng = loadFinancialEngine();
const { simulatePath } = eng;

const close = (a, b, msg, tol = 0.01) =>
  assert.ok(Math.abs(a - b) < tol, `${msg}: expected ${b}, got ${a}`);

function successRate(params, nPaths = 200) {
  let ok = 0;
  for (let i = 0; i < nPaths; i++) {
    const r = simulatePath(params, i);
    if (r.solvent) ok++;
  }
  return ok / nPaths;
}

test('2c. zero-everything degenerate case is hand-computable to the dollar', () => {
  const p = auditParams({
    currentAge: 60, retireAge: 60, endAge: 65,
    taxableBalance: 500000, lifestyleSpending: 50000,
    stockReturn: 0, bondReturn: 0, lifestyleInflation: 0, taxableGainRatio: 0
  });
  const r = simulatePath(p, 0);
  const expected = [450000, 400000, 350000, 300000, 250000];
  r.log.forEach((y, i) => {
    close(y.totalBal, expected[i], `balance after year ${i}`);
    close(y.totalWithdrawal, 50000, `withdrawal in year ${i}`);
    close(y.taxBill, 0, `no tax in year ${i}`);
    close(y.spending, 50000, `spending in year ${i}`);
  });
  assert.equal(r.solvent, true);
  close(r.finalBalance, 250000, 'final balance');
});

test('2c. solvency edge: partial withdrawal, no negatives, no resurrection, depletionAge exact', () => {
  const p = auditParams({
    currentAge: 60, retireAge: 60, endAge: 68,
    taxableBalance: 500000, lifestyleSpending: 120000,
    stockReturn: 0, bondReturn: 0, lifestyleInflation: 0, taxableGainRatio: 0
  });
  const r = simulatePath(p, 0);
  // Years 0-3 fully funded (480k), year 4 has only 20k left.
  close(r.log[3].totalBal, 20000, 'year 3 leaves 20k');
  close(r.log[4].totalWithdrawal, 20000, 'year 4 withdraws only what exists (partial)');
  assert.equal(r.solvent, false);
  assert.equal(r.depletionAge, 65, 'depletion at the birthday the balance hits zero');
  for (const y of r.log) {
    assert.ok(y.totalBal >= 0, `no negative balance at age ${y.age}`);
  }
  // No resurrection: with no income, later years stay at zero with zero withdrawals.
  for (const y of r.log.slice(5)) {
    close(y.totalBal, 0, `age ${y.age} stays depleted`);
    close(y.totalWithdrawal, 0, `age ${y.age} cannot withdraw`);
  }
  close(r.finalBalance, 0, 'final balance zero');
});

test('2c. inflation coherence: SS, COLA pension, and part-time inflate exactly once; non-COLA pension never', () => {
  const infl = 0.03;
  const p = auditParams({
    currentAge: 70, retireAge: 70, endAge: 75,
    taxableBalance: 2000000, lifestyleSpending: 60000,
    userSS: 24000, userClaimAge: 67,
    pension: 12000, pensionAge: 65, enablePensionCOLA: true,
    enablePartTime: true, partTimeIncome: 10000, partTimeStartAge: 70, partTimeEndAge: 75,
    lifestyleInflation: infl, stockReturn: 0, bondReturn: 0, taxableGainRatio: 0
  });
  const r = simulatePath(p, 0);
  r.log.forEach((y, i) => {
    const f = Math.pow(1 + infl, i);
    close(y.ssIncome, 24000 * f, `SS inflates exactly once (year ${i})`, 1);
    close(y.pensionIncome, 12000 * f, `COLA pension inflates exactly once (year ${i})`, 1);
    close(y.partTimeIncome, 10000 * f, `part-time inflates exactly once (year ${i})`, 1);
  });
  const flat = simulatePath({ ...p, enablePensionCOLA: false }, 0);
  flat.log.forEach((y, i) => {
    close(y.pensionIncome, 12000, `non-COLA pension stays flat (year ${i})`, 0.01);
  });
});

test('2c. monotonicity: higher savings rate never lowers the final balance (same seeds)', () => {
  const base = auditParams({
    currentAge: 40, retireAge: 65, endAge: 90,
    currentSalary: 120000, userPriorYearWages: 120000,
    userPreTaxBalance: 50000, taxableBalance: 20000,
    lifestyleSpending: 70000, userSS: 30000, userClaimAge: 67,
    lifestyleInflation: 0.025, stockReturn: 0.07, bondReturn: 0.035,
    stockVol: 0.17, bondVol: 0.06, stockAllocation: 0.6, taxableGainRatio: 0.6
  });
  for (const seed of [0, 3, 11]) {
    let prev = -Infinity;
    for (const rate of [0.00, 0.05, 0.10, 0.20, 0.35]) {
      const r = simulatePath({ ...base, userSavingsRate: rate }, seed);
      assert.ok(r.finalBalance >= prev - 1,
        `seed ${seed}: final at ${rate} (${Math.round(r.finalBalance)}) < final at lower rate (${Math.round(prev)})`);
      prev = r.finalBalance;
    }
  }
});

test('2c. monotonicity: higher spending never raises success; retiring later never lowers it', () => {
  const base = auditParams({
    currentAge: 50, retireAge: 62, endAge: 90,
    currentSalary: 130000, userPriorYearWages: 130000, userSavingsRate: 0.15,
    userPreTaxBalance: 500000, taxableBalance: 150000,
    userSS: 32000, userClaimAge: 67,
    lifestyleInflation: 0.025, stockReturn: 0.07, bondReturn: 0.035,
    stockVol: 0.17, bondVol: 0.06, stockAllocation: 0.6, taxableGainRatio: 0.6
  });
  let prev = Infinity;
  for (const spend of [60000, 80000, 100000, 120000]) {
    const s = successRate({ ...base, lifestyleSpending: spend });
    assert.ok(s <= prev + 1e-9, `success at spending ${spend} (${s}) exceeds lower spending (${prev})`);
    prev = s;
  }
  prev = -Infinity;
  for (const ra of [62, 64, 66, 68]) {
    const s = successRate({ ...base, lifestyleSpending: 90000, retireAge: ra });
    assert.ok(s >= prev - 1e-9, `success at retireAge ${ra} (${s}) below earlier retirement (${prev})`);
    prev = s;
  }
});

test('2c. later SS claim pays a higher nominal benefit once both are claiming', () => {
  const mk = (claim) => auditParams({
    currentAge: 62, retireAge: 62, endAge: 75,
    taxableBalance: 2000000, lifestyleSpending: 60000,
    userSS: 24000, userClaimAge: claim,
    lifestyleInflation: 0.025, stockReturn: 0, bondReturn: 0, taxableGainRatio: 0
  });
  const early = simulatePath(mk(63), 0);
  const late = simulatePath(mk(70), 0);
  const idx = 70 - 62 + 1; // age 71: both claiming
  assert.ok(late.log[idx].ssIncome > early.log[idx].ssIncome * 1.5,
    `124% vs 75% of PIA: ${Math.round(late.log[idx].ssIncome)} vs ${Math.round(early.log[idx].ssIncome)}`);
});

test('2c. timeline invariants: period count, retirement start, healthcare wait, mortgage/property tax', () => {
  // Exact period count at several spans
  for (const [cur, end] of [[50, 53], [30, 90], [64, 65]]) {
    const r = simulatePath(auditParams({ currentAge: cur, retireAge: Math.max(cur, 60), endAge: end, taxableBalance: 100000 }), 0);
    assert.equal(r.log.length, end - cur, `${cur}->${end} runs exactly ${end - cur} periods`);
  }
  // Spending begins the period whose STARTING age equals retireAge; nothing before
  const p = auditParams({
    currentAge: 63, retireAge: 65, endAge: 68,
    currentSalary: 100000, userPriorYearWages: 100000, userSavingsRate: 0.10,
    taxableBalance: 1000000, lifestyleSpending: 50000,
    healthcarePre65: 6000, healthcare65: 9000,
    mortgagePrincipal: 1500, mortgageLastAge: 66, propertyTax: 8000,
    lifestyleInflation: 0.025, stockReturn: 0, bondReturn: 0, taxableGainRatio: 0
  });
  const r = simulatePath(p, 0);
  assert.equal(r.log[0].spending, 0, 'age 63: still working, no spending');
  assert.equal(r.log[1].spending, 0, 'age 64: still working, no spending');
  const infl2 = Math.pow(1.025, 2);
  // Age 65: lifestyle + mortgage (fixed!) + property tax (inflated) + healthcare65 (its own inflation, 0 here)
  close(r.log[2].spending, 50000 * infl2 + 1500 * 12 + 8000 * infl2 + 9000, 'age-65 spending composition', 1);
  // Age 67 (mortgage ended at 66): no P&I, property tax persists and inflates
  const infl4 = Math.pow(1.025, 4);
  close(r.log[4].spending, 50000 * infl4 + 8000 * infl4 + 9000, 'age-67: P&I gone, tax+insurance persists', 1);
});

test('2c. couple symmetry: swapping user and spouse leaves household outcomes unchanged', () => {
  // No user-age-keyed features (windfall/conversions/slow-go/part-time/guardrails all
  // off) — those are household inputs keyed to the USER's age by design, so a swap
  // legitimately shifts their calendar timing when ages differ.
  const A = auditParams({
    currentAge: 58, retireAge: 64, endAge: 90,
    spouseAge: 52, spouseRetireAge: 62,
    currentSalary: 140000, userPriorYearWages: 140000, userSavingsRate: 0.15,
    spouseCurrentSalary: 90000, spousePriorYearWages: 90000, spouseSavingsRate: 0.10,
    userPreTaxBalance: 600000, userRothBalance: 100000,
    spousePreTaxBalance: 250000, spouseRothBalance: 40000, taxableBalance: 200000,
    userSS: 36000, userClaimAge: 67, spouseSS: 20000, spouseClaimAge: 67,
    pension: 15000, pensionAge: 65,
    lifestyleSpending: 90000, lifestyleInflation: 0.025,
    healthcarePre65: 8000, healthcare65: 5000, healthcareInflation: 0.05,
    stockReturn: 0.06, bondReturn: 0.03, stockAllocation: 0.6, taxableGainRatio: 0.6
  });
  const B = {
    ...A,
    currentAge: A.spouseAge, retireAge: A.spouseRetireAge,
    spouseAge: A.currentAge, spouseRetireAge: A.retireAge,
    currentSalary: A.spouseCurrentSalary, userPriorYearWages: A.spousePriorYearWages,
    userSavingsRate: A.spouseSavingsRate,
    spouseCurrentSalary: A.currentSalary, spousePriorYearWages: A.userPriorYearWages,
    spouseSavingsRate: A.userSavingsRate,
    userPreTaxBalance: A.spousePreTaxBalance, userRothBalance: A.spouseRothBalance,
    spousePreTaxBalance: A.userPreTaxBalance, spouseRothBalance: A.userRothBalance,
    userSS: A.spouseSS, userClaimAge: A.spouseClaimAge,
    spouseSS: A.userSS, spouseClaimAge: A.userClaimAge,
    pension: 0, spousePension: A.pension, spousePensionAge: A.pensionAge,
    // pension moves to the spouse side on swap; keep COLA flags aligned (both off)
    endAge: A.spouseAge + (A.endAge - A.currentAge) // same number of simulated years
  };
  const rA = simulatePath(A, 0);
  const rB = simulatePath(B, 0);
  assert.equal(rA.log.length, rB.log.length, 'same horizon');
  close(rA.finalBalance, rB.finalBalance, 'household final balance is role-independent', 5);
  assert.equal(rA.depletionAge === null, rB.depletionAge === null, 'same solvency');
  rA.log.forEach((y, i) => {
    close(y.totalBal, rB.log[i].totalBal, `household balance year ${i} role-independent`, 5);
  });
});

// FINDING F-ROTHCONV-PHANTOM -- FIXED (V19.5): the planned Roth conversion used to be
// added to ordinary income in full even when discretionary withdrawals drained the
// pre-tax account first and only a fraction could actually convert. Pre-fix repro: a
// $100k pre-tax account produced $159,901 of ordinary income in one year ($79,901
// withdrawal + $80,000 "conversion income" of which only $20,099 could convert): ~$60k
// of phantom taxable income. The engine now computes the executable conversion
// (respecting this pass's withdrawals) and taxes only that.
test('2c. FIXED F-ROTHCONV-PHANTOM: only the executed conversion is taxed', () => {
  const p = auditParams({
    currentAge: 66, retireAge: 66, endAge: 68,
    userPreTaxBalance: 100000, userRothBalance: 0, taxableBalance: 0,
    lifestyleSpending: 50000, stockReturn: 0, bondReturn: 0, stockAllocation: 1,
    taxableGainRatio: 0, enableRothConversion: true, rothConversionAmount: 80000,
    rothConversionStartAge: 66, rothConversionEndAge: 67
  });
  const y = simulatePath(p, 0).log[0];
  // Ordinary income can never exceed what actually left/changed tax character in the
  // whole $100k account -- no more phantom conversion income (was $159,901 pre-fix).
  assert.ok(y.ordIncome <= 100000 + 1,
    `ordIncome ${Math.round(y.ordIncome)} exceeds the whole $100k account: phantom conversion income`);
});

// FINDING F-PT-EARNTEST-ATTRIB -- FIXED (V19.9 B6, superseded V19.10): part-time income is now
// TWO independent channels, one per partner. The SS earnings test reduces only the earning
// partner's benefit, and each channel's start/stop ages are read against ITS earner's age.
//
// Use an ASYMMETRIC pair (different benefits) so mis-attribution changes the HOUSEHOLD total —
// a symmetric pair would hide the bug because reducing either identical benefit costs the same.
test('2c. FIXED F-PT-EARNTEST-ATTRIB: earnings test hits the earning partner only (V19.10 channels)', () => {
  const base = {
    currentAge: 63, retireAge: 63, endAge: 66, spouseAge: 63, spouseRetireAge: 63,
    taxableBalance: 2000000, lifestyleSpending: 60000,
    userSS: 40000, userClaimAge: 62, spouseSS: 10000, spouseClaimAge: 62,
    stockReturn: 0, bondReturn: 0, taxableGainRatio: 0,
  };
  const household = (extra) => simulatePath(auditParams({ ...base, ...extra }), 0).log[0].ssIncome;
  const userOwned = household({
    enablePartTime: true, partTimeIncome: 40000, partTimeStartAge: 63, partTimeEndAge: 66 });
  const spouseOwned = household({
    spouseEnablePartTime: true, spousePartTimeIncome: 40000,
    spousePartTimeStartAge: 63, spousePartTimeEndAge: 66 });
  // Attribution MATTERS: the two households differ (they were identical while the bug forced
  // every reduction onto the user).
  assert.ok(Math.abs(userOwned - spouseOwned) > 500,
    `attribution should change the household total, got user=${Math.round(userOwned)} spouse=${Math.round(spouseOwned)}`);
  // Reducing the SMALLER (spouse) benefit loses less to the earnings test (it floors at $0), so a
  // spouse-earned paycheck leaves a HIGHER household benefit than a user-earned one.
  assert.ok(spouseOwned > userOwned,
    `spouse-owned should preserve more household benefit, got user=${Math.round(userOwned)} spouse=${Math.round(spouseOwned)}`);
});

// V19.10: BOTH partners can work part-time simultaneously, each with own amount and years.
test('2c. V19.10 two channels: both jobs pay in, each earnings test is independent', () => {
  const base = {
    currentAge: 63, retireAge: 63, endAge: 66, spouseAge: 63, spouseRetireAge: 63,
    taxableBalance: 2000000, lifestyleSpending: 60000,
    userSS: 40000, userClaimAge: 62, spouseSS: 10000, spouseClaimAge: 62,
    stockReturn: 0, bondReturn: 0, taxableGainRatio: 0,
  };
  const run = (extra) => simulatePath(auditParams({ ...base, ...extra }), 0).log[0];
  // Both amounts sit ABOVE the SS earnings-test exempt amount ($24,480 in the engine's 2026
  // baseline) so each job produces a nonzero reduction of its earner's early-claimed benefit.
  const userJob = { enablePartTime: true, partTimeIncome: 30000, partTimeStartAge: 63, partTimeEndAge: 66 };
  const spouseJob = { spouseEnablePartTime: true, spousePartTimeIncome: 40000,
    spousePartTimeStartAge: 63, spousePartTimeEndAge: 66 };
  const both = run({ ...userJob, ...spouseJob });
  const onlyUser = run(userJob);
  const onlySpouse = run(spouseJob);
  const none = run({});
  // Income sums: household part-time income equals the two jobs added together.
  assert.ok(Math.abs(both.partTimeIncome - 70000) < 1,
    `both jobs should pay $70k combined, got ${Math.round(both.partTimeIncome)}`);
  // Earnings tests are independent: the combined household's SS reduction equals the sum of
  // each job's own reduction (no cross-contamination between partners).
  const redUser = none.ssIncome - onlyUser.ssIncome;      // user's job reduces only user's benefit
  const redSpouse = none.ssIncome - onlySpouse.ssIncome;  // spouse's job reduces only spouse's
  const redBoth = none.ssIncome - both.ssIncome;
  assert.ok(redUser > 0 && redSpouse > 0, 'each early-claimed benefit should see its own reduction');
  assert.ok(Math.abs(redBoth - (redUser + redSpouse)) < 1,
    `reductions should be independent and additive: both=${Math.round(redBoth)} vs sum=${Math.round(redUser + redSpouse)}`);
  // Each channel gates on ITS earner's age window: spouse job outside the spouse's window pays $0.
  const lateSpouse = run({ ...spouseJob, spousePartTimeStartAge: 65 });
  assert.ok(Math.abs(lateSpouse.partTimeIncome) < 1,
    'spouse channel must gate on the spouse\'s own start age');
});

test('2c. glide path convention: allocation steps toward the target but final year sits one step short', () => {
  const p = auditParams({
    currentAge: 60, retireAge: 60, endAge: 64,
    taxableBalance: 500000, lifestyleSpending: 10000,
    stockAllocation: 0.8, enableGlidePath: true, endingStockAllocation: 0.4,
    stockReturn: 0, bondReturn: 0, taxableGainRatio: 0
  });
  const r = simulatePath(p, 0);
  const allocs = Array.from(r.log, y => Math.round(y.stockAlloc * 1000) / 1000);
  assert.deepEqual(allocs, [0.8, 0.7, 0.6, 0.5],
    'linear glide 0.8->0.4 over 4 years: final simulated year is 0.5, never 0.4 (documented convention)');
});

// FINDING F-DEPLETED-WINDFALL -- FIXED (V19.5, per Cris's explicit go-ahead
// 2026-07-04): a windfall arriving AFTER depletion used to be added to the taxable
// balance, appear in that year's logged totalBal (so charts and the year table showed
// the money arriving), and then be destroyed by an unconditional post-insolvency
// zero-out the following year. Cris chose "bank it": the plan can become solvent
// again, same as a real inheritance genuinely rescuing a broke household. Solvency is
// now re-evaluated every year instead of latching false forever, and depletionAge
// clears when a resurrection happens.
test('2c. FIXED F-DEPLETED-WINDFALL: a late windfall is banked and the plan can recover', () => {
  const p = auditParams({
    currentAge: 60, retireAge: 60, endAge: 70,
    taxableBalance: 500000, lifestyleSpending: 120000,
    stockReturn: 0, bondReturn: 0, lifestyleInflation: 0, taxableGainRatio: 0,
    enableWindfall: true, windfallAmount: 500000, windfallAge: 67
  });
  const r = simulatePath(p, 0);
  // 500k / 120k per year depletes during the year starting at age 64 (balance hits 0
  // at balanceAge 65) -- insolvent ages 65-66 -- windfall lands at 67.
  assert.equal(r.log.find(y => y.age === 64).isSolvent, false, 'depleted before the windfall');
  const at67 = r.log.find(y => y.age === 67);
  const at68 = r.log.find(y => y.age === 68);
  const at69 = r.log.find(y => y.age === 69);
  close(at67.totalBal, 500000, 'windfall banked in full at 67');
  assert.equal(at67.isSolvent, true, 'plan is resolvent the instant the windfall lands');
  close(at68.totalBal, 380000, 'age 68 draws down normally from the banked windfall');
  close(at69.totalBal, 260000, 'age 69 continues drawing down normally');
  assert.equal(r.solvent, true, 'plan is solvent at the end, thanks to the windfall');
  assert.equal(r.depletionAge, null, 'depletionAge clears once the plan resurrects and stays solvent');
});

test('2c. guardrails: ceiling cuts and floor raises move spending as configured', () => {
  const base = auditParams({
    currentAge: 65, retireAge: 65, endAge: 75,
    taxableBalance: 1000000, lifestyleSpending: 80000, // 8% draw: above 6% ceiling
    enableGuardrails: true, guardrailCeiling: 0.06, guardrailFloor: 0.04,
    guardrailAdjustment: 0.10,
    stockReturn: 0, bondReturn: 0, lifestyleInflation: 0, taxableGainRatio: 0
  });
  const cut = simulatePath(base, 0);
  // i=0 never adjusts; from i=1 on, 8%+ draw keeps tripping the ceiling: 80k*0.9, *0.81...
  close(cut.log[0].spending, 80000, 'year 0 unadjusted');
  close(cut.log[1].spending, 72000, 'first ceiling cut is exactly 10%');
  assert.ok(cut.log[2].spending <= 72000 + 1, 'multiplier is cumulative');
  assert.ok(cut.guardrailTriggers > 0, 'triggers counted');

  const raise = simulatePath({
    ...base, lifestyleSpending: 20000, stockReturn: 0.05, stockAllocation: 1 // 2% draw, growing portfolio
  }, 0);
  close(raise.log[1].spending, 22000, 'floor raise is exactly 10% when portfolio grew');
});
