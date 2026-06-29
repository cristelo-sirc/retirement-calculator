const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAdapter() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'real-engine.js'), 'utf8')
    .replace('window.MockEngine = {', 'window.__mapToReal = mapToReal; window.__buildBalancePath = buildBalancePath; window.MockEngine = {');
  const window = {};
  const context = {
    console, window,
    document: { addEventListener() {}, createElement() { return {}; }, head: { appendChild() {} } }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 10000 });
  return { engine: window.MockEngine, mapToReal: window.__mapToReal, buildBalancePath: window.__buildBalancePath };
}

const { engine, mapToReal, buildBalancePath } = loadAdapter();

test('older saved plans receive zero employer contribution without changing employee rate', () => {
  const normalized = engine.normalizeParams({ savingsRate: 12, spouseSavingsRate: 6 }).params;
  assert.equal(normalized.savingsRate, 12);
  assert.equal(normalized.spouseSavingsRate, 6);
  assert.equal(normalized.employerContributionRate, 0);
  assert.equal(normalized.spouseEmployerContributionRate, 0);
  assert.equal(normalized.priorYearWages, engine.DEFAULTS.salary);
  assert.equal(normalized.spousePriorYearWages, engine.DEFAULTS.spouseSalary);
  assert.equal(normalized.employerContributionDest, 'pretax');
  assert.equal(normalized.spouseEmployerContributionDest, 'pretax');
});

test('adapter maps employee and employer rates independently', () => {
  const normalized = engine.normalizeParams({
    hasPartner: true,
    priorYearWages: 200000, savingsRate: 12, employerContributionRate: 5,
    employerContributionDest: 'roth',
    spousePriorYearWages: 90000, spouseSavingsRate: 6, spouseEmployerContributionRate: 3,
    spouseEmployerContributionDest: 'pretax'
  }).params;
  const real = mapToReal(normalized, 500);

  assert.equal(real.userSavingsRate, 0.12);
  assert.equal(real.userEmployerContributionRate, 0.05);
  assert.equal(real.userPriorYearWages, 200000);
  assert.equal(real.userEmployerContributionDest, 'roth');
  assert.equal(real.spouseSavingsRate, 0.06);
  assert.equal(real.spouseEmployerContributionRate, 0.03);
  assert.equal(real.spousePriorYearWages, 90000);
  assert.equal(real.spouseEmployerContributionDest, 'pretax');
});

test('balance path starts with today and then uses one point per elapsed birthday', () => {
  const params = engine.normalizeParams({
    hasPartner: false, currentAge: 50,
    userPreTax: 100000, userRoth: 0, taxable: 0
  }).params;
  const path = buildBalancePath([
    { age: 50, balanceAge: 51, totalBal: 120000 },
    { age: 51, balanceAge: 52, totalBal: 142000 },
    { age: 52, balanceAge: 53, totalBal: 166200 }
  ], params);
  assert.deepEqual(JSON.parse(JSON.stringify(path)), [
    { age: 50, balance: 100000 },
    { age: 51, balance: 120000 },
    { age: 52, balance: 142000 },
    { age: 53, balance: 166200 }
  ]);
});
