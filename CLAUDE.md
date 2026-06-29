# CLAUDE.md &mdash; Retirement Architect

## Project Overview

Browser-based retirement planning calculator with Monte Carlo simulations. As of **V18.0** the
front end is a React "Compass" app: `index.html` / `cover.html` are thin shells that load the
components in `cover-app/`, backed by the **real Monte Carlo engine** (`engine.js`) through the
`real-engine.js` adapter. `engine.js` is reused as a pure math library &mdash; only its DOM init is
bypassed. **Note:** V18.11 is the first release that intentionally modifies `engine.js` math
(contribution accumulation fix, IRMAA per-person + 2yr lookback, growing contribution caps).
See the V18.0 / V18.1 sections below for detail.

Pre-V18 UI architecture (legacy imperative-DOM app: render functions, dashboard layout, mobile/iOS
behaviors, full v9.9&ndash;v17.6 version history) is archived in **`CLAUDE-legacy.md`**.

**Current Version:** 19.0
**Project Location:** `/Users/cristelogarza/Claude Code/Retirement Calculator`
**GitHub Repo:** https://github.com/cristelo-sirc/retirement-calculator
**GitHub Pages:** https://cristelo-sirc.github.io/retirement-calculator/
**Tech Stack:** HTML5, CSS3, React + Babel (CDN), Chart.js v3.9.1, localStorage (`compassParams`)
**Encoding:** Use HTML entities (`&mdash;` `&rarr;` `&middot;`) not Unicode to prevent mojibake

**Documentation map:** `README.md` is the short public orientation; `CHANGELOG.md` is the concise release
record; this file is the technical source of truth; `CLAUDE-legacy.md` preserves the pre-V18 architecture.
`BACKLOG.md` and audit reports are local working records and are intentionally not published.

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
3. Work on a scoped branch; stage only intended files; commit and publish through a pull request into `main`
4. Let GitHub Pages deploy the merged `main` checkpoint
5. Live browser test against the deployed URL &mdash; desktop and mobile
6. Comprehensive audit (pre/post) confirming outcomes, not just implementation
7. Version increment with systematic updates to ALL version references (incl. the `engine.js?v=` cache-buster in `real-engine.js` &mdash; without it browsers can serve a stale engine against new HTML)

`scripts/deploy.sh` is an emergency direct-to-`main` fallback, not the standard workflow. It bypasses the
pull-request review gate and broadly mirrors the local project folder, so use it only with explicit approval
and a verified clean scope.

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

**Core:** `age` (cash-flow period), `balanceAge` (ending-balance birthday), `startingBalance`, `totalBal`, `rmd`, `totalWithdrawal`, `ordIncome`, `taxBill`, `effRate`, `spending`, `stockAlloc`, `inflation`, `isSolvent`, `employeeContribution`, `employerContribution`

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
Goal Solver, Reports/QR/PDF export, detailed spending/tax/outcome charts, legacy setup wizard, and importing the legacy `retirementArchitect_autoSave` plan. Interim "V18.0 WIP Phase 1&ndash;5" (in-place re-skin) is superseded by this rebuild but remains in git history. (**Update:** explicit file Save/Load shipped in V18.2 &mdash; see below. Legacy `retirementArchitect_autoSave` import and Reports/QR/PDF export remain deferred.)

---

## V18.1 &mdash; Full input exposure in the Questionnaire

Every engine input is now editable in the Compass Questionnaire; nothing runs on a hidden adapter default. Before this, the adapter (`real-engine.js`) hardcoded ~40 of `collectInputs()`'s 67 inputs.

**Newly exposed** (desktop `cover-inputs.jsx` + mobile `cover-mobile.jsx`): savings destination (pre-tax/Roth/split, per spouse); a real Part-time/other-income block (toggle, amount, start/end age) replacing the old "Other income" proxy that was silently modeled as lifelong part-time; **post-65 healthcare** + healthcare inflation (post-65 was previously $0); spending reduction (slow-go) block; SS spousal benefit; pension start ages + COLA per spouse; a Home group (own/rent &rarr; mortgage payment, payoff age, property tax, or monthly rent); windfall; Roth conversions; guardrail bands (ceiling/floor/adjustment); bond volatility, tax-bracket growth, TCJA sunset, taxable gain ratio.

**Decisions (per Cris):** the State dropdown was replaced by a numeric **State tax rate %** that maps straight to the engine's flat `stateTaxRate` (engine applies ONE flat rate and does NOT honor state SS/pension exemptions &mdash; disclosed in an in-form note). The **Filing status** dropdown was removed &mdash; the engine derives MFJ vs Single from the partner toggle and has no head-of-household path; a note explains the link.

**Units/conventions** (mock param shape &rarr; adapter): `$` amounts ANNUAL except `mortgagePayment` and `monthlyRent` which are MONTHLY (engine `&times;12`); percentages entered as whole numbers and divided by 100 in `mapToReal`. New `DEFAULTS` mirror the verified engine defaults exactly, so an untouched questionnaire reproduces the prior baseline (~93%).

**Also fixed:** mobile SS/pension fields were "/mo" with monthly-scaled steppers while the engine treats them as ANNUAL &mdash; corrected to "/yr" to match desktop and the engine. `FIELD_INFO` "monthly" wording on SS/pension corrected to annual.

**Cache-buster:** `engine.js?v=18.1` in `real-engine.js`. Engine.js UNCHANGED (math untouched). Shipped to the live site (both `index.html` and `cover.html` load the shared `cover-app/` files).

---

## V18.2 &mdash; Welcome launch screen + file Save/Load

**Problem solved:** on open, the app always landed on the Cover showing a confident "93/100 &mdash; On Track" verdict computed from `DEFAULTS`, with the word "Your" in front of placeholder numbers and the Questionnaire just one of five equal tabs. Nothing signaled that you must fill out the Questionnaire, and explicit save/load (a V18 deferred item) didn't exist &mdash; only silent `compassParams` auto-save.

**Welcome launch screen (`CoverWelcome` in `compass-cover.jsx`, gated in `index.html`).** Shows on **every** load before the app (`started` flag). Choices adapt to context via `hasSession` (a *personalized* saved plan exists &mdash; saved params differ from `DEFAULTS`, computed in a `useState` initializer so it reads the prior session before the auto-save effect rewrites it):
- **Continue your plan** &mdash; primary, only when `hasSession`; reopens the `compassParams` session.
- **Start a new plan** &mdash; resets to `DEFAULTS` and routes to the Questionnaire (desktop `screen='quiz'`; mobile via new `initialTab` prop on `CoverMobile`). `window.confirm` guards against overwriting a personalized session.
- **Load a saved plan** &mdash; file picker &rarr; import &rarr; Cover.

**File Save/Load (`window.CompassIO` in `compass-cover.jsx`).** `savePlan` downloads `compass-plan-YYYY-MM-DD.json` = `{schema, version, savedAt, params}`. `parsePlan` is defensive: JSON-parse in try/catch, accepts our wrapped shape or a bare params object, and **merges only known `DEFAULTS` keys over `DEFAULTS`** so a foreign/partial/garbage file can never feed unknown fields to the engine (returns friendly errors otherwise). Shared `CoverSaveLoad` control row appears on the desktop Cover footer, the desktop Questionnaire footer, and the mobile Cover.

**Sample labeling (safety net, persists whenever `!dirty`).** Desktop Cover + mobile Cover show a "Sample plan &middot; not your numbers yet" badge, reword the verdict to "This sample plan is&hellip;", surface a primary "Answer the questionnaire" CTA, and render the Questionnaire nav item/tab as an emphasized "Start here" pill. All of it clears the instant any input changes.

**Also fixed:** the desktop Questionnaire's "See the cover &rarr;" button had no `onClick` (dead button) &mdash; now navigates to the Cover.

**Cache-buster:** bumped `engine.js?v=18.2` in `real-engine.js` and added `?v=18.2` to all five `cover-app/*.jsx` includes in `index.html` (they previously had none, risking stale JSX on deploy). Engine.js UNCHANGED (math untouched); all changes are UI/data plumbing, zero Monte Carlo impact.

---

## V18.3 &mdash; Save/Load surfaced at the top of each page

**Problem solved:** V18.2's Save/Load lived only at the *bottom* of the cover and questionnaire, so a returning user couldn't see "Load my plan" until after scrolling past (or re-entering) everything &mdash; backwards, since Load is the whole point of avoiding re-entry.

**New `CoverSaveLoadCallout` (in `compass-cover.jsx`).** A prominent bordered callout (prompt + Load/Save buttons, `primary` selects which is filled, `compact` flag, inline success/error feedback in sage/clay). Reused across desktop + mobile via `window.CoverSaveLoadCallout`.

**Placement:**
- **Questionnaire** (desktop `cover-inputs.jsx` + mobile `QuizView`): callout at the TOP, right under the intro and above the first question, leading with **Load** ("no need to re-enter everything"). The desktop questionnaire keeps its bottom Save/Load row for the natural post-entry save moment. (Mobile's questionnaire previously had no Save/Load at all &mdash; now fixed; `QuizView` gained a `setParams` prop.)
- **Cover** (desktop `CoverDesktop` + mobile `CoverView`): callout moved UP &mdash; directly under the nav on desktop, at the top of the mobile cover &mdash; so it's visible without scrolling. The buried V18.2 footer row was removed so there's one clear home (Save-primary copy, since the cover always has a plan in view).

**No engine impact** (UI/placement only). **Cache-buster:** `engine.js?v=18.3` + `?v=18.3` on all `cover-app/*.jsx` includes; titles bumped to V18.3. Engine.js UNCHANGED.

**Note (carried from V18.2 audit, still open):** the untouched-defaults scenario scores ~42/100, not the ~93% an older doc line implied; that figure referred to a specific saved scenario, not `DEFAULTS`. Pre-existing, unrelated to V18.2/V18.3 (engine math unchanged). Reconciliation deferred pending Cris's direction.

---

## V18.5 &mdash; Cross-screen consistency, tax relabel, input reorg, version hygiene

Batch of fixes from an external code review (findings independently verified against the code first).
**`engine.js` is UNCHANGED** &mdash; every change is in the adapter, the React UI, or docs. Zero Monte
Carlo math impact.

**Consistent odds across every screen (the review's top P1).** `real-engine.js`'s `runPaths()` re-rolled
`Math.random()` on every call, with no shared seed or cache, so the *same* plan showed slightly
different success % on each screen (Cover/Projection/Income&amp;Odds/Rework/Questionnaire/mobile) &mdash;
e.g. 39 vs 42 vs 44. Fix: `runPaths()` now activates the engine's **existing, already-trusted
deterministic RNG** (sets `_solverDeterministic` + a fixed `_solverSeedBase` and passes the loop index
as `solverPathIndex` to `simulatePath`). Same plan &rarr; identical paths &rarr; identical odds everywhere,
and Rework's filed-vs-proposed delta now reflects only the change made, not dice noise. `engine.js`
itself is untouched &mdash; we only switch on a code path it already had. **Disclosure:** a plan's displayed
score may shift a point or two vs. the old random draw (we fixed the dice instead of re-rolling);
statistically equivalent, now reproducible.

**TCJA toggle relabeled (copy only).** The 2017 cuts were made permanent by the 2025 budget law
(Public Law 119-21), so &ldquo;TCJA expires 2026&rdquo; was a counterfactual. Relabeled to **&ldquo;Assume
higher future tax rates&rdquo;** with a tooltip explaining it now stress-tests a *possible future* reversal
(desktop `cover-inputs.jsx`, mobile `cover-mobile.jsx`, tooltip `retire-ui.jsx`). Per Cris, the engine's
tax tables and the `2025 + i` start-year are intentionally **NOT** touched here &mdash; refreshing the
hardcoded 2025 brackets to current law remains a separate future item.

**Path-count copy now dynamic.** Adapter runs 1500 paths but copy said &ldquo;a thousand&rdquo; / &ldquo;1,000 paths.&rdquo;
`compute()` now returns `numPaths`; the two strings in `compass-cover.jsx` read from it, so the copy can't
drift again.

**Questionnaire reorg (desktop + mobile).** **Windfall** moved out of the bottom Advanced block into
**&ldquo;What you've saved&rdquo;** as an always-visible field. **Roth conversions** moved into the **Investments**
group (under &ldquo;Show more&rdquo;). The now-empty &ldquo;Windfall &amp; conversions&rdquo; sub-section was removed; the
Advanced &ldquo;Show N settings&rdquo; count dropped 18 &rarr; 12 on both layouts. No field logic changed &mdash; Windfall
and Roth conversions were already wired to the engine; this is pure relocation.

**Version hygiene (review P2).** All version strings reconciled to **18.5**: both HTML titles, every
`?v=` cache-buster (incl. `engine.js?v=`), the `real-engine.js` header (was V18.1), the saved-plan
JSON stamp (was frozen at 18.2), and the two on-screen cover kickers (were V18.4). **Note:** V18.4 shipped
to the live site without a changelog (this folder's stale git only goes to V18.1; real history is on
GitHub); 18.5 reconciles the drift. Saved plans now stamp `18.5`; older files stamped `18.2` still load
(the loader merges known keys; version is only a label). Provenance comments (&ldquo;added in V18.2/V18.4&rdquo;)
left as-is.

**Deferred to V18.6:** wire `legacyGoal` into the engine so &ldquo;money left at the end&rdquo; actually binds the
success test (today it is collected but ignored &mdash; the only finding that needs an engine change). Per
Cris the field stays **visible** in the interim rather than being hidden.

**Cache-buster:** `engine.js?v=18.5` + `?v=18.5` on all `cover-app/*` includes in both shells.
Source for the tax-law point: Congress.gov H.R.1 / Public Law 119-21.

---

## V18.6 &mdash; Cross-screen odds fully consistent + user-facing path-count control

Completes the V18.5 cross-screen consistency fix and adds a Monte Carlo path-count input.
**`engine.js` is UNCHANGED.**

**Income &amp; Odds now matches the headline.** V18.5's seeding made Cover/Questionnaire/Projection/Rework
agree (e.g. 40/100), but the Income &amp; Odds &ldquo;what each change is worth&rdquo; base still read 45,
because its `ScenarioCompareChart` used `quickSuccess()` at **300 paths** while every other screen used
**1500**. Live testing on the deployed V18.5 caught it. Fix: `numPaths` is now a **SINGLE SOURCE** &mdash;
added to `DEFAULTS` (1500) and read by BOTH `compute()` and `quickSuccess()` (`mapToReal(m, m.numPaths)`),
so every screen&rsquo;s odds use the same count and move together. Income &amp; Odds base now equals the cover.
**Cost:** that screen recomputes in ~1.8s (full count on all five bars) vs ~0.9s before &mdash; only that
screen, only when opened. Per Cris, accuracy over speed here.

**New &ldquo;Simulation paths&rdquo; input (Advanced &rarr; Market assumptions; desktop + mobile).** Range
500&ndash;5000, step 500, default 1500. It IS the single source above, so changing it moves the odds on
every screen in lockstep (Cris&rsquo;s explicit intent). Saved in the plan JSON (known key; older plans without
it default to 1500). Advanced count 12 &rarr; 13. Tooltip notes more paths = steadier estimate but slower;
default unchanged so out-of-box behavior is identical.

**Still fast internals (disclosed, not yet unified).** The cover&rsquo;s &ldquo;Three Moves, Ranked&rdquo; deltas
(`buildLevers`, 200 paths) and the sustainable-spending bisection (250 paths) remain deliberate speed
optimizations and do **not** scale with `numPaths` &mdash; they drive deltas/estimates, not the headline odds.
Because `buildLevers` measures move-deltas at 200 paths against the full-count base, a cover delta can differ
by a point or two from the same move on Income &amp; Odds (full count). **Flagged for a separate decision:**
unifying them would slow every screen&rsquo;s live recompute (compute() ~0.7s &rarr; ~1.6s), so it was not done
silently.

**Deferred to V18.7:** wire `legacyGoal` into the engine (Batch B). Field stays visible meanwhile.

**Cache-buster:** `engine.js?v=18.6` + `?v=18.6` on all `cover-app/*` includes; all version strings
(both HTML titles, `real-engine.js` header, saved-plan stamp, cover kickers) reconciled to 18.6. V18.5
shipped as commit 5f208d7; this is the fast-follow that completes finding #1.

---

## V18.7 &mdash; Legacy goal wired into scoring (adapter) + Cover lever deltas reconciled

**`engine.js` is UNCHANGED.** Both changes live in `real-engine.js` scoring only &mdash; we changed how the
already-simulated paths are graded, not how they are simulated. Zero Monte Carlo math impact.

**Legacy goal now binds the success test (flat target).** `legacyGoal` was collected but ignored. Now
`successOf(results, goal)` counts a path as a success only if it is solvent **and** its `finalBalance &ge;
goal`. Per Cris the goal is a **flat future-dollar amount** (not inflation-adjusted): the plan must finish
at or above the literal number entered. `finalBalance` is the engine&rsquo;s nominal end balance (sum of all
accounts at `endAge`), so this is the &ldquo;leave exactly $X at the finish line&rdquo; reading. **Default
`legacyGoal: 0` reproduces prior behavior exactly** &mdash; a solvent path always ends &ge; 0, so goal 0 is
the old solvent-only test (verified: DEFAULTS still 40/100). Threaded through every scorer &mdash; `compute()`
headline, `quickSuccess()` (Income &amp; Odds), `buildLevers` (cover moves), and the sustainable-spending
bisection &mdash; so a goal lowers the odds consistently on every screen and also shrinks the safe-to-spend
figure. **Implementation note:** this did NOT require an engine change after all, contrary to the earlier
V18.5/18.6 &ldquo;needs an engine change&rdquo; note &mdash; grading on `finalBalance` in the adapter is sufficient.

**Cover &ldquo;Three Moves&rdquo; deltas reconciled with Income &amp; Odds.** `buildLevers` measured each move at
200 paths but subtracted a 1500-path base, biasing the delta &mdash; the cover showed e.g. +26/+16/+12 while
Income &amp; Odds (full count) showed +23/+9/+5 for the same moves (up to 7 pts apart; caught in live testing,
not static review). Fix: `buildLevers` now measures its **base at the same 200 paths** as its moves, so each
delta is apples-to-apples and lines up with the full-count deltas (within ~1 pt). No performance change (still
200-path runs). The `buildLevers(m, real)` signature dropped the now-unused `baseRate` argument.

**Status:** the `legacyGoal` wiring earmarked for V18.7/Batch B is shipped. No remaining items from the
external code review.

**Cache-buster:** `engine.js?v=18.7` + `?v=18.7` on all `cover-app/*` includes; all version strings (both
HTML titles, `real-engine.js` header, saved-plan stamp, cover kickers) reconciled to 18.7.

---

## Repo Maintenance &mdash; 2026-06-15

Housekeeping only &mdash; **no app or engine changes** (V18.3 unchanged; `engine.js` untouched; zero Monte Carlo impact).

- **Removed superseded files from the repo** (still recoverable from git history): the pre-V18 monolithic builds `Retirement_Calculator_v15_6/v16_0/v16_1/v16_5.html`; the stale plans `V16_1_Improvement_Plan.md`, `v16.5-plan.md`, `v17-mobile-rewrite-plan.md`; and the `preview/` placeholder mockup (its content lives on in `cover-app/`). Verified the live app references none of these &mdash; `index.html`/`cover.html` load only `cover-app/*` + CDN.
- **Added `scripts/deploy.sh`** &mdash; originally the standard deploy path while the mounted folder's Git locks were broken. It performs Git work in a writable clone and pushes directly to `main`. As of V19.0 the local repository is repaired and aligned, so branch + pull request is standard and this script is fallback-only. It pins the commit identity to the GitHub no-reply email (`cristelo-sirc@users.noreply.github.com`).
- **Tightened `.gitignore`**: added `_archive/`, `data/`, `Retirement_Calculator_v*.html`, `.fuse_hidden*`.
- **Local-only tidy** (never on GitHub; `.gitignore` already excludes `*.md`/`*.json`): older version HTMLs, superseded planning docs, and the `handoff-07-cover/` design source moved to a local `_archive/` folder; personal-data JSONs moved to a gitignored `data/` folder.

**Update (V19.0):** the local `.git` history was safely reconciled with deployed V18.14, V19 was developed on
`codex/v19-completion`, merged through PR #1, and local `main` was fast-forwarded to the resulting release
checkpoint (`3f6b20e`). Local Git is once again the authoritative working copy.

---

## V18.8 &mdash; Monte Carlo default raised to 5,000, range to 10,000, internals proportional

**`engine.js` is UNCHANGED.** Every change is in the adapter (`real-engine.js`), the questionnaire UI, or docs.
Zero Monte Carlo math impact &mdash; this only changes how many already-trusted paths we run and how the two
helper estimates are sized.

**Default path count 1,500 &rarr; 5,000; user range 500&ndash;5,000 &rarr; 500&ndash;10,000.** `DEFAULTS.numPaths`
is now 5,000 and the `numPaths` input (desktop `cover-inputs.jsx` + mobile `cover-mobile.jsx`) tops out at
10,000 (min 500, step 500 unchanged). The three defensive `|| 1500` fallbacks in `real-engine.js` were
reconciled to 5,000. Per Cris: accuracy over speed, with a higher ceiling for anyone who wants an even
steadier read.

**The two internals are now PROPORTIONAL to the path count (the "proportionally" ask).** Previously the
cover's "Three Moves" deltas ran at a fixed 200 paths (`buildLevers`) and the sustainable-spending bisection
at a fixed 250. Both now scale as the same share of the active count they held against the old 1,500 default:
`lp = round(numPaths &times; 200/1500)` (&asymp;13.3%) for the levers and `bp = round(numPaths &times; 250/1500)`
(&asymp;16.7%) for the bisection, each floored at 50 (the floor never triggers within the 500&ndash;10,000
range). So at the 5,000 default they run ~667 and ~833; at 10,000, ~1,333 and ~1,667. This keeps the cover
deltas and the safe-to-spend figure apples-to-apples with the headline at **every** slider position &mdash;
including low settings, where the old fixed counts would have absurdly run *more* internal paths than the
headline itself. At the default both readings coincide; they only diverge once the slider moves, and
proportional is the one that stays consistent.

**Measured performance (live, on Cris's machine, pre-change baseline).** Timed real `compute()` /
`quickSuccess()` calls on the deployed app: cover recompute **0.25s / 0.56s / 1.01s** at 1,500 / 5,000 /
10,000 paths; the heaviest screen (Income &amp; Odds, 5&times; full count) **0.33s / 1.49s / 3.81s**. So the
5,000 default stays snappy (cover ~0.6s); only pushing the slider to the 10,000 ceiling makes Income &amp; Odds
noticeably heavier (~3.8s), and only while that screen is open. These supersede the stale ~0.9s/1.8s figures in
the V18.6 note (a slower/older baseline). Numbers are simulation time; on-screen redraw adds a small fixed
overhead that does not scale with paths.

**Diminishing returns, confirmed live.** The untouched-`DEFAULTS` sample scored **40 at 1,500, 42 at 5,000,
42 at 10,000** &mdash; the estimate has settled by 5,000, which is exactly why 5,000 is the new default and
10,000 is offered but rarely worth the wait. (Because the solver RNG is deterministically seeded, raising the
default nudges existing scores a point or two as the estimate converges &mdash; the same harmless shift
disclosed in V18.5.)

**Copy:** the `numPaths` tooltip (`retire-ui.jsx`) updated from &ldquo;1,500 is plenty&hellip;&rdquo; to
&ldquo;5,000 is plenty&hellip; raise it toward 10,000&hellip;&rdquo;. The cover/projection path-count copy was
already dynamic (reads `numPaths`), so it tracks automatically.

**Saved plans:** stamp is now `18.8`. Older plans that predate the `numPaths` key inherit the new 5,000
default; plans saved with an explicit `numPaths` keep their value (the old max was 5,000, so every existing
value is still within the new range). Version is only a label; the loader still merges known keys over
`DEFAULTS`.

**Cache-buster:** `engine.js?v=18.8` + `?v=18.8` on all `cover-app/*` includes in both shells; all version
strings (both HTML titles, `real-engine.js` header, saved-plan stamp, cover kickers) reconciled to 18.8. The
V18.7 provenance comment in `real-engine.js` is left as-is per convention.

---

## V18.9 &mdash; Hotfix: Projection no longer blanks at high path counts

**`engine.js` is UNCHANGED.** A single rendering-helper fix in `retire-charts.jsx`. No engine math, no
displayed numbers, no visual change &mdash; purely how one chart finds its vertical scale.

**Bug (regression exposed by V18.8).** `BalanceFanChart` (the Projection balance fan) computed its y-axis
ceiling with `Math.max(...results.paths.flatMap(p =&gt; p.path.map(pt =&gt; pt.balance)), 1)` &mdash; *spreading*
every path&rsquo;s every year into one function call. At the old 1,500-path default that was ~60k arguments,
just under the JS engine&rsquo;s argument/spread limit, so it worked. V18.8&rsquo;s 5,000 default &mdash; and a
10,000 setting &mdash; pushes it to ~200k&ndash;400k arguments, throwing `RangeError: Maximum call stack size
exceeded` *during render*. React then unmounts the whole tree, so the entire app goes blank when Projection is
opened. Latent bug, surfaced by raising the path count; the V18.8 live test missed it because the Projection
screen itself was never opened (the audit only exercised the engine and the questionnaire).

**Fix.** Replaced the spread with a plain scan that holds only one running maximum:
`let maxBal = 1; results.paths.forEach(p =&gt; p.path.forEach(pt =&gt; { if (pt.balance &gt; maxBal) maxBal =
pt.balance; }));`. Identical result (the largest balance, floored at 1), O(n), no giant argument list &mdash;
works at any path count. Chart is visually and numerically unchanged. The file&rsquo;s only other
`Math.max(...spread)` (`maxNeed`, over the per-year income array &asymp;40 values) is bounded and left as-is.

**Validation.** Deployed, then opened EVERY screen (Cover, Projection, Income &amp; Odds, Rework, Questionnaire)
against the **10,000-path** session &mdash; the exact count that was crashing &mdash; with the console open.
All five render (Projection&rsquo;s balance fan chart intact, desktop confirmed by screenshot), zero console
errors, no `RangeError`. The fix removes the array-spread entirely, so it is path-count-independent; 10,000 is
the worst case, so 5,000 and 1,500 pass trivially.

**Cache-buster:** `engine.js?v=18.9` + `?v=18.9` on all `cover-app/*` includes in both shells; all version
strings (both HTML titles, `real-engine.js` header, saved-plan stamp, cover kickers) reconciled to 18.9.

---

## V18.10 &mdash; Audit Pass 1 (app-only fixes from the 2026-06-27 external audit)

Pass 1 of a **two-pass** batch addressing `AUDIT_FINDINGS_AND_RECOMMENDATIONS.txt` (2026-06-27). Per Cris,
the audit's items were triaged: Pass 1 (this release) ships the **app-only** fixes &mdash; zero Monte Carlo
math change; the only `engine.js` edits are comments. Pass 2 (V18.11) will ship the **engine-math** items
(couple IRMAA per-person + 2-yr lookback, frozen-limit growth, paycheck reconciliation). Audit item 9
(production hardening) and "load enacted 2026 statutory values" are on `BACKLOG.md`.

**Item 1 &mdash; Social Security move is consistent across every screen (audit #6).** The "claim at 70" move
previously delayed **both** partners on the Cover and Income &amp; Odds but only the **primary** on Rework
(42 filed &rarr; 44 user-only vs 46 both). Now unified on **both partners** everywhere: Rework gained a
**"Spouse claims SS at"** dial (shown only for couples; `sc.spouseClaimAge` threaded through reset/anyChange/
publish), and its suggested move is relabeled **"Claim SS at 70 (both of you)"** and sets both claim ages.
Live-verified: tapping it moves both dials to 70 and the proposed score to **46**, matching Cover &amp;
Income &amp; Odds. The user SS dial is relabeled "You claim SS at" for couples. (`compass-cover.jsx`,
`real-engine.js`/`retire-charts.jsx` already used both.)

**Item 2 &mdash; headline label discloses the legacy goal (audit #9).** Success counts a path only if it is
solvent **and** finishes &ge; `legacyGoal`, but the headline always read "Chance of never running out." New
`cvChanceLabel(params)` (in `compass-cover.jsx`, exposed on `window`): at goal 0 it keeps the original copy;
at goal &gt; 0 it reads **"Chance of leaving $Xk or more."** Applied to the desktop cover kicker, the desktop
"futures succeed" reason body, and the mobile cover label (`cover-mobile.jsx`). Live-verified:
`cvChanceLabel({legacyGoal:500000})` &rarr; "Chance of leaving $500k or more".

**Item 3 &mdash; centralized validation + hard path-count ceiling (audit #5).** New
`window.MockEngine.normalizeParams(raw)` in `real-engine.js`: coerces each known field by its DEFAULT's type,
clamps numerics to a `RANGES` table, validates string enums, fixes age ordering (current &lt; retire &lt;
end; spouse), and **caps `numPaths` at 500&ndash;10,000** so a malformed file/localStorage can't freeze the
browser. Idempotent &mdash; an untouched DEFAULTS plan passes through unchanged (so the baseline is preserved,
verified). Wired into `compute()`, `quickSuccess()`, `CompassIO.parsePlan` (with a "values were adjusted"
load message), and the `localStorage` reads in both HTML shells. Unit-tested against the shipped file and
live: numPaths 90,000,000 &rarr; 10,000; ages 70/60/50 &rarr; 70/71/72; stock 250 &rarr; 100; bad enum &rarr;
default.

**Item 5 &mdash; RMD/FRA design-decision comments (audit #1, #2; engine.js COMMENTS ONLY).** Per Cris, the
hardcoded RMD age 75 and FRA 67 are a **conscious decision** (people born before 1960 aren't this tool's
planning audience), not bugs. Added explanatory comments at `getDistributionPeriod()` and `const FRA = 67`.
No logic change; `engine.js` math remains untouched.

**Item 8 &mdash; projection chart shows real percentiles (audit #8).** `BalanceFanChart` (`retire-charts.jsx`)
replaced the absolute **min&ndash;max** band + single median-**ending** path with true **per-year P10 / P50 /
P90** computed across all paths (new `rcPercentile` helper), the y-axis capped at the 90th percentile so rare
outliers no longer flatten the chart, and a caption stating the definition. Still array-safe (per-age sort, no
`Math.max(...spread)`), so the V18.9 high-path-count `RangeError` cannot recur &mdash; **live-verified no throw
at 10,000 paths**. Projection intro copy updated to match (median + P10&ndash;P90, not "most likely path").

**Validation (per audit standard).** Local: `node --check` on plain JS, Babel-transform of all five JSX files,
and a `normalizeParams` unit test against the shipped adapter. Deployed via `scripts/deploy.sh`, then
**live-tested on the GitHub Pages URL** at desktop (1680/1440) and the mobile component (Cover + Questionnaire):
default score **unchanged at 42** (regression gate), all five items confirmed, **zero console errors**, and the
user's saved `localStorage` plan was backed up and restored intact.

**Repo hygiene follow-up.** The Pass-1 deploy accidentally synced a local `node_modules/` (installed for the
JSX syntax check; the FUSE mount blocked deleting it pre-deploy). Removed from the repo with `git rm --cached`,
added `node_modules/` to `.gitignore`, and added `--exclude 'node_modules/'` to `scripts/deploy.sh` so it
cannot recur.

**Cache-buster:** `engine.js?v=18.10` + `?v=18.10` on all `cover-app/*` includes in both shells; all version
strings (both HTML titles, `real-engine.js` header, saved-plan stamp, cover kickers) reconciled to 18.10.
**`engine.js` math is UNCHANGED** (item 5 is comments only).

---

## V18.11 &mdash; Audit Pass 2: engine-math fixes + contribution accumulation bug

Pass 2 of the 2026-06-27 audit batch. **`engine.js` IS changed in this release** &mdash; the first intentional
math modification since the engine was written. Every change is in `engine.js` or the adapter (`real-engine.js`).
Zero UI changes; zero changes to `compass-cover.jsx`, `cover-inputs.jsx`, `cover-mobile.jsx`, `retire-charts.jsx`,
or `retire-ui.jsx` (beyond the version kicker).

**Critical pre-existing bug fixed: contributions were discarded every year.** This is the most impactful accuracy
correction in the app's history. The year-end balance reset used `userPreTax_startOfYear` (snapshotted *before*
contributions were added), so every year's employer/employee contributions were silently lost. A zero-starting
saver with a 50% savings rate accumulated $0 instead of ~$1.8M by age 64. Fix: the five reset lines now add
back `+ userPreTaxContrib`, `+ userRothContrib`, etc. after subtracting withdrawals. Impact on default score:
**41 &rarr; 61** (10 working years of contributions now count). Mid-career saver (age 45, 15% rate): **39 &rarr; 84**.
Already-retired plans (no contributions left): **unchanged** (correct).

**Item 4 (audit) &mdash; IRMAA per-person + 2-year lookback.** IRMAA was charged once per household regardless
of how many Medicare-eligible members there are. Fixed: `irmaa = calculateIRMAA(...) * medicareCount` where
`medicareCount` is the number of partners &ge; 65. The lookback now uses `magiHistory[i-2]` (the MAGI from two
years prior, per the SSA rule) rather than current-year MAGI. A `magiHistory[]` array is built across the year
loop and indexed per year.

**Item 6 (audit) &mdash; Contribution caps grow with inflation.** The 401(k) limits (`LIMIT_401K`,
`CATCHUP_401K`, `SUPER_CATCHUP_401K`) and the SS earnings limit were previously frozen in nominal dollars.
Now multiplied by `inflation` so real-dollar limits stay constant over the simulation. Effect only meaningful
now that contributions are no longer discarded (validated: savings rate 25% vs 50% produces same balance because
the cap binds at 25% &mdash; item 6 working correctly).

**Item 7 (audit) &mdash; Wages added to pathLog + paycheck reconciliation.** `wages: userNetSalary +
spouseNetSalary` added to every `pathLog` entry. The adapter paycheck now uses the household's fully-retired
year (max of user and spouse retirement indices) and includes wages as a segment. The paycheck total reconciles
to spending + taxes exactly: sources (SS + pension + wages + portfolio) + taxes = spending + taxes = total.
Verified to within $0.30/month rounding on the default scenario.

**Score disclosure.** The default DEFAULTS score rises from **42 (V18.10) to 61 (V18.11)** due to the
contribution fix. Any user whose plan includes working years will see a higher (more accurate) score on first
load. Plans with no remaining working years (already retired) are unchanged.

**Input Units note (carried forward).** All income inputs remain ANNUAL. `mortgagePayment` and `monthlyRent`
remain MONTHLY (adapter &times; 12). Unchanged from prior versions; documented here for cross-reference.

**Cache-buster:** `engine.js?v=18.11` + `?v=18.11` (or `?v=18.11b` for `compass-cover.jsx` after a
mid-deploy kicker fix) on all `cover-app/*` includes in both shells; all version strings (both HTML titles,
`real-engine.js` header, saved-plan stamp, cover kickers) reconciled to 18.11. `engine.js` math IS changed.

---

## V18.12 &mdash; Exact questionnaire entry

All numerical questionnaire values are directly editable on desktop and mobile while retaining the plus/minus
controls. Exact typed values no longer snap to the button increment. Shared parsing, validation, precision rules,
and automated tests live in `cover-app/numeric-entry.js` and `tests/numeric-entry.test.js`.

---

## V18.13 &mdash; V17 spending contract restoration + accumulation protection

The V18 interface had changed the meaning of two legacy inputs without changing the engine: it described annual
spending as including housing even though the engine adds housing separately, and it relabeled V17's combined
property-tax-and-homeowners-insurance amount as property tax alone. The questionnaire now restores the verified
V17 contract: `spending` excludes housing and healthcare; `mortgagePayment` is fixed monthly principal and
interest only; `propertyTax` stores combined annual property tax and homeowners insurance and continues after
payoff with general inflation.

Two unambiguous inherited engine issues are also corrected. Everyday spending and housing are no longer charged
while every household member is still working, and retirement healthcare waits until the covered person retires,
so these costs cannot silently draw from the portfolio during accumulation. Fixed mortgage principal and interest
no longer grows with inflation; rent and property tax plus insurance still do.

Executable regression coverage in `tests/financial-engine.test.js` verifies contribution persistence and growth,
no hidden working-year withdrawals, fixed mortgage payments, mortgage payoff, and continuing inflation-adjusted
property tax plus insurance.

The age-label/return-period convention and the single savings-rate/employer-match input remain unchanged pending a
separate whole-model decision; they were not silently redefined in this repair.

---

## V18.14 &mdash; Employee/employer split + 2026 statutory baselines

Employee and employer retirement contributions are now separate inputs for each person. Employee contributions
reduce take-home pay and receive pre-tax or Roth treatment according to the selected destination. Employer
contributions are modeled as traditional pre-tax money, grow the portfolio, and never reduce take-home pay.

The engine applies the 2026 workplace-plan limits independently: $24,500 employee deferral, $8,000 age-50
catch-up, $11,250 higher catch-up at ages 60&ndash;63, $72,000 annual additions excluding catch-up, and the
$360,000 eligible-compensation limit. The mandatory Roth catch-up rule above the $150,000 wage threshold uses
current annual salary as the available proxy because the questionnaire does not collect prior-year W-2 wages.

Federal ordinary-income and capital-gains brackets, standard deductions, the Social Security earnings-test
limit, and Medicare Part B plus Part D IRMAA thresholds/surcharges now use official 2026 baselines. Future
indexed tax thresholds use the questionnaire's tax-bracket growth assumption.

Executable tests verify employee/employer paycheck and portfolio effects, every contribution limit, high-earner
Roth catch-up treatment, exact tax and benefit thresholds, adapter propagation, and old saved-plan defaults.

---

## V19.0 &mdash; Explicit elapsed-year timeline + complete input coverage

The projection now distinguishes **cash-flow age** from **balance age**. Each engine row represents one annual
period `[age, age + 1)`: salary, contributions, retirement spending, Social Security, Medicare, pensions, RMDs,
housing, and conversions use `age`; the resulting portfolio uses `balanceAge = age + 1`. The loop runs
`endAge - currentAge` periods, not one extra inclusive period. The adapter prepends the exact entered portfolio
at `currentAge`, then charts each annual ending balance through `endAge`.

This fixes the inherited off-by-one convention: a plan from age 50 to 53 receives three returns, not four, and
today&rsquo;s displayed balance is not silently grown before it appears. Retirement cash flow begins in the period
whose starting age equals `retireAge`; Social Security, Medicare, RMDs, pension, mortgage payoff, and other age
events retain their named starting ages. `depletionAge` is the birthday whose ending balance reaches zero.

V19 also removes the remaining contribution-input shortcuts. `priorYearWages` and `spousePriorYearWages`
collect W-2 Box 3 wages for the first-year Roth catch-up test; later years use the prior modeled salary.
`employerContributionDest` and its spouse equivalent allow traditional pre-tax or Roth employer contributions.
Roth employer contributions do not reduce take-home pay but are included in current ordinary income.

`tests/input-coverage.test.js` enforces the user-input contract: every key in `MockEngine.DEFAULTS` must have an
editable control in both desktop and mobile questionnaires, and every rendered field must have a plain-English
help line plus a deeper tooltip in `FIELD_INFO`. Timeline invariants in `tests/financial-engine.test.js` verify
exact period counts and every important age boundary.

**Lessons from final verification.** The first input-coverage check looked only at controls that already declared
a `field` attribute, so it could not detect a control that omitted that attribute. Live browser testing caught the
missing &ldquo;Stocks by end&rdquo; explanation and the partner-retirement control borrowing the primary user&rsquo;s help.
The final check now parses every rendered input component, requires a help-field connection, and permits shared
help only through an explicit alias map. General rule: coverage must enumerate the consumer first, then prove its
mapping; it must not discover consumers only through the mapping being tested.

**Release validation.** V19.0 passed 24 executable checks plus every desktop screen and the phone Cover and
Questionnaire. Exact entry, tooltip taps, employer Roth selection, chart ages, saved-plan defaults, and browser
errors were checked locally and again on GitHub Pages. Released through PR #1; production and local `main` both
point to `3f6b20e`.
