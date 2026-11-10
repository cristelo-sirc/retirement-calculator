// cover-app/plan-refresh.js — V19.20 (V19.19 origin)
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
  //
  // V19.20 (F8): returns { write: iso } | { clear: true } | null. A loaded file whose edit date
  // is unknown (UNKNOWN_STAMP) CLEARS the stamp — "we don't know" — rather than stamping today.
  var UNKNOWN_STAMP = '__unknown__';
  function decideStamp(isFirstPersist, pendingSavedAt, nowISO) {
    if (isFirstPersist) return null;
    if (pendingSavedAt === UNKNOWN_STAMP) return { clear: true };
    if (typeof pendingSavedAt === 'string' && pendingSavedAt) return { write: pendingSavedAt };
    return { write: nowISO };
  }

  function validISO(v) {
    return typeof v === 'string' && v !== '' && v !== UNKNOWN_STAMP && isFinite(Date.parse(v));
  }

  // V19.20 (F8): the two dates a saved file carries. savedAt is when the plan's NUMBERS were last
  // edited (the stored stamp, or null when nobody knows); exportedAt is when the file was made.
  // Before V19.20 savedAt was the save time, so save→load reset the staleness clock to today.
  function fileStamps(storedStampISO, nowISO) {
    return { savedAt: validISO(storedStampISO) ? storedStampISO : null, exportedAt: nowISO };
  }

  // V19.20 (F8): the edit date to adopt from a parsed file. Only a file that also carries
  // exportedAt was written by V19.20+, so only then is savedAt really an edit date. A V19.19
  // file's savedAt is its SAVE time and must not be trusted as one.
  function fileEditStamp(obj) {
    if (!obj || typeof obj !== 'object') return UNKNOWN_STAMP;
    if (!validISO(obj.exportedAt)) return UNKNOWN_STAMP;
    return validISO(obj.savedAt) ? obj.savedAt : UNKNOWN_STAMP;
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

  // ---- V19.20 (F4): checking one update box ------------------------------------

  // Same parser and rules as the questionnaire's entry boxes (NumericEntry.validateDraft),
  // so the two ways of entering a number agree. Whole numbers only; ages 18–100 (the
  // engine's own currentAge range); money zero or more with no cap.
  var ENTRY_RULES = {
    age:   { precision: 0, min: 18, max: 100 },
    money: { precision: 0, min: 0, max: Infinity }
  };
  function numericEntry() {
    if (root && root.NumericEntry) return root.NumericEntry;
    if (typeof require === 'function') return require('./numeric-entry.js');
    return null;
  }
  // Returns { status: 'unchanged' } | { status: 'changed', value } |
  //         { status: 'invalid', reason: 'number'|'precision'|'range' }.
  // A blank box is 'unchanged' (keeps the stored value) — never zero.
  function checkEntry(kind, raw, stored) {
    var text = (raw === null || raw === undefined) ? '' : String(raw);
    if (text.trim() === '') return { status: 'unchanged' };
    var r = numericEntry().validateDraft(text, ENTRY_RULES[kind] || ENTRY_RULES.money);
    if (!r.ok) return { status: 'invalid', reason: r.reason };
    if (r.value === stored) return { status: 'unchanged' };
    return { status: 'changed', value: r.value };
  }
  function entryMessage(kind, reason) {
    if (kind === 'age') {
      if (reason === 'precision') return 'Use whole years, like 64.';
      if (reason === 'range') return 'Enter an age from 18 to 100.';
      return 'Type your age in digits, like 64.';
    }
    if (reason === 'precision') return 'Use whole dollars, without cents.';
    if (reason === 'range') return 'This can’t be negative.';
    return 'Type the full amount in digits, like 600000 — not 600k.';
  }

  // ---- V19.20 (F1): retirement age moved by the app, not the user -------------------

  // normalizeParams forces retirement age to come after current age. When an age update
  // crosses the retirement age, the app moves it silently and models another working year.
  // This tracks that move so the Cover can keep saying so until the user picks an age.
  //   record      the stored record, or null: { user?: {from,to}, spouse?: {from,to} }
  //   prev        params before this write
  //   requested   what the caller asked to store (pre-normalization)
  //   normalized  what was actually stored
  // Returns the new record, or null when nothing is outstanding.
  function trackOne(rec, prevR, reqR, normR) {
    reqR = Number(reqR);
    if (isFinite(reqR) && normR !== reqR) {
      return { from: (rec && rec.to === reqR) ? rec.from : reqR, to: normR };
    }
    if (prevDiffers(prevR, reqR)) return null;     // the user chose a retirement age
    if (rec && normR !== rec.to) return null;        // no longer true
    return rec || null;
  }
  function prevDiffers(a, b) { return Number(a) !== Number(b); }
  function trackRetireMove(record, prev, requested, normalized) {
    var r = record || {}, p = prev || {}, q = requested || {}, n = normalized || {};
    var out = {};
    var u = trackOne(r.user, p.retireAge, q.retireAge, n.retireAge);
    if (u) out.user = u;
    if (n.hasPartner) {
      var s = trackOne(r.spouse, p.spouseRetireAge, q.spouseRetireAge, n.spouseRetireAge);
      if (s) out.spouse = s;
    }
    return (out.user || out.spouse) ? out : null;
  }
  function retireMoveWarnings(record, params) {
    var w = [];
    if (!record || !params) return w;
    if (record.user && params.retireAge === record.user.to) {
      w.push({ who: 'user', from: record.user.from, to: record.user.to });
    }
    if (params.hasPartner && record.spouse && params.spouseRetireAge === record.spouse.to) {
      w.push({ who: 'spouse', from: record.spouse.from, to: record.spouse.to });
    }
    return w;
  }
  // Fields normalization moved on a write, excluding the ones the user typed themselves.
  function adjustedFields(before, normalizedAfter, notes, typed) {
    var out = [], seen = {};
    (notes || []).forEach(function (f) {
      if (seen[f] || (typed && typed.indexOf(f) !== -1)) return;
      seen[f] = true;
      if (before && normalizedAfter && before[f] !== normalizedAfter[f]) {
        out.push({ field: f, from: before[f], to: normalizedAfter[f] });
      }
    });
    return out;
  }

  // ---- V19.20 (F2): the update summary's headline ------------------------------------
  function updateHeadline(before, after) {
    if (after == null) return 'Working out where that leaves you…';
    if (before == null) return 'Here’s where you stand.';
    if (after > before) return 'Better than you left it.';
    if (after < before) return 'Worth a closer look.';
    return 'Right where you left it.';
  }

  var api = {
    decideStamp: decideStamp,
    describeStaleness: describeStaleness,
    parseEntry: parseEntry,
    applyFieldEdits: applyFieldEdits,
    stepsFor: stepsFor,
    syncPriorWages: syncPriorWages,
    STALE_MONTHS: STALE_MONTHS,
    UNKNOWN_STAMP: UNKNOWN_STAMP,
    fileStamps: fileStamps,
    fileEditStamp: fileEditStamp,
    checkEntry: checkEntry,
    entryMessage: entryMessage,
    trackRetireMove: trackRetireMove,
    retireMoveWarnings: retireMoveWarnings,
    adjustedFields: adjustedFields,
    updateHeadline: updateHeadline
  };

  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PlanRefresh = api;
})(typeof window !== 'undefined' ? window : null);
