// tests/audit-helpers.js — ENGINE-AUDIT-PLAN.md Phase 0 harness (2026-07 audit)
// Loads engine.js and cover-app/real-engine.js headlessly (same technique as the
// existing suite), exposes every audited function, and provides fixture builders
// plus the conservation-identity checker used by the audit test batteries.
//
// NOTE (Phase 0 finding on realized returns): the engine's pathLog does NOT record
// each year's realized portfolio return. With vol > 0 the per-year return is only
// reproducible by re-drawing the seeded RNG in the engine's exact consumption order
// (two gaussians per year, stock z1 then bond z2). reconstructReturns() below does
// that. The primary conservation matrix therefore runs at vol = 0 (decisive per the
// plan), with a seeded vol > 0 spot-check that doubles as verification of the RNG
// consumption-order assumption.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadFinancialEngine() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'engine.js'), 'utf8');
  const emptyList = [];
  const document = {
    addEventListener() {},
    getElementById() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return emptyList; },
    createElement() {
      return { style: {}, click() {}, setAttribute() {}, appendChild() {} };
    },
    body: {
      style: {}, appendChild() {},
      classList: { add() {}, remove() {}, contains() { return false; } }
    }
  };
  const window = {
    addEventListener() {}, innerWidth: 1280, innerHeight: 720, scrollY: 0,
    location: { origin: '', pathname: '', search: '' },
    history: { replaceState() {} },
    URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
    confirm() { return false; }
  };
  const context = {
    console, Math, Intl, Date, JSON, Promise, setTimeout, clearTimeout, URLSearchParams,
    Blob, document, window,
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    sessionStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__financialEngine = {
    simulatePath, calculateWorkplaceContributions, calculateFederalOrdinaryTax,
    calculateTaxableSS, calculateCapGainsTax, calculateNIIT, calculateStateTax,
    calculateIRMAA, calculateSSBenefit, calculateSpousalBenefit,
    calculateOwnBenefitAtClaiming, determineSpousalBenefitRecipient,
    getDistributionPeriod, gaussianRandom, mulberry32
  };`, context, { timeout: 20000 });
  return context.__financialEngine;
}

function loadAdapter() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'cover-app', 'real-engine.js'), 'utf8')
    .replace('window.MockEngine = {',
      'window.__mapToReal = mapToReal; window.__buildBalancePath = buildBalancePath;' +
      ' window.__successOf = successOf; window.__runPaths = runPaths;' +
      ' window.__tableRowsOf = tableRowsOf; window.__buildYearTables = buildYearTables;' +
      ' window.__computeMoves = computeMoves; window.__DEFAULTS = DEFAULTS; window.MockEngine = {');
  // Give the adapter the real simulatePath so runPaths / compute work headlessly.
  const eng = loadFinancialEngine();
  const window = { simulatePath: eng.simulatePath };
  const context = {
    console, Math, JSON, window,
    document: { addEventListener() {}, createElement() { return {}; }, head: { appendChild() {} } }
  };
  vm.createContext(context);
  vm.runInContext(source, context, { timeout: 10000 });
  return {
    engine: window.MockEngine,
    mapToReal: window.__mapToReal,
    buildBalancePath: window.__buildBalancePath,
    successOf: window.__successOf,
    runPaths: window.__runPaths,
    tableRowsOf: window.__tableRowsOf,
    buildYearTables: window.__buildYearTables,
    computeMoves: window.__computeMoves,
    DEFAULTS: window.__DEFAULTS
  };
}

// ---- Fixture builder -----------------------------------------------------------
// Deterministic, everything off unless a scenario turns it on. vol = 0.
function auditParams(overrides = {}) {
  return {
    currentAge: 50, retireAge: 65, endAge: 90, spouseAge: 0, spouseRetireAge: 0,
    userPreTaxBalance: 0, userRothBalance: 0,
    spousePreTaxBalance: 0, spouseRothBalance: 0, taxableBalance: 0,
    currentSalary: 0, userSavingsRate: 0,
    userEmployerContributionRate: 0, userPriorYearWages: 0,
    userSavingsDest: 'pretax', userEmployerContributionDest: 'pretax',
    spouseCurrentSalary: 0, spouseSavingsRate: 0,
    spouseEmployerContributionRate: 0, spousePriorYearWages: 0,
    spouseSavingsDest: 'pretax', spouseEmployerContributionDest: 'pretax',
    userSS: 0, userClaimAge: 70, spouseSS: 0, spouseClaimAge: 70,
    enableSpousalBenefit: false,
    pension: 0, pensionAge: 65, enablePensionCOLA: false,
    spousePension: 0, spousePensionAge: 65, enableSpousePensionCOLA: false,
    enablePartTime: false, partTimeIncome: 0, partTimeStartAge: 65, partTimeEndAge: 70,
    enableWindfall: false, windfallAmount: 0, windfallAge: 70,
    enableRothConversion: false, rothConversionAmount: 0,
    rothConversionStartAge: 65, rothConversionEndAge: 72,
    lifestyleSpending: 0, lifestyleInflation: 0,
    enableSpendingReduction: false, spendingReductionAge: 75, spendingReductionPercent: 0,
    enableGuardrails: false, guardrailCeiling: 0.06,
    guardrailFloor: 0.04, guardrailAdjustment: 0.10,
    housingType: 'own', mortgagePrincipal: 0, mortgageLastAge: 0,
    propertyTax: 0, monthlyRent: 0,
    healthcarePre65: 0, healthcare65: 0, healthcareInflation: 0,
    stockAllocation: 1, enableGlidePath: false, endingStockAllocation: 1,
    stockReturn: 0.06, stockVol: 0, bondReturn: 0.03, bondVol: 0,
    bracketGrowth: 0, enableTCJASunset: false, stateTaxRate: 0, taxableGainRatio: 0.5,
    _solverDeterministic: true, _solverSeedBase: 123,
    ...overrides
  };
}

// ---- Conservation identity checker ----------------------------------------------
// At vol = 0 the realized weighted return of year i is derivable from the logged
// stockAlloc:  r_i = stockAlloc_i*stockReturn + (1-stockAlloc_i)*bondReturn.
// Identity (total portfolio, engine's balance-update step):
//   end_i = start_i*(1+r_i) + contributions_i - rmd_i - totalWithdrawal_i + windfall_i + surplusBanked_i
// (Roth conversions move money between accounts and must net to zero in the total.)
// V19.5: surplusBanked is the F-SURPLUS fix's leftover-cash deposit into taxable.
// Also checks the chain start_{i+1} === end_i. Depletion no longer latches forever
// (F-DEPLETED-WINDFALL fix): isSolvent can flip back true if new money (windfall or
// banked surplus) resurrects the balance, and the identity is checked normally for
// any row where isSolvent !== false, resurrection years included.
function checkConservation(result, params, tolerance = 1) {
  const violations = [];
  const log = result.log;
  for (let i = 0; i < log.length; i++) {
    const y = log[i];
    const r = y.stockAlloc * params.stockReturn + (1 - y.stockAlloc) * params.bondReturn;
    const contrib = (y.employeeContribution || 0) + (y.employerContribution || 0);
    const windfall = (params.enableWindfall && y.age === params.windfallAge)
      ? params.windfallAmount : 0;
    const expectedEnd = y.startingBalance * (1 + r) + contrib
      - (y.rmd || 0) - (y.totalWithdrawal || 0) + windfall + (y.surplusBanked || 0);
    if (y.isSolvent !== false) {
      const diff = y.totalBal - expectedEnd;
      if (Math.abs(diff) > tolerance) {
        violations.push({ age: y.age, kind: 'identity', diff, expectedEnd, actualEnd: y.totalBal });
      }
    } else {
      // After/at depletion the engine zeroes balances; expected end must not be
      // materially positive (that would mean real money was destroyed).
      if (expectedEnd > tolerance) {
        violations.push({ age: y.age, kind: 'destroyed-at-depletion', diff: expectedEnd, expectedEnd, actualEnd: y.totalBal });
      }
    }
    if (i + 1 < log.length) {
      const chain = log[i + 1].startingBalance - y.totalBal;
      // After depletion the engine re-zeroes balances before the next year, so the
      // next start is 0 even though totalBal may log a sub-$1 remainder.
      if (Math.abs(chain) > tolerance && y.isSolvent !== false) {
        violations.push({ age: y.age, kind: 'chain', diff: chain });
      }
    }
  }
  return violations;
}

// ---- Seeded per-year return reconstruction (vol > 0 spot-check) ------------------
// Mirrors engine lines 1789-1835: mulberry32 seed, two gaussians per year,
// Cholesky correlation -0.3, glide-path allocation.
function reconstructReturns(engineFns, params, solverPathIndex) {
  const { mulberry32, gaussianRandom } = engineFns;
  const rng = mulberry32(((((params._solverSeedBase >>> 0) || 0) + ((solverPathIndex + 1) * 0x9E3779B9)) >>> 0));
  const years = params.endAge - params.currentAge;
  const CORR = -0.3;
  const out = [];
  for (let i = 0; i < years; i++) {
    const z1 = gaussianRandom(0, 1, rng);
    const z2 = gaussianRandom(0, 1, rng);
    const stockR = params.stockReturn + params.stockVol * z1;
    const bondR = params.bondReturn + params.bondVol * (CORR * z1 + Math.sqrt(1 - CORR * CORR) * z2);
    let alloc = params.stockAllocation;
    if (params.enableGlidePath && years > 0) {
      alloc = params.stockAllocation + (params.endingStockAllocation - params.stockAllocation) * (i / years);
    }
    out.push(alloc * stockR + (1 - alloc) * bondR);
  }
  return out;
}

module.exports = { loadFinancialEngine, loadAdapter, auditParams, checkConservation, reconstructReturns };
