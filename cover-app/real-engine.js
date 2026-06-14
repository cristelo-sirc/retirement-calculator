// real-engine.js — V18.0 adapter
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
      s.src = 'engine.js?v=18.0p6';
      s.onload = function () { resolve(true); };
      s.onerror = function () { console.error('real-engine: failed to load engine.js'); resolve(false); };
      document.head.appendChild(s);
    });
  });

  // ---- Defaults (mock param shape; SS/pension are ANNUAL per the /yr decision) --
  var DEFAULTS = {
    hasPartner: true,
    currentAge: 55, retireAge: 65, endAge: 92, spouseAge: 53, spouseRetireAge: 65,
    userPreTax: 520000, userRoth: 120000, spousePreTax: 180000, spouseRoth: 40000, taxable: 90000,
    salary: 145000, savingsRate: 12, spouseSalary: 78000, spouseSavingsRate: 6,
    spending: 115000, healthcare: 8000, inflation: 2.5, legacyGoal: 0,
    ssBenefit: 33600, ssClaimAge: 67, spouseSS: 22800, spouseClaimAge: 67,   // annual
    pension: 0, pensionStartAge: 65, spousePension: 0, otherIncome: 0,       // annual
    stockAllocation: 60, stockReturn: 7.0, bondReturn: 3.5, stockVol: 17,
    enableGuardrails: true, enableGlidePath: true, glidePathEndStock: 40,
    filingStatus: 'married', stateOfResidence: 'CA'
  };

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
      enableSpousalBenefit: false,

      // "Other income" (annuity/rental) modeled as steady part-time-equivalent income
      enablePartTime: (m.otherIncome || 0) > 0,
      partTimeIncome: m.otherIncome || 0, partTimeStartAge: m.retireAge, partTimeEndAge: m.endAge,

      enableWindfall: false, windfallAmount: 0, windfallAge: 0,

      userPreTaxBalance: m.userPreTax || 0, userRothBalance: m.userRoth || 0,
      spousePreTaxBalance: partner ? (m.spousePreTax || 0) : 0,
      spouseRothBalance: partner ? (m.spouseRoth || 0) : 0,
      taxableBalance: m.taxable || 0,

      currentSalary: m.salary || 0, userSavingsRate: (m.savingsRate || 0) / 100, userSavingsDest: 'pretax',
      spouseCurrentSalary: partner ? (m.spouseSalary || 0) : 0,
      spouseSavingsRate: partner ? (m.spouseSavingsRate || 0) / 100 : 0, spouseSavingsDest: 'pretax',

      pension: m.pension || 0, pensionAge: m.pensionStartAge || 65,
      spousePension: partner ? (m.spousePension || 0) : 0, spousePensionAge: m.pensionStartAge || 65,
      enablePensionCOLA: false, enableSpousePensionCOLA: false,

      enableRothConversion: false, rothConversionAmount: 0, rothConversionStartAge: 0, rothConversionEndAge: 0,

      lifestyleSpending: m.spending || 0, lifestyleInflation: inflFrac,
      enableSpendingReduction: false, spendingReductionAge: 0, spendingReductionPercent: 0,

      enableGuardrails: !!m.enableGuardrails,
      guardrailCeiling: 0.20, guardrailFloor: 0.15, guardrailAdjustment: 0.10,

      housingType: 'own', mortgagePrincipal: 0, mortgageLastAge: 0, propertyTax: 0, monthlyRent: 0,

      healthcarePre65: m.healthcare || 0, healthcare65: 0, healthcareInflation: inflFrac,

      stockAllocation: (m.stockAllocation || 0) / 100,
      enableGlidePath: !!m.enableGlidePath,
      endingStockAllocation: (m.glidePathEndStock || 0) / 100,
      stockReturn: (m.stockReturn || 0) / 100, stockVol: (m.stockVol || 0) / 100,
      bondReturn: (m.bondReturn || 0) / 100, bondVol: 0.05,
      bracketGrowth: 0.02, enableTCJASunset: false, stateTaxRate: 0, taxableGainRatio: 0.5
    };
  }

  function runPaths(real) {
    var results = [];
    for (var i = 0; i < real.numPaths; i++) results.push(window.simulatePath(real));
    return results;
  }

  function successOf(results) {
    var solved = 0;
    for (var i = 0; i < results.length; i++) if (results[i].solvent) solved++;
    return Math.round((solved / results.length) * 100);
  }

  // Fast success-only estimate for what-if comparisons / levers
  function quickSuccess(m) {
    if (!window.simulatePath) return 0;
    return successOf(runPaths(mapToReal(Object.assign({}, DEFAULTS, m || {}), 150)));
  }

  function verdictFor(rate) {
    if (rate >= 90) return { verdict: 'green', verdictWord: 'On Track',
      verdictBlurb: 'Your plan has strong odds. You can likely retire as planned without changes.' };
    if (rate >= 70) return { verdict: 'yellow', verdictWord: 'Tight',
      verdictBlurb: 'Your plan works in most scenarios, but a bad market sequence could squeeze you.' };
    return { verdict: 'red', verdictWord: 'At Risk',
      verdictBlurb: 'Your plan runs out of money in too many scenarios. Adjustments are needed.' };
  }

  function buildLevers(m, real, baseRate) {
    var levers = [];
    var r1 = successOf(runPaths(Object.assign({}, real, { retireAge: real.retireAge + 2, numPaths: 150 })));
    levers.push({ id: 'delay', title: 'Delay retirement 2 years',
      detail: 'Retire at ' + (m.retireAge + 2) + ' instead of ' + m.retireAge, delta: r1 - baseRate });
    var newSpend = Math.round(real.lifestyleSpending * 0.9 / 1000) * 1000;
    var r2 = successOf(runPaths(Object.assign({}, real, { lifestyleSpending: newSpend, numPaths: 150 })));
    levers.push({ id: 'spend', title: 'Cut spending 10%',
      detail: '$' + Math.round(newSpend / 1000) + 'k/yr instead of $' + Math.round(real.lifestyleSpending / 1000) + 'k', delta: r2 - baseRate });
    if (m.ssClaimAge < 70) {
      var r3 = successOf(runPaths(Object.assign({}, real, { userClaimAge: 70, spouseClaimAge: 70, numPaths: 150 })));
      levers.push({ id: 'ss', title: 'Wait until 70 for Social Security',
        detail: 'Claim at 70 instead of ' + m.ssClaimAge, delta: r3 - baseRate });
    }
    return levers.sort(function (a, b) { return b.delta - a.delta; }).filter(function (l) { return l.delta >= 0; }).slice(0, 3);
  }

  function compute(params) {
    var m = Object.assign({}, DEFAULTS, params || {});
    if (!window.simulatePath) {            // engine not loaded yet — safe placeholder
      return { params: m, successRate: 0, verdict: 'yellow', verdictWord: '…', verdictBlurb: 'Calculating…',
        levers: [], medianLegacy: 0, sustainableSpending: 0, runwayYears: 0,
        paycheck: { total: 0, ss: 0, pension: 0, portfolio: 0 },
        path: [], incomeByYear: [], allocByYear: [], paths: [], totalSavings: 0 };
    }
    var real = mapToReal(m, 400);
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
    var successRate = successOf(results);

    // Paycheck (monthly) from the median path's first retirement year
    var retIdx = Math.max(0, m.retireAge - m.currentAge);
    var ry = medianLog[Math.min(retIdx, medianLog.length - 1)] || {};
    var portfolioDraw = (ry.rmd || 0) + (ry.wdTaxable || 0) + (ry.wdPreTax || 0) + (ry.wdRoth || 0);
    var paycheck = {
      total: (ry.spending || 0) / 12,
      ss: (ry.ssIncome || 0) / 12,
      pension: ((ry.pensionIncome || 0) + (ry.partTimeIncome || 0)) / 12,
      portfolio: portfolioDraw / 12
    };

    // Median legacy + runway
    var medianLegacy = Math.max(0, p50.finalBalance);
    var runwayYears = (p50.depletionAge !== null ? p50.depletionAge : m.endAge) - m.retireAge;

    // Sustainable spending (real solver; fall back to a quick bisection)
    var sustainableSpending = 0;
    try {
      if (window.calculateSustainableSpending) {
        sustainableSpending = Math.round(window.calculateSustainableSpending(real, 90) / 1000) * 1000;
      }
    } catch (e) { sustainableSpending = 0; }
    if (!sustainableSpending || isNaN(sustainableSpending)) {
      var lo = 20000, hi = 250000;
      for (var k = 0; k < 10; k++) {
        var mid = (lo + hi) / 2;
        var s = successOf(runPaths(Object.assign({}, real, { lifestyleSpending: mid, numPaths: 120 })));
        if (s < 85) hi = mid; else lo = mid;
      }
      sustainableSpending = Math.round(lo / 1000) * 1000;
    }

    // Per-year series from the median path
    var path = medianLog.map(function (y) { return { age: y.age, balance: y.totalBal }; });
    var incomeByYear = medianLog.filter(function (y) { return y.age >= m.retireAge; }).map(function (y) {
      return { age: y.age, ss: y.ssIncome || 0, pension: y.pensionIncome || 0, other: y.partTimeIncome || 0,
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
      params: m, successRate: successRate,
      sustainableSpending: sustainableSpending, runwayYears: runwayYears, medianLegacy: medianLegacy,
      levers: buildLevers(m, real, successRate), paycheck: paycheck,
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
    DEFAULTS: DEFAULTS, compute: compute, quickSuccess: quickSuccess,
    formatCurrency: formatCurrency, formatPct: formatPct, clone: clone, ssFactor: ssFactor
  };
})();
