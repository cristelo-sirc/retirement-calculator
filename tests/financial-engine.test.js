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
    userEmployerContributionRate: 0, userSavingsDest: 'pretax',
    spouseCurrentSalary: 0, spouseSavingsRate: 0,
    spouseEmployerContributionRate: 0, spouseSavingsDest: 'pretax',
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
  const expected = [120000, 142000, 166200, 182820];
  result.log.forEach((year, index) => {
    assertClose(year.totalBal, expected[index], `balance at age ${year.age}`);
    assert.equal(year.totalWithdrawal, 0);
  });
});

test('employee and employer contributions have separate paycheck and portfolio effects', () => {
  const result = simulatePath(baseParams({
    currentAge: 40, retireAge: 41, endAge: 40,
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
  const under50 = calculateWorkplaceContributions(400000, 40, 1, 1, 'pretax', 1);
  assertClose(under50.employeeTotal, 24500, 'under-50 employee limit');
  assertClose(under50.employerTotal, 47500, 'employer room under overall limit');
  assertClose(under50.employeeTotal + under50.employerTotal, 72000, 'overall annual additions limit');

  const age55 = calculateWorkplaceContributions(100000, 55, 1, 1, 'pretax', 1);
  assertClose(age55.employeeTotal, 32500, 'age-50 catch-up limit');
  assertClose(age55.employerTotal, 47500, 'catch-up excluded from employer plan room');
  assertClose(age55.employeeTotal + age55.employerTotal, 80000, 'overall limit plus catch-up');

  const age61 = calculateWorkplaceContributions(100000, 61, 1, 1, 'pretax', 1);
  assertClose(age61.employeeTotal, 35750, 'age-60-to-63 higher catch-up limit');
  assertClose(age61.employeeTotal + age61.employerTotal, 83250, 'overall limit plus higher catch-up');

  const highSalary = calculateWorkplaceContributions(1000000, 40, 0, 0.10, 'pretax', 1);
  assertClose(highSalary.employerTotal, 36000, 'employer rate uses capped eligible compensation');
});

test('2026 high-earner catch-up is directed to Roth', () => {
  const contribution = calculateWorkplaceContributions(200000, 55, 1, 0, 'pretax', 1);
  assertClose(contribution.employeePreTax, 24500, 'regular deferral remains pre-tax');
  assertClose(contribution.employeeRoth, 8000, 'catch-up is Roth');
  assertClose(contribution.forcedRothCatchup, 8000, 'forced Roth portion');
});

test('2026 tax, capital-gains, Medicare, and Social Security baselines are exact', () => {
  assertClose(calculateFederalOrdinaryTax(16100, 'Single', 1, 1), 0, 'single standard deduction');
  assertClose(calculateFederalOrdinaryTax(28500, 'Single', 1, 1), 1240, 'single first bracket');
  assertClose(calculateFederalOrdinaryTax(32200, 'MFJ', 1, 1), 0, 'joint standard deduction');
  assertClose(calculateFederalOrdinaryTax(57000, 'MFJ', 1, 1), 2480, 'joint first bracket');

  assertClose(calculateCapGainsTax(98900, 0, 'MFJ', 1, 1), 0, 'joint zero-rate capital gains ceiling');
  assertClose(calculateCapGainsTax(99000, 0, 'MFJ', 1, 1), 15, 'capital gains above zero-rate ceiling');

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
    endAge: 50, retireAge: 52, stockReturn: 0,
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
    currentAge: 66, retireAge: 68, endAge: 66,
    userPreTaxBalance: 100000, currentSalary: 100000,
    stockReturn: 0, lifestyleSpending: 90000, healthcare65: 12000
  }), 0);
  assert.equal(result.log[0].spending, 0);
  assert.equal(result.log[0].totalWithdrawal, 0);
});

test('housing uses non-housing spending, fixed mortgage P&I, and continuing tax plus insurance', () => {
  const result = simulatePath(baseParams({
    currentAge: 60, retireAge: 60, endAge: 63,
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
