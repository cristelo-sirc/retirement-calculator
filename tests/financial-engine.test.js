const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadSimulatePath() {
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
  vm.runInContext(`${source}\n;globalThis.__simulatePath = simulatePath;`, context, { timeout: 10000 });
  return context.__simulatePath;
}

const simulatePath = loadSimulatePath();

function baseParams(overrides = {}) {
  return {
    currentAge: 50, retireAge: 53, endAge: 53, spouseAge: 0, spouseRetireAge: 0,
    userPreTaxBalance: 100000, userRothBalance: 0,
    spousePreTaxBalance: 0, spouseRothBalance: 0, taxableBalance: 0,
    currentSalary: 100000, userSavingsRate: 0.10, userSavingsDest: 'pretax',
    spouseCurrentSalary: 0, spouseSavingsRate: 0, spouseSavingsDest: 'pretax',
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
