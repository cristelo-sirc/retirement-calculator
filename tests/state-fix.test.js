// tests/state-fix.test.js — V19.20 (STATE-FIX-PLAN-2026-11-10.md)
// Written BEFORE the fixes. Each block names the plan item it guards.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const PR = require(path.join(__dirname, '..', 'cover-app', 'plan-refresh.js'));
const { loadAdapter } = require('./audit-helpers.js');
const A = loadAdapter();
const ME = A.engine;
const DEFAULTS = A.DEFAULTS;

// ------------------------------------------------------------------ F4: update boxes

test('F4 checkEntry: shorthand and junk are INVALID, never silently kept', () => {
  for (const raw of ['600k', '1.2m', 'abc', '12-3', '$']) {
    assert.equal(PR.checkEntry('money', raw, 520000).status, 'invalid', raw);
  }
});

test('F4 checkEntry: a trailing decimal point is readable', () => {
  assert.deepEqual(PR.checkEntry('money', '650000.', 520000), { status: 'changed', value: 650000 });
});

test('F4 checkEntry: money formatting is accepted', () => {
  assert.deepEqual(PR.checkEntry('money', '$1,234,000', 520000), { status: 'changed', value: 1234000 });
});

test('F4 checkEntry: a cleared box is unchanged — never zero', () => {
  for (const raw of ['', '   ', null, undefined]) {
    assert.equal(PR.checkEntry('money', raw, 520000).status, 'unchanged', String(raw));
  }
});

test('F4 checkEntry: typing the stored value back reads unchanged', () => {
  assert.equal(PR.checkEntry('money', '520000', 520000).status, 'unchanged');
  assert.equal(PR.checkEntry('money', '520,000', 520000).status, 'unchanged');
  assert.equal(PR.checkEntry('age', '63', 63).status, 'unchanged');
});

test('F4 checkEntry: a typed zero IS zero', () => {
  assert.deepEqual(PR.checkEntry('money', '0', 120000), { status: 'changed', value: 0 });
});

test('F4 checkEntry: negative money is invalid', () => {
  const r = PR.checkEntry('money', '-5000', 120000);
  assert.equal(r.status, 'invalid');
  assert.equal(r.reason, 'range');
});

test('F4 checkEntry: fractional and out-of-range ages are invalid (55.5 once produced a $0 paycheck)', () => {
  assert.equal(PR.checkEntry('age', '55.5', 55).reason, 'precision');
  assert.equal(PR.checkEntry('age', '5', 55).reason, 'range');
  assert.equal(PR.checkEntry('age', '101', 55).reason, 'range');
  assert.deepEqual(PR.checkEntry('age', '18', 55), { status: 'changed', value: 18 });
  assert.deepEqual(PR.checkEntry('age', '100', 55), { status: 'changed', value: 100 });
});

test('F4 entryMessage: every invalid reason has plain-English copy', () => {
  for (const kind of ['age', 'money']) {
    for (const reason of ['number', 'precision', 'range']) {
      const m = PR.entryMessage(kind, reason);
      assert.equal(typeof m, 'string');
      assert.ok(m.length > 10, `${kind}/${reason}`);
    }
  }
});

test('F4 contract kept: parseEntry still never turns empty into 0, and 0 into 0', () => {
  assert.equal(PR.parseEntry(''), null);
  assert.equal(PR.parseEntry('0'), 0);
});

// ------------------------------------------------------------------ F8: staleness through a file

const NOW = '2026-11-10T12:00:00.000Z';
const OLD = '2024-03-01T00:00:00.000Z';

test('F8 fileStamps: the file carries the plan\'s EDIT date, and the save time separately', () => {
  assert.deepEqual(PR.fileStamps(OLD, NOW), { savedAt: OLD, exportedAt: NOW });
});

test('F8 fileStamps: a plan with no edit date says so in the file (no guessing "today")', () => {
  for (const v of [null, undefined, '', 'garbage']) {
    assert.deepEqual(PR.fileStamps(v, NOW), { savedAt: null, exportedAt: NOW }, String(v));
  }
});

test('F8 fileEditStamp: a V19.20 file hands back its edit date', () => {
  assert.equal(PR.fileEditStamp({ savedAt: OLD, exportedAt: NOW }), OLD);
});

test('F8 fileEditStamp: a V19.19 file (no exportedAt — its savedAt is really the SAVE time) is unknown', () => {
  assert.equal(PR.fileEditStamp({ savedAt: NOW, params: {} }), PR.UNKNOWN_STAMP);
});

test('F8 fileEditStamp: a missing or broken date is unknown', () => {
  for (const o of [{}, { savedAt: null, exportedAt: NOW }, { savedAt: 'nope', exportedAt: NOW }, null]) {
    assert.equal(PR.fileEditStamp(o), PR.UNKNOWN_STAMP, JSON.stringify(o));
  }
});

test('F8 decideStamp: mount write still writes nothing', () => {
  assert.equal(PR.decideStamp(true, OLD, NOW), null);
  assert.equal(PR.decideStamp(true, PR.UNKNOWN_STAMP, NOW), null);
});

test('F8 decideStamp: an unknown file CLEARS the stamp rather than stamping today', () => {
  assert.deepEqual(PR.decideStamp(false, PR.UNKNOWN_STAMP, NOW), { clear: true });
});

test('F8 decideStamp: a dated file and an ordinary edit still behave as before', () => {
  assert.deepEqual(PR.decideStamp(false, OLD, NOW), { write: OLD });
  for (const p of [null, undefined, '']) assert.deepEqual(PR.decideStamp(false, p, NOW), { write: NOW });
});

test('F8 round trip: save → load of a 2024 plan still reads 2024', () => {
  const file = PR.fileStamps(OLD, NOW);
  const d = PR.decideStamp(false, PR.fileEditStamp(file), NOW);
  assert.deepEqual(d, { write: OLD });
});

// ------------------------------------------------------------------ F1: retirement age moved

const norm = (p) => ME.normalizeParams(p);

test('F1 reachability: stored plans can NEVER be "already retired" — stepsFor on normalized params', () => {
  // Documents what the app can really reach (the old stepsFor test fed un-normalized params).
  const n = norm({ ...DEFAULTS, hasPartner: false, currentAge: 70, retireAge: 65 }).params;
  assert.equal(n.retireAge, 71);
  assert.ok(PR.stepsFor(n).some(s => s.id === 'salaries'),
    'a normalized plan always looks like it is still working');
});

test('F1 trackRetireMove: an age update that pushes retirement records where it came from', () => {
  const prev = { ...DEFAULTS, currentAge: 63, retireAge: 65 };
  const req = { ...prev, currentAge: 66 };
  const n = norm(req).params;
  const rec = PR.trackRetireMove(null, prev, req, n);
  assert.deepEqual(rec.user, { from: 65, to: 67 });
  assert.deepEqual(PR.retireMoveWarnings(rec, n), [{ who: 'user', from: 65, to: 67 }]);
});

test('F1 trackRetireMove: a second push keeps the ORIGINAL retirement age', () => {
  const p0 = { ...DEFAULTS, currentAge: 63, retireAge: 65 };
  const r1 = { ...p0, currentAge: 66 }; const n1 = norm(r1).params;
  const rec1 = PR.trackRetireMove(null, p0, r1, n1);
  const r2 = { ...n1, currentAge: 68 }; const n2 = norm(r2).params;
  const rec2 = PR.trackRetireMove(rec1, n1, r2, n2);
  assert.deepEqual(rec2.user, { from: 65, to: 69 });
});

test('F1 trackRetireMove: the user choosing a retirement age themselves clears the warning', () => {
  const p0 = { ...DEFAULTS, currentAge: 63, retireAge: 65 };
  const r1 = { ...p0, currentAge: 66 }; const n1 = norm(r1).params;
  const rec1 = PR.trackRetireMove(null, p0, r1, n1);
  // even choosing the SAME number the app picked counts as a decision
  const r2 = { ...n1, retireAge: 67 };
  const fake = { ...n1, retireAge: 66 }; // previous value differed
  assert.equal(PR.trackRetireMove(rec1, fake, r2, norm(r2).params), null);
  const r3 = { ...n1, retireAge: 70 }; const n3 = norm(r3).params;
  assert.equal(PR.trackRetireMove(rec1, n1, r3, n3), null);
});

test('F1 trackRetireMove: unrelated edits leave an active warning in place', () => {
  const p0 = { ...DEFAULTS, currentAge: 63, retireAge: 65 };
  const r1 = { ...p0, currentAge: 66 }; const n1 = norm(r1).params;
  const rec1 = PR.trackRetireMove(null, p0, r1, n1);
  const r2 = { ...n1, spending: 90000 }; const n2 = norm(r2).params;
  assert.deepEqual(PR.trackRetireMove(rec1, n1, r2, n2), rec1);
});

test('F1 trackRetireMove: nothing moved, nothing recorded', () => {
  const p0 = { ...DEFAULTS };
  const r1 = { ...p0, spending: 90000 };
  assert.equal(PR.trackRetireMove(null, p0, r1, norm(r1).params), null);
});

test('F1 trackRetireMove: the partner is tracked independently, and dropped when there is no partner', () => {
  const p0 = { ...DEFAULTS, spouseAge: 63, spouseRetireAge: 65 };
  const r1 = { ...p0, spouseAge: 66 }; const n1 = norm(r1).params;
  const rec = PR.trackRetireMove(null, p0, r1, n1);
  assert.deepEqual(rec.spouse, { from: 65, to: 67 });
  assert.equal(rec.user, undefined);
  assert.deepEqual(PR.retireMoveWarnings(rec, n1), [{ who: 'spouse', from: 65, to: 67 }]);
  assert.deepEqual(PR.retireMoveWarnings(rec, { ...n1, hasPartner: false }), []);
});

test('F1 retireMoveWarnings: stale or empty records show nothing', () => {
  assert.deepEqual(PR.retireMoveWarnings(null, DEFAULTS), []);
  assert.deepEqual(PR.retireMoveWarnings({ user: { from: 65, to: 67 } }, { ...DEFAULTS, retireAge: 70 }), []);
});

test('F1 adjustedFields: lists what normalization moved, not what the user typed', () => {
  const before = { ...DEFAULTS, currentAge: 63, retireAge: 65 };
  const req = { ...before, currentAge: 66 };
  const n = norm(req);
  const adj = PR.adjustedFields(before, n.params, n.notes, ['currentAge']);
  assert.deepEqual(adj, [{ field: 'retireAge', from: 65, to: 67 }]);
});

// ------------------------------------------------------------------ F2: headline

test('F2 updateHeadline: an unknown before-score never claims "right where you left it"', () => {
  assert.equal(PR.updateHeadline(null, 46), 'Here’s where you stand.');
  assert.equal(PR.updateHeadline(undefined, 46), 'Here’s where you stand.');
  assert.equal(PR.updateHeadline(80, null), 'Working out where that leaves you…');
  assert.equal(PR.updateHeadline(80, 85), 'Better than you left it.');
  assert.equal(PR.updateHeadline(80, 70), 'Worth a closer look.');
  assert.equal(PR.updateHeadline(80, 80), 'Right where you left it.');
});

// ------------------------------------------------------------------ F10: DEFAULTS pin

// "Sample plan" is detected by exact equality with DEFAULTS in five places. Changing ANY
// default relabels every stored untouched sample plan as a personal plan. If this fails,
// that change needs a migration decision first — see STATE-FIX-PLAN-2026-11-10.md F10.
const PINNED = {"hasPartner":true,"currentAge":55,"retireAge":65,"endAge":92,"spouseAge":53,"spouseRetireAge":65,"userPreTax":520000,"userRoth":120000,"spousePreTax":180000,"spouseRoth":40000,"taxable":90000,"salary":145000,"priorYearWages":145000,"savingsRate":12,"employerContributionRate":0,"savingsDest":"pretax","employerContributionDest":"pretax","spouseSalary":78000,"spousePriorYearWages":78000,"spouseSavingsRate":6,"spouseEmployerContributionRate":0,"spouseSavingsDest":"pretax","spouseEmployerContributionDest":"pretax","salaryGrowth":2.5,"spouseSalaryGrowth":2.5,"spending":115000,"inflation":2.5,"legacyGoal":0,"healthcare":8000,"healthcare65":0,"healthcareInflation":5,"enableSpendingReduction":false,"spendingReductionAge":75,"spendingReductionPercent":20,"ssBenefit":33600,"ssClaimAge":67,"spouseSS":22800,"spouseClaimAge":67,"enableSpousalBenefit":false,"pension":0,"pensionStartAge":65,"enablePensionCOLA":false,"spousePension":0,"spousePensionStartAge":65,"enableSpousePensionCOLA":false,"enablePartTime":false,"partTimeIncome":0,"partTimeStartAge":65,"partTimeEndAge":70,"spouseEnablePartTime":false,"spousePartTimeIncome":0,"spousePartTimeStartAge":65,"spousePartTimeEndAge":70,"enableWindfall":false,"windfallAmount":0,"windfallAge":70,"enableRothConversion":false,"rothConversionAmount":0,"rothConversionStartAge":65,"rothConversionEndAge":72,"housingType":"own","mortgagePayment":0,"mortgageLastAge":70,"propertyTax":0,"monthlyRent":0,"stockAllocation":60,"enableGlidePath":true,"glidePathEndStock":40,"stockReturn":7,"bondReturn":3.5,"stockVol":17,"bondVol":6,"enableGuardrails":false,"guardrailCeiling":6,"guardrailFloor":4,"guardrailAdjustment":10,"bracketGrowth":2.5,"enableTCJASunset":false,"stateTaxRate":0,"taxableGainRatio":60,"numPaths":5000};

test('F10 DEFAULTS are pinned (a change relabels every stored sample plan — needs a migration decision)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(DEFAULTS)), PINNED,
    'DEFAULTS changed. Sample-plan detection compares against DEFAULTS by exact equality; see STATE-FIX-PLAN-2026-11-10.md F10 before updating this pin.');
});

test('F10 normalized DEFAULTS equal DEFAULTS (the sample-plan check depends on it)', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(norm(DEFAULTS).params)), PINNED);
});
