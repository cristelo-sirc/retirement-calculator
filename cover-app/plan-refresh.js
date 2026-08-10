// cover-app/plan-refresh.js — V19.19
// The two stateful bits of the Welcome/update work, extracted as PURE functions so they
// can be proven in node rather than reasoned about in a browser.
//
// Why this file exists: both pieces below have silent failure modes. A wrong stamp decision
// destroys the one fact the Welcome screen reports. A wrong field decision turns "I left this
// alone" into "$0", which produces a plausible-looking catastrophic plan rather than an
// obvious crash. Neither is safe to verify by reading.
//
// No DOM, no React, no localStorage — callers own all of that.

(function (root) {
  'use strict';

  // ---- Staleness stamp ----------------------------------------------------------

  // What should be written to the stamp key on this params change, if anything?
  //   isFirstPersist  the mount write — the app re-saves a migrated plan on first load,
  //                   and stamping there would mark an old plan as edited today.
  //   pendingSavedAt  a just-loaded file's own savedAt, consumed once (CompassIO.parsePlan).
  //   nowISO          caller-supplied clock, so tests are deterministic.
  // Returns an ISO string to write, or null to write nothing.
  function decideStamp(isFirstPersist, pendingSavedAt, nowISO) {
    if (isFirstPersist) return null;
    if (typeof pendingSavedAt === 'string' && pendingSavedAt) return pendingSavedAt;
    return nowISO;
  }

  var MS_PER_DAY = 86400000;
  // Months old, and whether that is old enough to prompt a refresh.
  // STALE_MONTHS is the threshold: below it the Welcome screen greets, above it it nudges.
  var STALE_MONTHS = 3;

  function describeStaleness(savedAtISO, nowISO) {
    if (typeof savedAtISO !== 'string' || !savedAtISO) {
      return { known: false, months: null, phrase: null, stale: true };
    }
    var then = Date.parse(savedAtISO), now = Date.parse(nowISO);
    if (!isFinite(then) || !isFinite(now)) {
      return { known: false, months: null, phrase: null, stale: true };
    }
    var days = Math.floor((now - then) / MS_PER_DAY);
    if (days < 0) days = 0;                       // a clock skew must not read as the future
    // Calendar months, not days/30.4375 — averaging undercounts, so a plan last touched on
    // 10 June 2025 read as "13 months ago" on 10 August 2026 when any human would say 14.
    var months = 0;
    if (days > 0) {
      var a = new Date(then), b = new Date(now);
      months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
      if (b.getUTCDate() < a.getUTCDate()) months -= 1;
      if (months < 0) months = 0;
    }
    var phrase;
    if (days < 1) phrase = 'today';
    else if (days === 1) phrase = 'yesterday';
    else if (days < 30) phrase = days + ' days ago';
    else if (months < 24) phrase = months + ' month' + (months === 1 ? '' : 's') + ' ago';
    else phrase = Math.floor(months / 12) + ' years ago';
    return { known: true, months: months, phrase: phrase, stale: months >= STALE_MONTHS };
  }

  // ---- Field write-back ---------------------------------------------------------

  // Parse one money/number entry. Returns a finite number, or null meaning "no usable
  // entry — keep what was stored".
  //
  // The whole risk of the update flow lives in this function: '' must NOT become 0, while
  // '0' MUST become 0 (a genuinely empty Roth is a real answer). Anything that cannot be
  // read as a number keeps the stored value rather than guessing.
  function parseEntry(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return isFinite(raw) ? raw : null;
    if (typeof raw !== 'string') return null;
    var s = raw.replace(/[$,\s]/g, '');
    if (s === '') return null;                    // untouched / cleared — never zero
    if (!/^-?\d*\.?\d+$/.test(s)) return null;    // garbage — keep what was stored
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  // Apply a map of raw entries onto stored params.
  //   stored  the params object as currently saved
  //   edits   { fieldName: rawEntry } — missing, null, '' all mean "unchanged"
  // Returns { params, changed: [names], kept: [names] }.
  // params is a NEW object; stored is never mutated. Fields absent from edits are copied
  // through untouched, so this can never drop a field it was not asked about.
  function applyFieldEdits(stored, edits) {
    var out = {}, changed = [], kept = [];
    var k;
    for (k in stored) if (Object.prototype.hasOwnProperty.call(stored, k)) out[k] = stored[k];
    if (!edits || typeof edits !== 'object') return { params: out, changed: changed, kept: kept };
    for (k in edits) {
      if (!Object.prototype.hasOwnProperty.call(edits, k)) continue;
      if (!Object.prototype.hasOwnProperty.call(stored, k)) continue;  // unknown key — ignore
      var v = parseEntry(edits[k]);
      if (v === null) { kept.push(k); continue; }
      if (v === stored[k]) { kept.push(k); continue; }                 // retyped the same number
      out[k] = v;
      changed.push(k);
    }
    return { params: out, changed: changed, kept: kept };
  }

  // ---- Which steps apply --------------------------------------------------------

  // Bucket 1 only. Each step is skipped when it cannot apply to this household, so a
  // retired single person with no pension sees two steps rather than five.
  function stepsFor(params) {
    var p = params || {};
    var couple = !!p.hasPartner;
    var working = p.currentAge < p.retireAge;
    var spouseWorking = couple && p.spouseAge < p.spouseRetireAge;
    var claiming = p.currentAge >= p.ssClaimAge;
    var spouseClaiming = couple && p.spouseAge >= p.spouseClaimAge;
    var hasPension = (p.pension || 0) > 0 || (couple && (p.spousePension || 0) > 0);
    var steps = [];
    steps.push({ id: 'ages', fields: couple ? ['currentAge', 'spouseAge'] : ['currentAge'] });
    steps.push({ id: 'balances', fields: couple
      ? ['userPreTax', 'userRoth', 'spousePreTax', 'spouseRoth', 'taxable']
      : ['userPreTax', 'userRoth', 'taxable'] });
    if (working || spouseWorking) {
      var sal = [];
      if (working) sal.push('salary');
      if (spouseWorking) sal.push('spouseSalary');
      steps.push({ id: 'salaries', fields: sal });
    }
    if (!claiming || !spouseClaiming) {
      var ss = [];
      if (!claiming) ss.push('ssBenefit');
      if (couple && !spouseClaiming) ss.push('spouseSS');
      if (ss.length) steps.push({ id: 'socialSecurity', fields: ss });
    }
    if (hasPension) {
      var pen = [];
      if ((p.pension || 0) > 0) pen.push('pension');
      if (couple && (p.spousePension || 0) > 0) pen.push('spousePension');
      steps.push({ id: 'pension', fields: pen });
    }
    return steps;
  }

  // Prior-year wages shadow salary and feed the SS earnings test. When someone updates a
  // salary the matching wages figure must move with it, or the two silently diverge — but
  // only when they were in step to begin with. If the user had deliberately set them apart,
  // that intent is preserved.
  function syncPriorWages(before, after) {
    var out = {}, k;
    for (k in after) if (Object.prototype.hasOwnProperty.call(after, k)) out[k] = after[k];
    if (after.salary !== before.salary && before.priorYearWages === before.salary) {
      out.priorYearWages = after.salary;
    }
    if (after.spouseSalary !== before.spouseSalary && before.spousePriorYearWages === before.spouseSalary) {
      out.spousePriorYearWages = after.spouseSalary;
    }
    return out;
  }

  var api = {
    decideStamp: decideStamp,
    describeStaleness: describeStaleness,
    parseEntry: parseEntry,
    applyFieldEdits: applyFieldEdits,
    stepsFor: stepsFor,
    syncPriorWages: syncPriorWages,
    STALE_MONTHS: STALE_MONTHS
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlanRefresh = api;
})(typeof window !== 'undefined' ? window : null);
