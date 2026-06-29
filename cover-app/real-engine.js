// real-engine.js — V18.13 adapter
// Drop-in replacement for mock-engine.js: exposes the SAME window.MockEngine API
// the mockup screens read, but compute() runs the app's REAL Monte Carlo
// (window.simulatePath from engine.js) and reshapes the output into the §12 shape.
//
// engine.js is injected AFTER DOMContentLoaded so its two DOM-init listeners never
// fire (they would error against the mockup DOM). Its math functions are global and
// pure, so simulatePath / calculateSustainableSpending are callable directly.

(function () {
  // ---- Load the real engine's math (no DOM init) -------------------------------
  window._engineReady = new Promise(function (resolve) {
    document.addEventListener('DOMContentLoaded', function () {
      var s = document.createElement('script');
      s.src = 'engine.js?v=18.13';
      s.onload = function () { resolve(true); };
      s.onerror = function () { console.error('real-engine: failed to load engine.js'); resolve(false); };
      document.head.appendChild(s);
    });
  });

  // ---- Defaults (mock param shape) ---------------------------------------------
  // Conventions: $ amounts are ANNUAL except mortgagePayment + monthlyRent (MONTHLY,
  // engine multiplies these by 12). Percentages are WHOLE NUMBERS (e.g. 12 = 12%);
  // the adapter divides them by 100. Every value below mirrors the verified engine
  // default so an untouched questionnaire reproduces the legacy baseline exactly.
  var DEFAULTS = {
    hasPartner: true,
    currentAge: 55, retireAge: 65, endAge: 92, spouseAge: 53, spouseRetireAge: 65,

    userPreTax: 520000, userRoth: 120000, spousePreTax: 180000, spouseRoth: 40000, taxable: 90000,

    salary: 145000, savingsRate: 12, savingsDest: 'pretax',
    spouseSalary: 78000, spouseSavingsRate: 6, spouseSavingsDest: 'pretax',

    spending: 115000, inflation: 2.5, legacyGoal: 0,
    healthcare: 8000, healthcare65: 0, healthcareInflation: 5.0,            // healthcare = pre-65, annual/person
    enableSpendingReduction: false, spendingReductionAge: 75, spendingReductionPercent: 20,

    ssBenefit: 33600, ssClaimAge: 67, spouseSS: 22800, spouseClaimAge: 67,  // annual
    enableSpousalBenefit: false,

    pension: 0, pensionStartAge: 65, enablePensionCOLA: false,              // annual
    spousePension: 0, spousePensionStartAge: 65, enableSpousePensionCOLA: false,

    enablePartTime: false, partTimeIncome: 0, partTimeStartAge: 65, partTimeEndAge: 70,  // annual

    enableWindfall: false, windfallAmount: 0, windfallAge: 70,
    enableRothConversion: false, rothConversionAmount: 0, rothConversionStartAge: 65, rothConversionEndAge: 72,

    housingType: 'own', mortgagePayment: 0, mortgageLastAge: 70, propertyTax: 0, monthlyRent: 0,  // mortgage/rent MONTHLY, propertyTax annual

    stockAllocation: 60, enableGlidePath: true, glidePathEndStock: 40,
    stockReturn: 7.0, bondReturn: 3.5, stockVol: 17, bondVol: 6.0,

    enableGuardrails: false, guardrailCeiling: 6.0, guardrailFloor: 4.0, guardrailAdjustment: 10,

    bracketGrowth: 2.5, enableTCJASunset: false, stateTaxRate: 0, taxableGainRatio: 60,

    numPaths: 5000            // Monte Carlo paths — SINGLE SOURCE for every screen's odds (user-editable in Advanced)
  };

  // ---- Validation / normalization (V18.10, extended V18.11) -------------------
  // Defends every entry point (loaded files, localStorage, live params) against bad
  // types, out-of-range values, contradictory ages, and a runaway path count that
  // could freeze the browser. Coerces each known field by its DEFAULT's type, clamps
  // numerics (RANGES where an upper bound matters), validates string enums, and fixes
  // age ordering. Unknown keys are dropped. Idempotent: in-range params pass through
  // unchanged, so an untouched DEFAULTS plan reproduces the prior baseline exactly.
  var RANGES = {
    currentAge: [18, 100], retireAge: [19, 101], endAge: [20, 110],
    spouseAge: [0, 100], spouseRetireAge: [0, 101],
    ssClaimAge: [62, 70], spouseClaimAge: [62, 70],
    pensionStartAge: [40, 100], spousePensionStartAge: [40, 100],
    partTimeStartAge: [40, 100], partTimeEndAge: [40, 110],
    windfallAge: [0, 110], rothConversionStartAge: [0, 110], rothConversionEndAge: [0, 110],
    spendingReductionAge: [0, 110], mortgageLastAge: [0, 110],
    inflation: [0, 20], healthcareInflation: [0, 30],
    savingsRate: [0, 100], spouseSavingsRate: [0, 100],
    stockAllocation: [0, 100], glidePathEndStock: [0, 100],
    stockReturn: [0, 30], bondReturn: [0, 30], stockVol: [0, 60], bondVol: [0, 40],
    bracketGrowth: [0, 20], stateTaxRate: [0, 60], taxableGainRatio: [0, 100],
    guardrailCeiling: [0, 30], guardrailFloor: [0, 30], guardrailAdjustment: [0, 100],
    spendingReductionPercent: [0, 100], numPaths: [500, 10000]
  };
  var ENUMS = {
    savingsDest: ['pretax', 'roth', 'split'], spouseSavingsDest: ['pretax', 'roth', 'split'],
    housingType: ['own', 'rent']
  };
  function normalizeParams(raw) {
    raw = (raw && typeof raw === 'object') ? raw : {};
    var out = {}, notes = [];
    Object.keys(DEFAULTS).forEach(function (k) {
      var dv = DEFAULTS[k], v = raw[k];
      if (v === undefined) { out[k] = dv; return; }
      if (typeof dv === 'number') {
        var n = Number(v);
        if (!isFinite(n)) { out[k] = dv; notes.push(k); return; }
        if (n < 0) { n = 0; notes.push(k); }
        var r = RANGES[k];
        if (r) {
          if (n < r[0]) { n = r[0]; notes.push(k); }
          else if (n > r[1]) { n = r[1]; notes.push(k); }
        }
        out[k] = n;
      } else if (typeof dv === 'boolean') {
        out[k] = (v === true || v === 'true' || v === 1 || v === '1');
      } else if (typeof dv === 'string') {
        var allowed = ENUMS[k];
        if (allowed && allowed.indexOf(v) === -1) { out[k] = dv; notes.push(k); }
        else out[k] = String(v);
      } else { out[k] = dv; }
    });
    // Cross-field rules: ages must strictly increase.
    if (out.retireAge <= out.currentAge) { out.retireAge = Math.min(101, out.currentAge + 1); notes.push('retireAge'); }
    if (out.endAge <= out.retireAge) { out.endAge = Math.min(110, out.retireAge + 1); notes.push('endAge'); }
    if (out.hasPartner) {
      if (out.spouseAge < 18) { out.spouseAge = 18; notes.push('spouseAge'); }
      if (out.spouseRetireAge <= out.spouseAge) { out.spouseRetireAge = Math.min(101, out.spouseAge + 1); notes.push('spouseRetireAge'); }
    }
    out.numPaths = Math.round(out.numPaths);   // hard path-count ceiling lives in RANGES above
    return { params: out, changed: notes.length > 0, notes: notes };
  }

  // ---- Map mockup params -> real engine params (collectInputs() shape) ----------
  // Real engine stores rates/allocations as FRACTIONS and income as ANNUAL dollars.
  function mapToReal(m, numPaths) {
    var partner = !!m.hasPartner;
    var inflFrac = (m.inflation || 0) / 100;
    return {
      numPaths: numPaths,
      currentAge: m.currentAge, retireAge: m.retireAge, endAge: m.endAge,
      spouseAge: partner ? m.spouseAge : 0,
      spouseRetireAge: partner ? m.spouseRetireAge : 0,

      userSS: m.ssBenefit || 0, userClaimAge: m.ssClaimAge || 67,
      spouseSS: partner ? (m.spouseSS || 0) : 0, spouseClaimAge: m.spouseClaimAge || 67,
      enableSpousalBenefit: partner ? !!m.enableSpousalBenefit : false,

      // Part-time / other steady income (engine has one such channel)
      enablePartTime: !!m.enablePartTime,
      partTimeIncome: m.enablePartTime ? (m.partTimeIncome || 0) : 0,
      partTimeStartAge: m.partTimeStartAge || m.retireAge,
      partTimeEndAge: m.partTimeEndAge || m.endAge,

      enableWindfall: !!m.enableWindfall,
      windfallAmount: m.enableWindfall ? (m.windfallAmount || 0) : 0,
      windfallAge: m.windfallAge || 0,

      userPreTaxBalance: m.userPreTax || 0, userRothBalance: m.userRoth || 0,
      spousePreTaxBalance: partner ? (m.spousePreTax || 0) : 0,
      spouseRothBalance: partner ? (m.spouseRoth || 0) : 0,
      taxableBalance: m.taxable || 0,

      currentSalary: m.salary || 0, userSavingsRate: (m.savingsRate || 0) / 100,
      userSavingsDest: m.savingsDest || 'pretax',
      spouseCurrentSalary: partner ? (m.spouseSalary || 0) : 0,
      spouseSavingsRate: partner ? (m.spouseSavingsRate || 0) / 100 : 0,
      spouseSavingsDest: partner ? (m.spouseSavingsDest || 'pretax') : 'pretax',

      pension: m.pension || 0, pensionAge: m.pensionStartAge || 65,
      enablePensionCOLA: !!m.enablePensionCOLA,
      spousePension: partner ? (m.spousePension || 0) : 0,
      spousePensionAge: partner ? (m.spousePensionStartAge || 65) : 65,
      enableSpousePensionCOLA: partner ? !!m.enableSpousePensionCOLA : false,

      enableRothConversion: !!m.enableRothConversion,
      rothConversionAmount: m.enableRothConversion ? (m.rothConversionAmount || 0) : 0,
      rothConversionStartAge: m.rothConversionStartAge || 0,
      rothConversionEndAge: m.rothConversionEndAge || 0,

      lifestyleSpending: m.spending || 0, lifestyleInflation: inflFrac,
      enableSpendingReduction: !!m.enableSpendingReduction,
      spendingReductionAge: m.spendingReductionAge || 0,
      spendingReductionPercent: (m.spendingReductionPercent || 0) / 100,

      enableGuardrails: !!m.enableGuardrails,
      guardrailCeiling: (m.guardrailCeiling != null ? m.guardrailCeiling : 6) / 100,
      guardrailFloor: (m.guardrailFloor != null ? m.guardrailFloor : 4) / 100,
      guardrailAdjustment: (m.guardrailAdjustment != null ? m.guardrailAdjustment : 10) / 100,

      housingType: m.housingType || 'own',
      mortgagePrincipal: (m.housingType === 'own') ? (m.mortgagePayment || 0) : 0,  // engine ×12 (monthly payment)
      mortgageLastAge: m.mortgageLastAge || 0,
      propertyTax: (m.housingType === 'own') ? (m.propertyTax || 0) : 0,            // annual
      monthlyRent: (m.housingType === 'rent') ? (m.monthlyRent || 0) : 0,           // engine ×12

      healthcarePre65: m.healthcare || 0, healthcare65: m.healthcare65 || 0,
      healthcareInflation: (m.healthcareInflation != null ? m.healthcareInflation : 5) / 100,

      stockAllocation: (m.stockAllocation || 0) / 100,
      enableGlidePath: !!m.enableGlidePath,
      endingStockAllocation: (m.glidePathEndStock || 0) / 100,
      stockReturn: (m.stockReturn || 0) / 100, stockVol: (m.stockVol || 0) / 100,
      bondReturn: (m.bondReturn || 0) / 100,
      bondVol: (m.bondVol != null ? m.bondVol : 6) / 100,
      bracketGrowth: (m.bracketGrowth != null ? m.bracketGrowth : 2.5) / 100,
      enableTCJASunset: !!m.enableTCJASunset,
      stateTaxRate: (m.stateTaxRate || 0) / 100,
      taxableGainRatio: (m.taxableGainRatio != null ? m.taxableGainRatio : 60) / 100
    };
  }

  // Fixed seed base => the SAME plan produces the SAME set of paths on every screen
  // (Cover, Projection, Income & Odds, Rework, Questionnaire, mobile). Reuses
  // engine.js's existing deterministic solver RNG via solverPathIndex; engine.js
  // itself is UNCHANGED. Without this each screen re-rolled Math.random(), so the
  // identical plan showed slightly different odds (V18.5 cross-screen-drift fix).
  var SEED_BASE = 0x5f3759df;
  function runPaths(real) {
    real._solverDeterministic = true;
    real._solverSeedBase = SEED_BASE;
    var results = [];
    for (var i = 0; i < real.numPaths; i++) results.push(window.simulatePath(real, i));
    return results;
  }

  // A path "succeeds" if it never went broke AND finishes with at least the legacy goal
  // left over. The goal is a FLAT future-dollar amount (no inflation growth). Default 0
  // reproduces the prior behavior exactly: a solvent path always ends >= 0, so goal 0 is
  // the old solvent-only test.
  function successOf(results, goal) {
    goal = goal || 0;
    var solved = 0;
    for (var i = 0; i < results.length; i++) {
      if (results[i].solvent && results[i].finalBalance >= goal) solved++;
    }
    return Math.round((solved / results.length) * 100);
  }

  // Success-only estimate at the FULL path count (same numPaths as compute()), so the
  // Income & Odds what-if base equals the cover's headline. Reads the single numPaths source.
  function quickSuccess(m) {
    if (!window.simulatePath) return 0;
    var mm = normalizeParams(m).params;
    return successOf(runPaths(mapToReal(mm, mm.numPaths || 5000)), mm.legacyGoal || 0);
  }

  function verdictFor(rate) {
    if (rate >= 90) return { verdict: 'green', verdictWord: 'On Track',
      verdictBlurb: 'Your plan has strong odds. You can likely retire as planned without changes.' };
    if (rate >= 70) return { verdict: 'yellow', verdictWord: 'Tight',
      verdictBlurb: 'Your plan works in most scenarios, but a bad market sequence could squeeze you.' };
    return { verdict: 'red', verdictWord: 'At Risk',
      verdictBlurb: 'Your plan runs out of money in too many scenarios. Adjustments are needed.' };
  }

  // Cover "Three Moves" deltas. Each move AND the base are measured at the same 200 paths
  // (V18.7) so the delta is apples-to-apples — it now lines up with the full-count Income &
  // Odds deltas instead of mixing a 200-path move with a 1500-path base. Legacy goal applied
  // to every run so the deltas respect the goal too.
  function buildLevers(m, real) {
    var goal = m.legacyGoal || 0;
    var lp = Math.max(50, Math.round((real.numPaths || 5000) * 200 / 1500));  // "Three Moves" sample = same share of the path count as the old 200/1500, so it tracks the slider
    var base = successOf(runPaths(Object.assign({}, real, { numPaths: lp })), goal);
    var levers = [];
    var r1 = successOf(runPaths(Object.assign({}, real, { retireAge: real.retireAge + 2, numPaths: lp })), goal);
    levers.push({ id: 'delay', title: 'Delay retirement 2 years',
      detail: 'Retire at ' + (m.retireAge + 2) + ' instead of ' + m.retireAge, delta: r1 - base });
    var newSpend = Math.round(real.lifestyleSpending * 0.9 / 1000) * 1000;
    var r2 = successOf(runPaths(Object.assign({}, real, { lifestyleSpending: newSpend, numPaths: lp })), goal);
    levers.push({ id: 'spend', title: 'Cut spending 10%',
      detail: '$' + Math.round(newSpend / 1000) + 'k/yr instead of $' + Math.round(real.lifestyleSpending / 1000) + 'k', delta: r2 - base });
    if (m.ssClaimAge < 70) {
      var r3 = successOf(runPaths(Object.assign({}, real, { userClaimAge: 70, spouseClaimAge: 70, numPaths: lp })), goal);
      levers.push({ id: 'ss', title: 'Wait until 70 for Social Security',
        detail: 'Claim at 70 instead of ' + m.ssClaimAge, delta: r3 - base });
    }
    return levers.sort(function (a, b) { return b.delta - a.delta; }).filter(function (l) { return l.delta >= 0; }).slice(0, 3);
  }

  function compute(params) {
    var m = normalizeParams(params).params;   // validate + clamp every entry point (incl. numPaths)
    if (!window.simulatePath) {            // engine not loaded yet — safe placeholder
      return { params: m, successRate: 0, numPaths: m.numPaths || 5000, verdict: 'yellow', verdictWord: '…', verdictBlurb: 'Calculating…',
        levers: [], medianLegacy: 0, sustainableSpending: 0, runwayYears: 0,
        paycheck: { total: 0, ss: 0, pension: 0, portfolio: 0 },
        path: [], incomeByYear: [], allocByYear: [], paths: [], totalSavings: 0 };
    }
    var real = mapToReal(m, m.numPaths || 5000);
    var goal = m.legacyGoal || 0;            // flat future-dollar target the plan must end at/above
    var results = runPaths(real);

    // Sort by final balance, then depletion age (matches initiateSimulation)
    results.sort(function (a, b) {
      if (a.finalBalance !== b.finalBalance) return a.finalBalance - b.finalBalance;
      var ad = a.depletionAge === null ? Infinity : a.depletionAge;
      var bd = b.depletionAge === null ? Infinity : b.depletionAge;
      return ad - bd;
    });
    var n = results.length;
    var p50 = results[Math.floor(n * 0.50)];
    var medianLog = p50.log;
    var successRate = successOf(results, goal);

    // Paycheck (monthly) from the median path. V18.11 (item 7): feature the HOUSEHOLD'S fully-retired
    // year (both partners have stopped working) so the breakdown matches the "once you both stop working"
    // copy, and include wages + taxes so the source bars reconcile to spending + taxes exactly.
    var userRetIdx = Math.max(0, m.retireAge - m.currentAge);
    var spouseRetIdx = m.hasPartner ? Math.max(0, (m.spouseRetireAge || 0) - (m.spouseAge || 0)) : 0;
    var retIdx = Math.max(userRetIdx, spouseRetIdx);
    var ry = medianLog[Math.min(retIdx, medianLog.length - 1)] || {};
    var portfolioDraw = (ry.rmd || 0) + (ry.wdTaxable || 0) + (ry.wdPreTax || 0) + (ry.wdRoth || 0);
    var taxesMo = (ry.taxBill || 0) / 12;
    var spendingMo = (ry.spending || 0) / 12;
    var paycheck = {
      total: spendingMo + taxesMo,                 // total monthly outflow; SS+pension+wages+portfolio sum to this
      ss: (ry.ssIncome || 0) / 12,
      pension: ((ry.pensionIncome || 0) + (ry.partTimeIncome || 0)) / 12,
      wages: (ry.wages || 0) / 12,
      portfolio: portfolioDraw / 12,
      taxes: taxesMo,
      spending: spendingMo,
      atAge: (ry.age != null ? ry.age : m.retireAge)
    };

    // Median legacy + runway
    var medianLegacy = Math.max(0, p50.finalBalance);
    var runwayYears = (p50.depletionAge !== null ? p50.depletionAge : m.endAge) - m.retireAge;

    // Sustainable spending: spending level that holds ~90% success (fast bisection
    // on the real engine — kept light so live recompute stays responsive)
    var sustainableSpending;
    var bp = Math.max(50, Math.round((real.numPaths || 5000) * 250 / 1500));  // bisection sample = same share of the path count as the old 250/1500, so it tracks the slider
    var lo = 20000, hi = Math.max(80000, real.lifestyleSpending * 2);
    for (var k = 0; k < 9; k++) {
      var mid = (lo + hi) / 2;
      var s = successOf(runPaths(Object.assign({}, real, { lifestyleSpending: mid, numPaths: bp })), goal);
      if (s < 90) hi = mid; else lo = mid;
    }
    sustainableSpending = Math.round(lo / 1000) * 1000;

    // Per-year series from the median path
    var path = medianLog.map(function (y) { return { age: y.age, balance: y.totalBal }; });
    var incomeByYear = medianLog.filter(function (y) { return y.age >= m.retireAge; }).map(function (y) {
      return { age: y.age, ss: y.ssIncome || 0, pension: y.pensionIncome || 0, other: y.partTimeIncome || 0,
        wages: y.wages || 0,
        portfolio: (y.rmd || 0) + (y.wdTaxable || 0) + (y.wdPreTax || 0) + (y.wdRoth || 0), need: y.spending || 0 };
    });
    var allocByYear = medianLog.map(function (y) {
      var stock = Math.round((y.stockAlloc != null ? y.stockAlloc : real.stockAllocation) * 100);
      return { age: y.age, stock: stock, bond: 100 - stock };
    });
    var paths = results.map(function (r) { return { path: r.log.map(function (y) { return { age: y.age, balance: y.totalBal }; }) }; });

    var totalSavings = (m.userPreTax || 0) + (m.userRoth || 0)
      + (m.hasPartner ? (m.spousePreTax || 0) + (m.spouseRoth || 0) : 0) + (m.taxable || 0);

    var v = verdictFor(successRate);
    return Object.assign({
      params: m, successRate: successRate, numPaths: real.numPaths,
      sustainableSpending: sustainableSpending, runwayYears: runwayYears, medianLegacy: medianLegacy,
      levers: buildLevers(m, real), paycheck: paycheck,
      path: path, incomeByYear: incomeByYear, allocByYear: allocByYear, paths: paths, totalSavings: totalSavings
    }, v);
  }

  // ---- formatting helpers (same as mock-engine) --------------------------------
  function formatCurrency(num, opts) {
    opts = opts || {};
    if (num == null || isNaN(num)) return '—';
    var abs = Math.abs(num);
    if (opts.compact && abs >= 1000000) return '$' + (num / 1000000).toFixed(abs >= 10000000 ? 1 : 2) + 'M';
    if (opts.compact && abs >= 1000) return '$' + Math.round(num / 1000) + 'k';
    return '$' + Math.round(num).toLocaleString();
  }
  function formatPct(num) { return (num == null || isNaN(num)) ? '—' : Math.round(num) + '%'; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function ssFactor(claimAge) {
    var fra = 67;
    if (claimAge >= fra) return 1 + (claimAge - fra) * 0.08;
    return Math.max(0.6, 1 - (fra - claimAge) * 0.06);
  }

  window.MockEngine = {
    DEFAULTS: DEFAULTS, compute: compute, quickSuccess: quickSuccess, normalizeParams: normalizeParams,
    formatCurrency: formatCurrency, formatPct: formatPct, clone: clone, ssFactor: ssFactor
  };
})();
