const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAdapter() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'real-engine.js'), 'utf8')
    .replace('window.MockEngine = {', 'window.__mapToReal = mapToReal; window.MockEngine = {');
  const window = {};
  const context = {
    console, window,
    document: { addEventListener() {}, createElement() { return {}; }, head: { appendChild() {} } }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 10000 });
  return { engine: window.MockEngine, mapToReal: window.__mapToReal };
}

const { engine, mapToReal } = loadAdapter();

test('older saved plans receive zero employer contribution without changing employee rate', () => {
  const normalized = engine.normalizeParams({ savingsRate: 12, spouseSavingsRate: 6 }).params;
  assert.equal(normalized.savingsRate, 12);
  assert.equal(normalized.spouseSavingsRate, 6);
  assert.equal(normalized.employerContributionRate, 0);
  assert.equal(normalized.spouseEmployerContributionRate, 0);
});

test('adapter maps employee and employer rates independently', () => {
  const normalized = engine.normalizeParams({
    hasPartner: true,
    savingsRate: 12, employerContributionRate: 5,
    spouseSavingsRate: 6, spouseEmployerContributionRate: 3
  }).params;
  const real = mapToReal(normalized, 500);

  assert.equal(real.userSavingsRate, 0.12);
  assert.equal(real.userEmployerContributionRate, 0.05);
  assert.equal(real.spouseSavingsRate, 0.06);
  assert.equal(real.spouseEmployerContributionRate, 0.03);
});
