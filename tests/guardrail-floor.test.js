// V19.21: guardrail gauge + spending floor.
// Before V19.21 the guardrail "withdrawal rate" was lifestyle budget / portfolio — it ignored the
// Social Security / pension paying for that budget (and the housing, healthcare and taxes the
// portfolio also pays), and cuts had no lower limit. A plan scoring 9/100 read 100/100 with
// guardrails on while spending fell to a fraction of plan. These checks pin the fix.
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadFinancialEngine, loadAdapter, auditParams } = require('./audit-helpers.js');
const { simulatePath } = loadFinancialEngine();
const A = loadAdapter();

const G = { enableGuardrails: true, guardrailCeiling: 0.06, guardrailFloor: 0.04, guardrailAdjustment: 0.10 };
// Retired at 65, flat markets, untaxed taxable withdrawals: every number below is hand-checkable.
const flat = (o) => auditParams({ currentAge: 65, retireAge: 65, endAge: 75,
  stockReturn: 0, bondReturn: 0, taxableGainRatio: 0, ...G, guardrailMinSpending: 0.75, ...o });
const close = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} vs ${b}`);
const mults = (r) => r.log.map(y => y.guardrailMult);

test('G1. the gauge counts guaranteed income: a pension covering most spending triggers no cut', () => {
  // $80k spending, $50k pension, $1M: the portfolio pays ~$30k + tax (~3%) — under the 6% ceiling.
  // The pre-V19.21 gauge read $80k / $1M = 8% and cut every year.
  const r = simulatePath(flat({ taxableBalance: 1000000, lifestyleSpending: 80000, pension: 50000, pensionAge: 65 }), 0);
  assert.deepEqual(mults(r), mults(r).map(() => 1), 'spending never trimmed');
  assert.equal(r.guardrailTriggers, 0);
  // Same with Social Security instead of a pension (claimed at 65, so a reduced benefit).
  const ss = simulatePath(flat({ taxableBalance: 1000000, lifestyleSpending: 80000, userSS: 55000, userClaimAge: 65 }), 0);
  assert.ok(ss.log[1].ssIncome > 40000, 'SS is being paid');
  assert.ok(mults(ss).every(v => v === 1), 'SS counts as income in the gauge');
  // Control: same plan without the pension really is drawing 8%+ and is trimmed at year 1.
  const ctl = simulatePath(flat({ taxableBalance: 1000000, lifestyleSpending: 80000 }), 0);
  close(ctl.log[1].guardrailMult, 0.9, 'control trimmed 10%');
});

test('G2. the gauge counts housing and healthcare the portfolio pays', () => {
  // $40k spending + $30k healthcare from $1M: year-1 gauge = $70k / $930k = 7.5% > 6% -> trim.
  // (The old gauge read $40k / $930k = 4.3% and never trimmed.)
  const r = simulatePath(flat({ taxableBalance: 1000000, lifestyleSpending: 40000, healthcare65: 30000 }), 0);
  close(r.log[0].guardrailMult, 1, 'year 0 never adjusts');
  close(r.log[1].guardrailMult, 0.9, 'year-1 trim');
  close(r.log[1].spending, 36000 + 30000, 'only lifestyle is trimmed; healthcare is not');
});

test('G3. the gauge counts last year\'s taxes', () => {
  // $58k spending from $1.1M, no income. Roth (no tax): year-1 gauge = 58,000 / 1,042,000 = 5.57% -> no trim.
  // Pre-tax: year-0 tax ~$5.4k, so year-1 gauge = (58,000 + tax) / ~1,036,600 = ~6.1% -> trim.
  const roth = simulatePath(flat({ userRothBalance: 1100000, lifestyleSpending: 58000 }), 0);
  const pre = simulatePath(flat({ userPreTaxBalance: 1100000, lifestyleSpending: 58000 }), 0);
  close(roth.log[1].guardrailMult, 1, 'Roth: no trim');
  close(pre.log[1].guardrailMult, 0.9, 'pre-tax: trimmed because taxes are part of the draw');
  const t0 = pre.log[0].taxBill, gauge = (58000 + t0) / pre.log[0].totalBal;
  assert.ok(t0 > 4000 && t0 < 7000, `year-0 tax is plausible: ${t0}`);
  assert.ok(gauge > 0.06 && 58000 / pre.log[0].totalBal < 0.06, 'taxes are what push it over the ceiling');
});

test('G4. a paycheck year\'s tax is not used as the next year\'s estimate', () => {
  // Age 64, retiring at 65: year 0 is a working year with a big tax bill. Year 1 (first retired
  // year) must not count it. $56k from $1.1M Roth = ~5.1% -> no trim, despite the salary-year tax.
  const r = simulatePath(flat({ currentAge: 64, retireAge: 65, userRothBalance: 1100000,
    lifestyleSpending: 56000, currentSalary: 300000 }), 0);
  assert.ok(r.log[0].taxBill > 50000, 'working year had a large tax bill');
  close(r.log[1].guardrailMult, 1, 'first retired year not trimmed by paycheck-era tax');
});

test('G5. cuts stop at the spending floor', () => {
  // $80k from $1M, no income: 8%+ every year. Multiplier 1 -> .9 -> .81 -> .75 (not .729), then holds.
  const r = simulatePath(flat({ taxableBalance: 1000000, lifestyleSpending: 80000 }), 0);
  const m = mults(r);
  close(m[1], 0.9, 'y1'); close(m[2], 0.81, 'y2'); close(m[3], 0.75, 'y3 clamped to the floor');
  for (let k = 3; k < m.length; k++) close(m[k], 0.75, `y${k} holds at the floor`);
  assert.equal(r.guardrailTriggers, 3, 'no trigger is counted once at the floor');
  for (const y of r.log) assert.ok(y.spending >= 60000 - 1e-6, 'never below 75% of $80k');
});

test('G6. with a floor, a plan that needs deeper cuts runs out — and counts as a failure', () => {
  const p = (f) => flat({ endAge: 90, taxableBalance: 700000, lifestyleSpending: 80000, stockReturn: 0.03,
    guardrailMinSpending: f });
  const noFloor = simulatePath(p(0), 0);
  const floored = simulatePath(p(0.75), 0);
  assert.equal(noFloor.everDepleted, false, 'unlimited cuts "survive" by cutting to ~15% of plan');
  assert.ok(Math.min(...mults(noFloor)) < 0.2);
  assert.equal(floored.everDepleted, true, 'at 75% the money runs out');
});

test('G7. an absent floor (legacy DOM app) behaves exactly as floor 0', () => {
  const o = { endAge: 90, taxableBalance: 700000, lifestyleSpending: 80000, stockReturn: 0.03 };
  const absent = flat(o); delete absent.guardrailMinSpending;
  assert.deepEqual(simulatePath(absent, 0), simulatePath(flat({ ...o, guardrailMinSpending: 0 }), 0));
});

test('G8. with guardrails off, the floor setting changes nothing', () => {
  const o = { enableGuardrails: false, currentAge: 55, endAge: 92, taxableBalance: 800000,
    lifestyleSpending: 90000, userSS: 30000, userClaimAge: 67, stockVol: 0.17, bondVol: 0.06 };
  for (let i = 0; i < 5; i++)
    assert.deepEqual(simulatePath(flat({ ...o, guardrailMinSpending: 0.5 }), i),
                     simulatePath(flat({ ...o, guardrailMinSpending: 1 }), i));
});

test('G9. adapter: default 75%, mapped to a fraction, clamped 50–100, old plans get the default', () => {
  assert.equal(A.DEFAULTS.guardrailMinSpending, 75);
  assert.equal(A.mapToReal(A.DEFAULTS, 10).guardrailMinSpending, 0.75);
  const n = (v) => A.engine.normalizeParams({ ...A.DEFAULTS, guardrailMinSpending: v }).params.guardrailMinSpending;
  assert.equal(n(30), 50); assert.equal(n(120), 100); assert.equal(n(80), 80);
  // A sample plan stored before V19.21 lacks the key: it must still normalize to exactly DEFAULTS,
  // or every stored sample plan would be relabeled as personal.
  const old = { ...A.DEFAULTS }; delete old.guardrailMinSpending;
  assert.equal(JSON.stringify(A.engine.normalizeParams(old).params), JSON.stringify(A.DEFAULTS));
  const once = A.engine.normalizeParams(old).params;
  assert.deepEqual(A.engine.normalizeParams(once).params, once, 'idempotent');
});

test('G10. compute(): guardrailSummary reports the cuts; null when guardrails are off', () => {
  const D = { ...A.DEFAULTS, numPaths: 500 };
  assert.equal(A.engine.compute(D).guardrailSummary, null);
  const on = A.engine.compute({ ...D, enableGuardrails: true }).guardrailSummary;
  assert.ok(on.cutShare > 0 && on.cutShare <= 100, `cutShare ${on.cutShare}`);
  assert.ok(on.typicalLow >= 75 && on.typicalLow < 100, `typicalLow respects the floor: ${on.typicalLow}`);
  const none = A.engine.compute({ ...D, enableGuardrails: true, guardrailMinSpending: 100 }).guardrailSummary;
  assert.equal(none.cutShare, 0); assert.equal(none.typicalLow, null);
});

test('G11. the original bug: $160k spending no longer reads 100/100 with guardrails', () => {
  const D = { ...A.DEFAULTS, numPaths: 1000, spending: 160000 };
  const off = A.engine.compute(D).successRate;
  const on = A.engine.compute({ ...D, enableGuardrails: true }).successRate;
  assert.ok(off < 20, `off ${off}`);
  assert.ok(on >= 40 && on <= 58, `guardrails on now ${on} (49 at 1,000 paths; was 100 before V19.21)`);
  // The floor is what drives it: accept cuts to 50% and the plan survives; refuse cuts and it's back to "off".
  assert.ok(A.engine.compute({ ...D, enableGuardrails: true, guardrailMinSpending: 50 }).successRate > 90);
  assert.equal(A.engine.compute({ ...D, enableGuardrails: true, guardrailMinSpending: 100 }).successRate, off);
});

// Review findings (Fable, 2026-11-10) — each scenario reproduced a defect in the first V19.21 draft.
const R4 = (o) => auditParams({ stockReturn: 0.04, bondReturn: 0.04, lifestyleInflation: 0.025, bracketGrowth: 0.025,
  ...G, guardrailMinSpending: 0.75, ...o });

test('G12. partner still working: the gauge counts tax, so no raise while the real draw tops the ceiling', () => {
  // You retired at 65; partner earns $150k until 65 (you're 75). Draft gauge zeroed tax in every wage
  // year, read ~2%, and RAISED spending at 66 while the real draw was 7.4%+.
  const r = simulatePath(R4({ currentAge: 65, retireAge: 65, endAge: 85, spouseAge: 55, spouseRetireAge: 65,
    spouseCurrentSalary: 150000, spousePriorYearWages: 150000, userPreTaxBalance: 900000, lifestyleSpending: 170000 }), 0);
  const wageYears = r.log.filter(y => y.age >= 66 && y.age <= 70);
  for (const y of wageYears) {
    const real = (y.spending + y.taxBill - (y.wages + y.pensionIncome + y.partTimeIncome + y.ssIncome)) / (y.startingBalance * 1.04);
    assert.ok(real < 0.065, `age ${y.age}: real draw ${real.toFixed(4)} stays near/below the ceiling`);
  }
  // The trim that only a tax-aware gauge sees: at 71 the gauge (incl. tax) reads ~6.2% and trims;
  // with wage-year tax zeroed it stays at 1.00 through 74 (mutation-checked in review).
  close(r.log.find(y => y.age === 71).guardrailMult, 0.9, 'trim at 71');
});

test('G13. the year after Roth conversions end, last year\'s conversion tax does not force a cut', () => {
  // $150k/yr conversions at 60-64. Age-64 tax ~$77k; age-65 tax ~$14k. Draft gauge carried $77k into 65 and cut.
  const r = simulatePath(R4({ currentAge: 60, retireAge: 60, endAge: 80, userPreTaxBalance: 2000000, taxableBalance: 400000,
    lifestyleSpending: 95000, enableRothConversion: true, rothConversionAmount: 150000,
    rothConversionStartAge: 60, rothConversionEndAge: 64 }), 0);
  const at = (a) => r.log.find(y => y.age === a).guardrailMult;
  close(at(64), 0.9, 'the age-64 cut is real (draw 7.5%)');
  close(at(65), at(64), 'no extra cut at 65');
});

test('G14. raises never lift spending above plan, even when income covers the budget', () => {
  // $60k spending, $55k COLA pension, $1.5M: draft gauge read ~0% and raised spending to ~195% of plan.
  const r = simulatePath(R4({ currentAge: 65, retireAge: 65, endAge: 90, taxableBalance: 1500000, lifestyleSpending: 60000,
    pension: 55000, pensionAge: 65, enablePensionCOLA: true }), 0);
  assert.ok(mults(r).every(v => v === 1), 'stays exactly at plan');
  assert.equal(r.guardrailTriggers, 0, 'no no-op raises counted');
  // Stochastic: across 300 sample-plan futures, never above plan.
  const real = A.mapToReal(A.engine.normalizeParams({ ...A.DEFAULTS, enableGuardrails: true }).params, 300);
  real._solverDeterministic = true; real._solverSeedBase = 0x5f3759df;
  for (let i = 0; i < 300; i++) assert.ok(simulatePath(real, i).log.every(y => y.guardrailMult <= 1));
});

test('G15. the floor is measured against the plan after a planned slow-down', () => {
  // 20% slow-down from 70; floor 75% -> lifestyle never below 0.75 x 0.8 x $80k = $48k after 70 (flat, no inflation).
  const r = simulatePath(flat({ endAge: 85, taxableBalance: 900000, lifestyleSpending: 80000,
    enableSpendingReduction: true, spendingReductionAge: 70, spendingReductionPercent: 0.20 }), 0);
  for (const y of r.log) {
    const planned = y.age >= 70 ? 64000 : 80000;
    assert.ok(y.spending >= 0.75 * planned - 1e-6, `age ${y.age}: ${y.spending}`);
  }
  assert.ok(r.log.some(y => y.age >= 70 && Math.abs(y.spending - 48000) < 1e-6), 'reaches the floor of the slowed plan');
});

test('G16. income above the budget: gauge clamps at 0, nothing breaks', () => {
  const r = simulatePath(flat({ taxableBalance: 500000, lifestyleSpending: 40000, pension: 90000, pensionAge: 65 }), 0);
  assert.ok(mults(r).every(v => v === 1));
  assert.ok(r.log.every(y => Number.isFinite(y.totalBal)));
});

test('G17. guardrailSummary never reports a trim that would display as 100%', () => {
  const s = A.engine.compute({ ...A.DEFAULTS, numPaths: 500, enableGuardrails: true, guardrailAdjustment: 0.5 }).guardrailSummary;
  assert.ok(s.typicalLow == null || s.typicalLow < 100, `typicalLow ${s.typicalLow}`);
  // Hand-built logs: a 0.996 low would round to "100%", so it isn't a reported trim.
  const logs = (lows) => lows.map(l => ({ log: [{ guardrailMult: 1 }, { guardrailMult: l }] }));
  assert.deepEqual({ ...A.guardrailSummaryOf(logs([0.996, 0.90]), { enableGuardrails: true }) }, { cutShare: 50, typicalLow: 90 });
  assert.deepEqual({ ...A.guardrailSummaryOf(logs([0.80, 0.90, 0.75]), { enableGuardrails: true }) }, { cutShare: 100, typicalLow: 80 });
  assert.equal(A.guardrailSummaryOf(logs([0.8]), { enableGuardrails: false }), null);
});

test('G18. the gauge counts the Medicare surcharge (IRMAA)', () => {
  // Single, 68, $3M pre-tax, $150k spending, 5% returns: high MAGI -> top IRMAA tiers. Counting the
  // surcharge puts the year-1 gauge over 6% (trim at 69); without it the first trim waits until 71
  // (mutation-checked: gauge IRMAA zeroed -> 1.00 at 69 and 70).
  const r = simulatePath(auditParams({ currentAge: 68, retireAge: 68, endAge: 78, userPreTaxBalance: 3000000,
    lifestyleSpending: 150000, stockReturn: 0.05, bondReturn: 0.05, ...G, guardrailMinSpending: 0.75 }), 0);
  assert.ok(r.log[1].spending > r.log[1].guardrailMult * 150000, 'IRMAA is being charged');
  close(r.log.find(y => y.age === 69).guardrailMult, 0.9, 'trim at 69 because of the surcharge');
});
