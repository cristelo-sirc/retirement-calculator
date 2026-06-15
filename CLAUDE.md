# CLAUDE.md &mdash; Retirement Architect

## Project Overview

Browser-based retirement planning calculator with Monte Carlo simulations. As of **V18.0** the
front end is a React "Compass" app: `index.html` / `cover.html` are thin shells that load the
components in `cover-app/`, backed by the **real Monte Carlo engine** (`engine.js`) through the
`real-engine.js` adapter. `engine.js` is reused **unchanged** as a pure math library &mdash; only
its DOM init is bypassed. See the V18.0 / V18.1 sections below for detail.

Pre-V18 UI architecture (legacy imperative-DOM app: render functions, dashboard layout, mobile/iOS
behaviors, full v9.9&ndash;v17.6 version history) is archived in **`CLAUDE-legacy.md`**.

**Current Version:** 18.1
**Project Location:** `/Users/cristelogarza/Claude Code/Retirement Calculator`
**GitHub Repo:** https://github.com/cristelo-sirc/retirement-calculator
**GitHub Pages:** https://cristelo-sirc.github.io/retirement-calculator/
**Tech Stack:** HTML5, CSS3, React + Babel (CDN), Chart.js v3.9.1, localStorage (`compassParams`)
**Encoding:** Use HTML entities (`&mdash;` `&rarr;` `&middot;`) not Unicode to prevent mojibake

## Working Style

- **User (Cris) does not code** &mdash; handle all implementation, testing, and validation
- **No code changes without explicit approval** &mdash; propose plan with scope, rationale, risks, validation steps, and alternatives first
- **When multiple approaches exist**, present options with trade-offs (accuracy, complexity, maintainability, performance, UX), recommend one, wait for approval
- **Accuracy is non-negotiable** &mdash; any potential inaccuracy must be disclosed with safer alternatives
- **Verify changes work before delivering**
- **Maintain standard versioning** with clear increments and change logs; no silent changes
- **Version references show number only** (e.g., "V18.1") &mdash; no descriptive names or subtitles after the version number
- **Claude is responsible for all testing** &mdash; Cris does not test. After every change, Claude must deploy (push to GitHub), then conduct live browser testing against the GitHub Pages URL via Chrome MCP. This includes interacting with UI elements, verifying visual output, and testing at both desktop (1680px) and mobile (375px) viewports. Do not mark a task complete until live browser testing passes.
- **Keep responses succinct** &mdash; alert at 75% context capacity before compaction needed

## Core Principles

### Zero-Trust Logic Protocol
Role: Compliance Engineer / Legacy Maintainer (NOT Product Architect)
Goal: Logic Preservation, not Feature Optimization
Doctrine: Zero-trust regarding AI output

### Accuracy Above All
Calculation integrity must never be compromised for UI improvements. Core Monte Carlo engine (v9.9 baseline) is mathematically verified &mdash; preserve it. Any accuracy risk requires explicit approval.

### Audit Standard
After every code change, audit must verify OUTCOMES not just implementation:
1. Confirm original problem no longer exists (broader search than original diagnosis)
2. Check all areas with same class of issue (not just specific instances)
3. For UI changes, validate all affected user-facing sections via live browser testing (Chrome MCP against deployed GitHub Pages URL)
4. Check for unintended side effects, regressions, broken functionality
5. Test at desktop (1680px) and mobile (375px) viewports
6. Goal: "Is it fixed AND is everything else still working?"

Audit thoroughness should align with scope of changes and professional standards.

## Development Workflow
1. Propose changes and await approval
2. Implement after approval
3. Push to GitHub so GitHub Pages deploys the updated file
4. Live browser test via Chrome MCP against the deployed URL &mdash; desktop and mobile
5. Comprehensive audit (pre/post) confirming outcomes, not just implementation
6. Version increment with systematic updates to ALL version references (incl. the `engine.js?v=` cache-buster in `real-engine.js` &mdash; without it browsers can serve a stale engine against new HTML)

---

## Engine (`engine.js`) &mdash; pure math, unchanged

`engine.js` is reused as a pure math library by the V18 app. `simulatePath` and the financial
helpers are global/pure; only the engine's two DOM-init listeners are bypassed (the adapter injects
`engine.js` after `DOMContentLoaded`). The facts below describe this engine and remain valid
regardless of front end.

### Market Return Model
Stock and bond returns are correlated via Cholesky decomposition:
```
STOCK_BOND_CORR = -0.3  (historical stock-bond correlation)
stockR = stockReturn + stockVol * z1
bondR  = bondReturn + bondVol * (STOCK_BOND_CORR * z1 + sqrt(1 - STOCK_BOND_CORR^2) * z2)
```
Where z1, z2 are independent standard normal draws from `gaussianRandom()`.

The solver uses a deterministic RNG (`mulberry32` seeded PRNG) so identical market scenarios are reused across spending-level tests, producing consistent comparisons.

### pathLog Fields (per year per simulation)

**Core:** `age`, `totalBal`, `rmd`, `totalWithdrawal`, `ordIncome`, `taxBill`, `effRate`, `spending`, `stockAlloc`, `inflation`, `isSolvent`

**Income sources:** `ssIncome`, `pensionIncome`, `partTimeIncome`

**Withdrawal breakdown:** `wdTaxable`, `wdPreTax`, `wdRoth`, `discretionaryWithdrawal`
- `wdPreTax` = discretionary pre-tax only (does NOT include RMD &mdash; RMD is tracked separately in `rmd`)
- RMDs are withdrawn before discretionary withdrawals in the tax convergence loop

### Tax Convergence Loop
Five-iteration convergence loop (line refs are approximate):
1. Calculate available cash (salary + SS + pension + part-time + RMD)
2. Calculate gap = totalNeed + iterationTax - availableCash
3. Waterfall withdrawals: Taxable &rarr; Pre-Tax (by age) &rarr; Roth
4. Calculate ordinary income from all sources
5. Calculate taxable SS, IRMAA, federal/cap gains/NIIT/state tax
6. Check convergence (diff < $1 or max 5 passes)

---

## Engine Learnings &amp; Pitfalls

These are math/financial-logic facts about `engine.js`. UI-specific learnings live in `CLAUDE-legacy.md`.

### Data Consistency Is Critical
When a new field is added to the simulation, it must be propagated to ALL consumers (the `pathLog.push({})` in `simulatePath()`, the `lastSimulationResults.paths` mapping, and every downstream view/adapter). Deriving values (e.g., `withdrawal = spending - ss - pension`) instead of using actual simulation data leads to mismatches. Always use the source data.

### RMD vs Discretionary Pre-Tax
RMDs are withdrawn first, separately from discretionary pre-tax. In the tax convergence loop: `userPreTax = userPreTax_startOfYear - userRmd - withdrawals_converged.userPreTax`. The `wdPreTax` field represents only the discretionary portion beyond RMD.

### RMD Start Age Is 75 (SECURE 2.0, Born 1960+)
Per the SECURE 2.0 Act, RMDs begin at age 75 for individuals born in 1960 or later. `getDistributionPeriod()` returns 0 for ages < 75. Distribution periods extend through age 110 (floor of 3.5 beyond).

### SSA Early Claiming Is Tiered, Not Flat
The SSA reduction for claiming before FRA uses two tiers:
- First 36 months early: 5/9 of 1% per month (6.67%/year)
- Beyond 36 months: 5/12 of 1% per month (5%/year)

This formula exists in `calculateSSBenefit()`, `calculateSpousalBenefit()`, and `calculateOwnBenefitAtClaiming()`. All three must stay consistent.

### SS COLA Must Be External Only
Social Security benefits use a single nominal growth mechanism: `* inflation` at the simulation loop call site. Internal COLA inside `calculateSSBenefit()` would cause double-inflation because the function is called every year with the same `baseFRA` (today's dollars PIA), and the loop already converts to nominal via `* inflation`. Pension and part-time income follow this same pattern.

### Pension COLA Is Per-Spouse
Two independent toggles: `enablePensionCOLA` (user) and `enableSpousePensionCOLA` (spouse). The simulation uses `userPensionMult` and `spousePensionMult` independently. Most private pensions do not have COLA; some government/military pensions do.

### Input Units: All Income Inputs Are Annual (Doc Corrected 2026-06-10)
Pension inputs (`params.pension`, `params.spousePension`) AND Social Security inputs (`params.userSS`, `params.spouseSS`) are all **annual** amounts. The engine applies no `* 12` anywhere; labels read "Annual SS Benefit." This section previously claimed SS inputs were monthly &mdash; that was wrong and caused a mis-entry during the 2026-06-10 audit. When units matter, verify against the engine (`calculateSSBenefit` is called with `params.userSS` directly) and the input labels, not historical docs. (Adapter exception: `mortgagePayment` and `monthlyRent` are entered MONTHLY and the adapter multiplies by 12.)

### Taxable Account Tax Drag Is Real
A 100% taxable portfolio with 60% gain ratio loses ~10&ndash;15% of every withdrawal to capital gains tax + NIIT + state tax. For $1M taxable-only with $70k spending over 30 years, 0% success is mathematically correct.

### Param Name Consistency
Never invent param names. `collectInputs()` is the single source of truth for param names, and the V18 adapter maps the questionnaire onto its shape. Verify any param against it before use.

---

## V18.0 &mdash; "Compass" editorial rebuild (Concept 07 Cover)

**Major architecture change.** The front end was rebuilt from the design handoff
(`handoff-07-cover/`) rather than re-skinning the legacy UI. `index.html` now serves
the mockup's React components (CDN React + Babel) backed by the REAL Monte Carlo
engine via an adapter &mdash; not the legacy imperative-DOM app.

### File layout
- `index.html` / `cover.html` &mdash; the editorial "Compass" app shell (identical; cover.html kept as a staging URL). Renders one shared-state screen at a time; the in-screen nav switches screens; params persist to `localStorage['compassParams']`; `CoverMobile` renders under 769px.
- `cover-app/` &mdash; design components copied from the handoff, lightly adapted:
  - `compass-cover.jsx` (Cover/Rework/Projection/Income&Odds + chrome), `cover-inputs.jsx` (Questionnaire), `cover-mobile.jsx`, `retire-ui.jsx`, `retire-charts.jsx`.
  - Each top-level screen accepts shared `{params,setParams}` props (fallback to internal state); in-screen nav clickable via `window._coverNav`; SS/pension relabeled per-year with rescaled steppers.
  - `real-engine.js` &mdash; adapter exposing `window.MockEngine`. Injects `engine.js` AFTER DOMContentLoaded (so engine.js's two DOM-init listeners never fire), maps the mockup param set onto `collectInputs()`-shape params (real-engine defaults for inputs the mockup omits), runs `simulatePath` (1500 paths), aggregates to the return shape.

### Engine
`engine.js` is UNCHANGED, reused as a pure math library. `simulatePath` + financial helpers are global/pure; only its DOM init is bypassed.

### Accuracy (verified)
Adapter vs legacy app on the saved scenario: **93% vs 92%** (Monte Carlo noise), same ~$3.25M median legacy, 30-yr runway. Adapter defaults aligned to engine defaults: taxableGainRatio 0.6, bondVol 0.06, bracketGrowth 0.025, healthcareInflation 0.05, guardrail bands 0.06/0.04/0.10, stateTaxRate 0, guardrails default OFF.

### Rollback
Pre-rebuild V17.6 preserved on branch **`pre-reskin-v17.6`** (commit a436eea) + git history.

### Deferred (to re-add onto the new app)
Goal Solver, Reports/QR/PDF export, detailed spending/tax/outcome charts, legacy setup wizard, and importing the legacy `retirementArchitect_autoSave` plan. Interim "V18.0 WIP Phase 1&ndash;5" (in-place re-skin) is superseded by this rebuild but remains in git history.

---

## V18.1 &mdash; Full input exposure in the Questionnaire

Every engine input is now editable in the Compass Questionnaire; nothing runs on a hidden adapter default. Before this, the adapter (`real-engine.js`) hardcoded ~40 of `collectInputs()`'s 67 inputs.

**Newly exposed** (desktop `cover-inputs.jsx` + mobile `cover-mobile.jsx`): savings destination (pre-tax/Roth/split, per spouse); a real Part-time/other-income block (toggle, amount, start/end age) replacing the old "Other income" proxy that was silently modeled as lifelong part-time; **post-65 healthcare** + healthcare inflation (post-65 was previously $0); spending reduction (slow-go) block; SS spousal benefit; pension start ages + COLA per spouse; a Home group (own/rent &rarr; mortgage payment, payoff age, property tax, or monthly rent); windfall; Roth conversions; guardrail bands (ceiling/floor/adjustment); bond volatility, tax-bracket growth, TCJA sunset, taxable gain ratio.

**Decisions (per Cris):** the State dropdown was replaced by a numeric **State tax rate %** that maps straight to the engine's flat `stateTaxRate` (engine applies ONE flat rate and does NOT honor state SS/pension exemptions &mdash; disclosed in an in-form note). The **Filing status** dropdown was removed &mdash; the engine derives MFJ vs Single from the partner toggle and has no head-of-household path; a note explains the link.

**Units/conventions** (mock param shape &rarr; adapter): `$` amounts ANNUAL except `mortgagePayment` and `monthlyRent` which are MONTHLY (engine `&times;12`); percentages entered as whole numbers and divided by 100 in `mapToReal`. New `DEFAULTS` mirror the verified engine defaults exactly, so an untouched questionnaire reproduces the prior baseline (~93%).

**Also fixed:** mobile SS/pension fields were "/mo" with monthly-scaled steppers while the engine treats them as ANNUAL &mdash; corrected to "/yr" to match desktop and the engine. `FIELD_INFO` "monthly" wording on SS/pension corrected to annual.

**Cache-buster:** `engine.js?v=18.1` in `real-engine.js`. Engine.js UNCHANGED (math untouched). Shipped to the live site (both `index.html` and `cover.html` load the shared `cover-app/` files).
