const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const desktop = fs.readFileSync(path.join(root, 'cover-app', 'cover-inputs.jsx'), 'utf8');
const mobile = fs.readFileSync(path.join(root, 'cover-app', 'cover-mobile.jsx'), 'utf8');

function loadDefaults() {
  const source = fs.readFileSync(path.join(root, 'cover-app', 'real-engine.js'), 'utf8');
  const window = {};
  const context = {
    console, window,
    document: { addEventListener() {}, createElement() { return {}; }, head: { appendChild() {} } }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 10000 });
  return window.MockEngine.DEFAULTS;
}

function loadFieldInfo() {
  const source = fs.readFileSync(path.join(root, 'cover-app', 'retire-ui.jsx'), 'utf8');
  const end = source.indexOf('// Small "i" affordance');
  assert.ok(end > 0, 'FIELD_INFO boundary should exist');
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source.slice(0, end)}\n;globalThis.__FIELD_INFO = FIELD_INFO;`, context);
  return context.__FIELD_INFO;
}

function hasUpdate(source, key) {
  return source.includes(`update('${key}'`);
}

const HELP_ALIASES = {
  userPreTax: 'preTax',
  spousePreTax: 'preTax',
  userRoth: 'roth',
  spouseRoth: 'roth',
  enableWindfall: 'windfall',
  enableSpendingReduction: 'spendingReduction',
  enablePensionCOLA: 'pensionCOLA',
  spousePensionStartAge: 'pensionStartAge',
  enableSpousePensionCOLA: 'pensionCOLA',
  enablePartTime: 'partTime',
  enableGlidePath: 'glidePath',
  enableRothConversion: 'rothConversion',
  enableTCJASunset: 'tcjaSunset',
  enableGuardrails: 'guardrails'
};

function renderedControls(source) {
  const controls = [];
  const pattern = /<(?:CField|CToggle|CSelect|MStep|MToggle|MSelect)\b([\s\S]*?)\/>/g;
  for (const match of source.matchAll(pattern)) {
    const update = match[1].match(/update\('([^']+)'/);
    if (!update) continue;
    const field = match[1].match(/field="([^"]+)"/);
    controls.push({ key: update[1], field: field && field[1] });
  }
  return controls;
}

test('every saved-plan input has an editable field on desktop and mobile', () => {
  const defaults = loadDefaults();
  for (const key of Object.keys(defaults)) {
    assert.ok(hasUpdate(desktop, key), `desktop is missing an input for ${key}`);
    assert.ok(hasUpdate(mobile, key), `mobile is missing an input for ${key}`);
  }
});

test('every rendered input has a plain-English help line and tooltip', () => {
  const info = loadFieldInfo();
  for (const [layout, source] of [['desktop', desktop], ['mobile', mobile]]) {
    for (const control of renderedControls(source)) {
      assert.ok(control.field, `${layout} control for ${control.key} is missing its help field`);
      const expectedField = HELP_ALIASES[control.key] || control.key;
      assert.equal(control.field, expectedField,
        `${layout} control for ${control.key} is wired to the wrong help field`);
      assert.ok(info[control.field], `FIELD_INFO is missing ${control.field}`);
      assert.ok(typeof info[control.field].help === 'string' && info[control.field].help.length >= 10,
        `${control.field} needs a clear help line`);
      assert.ok(typeof info[control.field].detail === 'string' && info[control.field].detail.length >= 20,
        `${control.field} needs a clear tooltip`);
    }
  }
});
