// tests/plan-refresh.test.js — V19.19
// Proves the two pieces with silent failure modes: the staleness stamp decision and the
// update flow's field write-back. Both are pure, so both are provable here rather than
// argued about in a browser.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PR = require(path.join(__dirname, '..', 'cover-app', 'plan-refresh.js'));
const { loadAdapter } = require('./audit-helpers.js');
const DEFAULTS = loadAdapter().DEFAULTS;

// ---------------------------------------------------------------- stamp decision

test('decideStamp: the mount write never stamps', () => {
  assert.equal(PR.decideStamp(true, null, '2026-08-10T00:00:00.000Z'), null);
  // even with a pending file stamp, the mount write is still skipped
  assert.equal(PR.decideStamp(true, '2025-06-01T00:00:00.000Z', '2026-08-10T00:00:00.000Z'), null);
});

test('decideStamp: an ordinary edit stamps now', () => {
  const now = '2026-08-10T12:00:00.000Z';
  // V19.20: decideStamp returns { write } / { clear } / null (F8).
  assert.deepEqual(PR.decideStamp(false, null, now), { write: now });
  assert.deepEqual(PR.decideStamp(false, '', now), { write: now });
  assert.deepEqual(PR.decideStamp(false, undefined, now), { write: now });
});

test('decideStamp: a loaded file keeps its own date, so loading an old plan does not reset the clock', () => {
  const fileDate = '2025-06-01T00:00:00.000Z';
  assert.deepEqual(PR.decideStamp(false, fileDate, '2026-08-10T00:00:00.000Z'), { write: fileDate });
});

// ---------------------------------------------------------------- staleness copy

const NOW = '2026-08-10T00:00:00.000Z';

test('describeStaleness: no stamp means we say we do not know, not a guess', () => {
  for (const v of [null, undefined, '', 'not-a-date']) {
    const d = PR.describeStaleness(v, NOW);
    assert.equal(d.known, false);
    assert.equal(d.phrase, null);
    assert.equal(d.stale, true, 'unknown must still prompt a refresh');
  }
});

test('describeStaleness: recent plans are not flagged stale', () => {
  const d = PR.describeStaleness('2026-08-09T00:00:00.000Z', NOW);
  assert.equal(d.known, true);
  assert.equal(d.phrase, 'yesterday');
  assert.equal(d.stale, false);
});

test('describeStaleness: months and years read naturally', () => {
  assert.equal(PR.describeStaleness('2026-08-10T00:00:00.000Z', NOW).phrase, 'today');
  assert.equal(PR.describeStaleness('2026-07-26T00:00:00.000Z', NOW).phrase, '15 days ago');
  assert.equal(PR.describeStaleness('2026-06-25T00:00:00.000Z', NOW).phrase, '1 month ago');
  assert.equal(PR.describeStaleness('2025-06-10T00:00:00.000Z', NOW).phrase, '14 months ago');
  assert.equal(PR.describeStaleness('2023-01-10T00:00:00.000Z', NOW).phrase, '3 years ago');
});

test('describeStaleness: the stale threshold is where it says it is', () => {
  // 2 months — greet; 4 months — nudge
  assert.equal(PR.describeStaleness('2026-06-15T00:00:00.000Z', NOW).stale, false);
  assert.equal(PR.describeStaleness('2026-04-01T00:00:00.000Z', NOW).stale, true);
});

test('describeStaleness: a clock skew into the future does not read as negative age', () => {
  const d = PR.describeStaleness('2027-01-01T00:00:00.000Z', NOW);
  assert.equal(d.months, 0);
  assert.equal(d.phrase, 'today');
});

// ---------------------------------------------------------------- parseEntry

test('parseEntry: empty is NOT zero — this is the whole risk', () => {
  assert.equal(PR.parseEntry(''), null);
  assert.equal(PR.parseEntry('   '), null);
  assert.equal(PR.parseEntry(null), null);
  assert.equal(PR.parseEntry(undefined), null);
});

test('parseEntry: a typed zero IS zero — an empty Roth is a real answer', () => {
  assert.equal(PR.parseEntry('0'), 0);
  assert.equal(PR.parseEntry('$0'), 0);
  assert.equal(PR.parseEntry(0), 0);
});

test('parseEntry: money formatting is accepted', () => {
  assert.equal(PR.parseEntry('612000'), 612000);
  assert.equal(PR.parseEntry('$612,000'), 612000);
  assert.equal(PR.parseEntry(' 1,234.56 '), 1234.56);
});

test('parseEntry: garbage keeps the stored value rather than guessing', () => {
  for (const v of ['abc', '12abc', '--5', '1.2.3', '$', {}, []]) {
    assert.equal(PR.parseEntry(v), null, `expected null for ${JSON.stringify(v)}`);
  }
});

// ---------------------------------------------------------------- field write-back

test('applyFieldEdits: an all-untouched pass returns the stored params byte for byte', () => {
  const edits = {};
  for (const k of Object.keys(DEFAULTS)) edits[k] = '';
  const r = PR.applyFieldEdits(DEFAULTS, edits);
  assert.equal(JSON.stringify(r.params), JSON.stringify(DEFAULTS),
    'a screen full of untouched fields must not change a single value');
  assert.equal(r.changed.length, 0);
});

test('applyFieldEdits: no balance can ever be zeroed by leaving it alone', () => {
  const stored = { ...DEFAULTS };
  const money = ['userPreTax', 'userRoth', 'spousePreTax', 'spouseRoth', 'taxable',
    'salary', 'spouseSalary', 'ssBenefit', 'spouseSS', 'pension', 'spousePension'];
  for (const blank of ['', '   ', null, undefined, 'abc']) {
    const edits = {};
    for (const k of money) edits[k] = blank;
    const r = PR.applyFieldEdits(stored, edits);
    for (const k of money) {
      assert.equal(r.params[k], stored[k], `${k} changed on blank input ${JSON.stringify(blank)}`);
    }
  }
});

test('applyFieldEdits: edited fields land, untouched neighbours do not move', () => {
  const stored = { ...DEFAULTS };
  const r = PR.applyFieldEdits(stored, { userPreTax: '$612,000', userRoth: '', taxable: '0' });
  assert.equal(r.params.userPreTax, 612000);
  assert.equal(r.params.userRoth, stored.userRoth);
  assert.equal(r.params.taxable, 0, 'an explicit 0 must be honoured');
  assert.deepEqual(r.changed.sort(), ['taxable', 'userPreTax']);
  assert.ok(r.kept.includes('userRoth'));
});

test('applyFieldEdits: retyping the same number counts as unchanged', () => {
  const r = PR.applyFieldEdits(DEFAULTS, { userPreTax: String(DEFAULTS.userPreTax) });
  assert.equal(r.changed.length, 0);
  assert.ok(r.kept.includes('userPreTax'));
});

test('applyFieldEdits: does not mutate the stored object, and ignores unknown keys', () => {
  const stored = { ...DEFAULTS };
  const snapshot = JSON.stringify(stored);
  const r = PR.applyFieldEdits(stored, { userPreTax: '1', notARealField: '999' });
  assert.equal(JSON.stringify(stored), snapshot, 'stored params were mutated');
  assert.equal(r.params.notARealField, undefined);
});

test('applyFieldEdits: every field not mentioned is carried through untouched', () => {
  const r = PR.applyFieldEdits(DEFAULTS, { userPreTax: '1' });
  for (const k of Object.keys(DEFAULTS)) {
    if (k === 'userPreTax') continue;
    assert.equal(r.params[k], DEFAULTS[k], `${k} was dropped or altered`);
  }
});

// ---------------------------------------------------------------- prior-year wages

test('syncPriorWages: wages follow salary when they were in step', () => {
  const before = { ...DEFAULTS };
  const after = { ...before, salary: 160000 };
  const out = PR.syncPriorWages(before, after);
  assert.equal(out.priorYearWages, 160000);
});

test('syncPriorWages: a deliberately different wages figure is left alone', () => {
  const before = { ...DEFAULTS, priorYearWages: 90000 };
  const after = { ...before, salary: 160000 };
  const out = PR.syncPriorWages(before, after);
  assert.equal(out.priorYearWages, 90000, 'user intent was overwritten');
});

test('syncPriorWages: spouse channel behaves the same and independently', () => {
  const before = { ...DEFAULTS };
  const after = { ...before, spouseSalary: 95000 };
  const out = PR.syncPriorWages(before, after);
  assert.equal(out.spousePriorYearWages, 95000);
  assert.equal(out.priorYearWages, before.priorYearWages);
});

// ---------------------------------------------------------------- conditional steps

const ids = (p) => PR.stepsFor(p).map(s => s.id);

test('stepsFor: a working couple with no pension sees four steps', () => {
  const p = { ...DEFAULTS, currentAge: 58, spouseAge: 56, pension: 0, spousePension: 0 };
  assert.deepEqual(ids(p), ['ages', 'balances', 'salaries', 'socialSecurity']);
});

test('stepsFor: a pension in the plan adds the fifth step', () => {
  const p = { ...DEFAULTS, currentAge: 58, spouseAge: 56, pension: 24000 };
  assert.deepEqual(ids(p), ['ages', 'balances', 'salaries', 'socialSecurity', 'pension']);
  const pen = PR.stepsFor(p).find(s => s.id === 'pension');
  assert.deepEqual(pen.fields, ['pension'], 'a spouse with no pension must not be asked');
});

test('stepsFor: a retired single person already claiming sees two steps', () => {
  const p = { ...DEFAULTS, hasPartner: false, currentAge: 70, retireAge: 65,
    ssClaimAge: 67, pension: 0, spousePension: 0 };
  assert.deepEqual(ids(p), ['ages', 'balances']);
});

test('stepsFor: a single person is never asked about a spouse', () => {
  const p = { ...DEFAULTS, hasPartner: false, currentAge: 58 };
  for (const s of PR.stepsFor(p)) {
    for (const f of s.fields) {
      assert.ok(!/^spouse/.test(f), `single household was asked for ${f}`);
    }
  }
});

test('stepsFor: one retired partner still gets asked about the other one working', () => {
  const p = { ...DEFAULTS, currentAge: 66, retireAge: 65, spouseAge: 56, spouseRetireAge: 65 };
  const sal = PR.stepsFor(p).find(s => s.id === 'salaries');
  assert.deepEqual(sal.fields, ['spouseSalary']);
});
