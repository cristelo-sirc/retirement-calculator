const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadFinancialEngine() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  const emptyList = [];
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return emptyList; },
    createElement() {
      return { style: {}, click() {}, setAttribute() {}, appendChild() {} };
    },
    body: {
      style: {}, appendChild() {},
      classList: { add() {}, remove() {}, contains() { return false; } }
    }
  };
  const window = {
    addEventListener() {}, innerWidth: 1280, innerHeight: 720, scrollY: 0,
    location: { origin: '', pathname: '', search: '' },
    history: { replaceState() {} },
    URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
    confirm() { return false; }
  };
  const context = {
    console, Math, Intl, Date, JSON, Promise, setTimeout, clearTimeout, URLSearchParams,
    Blob, document, window,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__financialEngine = {
    simulatePath, calculateWorkplaceContributions, calculateFederalOrdinaryTax,
    calculateCapGainsTax, calculateIRMAA, calculateSSBenefit
  };`, context, { timeout: 10000 });
  return context.__financialEngine;
}

const {
  simulatePath, calculateWorkplaceContributions, calculateFederalOrdinaryTax,
  calculateCapGainsTax, calculateIRMAA, calculateSSBenefit
} = loadFinancialEngine();

function baseParams(overrides = {}) {
  return {
    currentAge: 50, retireAge: 53, endAge: 53, spouseAge: 0, spouseRetireAge: 0,
    userPreTaxBalance: 100000, userRothBalance: 0,
    spousePreTaxBalance: 0, spouseRothBalance: 0, taxableBalance: 0,
    currentSalary: 100000, userSavingsRate: 0.10,
    userEmployerContributionRate: 0, userPriorYearWages: 100000,
    userSavingsDest: 'pretax', userEmployerContributionDest: 'pretax',
    spouseCurrentSalary: 0, spouseSavingsRate: 0,
    spouseEmployerContributionRate: 0, spousePriorYearWages: 0,
    spouseSavingsDest: 'pretax', spouseEmployerContributionDest: 'pretax',
    userSS: 0, userClaimAge: 70, spouseSS: 0, spouseClaimAge: 70,
    enableSpousalBenefit: false,
    pension: 0, pensionAge: 65, enablePensionCOLA: false,
    spousePension: 0, spousePensionAge: 65, enableSpousePensionCOLA: false,
    enablePartTime: false, partTimeIncome: 0, partTimeStartAge: 65, partTimeEndAge: 70,
    enableWindfall: false, windfallAmount: 0, windfallAge: 70,
    enableRothConversion: false, rothConversionAmount: 0,
    rothConversionStartAge: 65, rothConversionEndAge: 72,
    lifestyleSpending: 0, lifestyleInflation: 0,
    enableSpendingReduction: false, spendingReductionAge: 75, spendingReductionPercent: 0,
    enableGuardrails: false, guardrailCeiling: 0.06,
    guardrailFloor: 0.04, guardrailAdjustment: 0.10,
    housingType: 'own', mortgagePrincipal: 0, mortgageLastAge: 0,
    propertyTax: 0, monthlyRent: 0,
    healthcarePre65: 0, healthcare65: 0, healthcareInflation: 0,
    stockAllocation: 1, enableGlidePath: false, endingStockAllocation: 1,
    stockReturn: 0.10, stockVol: 0, bondReturn: 0, bondVol: 0,
    bracketGrowth: 0, enableTCJASunset: false, stateTaxRate: 0, taxableGainRatio: 0,
    _solverDeterministic: true, _solverSeedBase: 123,
    ...overrides
  };
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.01,
    `${message}: expected ${expected}, received ${actual}`);
}

test('pre-tax contributions persist and compound with annual returns', () => {
  const result = simulatePath(baseParams(), 0);
  const expected = [120000, 142000, 166200];
  assert.equal(result.log.length, 3, 'age 50 to 53 is exactly three elapsed years');
  result.log.forEach((year, index) => {
    assertClose(year.totalBal, expected[index], `balance at age ${year.age}`);
    assert.equal(year.balanceAge, year.age + 1);
    assert.equal(year.totalWithdrawal, 0);
  });
  assertClose(result.log[0].startingBalance, 100000, 'today starts at the entered balance');
  assertClose(result.finalBalance, 166200, 'ending balance at age 53');
});

test('employee and employer contributions have separate paycheck and portfolio effects', () => {
  const result = simulatePath(baseParams({
    currentAge: 40, retireAge: 41, endAge: 41,
    userPreTaxBalance: 0, stockReturn: 0,
    userSavingsRate: 0.10, userEmployerContributionRate: 0.05
  }), 0);
  const year = result.log[0];

  assertClose(year.employeeContribution, 10000, 'employee contribution');
  assertClose(year.employerContribution, 5000, 'employer contribution');
  assertClose(year.totalBal, 15000, 'portfolio receives both contributions');
  assertClose(year.wages, 90000, 'only employee contribution reduces take-home wages');
  assertClose(year.ordIncome, 90000, 'only employee pre-tax contribution reduces taxable wages');
});

test('2026 workplace limits separate employee, catch-up, employer, and compensation caps', () => {
  const under50 = calculateWorkplaceContributions(400000, 40, 1, 1, 'pretax', 'pretax', 1, 400000);
  assertClose(under50.employeeTotal, 24500, 'under-50 employee limit');
  assertClose(under50.employerTotal, 47500, 'employer room under overall limit');
  assertClose(under50.employeeTotal + under50.employerTotal, 72000, 'overall annual additions limit');

  const age55 = calculateWorkplaceContributions(100000, 55, 1, 1, 'pretax', 'pretax', 1, 100000);
  assertClose(age55.employeeTotal, 32500, 'age-50 catch-up limit');
  assertClose(age55.employerTotal, 47500, 'catch-up excluded from employer plan room');
  assertClose(age55.employeeTotal + age55.employerTotal, 80000, 'overall limit plus catch-up');

  const age61 = calculateWorkplaceContributions(100000, 61, 1, 1, 'pretax', 'pretax', 1, 100000);
  assertClose(age61.employeeTotal, 35750, 'age-60-to-63 higher catch-up limit');
  assertClose(age61.employeeTotal + age61.employerTotal, 83250, 'overall limit plus higher catch-up');

  const highSalary = calculateWorkplaceContributions(1000000, 40, 0, 0.10, 'pretax', 'pretax', 1, 1000000);
  assertClose(highSalary.employerTotal, 36000, 'employer rate uses capped eligible compensation');
});

test('2026 high-earner catch-up is directed to Roth', () => {
  const contribution = calculateWorkplaceContributions(200000, 55, 1, 0, 'pretax', 'pretax', 1, 200000);
  assertClose(contribution.employeePreTax, 24500, 'regular deferral remains pre-tax');
  assertClose(contribution.employeeRoth, 8000, 'catch-up is Roth');
  assertClose(contribution.forcedRothCatchup, 8000, 'forced Roth portion');
});

test('explicit prior-year wages control Roth catch-up treatment', () => {
  const below = calculateWorkplaceContributions(200000, 55, 1, 0, 'pretax', 'pretax', 1, 100000);
  const above = calculateWorkplaceContributions(200000, 55, 1, 0, 'pretax', 'pretax', 1, 200000);
  assertClose(below.employeePreTax, 32500, 'below-threshold prior wages keep catch-up pre-tax');
  assertClose(below.employeeRoth, 0, 'below-threshold Roth catch-up');
  assertClose(above.employeePreTax, 24500, 'above-threshold regular pre-tax deferral');
  assertClose(above.employeeRoth, 8000, 'above-threshold catch-up forced to Roth');
});

test('Roth employer contributions grow Roth and are taxable without reducing take-home', () => {
  const result = simulatePath(baseParams({
    currentAge: 40, retireAge: 41, endAge: 42,
    userPreTaxBalance: 0, stockReturn: 0,
    userSavingsRate: 0, userEmployerContributionRate: 0.05,
    userEmployerContributionDest: 'roth', lifestyleSpending: 5000
  }), 0);
  const year = result.log[0];
  assertClose(year.totalBal, 5000, 'Roth employer contribution reaches portfolio');
  assertClose(year.wages, 100000, 'Roth employer contribution does not reduce take-home');
  assertClose(year.ordIncome, 105000, 'Roth employer contribution is included in gross income');
  assertClose(result.log[1].wdRoth, 5000, 'Roth employer contribution remains in the Roth account');
  assert.equal(result.log[1].wdPreTax, 0);
});

test('2026 tax, capital-gains, Medicare, and Social Security baselines are exact', () => {
  assertClose(calculateFederalOrdinaryTax(16100, 'Single', 1, 1), 0, 'single standard deduction');
  assertClose(calculateFederalOrdinaryTax(28500, 'Single', 1, 1), 1240, 'single first bracket');
  assertClose(calculateFederalOrdinaryTax(32200, 'MFJ', 1, 1), 0, 'joint standard deduction');
  assertClose(calculateFederalOrdinaryTax(57000, 'MFJ', 1, 1), 2480, 'joint first bracket');

  assertClose(calculateCapGainsTax(98900, 0, 'MFJ', 1, 1), 0, 'joint zero-rate capital gains ceiling');
  // V19.5 (F-SURPLUS/F-CG-SD fix, 2026-07-04): the unused standard deduction now
  // shelters gains too (taxable income 99000-32200=66800, still under the 98900
  // zero-rate cap), so this stays $0 -- see audit-statutory.test.js for the case that
  // tests the true 0%-ceiling boundary with the SD already spoken for by ordinary income.
  assertClose(calculateCapGainsTax(99000, 0, 'MFJ', 1, 1), 0, 'unused SD now shelters these gains too');

  assertClose(calculateIRMAA(218000, 'MFJ', 1), 0, 'IRMAA joint base tier');
  assertClose(calculateIRMAA(218001, 'MFJ', 1), 95.70 * 12, 'IRMAA first joint surcharge');
  assertClose(calculateIRMAA(500000, 'Single', 1), 578 * 12, 'IRMAA top single boundary');

  const ssAtLimit = calculateSSBenefit(10000, 62, 62, 67, 0.028, 24480, 24480);
  const ssOverLimit = calculateSSBenefit(10000, 62, 62, 67, 0.028, 24482, 24480);
  assertClose(ssAtLimit, 7000, 'Social Security earnings limit');
  assertClose(ssOverLimit, 6999, 'Social Security withholding above limit');
});

test('retirement spending does not cause hidden withdrawals while everyone is working', () => {
  const result = simulatePath(baseParams({
    endAge: 51, retireAge: 52, stockReturn: 0,
    lifestyleSpending: 90000, mortgagePrincipal: 2000,
    mortgageLastAge: 60, propertyTax: 12000,
    healthcarePre65: 8000, healthcare65: 10000
  }), 0);
  assertClose(result.log[0].totalBal, 110000, 'working-year balance');
  assert.equal(result.log[0].spending, 0);
  assert.equal(result.log[0].totalWithdrawal, 0);
});

test('post-65 healthcare waits until retirement rather than drawing from a working portfolio', () => {
  const result = simulatePath(baseParams({
    currentAge: 66, retireAge: 68, endAge: 67,
    userPreTaxBalance: 100000, currentSalary: 100000,
    stockReturn: 0, lifestyleSpending: 90000, healthcare65: 12000
  }), 0);
  assert.equal(result.log[0].spending, 0);
  assert.equal(result.log[0].totalWithdrawal, 0);
});

test('housing uses non-housing spending, fixed mortgage P&I, and continuing tax plus insurance', () => {
  const result = simulatePath(baseParams({
    currentAge: 60, retireAge: 60, endAge: 64,
    userPreTaxBalance: 0, taxableBalance: 1000000,
    currentSalary: 0, userSavingsRate: 0,
    lifestyleSpending: 100000, lifestyleInflation: 0.025,
    mortgagePrincipal: 2000, mortgageLastAge: 62, propertyTax: 12000,
    stockReturn: 0
  }), 0);

  const expectedSpending = [136000, 138800, 141670, 120611.75];
  result.log.forEach((year, index) => {
    assertClose(year.spending, expectedSpending[index], `spending at age ${year.age}`);
  });

  // The fixed $24,000 annual P&I payment is present through age 62, then drops.
  assertClose(result.log[2].spending - (100000 * 1.025 ** 2) - (12000 * 1.025 ** 2),
    24000, 'mortgage before payoff');
  // The combined property-tax and insurance amount remains after payoff and keeps inflating.
  assertClose(result.log[3].spending - (100000 * 1.025 ** 3),
    12000 * 1.025 ** 3, 'tax and insurance after payoff');
});

test('retirement begins at the retirement-age period without erasing the prior working year', () => {
  const result = simulatePath(baseParams({
    currentAge: 64, retireAge: 65, endAge: 66,
    userPreTaxBalance: 0, taxableBalance: 1000000,
    stockReturn: 0, lifestyleSpending: 50000
  }), 0);

  assert.deepEqual(Array.from(result.log, y => y.age), [64, 65]);
  assert.deepEqual(Array.from(result.log, y => y.balanceAge), [65, 66]);
  assertClose(result.log[0].employeeContribution, 10000, 'age-64 employee contribution');
  assert.equal(result.log[0].spending, 0);
  assert.equal(result.log[1].employeeContribution, 0);
  assertClose(result.log[1].spending, 50000, 'age-65 retirement spending');
});

test('Social Security, Medicare, and RMDs begin in their named age periods', () => {
  const ss = simulatePath(baseParams({
    currentAge: 66, retireAge: 66, endAge: 68,
    userPreTaxBalance: 0, taxableBalance: 1000000,
    currentSalary: 0, userSavingsRate: 0, stockReturn: 0,
    userSS: 10000, userClaimAge: 67
  }), 0);
  assert.equal(ss.log[0].age, 66);
  assert.equal(ss.log[0].ssIncome, 0);
  assert.equal(ss.log[1].age, 67);
  assertClose(ss.log[1].ssIncome, 10000, 'Social Security at claim age');

  const health = simulatePath(baseParams({
    currentAge: 64, retireAge: 64, endAge: 66,
    userPreTaxBalance: 0, taxableBalance: 1000000,
    currentSalary: 0, userSavingsRate: 0, stockReturn: 0,
    healthcarePre65: 8000, healthcare65: 10000
  }), 0);
  assertClose(health.log[0].spending, 8000, 'pre-65 healthcare at age 64');
  assertClose(health.log[1].spending, 10000, 'Medicare-age healthcare at age 65');

  const rmd = simulatePath(baseParams({
    currentAge: 74, retireAge: 74, endAge: 76,
    userPreTaxBalance: 246000, currentSalary: 0, userSavingsRate: 0,
    stockReturn: 0
  }), 0);
  assert.equal(rmd.log[0].rmd, 0);
  assertClose(rmd.log[1].rmd, 10000, 'RMD at age 75');
});

test('depletion age is the birthday when the ending balance reaches zero', () => {
  const result = simulatePath(baseParams({
    currentAge: 65, retireAge: 65, endAge: 67,
    userPreTaxBalance: 0, taxableBalance: 10000,
    currentSalary: 0, userSavingsRate: 0,
    stockReturn: 0, lifestyleSpending: 20000
  }), 0);
  assert.equal(result.depletionAge, 66);
  assert.equal(result.log[0].age, 65);
  assert.equal(result.log[0].balanceAge, 66);
});
