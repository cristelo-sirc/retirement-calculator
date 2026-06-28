const test = require('node:test');
const assert = require('node:assert/strict');
const entry = require('../cover-app/numeric-entry.js');

test('accepts exact formatted currency without snapping to the button increment', () => {
  assert.deepEqual(entry.validateDraft('$83,742', { min: 0, max: 1000000, precision: 0 }),
    { ok: true, value: 83742 });
});

test('accepts a percentage with the field precision', () => {
  assert.deepEqual(entry.validateDraft('5.5%', { min: 0, max: 12, precision: 1 }),
    { ok: true, value: 5.5 });
});

test('rejects blank, nonnumeric, over-precise, and out-of-range entries', () => {
  assert.equal(entry.validateDraft('', { min: 0, max: 100, precision: 0 }).reason, 'number');
  assert.equal(entry.validateDraft('salary', { min: 0, max: 100, precision: 0 }).reason, 'number');
  assert.equal(entry.validateDraft('65.5', { min: 20, max: 85, precision: 0 }).reason, 'precision');
  assert.equal(entry.validateDraft('101', { min: 0, max: 100, precision: 0 }).reason, 'range');
});

test('step buttons adjust the exact typed value rather than rounding it', () => {
  assert.equal(entry.adjustedValue(83742, 5000, { min: 0, max: 1000000, precision: 0 }), 88742);
  assert.equal(entry.adjustedValue(2.5, 0.1, { min: 0, max: 8, precision: 1 }), 2.6);
});

test('step buttons respect both limits', () => {
  assert.equal(entry.adjustedValue(999999, 5000, { min: 0, max: 1000000, precision: 0 }), 1000000);
  assert.equal(entry.adjustedValue(0, -5000, { min: 0, max: 1000000, precision: 0 }), 0);
});

test('field precision follows its existing step size', () => {
  assert.equal(entry.stepPrecision(5000), 0);
  assert.equal(entry.stepPrecision(0.5), 1);
  assert.equal(entry.stepPrecision(0.01), 2);
});
