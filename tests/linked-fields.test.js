// tests/linked-fields.test.js — V19.22 (F9-LINKED-FIELDS-PLAN-2026-11-10.md)
// Written BEFORE PlanRefresh.findConflicts. Each flagged rule: broken -> flagged,
// boundary -> clear, toggle off -> clear. DEFAULTS -> nothing. Disclosure only: the
// function must never change params (no math moves in F9).

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PR = require(path.join(__dirname, '..', 'cover-app', 'plan-refresh.js'));
const { loadAdapter } = require('./audit-helpers.js');
const DEFAULTS = loadAdapter().DEFAULTS;

const ids = (p) => PR.findConflicts(p).map(c => c.id).sort();
const plan = (o) => Object.assign({}, DEFAULTS, o);

test('F9: untouched DEFAULTS has no conflicts', () => {
  assert.deepEqual(ids(DEFAULTS), []);
});

test('F9: bad input returns an empty list, never throws', () => {
  assert.deepEqual(PR.findConflicts(null), []);
  assert.deepEqual(PR.findConflicts(undefined), []);
  assert.deepEqual(PR.findConflicts({}), []);
});

test('F9 rule 1: your part-time end before start', () => {
  assert.deepEqual(ids(plan({ enablePartTime: true, partTimeStartAge: 70, partTimeEndAge: 68 })), ['partTimeEnd']);
  assert.deepEqual(ids(plan({ enablePartTime: true, partTimeStartAge: 70, partTimeEndAge: 70 })), []);
  assert.deepEqual(ids(plan({ enablePartTime: false, partTimeStartAge: 70, partTimeEndAge: 68 })), []);
});

test('F9 rule 2: partner part-time end before start, only with a partner', () => {
  const broken = { spouseEnablePartTime: true, spousePartTimeStartAge: 70, spousePartTimeEndAge: 66 };
  assert.deepEqual(ids(plan(broken)), ['spousePartTimeEnd']);
  assert.deepEqual(ids(plan({ ...broken, spousePartTimeEndAge: 70 })), []);
  assert.deepEqual(ids(plan({ ...broken, spouseEnablePartTime: false })), []);
  assert.deepEqual(ids(plan({ ...broken, hasPartner: false })), []);
});

test('F9 rule 3: Roth conversion end before start', () => {
  assert.deepEqual(ids(plan({ enableRothConversion: true, rothConversionStartAge: 70, rothConversionEndAge: 65 })), ['rothEnd']);
  assert.deepEqual(ids(plan({ enableRothConversion: true, rothConversionStartAge: 70, rothConversionEndAge: 70 })), []);
  assert.deepEqual(ids(plan({ enableRothConversion: false, rothConversionStartAge: 70, rothConversionEndAge: 65 })), []);
});

test('F9 rule 4: windfall age already passed (current age itself still counts)', () => {
  assert.deepEqual(ids(plan({ enableWindfall: true, windfallAmount: 300000, windfallAge: 54 })), ['windfallPast']);
  assert.deepEqual(ids(plan({ enableWindfall: true, windfallAmount: 300000, windfallAge: 55 })), []);
  assert.deepEqual(ids(plan({ enableWindfall: false, windfallAge: 40 })), []);
  const c = PR.findConflicts(plan({ enableWindfall: true, windfallAge: 50 }))[0];
  assert.match(c.text, /\?/, 'worded as a question (Cris, 2026-11-10)');
});

test('F9 rule 5: spending slow-down before retirement', () => {
  assert.deepEqual(ids(plan({ enableSpendingReduction: true, spendingReductionAge: 60 })), ['slowDownEarly']);
  assert.deepEqual(ids(plan({ enableSpendingReduction: true, spendingReductionAge: 65 })), []);
  assert.deepEqual(ids(plan({ enableSpendingReduction: false, spendingReductionAge: 60 })), []);
});

test('F9 rule 6: a rising glide path is allowed on purpose, never flagged', () => {
  assert.deepEqual(ids(plan({ enableGlidePath: true, stockAllocation: 40, glidePathEndStock: 70 })), []);
});

test('F9 rule 7: guardrail win-back level at or above the ceiling', () => {
  assert.deepEqual(ids(plan({ enableGuardrails: true, guardrailCeiling: 5, guardrailFloor: 5.5 })), ['guardrailOrder']);
  assert.deepEqual(ids(plan({ enableGuardrails: true, guardrailCeiling: 5, guardrailFloor: 5 })), ['guardrailOrder']);
  assert.deepEqual(ids(plan({ enableGuardrails: true, guardrailCeiling: 5, guardrailFloor: 4.5 })), []);
  assert.deepEqual(ids(plan({ enableGuardrails: false, guardrailCeiling: 5, guardrailFloor: 6 })), []);
  const c = PR.findConflicts(plan({ enableGuardrails: true, guardrailCeiling: 5, guardrailFloor: 6 }))[0];
  assert.match(c.text, /Win back trims below/, 'uses the V19.21 label');
});

test('F9: rules 8-13 (sensible engine readings) are NOT flagged', () => {
  const p = plan({
    enablePartTime: true, partTimeStartAge: 50, partTimeEndAge: 60,          // 8: start before now
    enableRothConversion: true, rothConversionStartAge: 50, rothConversionEndAge: 60, // 9
    housingType: 'own', mortgagePayment: 2000, mortgageLastAge: 50,           // 10
    enableWindfall: true, windfallAge: 100,                                    // 11: past horizon
  });
  assert.deepEqual(ids(p), []);
});

test('F9: several conflicts are all reported, each tied to the box to fix', () => {
  const p = plan({
    enablePartTime: true, partTimeStartAge: 70, partTimeEndAge: 68,
    enableRothConversion: true, rothConversionStartAge: 70, rothConversionEndAge: 65,
    enableWindfall: true, windfallAge: 50,
    enableSpendingReduction: true, spendingReductionAge: 60,
    enableGuardrails: true, guardrailCeiling: 4, guardrailFloor: 6,
    spouseEnablePartTime: true, spousePartTimeStartAge: 70, spousePartTimeEndAge: 66,
  });
  const list = PR.findConflicts(p);
  assert.equal(list.length, 6);
  assert.deepEqual(list.map(c => c.field).sort(), ['guardrailFloor', 'partTimeEndAge', 'rothConversionEndAge',
    'spendingReductionAge', 'spousePartTimeEndAge', 'windfallAge']);
  for (const c of list) {
    assert.equal(typeof c.text, 'string');
    assert.ok(c.text.length > 20);
    assert.equal(PR.conflictNote(list, c.field), c.text);
  }
  assert.equal(PR.conflictNote(list, 'currentAge'), null);
  assert.equal(PR.conflictNote(null, 'windfallAge'), null);
});

test('F9: findConflicts never mutates params', () => {
  const p = plan({ enableWindfall: true, windfallAge: 50, enableGuardrails: true, guardrailFloor: 7 });
  const before = JSON.stringify(p);
  PR.findConflicts(p);
  assert.equal(JSON.stringify(p), before);
});

test('F9: notes name the numbers as entered (one decimal for guardrail percents)', () => {
  const c = PR.findConflicts(plan({ enableGuardrails: true, guardrailCeiling: 5, guardrailFloor: 6 }))[0];
  assert.match(c.text, /6\.0%/);
  assert.match(c.text, /5\.0%/);
  const w = PR.findConflicts(plan({ enablePartTime: true, partTimeStartAge: 70, partTimeEndAge: 68 }))[0];
  assert.match(w.text, /68/);
  assert.match(w.text, /70/);
});
