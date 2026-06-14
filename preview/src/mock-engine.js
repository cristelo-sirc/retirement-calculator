// mock-engine.js — Deterministic stand-in for the real Monte Carlo engine.
// Same shape as collectInputs() outputs from the real engine.js, but the
// math here is a simple deterministic projection so designs feel live without
// shipping 6,200 lines of simulation code. Numbers won't match production —
// they just react sensibly to slider changes for demo purposes.

window.MockEngine = (function () {
  // Default scenario: 55-yo couple, on-track-but-tight. Yellow zone (~75% success).
  // Tuned so the stoplight lands on "Tight" by default — the most informative
  // demo state for showing stoplight + levers.
  const DEFAULTS = {
    // ── Household ──
    hasPartner: true,
    currentAge: 55,
    retireAge: 65,
    endAge: 92,
    spouseAge: 53,
    spouseRetireAge: 65,

    // ── Savings ──
    userPreTax: 520000,
    userRoth: 120000,
    spousePreTax: 180000,
    spouseRoth: 40000,
    taxable: 90000,

    // ── Income today ──
    salary: 145000,
    savingsRate: 12,
    spouseSalary: 78000,
    spouseSavingsRate: 6,

    // ── Spending ──
    spending: 115000,
    healthcare: 8000,          // annual, added pre-Medicare (until 65)
    inflation: 2.5,
    legacyGoal: 0,

    // ── Social Security & other guaranteed income ──
    ssBenefit: 2800,           // monthly, at full retirement age (67)
    ssClaimAge: 67,
    spouseSS: 1900,            // monthly, at FRA
    spouseClaimAge: 67,
    pension: 0,                // monthly, user
    pensionStartAge: 65,
    spousePension: 0,          // monthly, spouse
    otherIncome: 0,            // monthly (rental, annuity), from retirement

    // ── Markets ──
    stockAllocation: 60,
    stockReturn: 7.0,
    bondReturn: 3.5,
    stockVol: 17,

    enableGuardrails: true,
    enableGlidePath: true,
    glidePathEndStock: 40,     // stock % the glide path ramps down to by endAge

    filingStatus: 'married',
    stateOfResidence: 'CA',
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // Social Security claim-age adjustment. FRA = 67. Claiming early cuts the
  // benefit ~6%/yr; delaying past FRA adds ~8%/yr (delayed retirement credits).
  function ssFactor(claimAge) {
    const fra = 67;
    if (claimAge >= fra) return 1 + (claimAge - fra) * 0.08;
    return Math.max(0.6, 1 - (fra - claimAge) * 0.06);
  }

  // Per-year stock allocation. With a glide path on, stock % ramps linearly
  // from the chosen allocation at retirement down to glidePathEndStock at endAge.
  function stockAtAge(p, age) {
    if (!p.enableGlidePath) return p.stockAllocation;
    const startA = p.retireAge;
    if (age <= startA) return p.stockAllocation;
    const t = Math.min(1, (age - startA) / Math.max(1, p.endAge - startA));
    return Math.round(p.stockAllocation + (p.glidePathEndStock - p.stockAllocation) * t);
  }

  function realReturnAt(p, age, stockOverride) {
    const stock = (stockOverride != null ? stockOverride : stockAtAge(p, age)) / 100;
    const blended = stock * p.stockReturn + (1 - stock) * p.bondReturn;
    return (blended - p.inflation) / 100;
  }

  // Simple deterministic projection. Returns one path of [age -> balance],
  // plus a per-year income-source breakdown and allocation track.
  function project(p, opts) {
    opts = opts || {};
    const partner = !!p.hasPartner;
    const sPreTax = partner ? (p.spousePreTax || 0) : 0;
    const sRoth = partner ? (p.spouseRoth || 0) : 0;
    const totalStart = (p.userPreTax || 0) + (p.userRoth || 0) + sPreTax + sRoth + (p.taxable || 0);

    const path = [];
    const incomeByYear = [];
    const allocByYear = [];
    let bal = totalStart;
    let depletionAge = null;

    const userSSann = (p.ssBenefit || 0) * 12 * ssFactor(p.ssClaimAge);
    const spouseSSann = partner ? (p.spouseSS || 0) * 12 * ssFactor(p.spouseClaimAge) : 0;

    for (let age = p.currentAge; age <= p.endAge; age++) {
      const stock = stockAtAge(p, age);
      allocByYear.push({ age, stock, bond: 100 - stock });
      const realReturn = realReturnAt(p, age, stock);

      let netFlow = 0;
      if (age < p.retireAge) {
        // accumulating
        const userContrib = (p.salary || 0) * ((p.savingsRate || 0) / 100);
        const spouseContrib = partner ? (p.spouseSalary || 0) * ((p.spouseSavingsRate || 0) / 100) : 0;
        netFlow = userContrib + spouseContrib;
        bal = bal * (1 + realReturn) + netFlow;
        if (bal < 0 && depletionAge === null) depletionAge = age;
        path.push({ age, balance: Math.max(bal, 0), depleted: bal < 0 });
        continue;
      }

      // withdrawing
      let need = p.spending;
      if (age < 65) need += (p.healthcare || 0);   // pre-Medicare bridge

      const ss = (age >= p.ssClaimAge ? userSSann : 0)
               + (partner && age >= p.spouseClaimAge ? spouseSSann : 0);
      const pension = (age >= (p.pensionStartAge || 65) ? (p.pension || 0) * 12 : 0)
                    + (partner && age >= (p.pensionStartAge || 65) ? (p.spousePension || 0) * 12 : 0);
      const other = (p.otherIncome || 0) * 12;
      const guaranteed = ss + pension + other;
      const fromPortfolio = Math.max(need - guaranteed, 0);

      incomeByYear.push({ age, ss, pension, other, portfolio: fromPortfolio, need });

      netFlow = guaranteed - need;
      bal = bal * (1 + realReturn) + netFlow;
      if (bal < 0 && depletionAge === null) depletionAge = age;
      path.push({ age, balance: Math.max(bal, 0), depleted: bal < 0 });
    }

    return { path, incomeByYear, allocByYear, depletionAge, endBalance: bal };
  }

  // Estimate success rate via volatility band — fan out ±2σ deterministically.
  function compute(params) {
    const p = Object.assign({}, DEFAULTS, params || {});
    const base = project(p);

    // Generate 50 deterministic "paths" by perturbing return
    const paths = [];
    let successes = 0;
    const vol = (p.stockVol / 100) * 0.6; // damped for visual stability
    for (let i = 0; i < 50; i++) {
      const seed = (i - 25) / 25; // -1 ... +1
      const perturbed = Object.assign({}, p, {
        stockReturn: Math.max(0, p.stockReturn + seed * vol * 100 * 0.3),
      });
      const r = project(perturbed);
      paths.push(r);
      if (r.depletionAge === null) successes++;
    }

    const successRate = Math.round((successes / paths.length) * 100);

    // Sustainable spending: bisect on spending until we hit ~85% success
    const targetSuccess = 0.85;
    let lo = 20000, hi = 250000;
    for (let k = 0; k < 12; k++) {
      const mid = (lo + hi) / 2;
      const tp = Object.assign({}, p, { spending: mid });
      let s = 0;
      for (let i = 0; i < 20; i++) {
        const seed = (i - 10) / 10;
        const r = project(Object.assign({}, tp, {
          stockReturn: Math.max(0, tp.stockReturn + seed * vol * 100 * 0.3),
        }));
        if (r.depletionAge === null) s++;
      }
      if (s / 20 < targetSuccess) hi = mid; else lo = mid;
    }
    const sustainableSpending = Math.round(lo / 1000) * 1000;

    // Runway: median path's depletion age, or endAge if none
    const depletions = paths.map(r => r.depletionAge).filter(a => a !== null).sort((a, b) => a - b);
    const medianDepletion = depletions.length > 0 ? depletions[Math.floor(depletions.length / 2)] : null;
    const runwayYears = medianDepletion ? medianDepletion - p.retireAge : p.endAge - p.retireAge;

    // Legacy: median end balance
    const endBalances = paths.map(r => Math.max(r.endBalance, 0)).sort((a, b) => a - b);
    const medianLegacy = endBalances[Math.floor(endBalances.length / 2)];

    // Verdict — stoplight
    let verdict, verdictWord, verdictBlurb;
    if (successRate >= 90) {
      verdict = 'green';
      verdictWord = 'On Track';
      verdictBlurb = 'Your plan has strong odds. You can likely retire as planned without changes.';
    } else if (successRate >= 70) {
      verdict = 'yellow';
      verdictWord = 'Tight';
      verdictBlurb = 'Your plan works in most scenarios, but a bad market sequence could squeeze you.';
    } else {
      verdict = 'red';
      verdictWord = 'At Risk';
      verdictBlurb = 'Your plan runs out of money in too many scenarios. Adjustments are needed.';
    }

    // Levers — three actionable adjustments
    const levers = computeLevers(p, successRate);

    // Income paycheck breakdown at retirement (monthly), first full retirement year
    const firstRetYear = base.incomeByYear[0] || { ss: 0, pension: 0, other: 0, portfolio: 0, need: p.spending };
    const monthlySpending = firstRetYear.need / 12;
    const monthlySS = firstRetYear.ss / 12;
    const monthlyPension = (firstRetYear.pension + firstRetYear.other) / 12;
    const monthlyFromPortfolio = firstRetYear.portfolio / 12;

    return {
      params: p,
      successRate,
      sustainableSpending,
      runwayYears,
      medianLegacy,
      verdict,
      verdictWord,
      verdictBlurb,
      levers,
      paycheck: {
        total: monthlySpending,
        ss: monthlySS,
        pension: monthlyPension,
        portfolio: monthlyFromPortfolio,
      },
      path: base.path,
      incomeByYear: base.incomeByYear,
      allocByYear: base.allocByYear,
      paths, // array of perturbed paths for fan chart
      totalSavings: (p.userPreTax || 0) + (p.userRoth || 0)
        + (p.hasPartner ? (p.spousePreTax || 0) + (p.spouseRoth || 0) : 0) + (p.taxable || 0),
    };
  }

  function computeLevers(p, currentSuccess) {
    const levers = [];

    // Lever 1: delay retirement by 2 years
    const r1 = quickSuccess(Object.assign({}, p, { retireAge: p.retireAge + 2 }));
    levers.push({
      id: 'delay',
      title: 'Delay retirement 2 years',
      detail: `Retire at ${p.retireAge + 2} instead of ${p.retireAge}`,
      delta: r1 - currentSuccess,
      newSuccess: r1,
      icon: 'clock',
      reasoning: 'Two extra years means more savings, fewer years of withdrawals, and a higher SS benefit.',
    });

    // Lever 2: cut spending by 10%
    const newSpend = Math.round(p.spending * 0.9 / 1000) * 1000;
    const r2 = quickSuccess(Object.assign({}, p, { spending: newSpend }));
    levers.push({
      id: 'spend',
      title: 'Cut spending 10%',
      detail: `$${(newSpend / 1000).toFixed(0)}k/yr instead of $${(p.spending / 1000).toFixed(0)}k`,
      delta: r2 - currentSuccess,
      newSuccess: r2,
      icon: 'wallet',
      reasoning: 'Lower withdrawals stretch the portfolio. Worth modeling part-time work as a buffer too.',
    });

    // Lever 3: delay SS to 70
    if (p.ssClaimAge < 70) {
      const r3 = quickSuccess(Object.assign({}, p, { ssClaimAge: 70, spouseClaimAge: 70 }));
      levers.push({
        id: 'ss',
        title: 'Wait until 70 for Social Security',
        detail: `Claim at 70 instead of ${p.ssClaimAge}`,
        delta: r3 - currentSuccess,
        newSuccess: r3,
        icon: 'calendar',
        reasoning: 'Each year you delay past FRA boosts your monthly benefit by ~8%. Inflation-protected for life.',
      });
    }

    return levers
      .sort((a, b) => b.delta - a.delta)
      .filter(l => l.delta >= 0)
      .slice(0, 3);
  }

  // Fast success-rate-only estimate (no lever recursion). Exposed so screens
  // can cheaply compare many what-if scenarios (e.g. the comparison chart).
  function quickSuccess(params) {
    const p = Object.assign({}, DEFAULTS, params || {});
    const vol = (p.stockVol / 100) * 0.6;
    let successes = 0;
    for (let i = 0; i < 30; i++) {
      const seed = (i - 15) / 15;
      const r = project(Object.assign({}, p, {
        stockReturn: Math.max(0, p.stockReturn + seed * vol * 100 * 0.3),
      }));
      if (r.depletionAge === null) successes++;
    }
    return Math.round((successes / 30) * 100);
  }

  function formatCurrency(n, opts) {
    opts = opts || {};
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (opts.compact && abs >= 1000000) return '$' + (n / 1000000).toFixed(abs >= 10000000 ? 1 : 2) + 'M';
    if (opts.compact && abs >= 1000) return '$' + Math.round(n / 1000) + 'k';
    return '$' + Math.round(n).toLocaleString();
  }

  function formatPct(n) {
    if (n == null || isNaN(n)) return '—';
    return Math.round(n) + '%';
  }

  return {
    DEFAULTS,
    compute,
    quickSuccess,
    clone,
    formatCurrency,
    formatPct,
    ssFactor,
  };
})();
