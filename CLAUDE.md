# CLAUDE.md &mdash; Retirement Architect

## Project Overview

Single-file HTML retirement planning calculator with Monte Carlo simulations. All HTML, CSS, and JS in one file (~14,530 lines).

**Current Version:** 16.0 (Mobile &amp; Accessibility)
**Project Location:** `/Users/cristelogarza/Claude Code/Retirement Calculator`
**GitHub Repo:** https://github.com/cristelo-sirc/retirement-calculator
**GitHub Pages:** https://cristelo-sirc.github.io/retirement-calculator/
**Tech Stack:** HTML5, CSS3, vanilla JS, Chart.js v3.9.1, localStorage for auto-save
**Encoding:** Use HTML entities (`&mdash;` `&rarr;` `&middot;`) not Unicode to prevent mojibake

## Working Style

- **User (Cris) does not code** &mdash; handle all implementation, testing, and validation
- **No code changes without explicit approval** &mdash; propose plan with scope, rationale, risks, validation steps, and alternatives first
- **When multiple approaches exist**, present options with trade-offs (accuracy, complexity, maintainability, performance, UX), recommend one, wait for approval
- **Accuracy is non-negotiable** &mdash; any potential inaccuracy must be disclosed with safer alternatives
- **Verify changes work before delivering**
- **Maintain standard versioning** with clear increments and change logs; no silent changes
- **Claude is responsible for all testing** &mdash; Cris does not test. After every change, Claude must deploy (push to GitHub), then conduct live browser testing against the GitHub Pages URL via Chrome MCP. This includes interacting with UI elements, verifying visual output, and testing at both desktop (1680px) and mobile (375px) viewports. Do not mark a task complete until live browser testing passes.

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
6. Version increment with systematic updates to ALL version references (title, badge, report header, PDF footer, data export object, localStorage migration)

---

## Architecture &amp; Data Flow

### Simulation Pipeline
```
simulatePath(params) &rarr; pathLog[] &rarr; medianPathData[] &rarr; Dashboard (budget bars, charts)
                                       &rarr; lastSimulationResults.paths &rarr; Charts tab (charts, Year-by-Year table)
```

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

### Tax Convergence Loop (~line 9204)
Five-iteration convergence loop:
1. Calculate available cash (salary + SS + pension + part-time + RMD)
2. Calculate gap = totalNeed + iterationTax - availableCash
3. Waterfall withdrawals: Taxable &rarr; Pre-Tax (by age) &rarr; Roth
4. Calculate ordinary income from all sources
5. Calculate taxable SS, IRMAA, federal/cap gains/NIIT/state tax
6. Check convergence (diff < $1 or max 5 passes)

### Key Function Locations (v16.0, ~14,530 lines)

| Function | ~Line | Purpose |
|----------|-------|---------|
| `gaussianRandom()` | 7950 | Normal distribution random draws |
| `mulberry32()` | 7971 | Deterministic seeded PRNG for solver |
| `updateChartsView()` | 8074 | Switches to Charts tab view |
| `renderChartsViewCharts()` | 8165 | Renders all Charts tab charts |
| `calculatePercentiles()` | 8358 | P10/P50/P90 percentile calculation |
| `toggleInputPanel()` | 8434 | Sidebar collapse/expand |
| `getDistributionPeriod()` | 8532 | RMD distribution period table (ages 75&ndash;110) |
| `calculateSSBenefit()` | 8546 | Social Security benefit with tiered early claiming |
| `calculateSpousalBenefit()` | 8580 | Spousal SS benefit calculation |
| `calculateOwnBenefitAtClaiming()` | 8609 | SS benefit at specific claim age |
| `calculateFederalOrdinaryTax()` | 8661 | Federal income tax brackets |
| `calculateTaxableSS()` | 8693 | Taxable portion of SS income |
| `calculateCapGainsTax()` | 8723 | Capital gains tax |
| `calculateNIIT()` | 8756 | Net Investment Income Tax |
| `calculateStateTax()` | 8765 | State income tax |
| `calculateIRMAA()` | 8773 | Medicare IRMAA surcharge |
| `validateInputs()` | 8794 | Input validation gate (blocks simulation on error) |
| `collectInputs()` | 8889 | Single source of truth for all param names |
| `simulatePath()` | 8974 | Core Monte Carlo simulation engine |
| `generateKeyObservations()` | 9354 | Contextual insights from simulation results |
| `initiateSimulation()` | 9441 | Entry point for Compute button |
| `updateSolverTracker()` | 9674 | Goal solver current-settings display |
| `calculateSustainableSpending()` | 9990 | Binary search solver for target success rate |
| `togglePresetScenario()` | 10093 | What-if scenario toggles |
| `renderCharts()` | 10542 | Dashboard Income Sources chart |
| `renderTable()` | 10728 | Year-by-Year data table |
| `calculateWallAges()` | 10805 | Wall age calculation (poor/average markets) |
| `renderYourStory()` | 10822 | Dashboard orchestrator function |
| `renderHeroLifespan()` | 10901 | Lifespan progress bar with milestone dots |
| `updateHeroMetrics()` | 10995 | Runway, Legacy, Lifetime Tax pills |
| `renderCompactBudget()` | 11021 | Today vs Retirement spending comparison |
| `renderPaycheckMirror()` | 11045 | **DEAD** &mdash; replaced by renderCompactBudget |
| `renderInputsSummary()` | 11113 | Inputs summary card (12 key fields, spouse-aware) |
| `renderBudgetBars()` | 11209 | Income source breakdown bars by milestone |
| `calculateLevers()` | 11440 | Improvement lever calculations |
| `calculateOpportunities()` | 11564 | Opportunity calculations |
| `renderLeversOrOpportunities()` | 11620 | Improvement suggestions display |
| `renderProgressBar()` | 11729 | **DEAD** &mdash; replaced by renderHeroLifespan |
| `renderWallInsights()` | 11868 | Poor/Average markets insight boxes |
| `exportData()` | 11934 | JSON data export |
| `exportForAI()` | 11947 | AI-formatted data export |
| `generatePDF()` | 12042 | PDF report generation |
| `getAllInputValues()` | 12468 | Generic input capture for auto-save |
| `renderScenarioTray()` | 12683 | Scenario comparison tray |
| `toggleWizFeature()` | ~12901 | Wizard feature toggle on/off with section expand |
| `setWizFeatureState()` | ~12924 | Programmatic setter for wizard feature toggles |
| `showSetupWizard()` | ~12796 | Guided setup wizard modal |
| `populateWizardFromSidebar()` | ~12948 | Syncs sidebar values AND toggle states into wizard |
| `finishWizard()` | ~13040 | Applies wizard values and toggle states back to sidebar |

### Income Source Color Scheme (consistent across all views)

| Source | Color | Hex |
|--------|-------|-----|
| Social Security | Blue | #3b82f6 |
| Pension | Green | #10b981 |
| Part-Time Work | Amber | #f59e0b |
| RMD | Violet | #a855f7 |
| Taxable Withdrawal | Cyan | #06b6d4 |
| 401k/IRA Withdrawal | Purple | #8b5cf6 |
| Roth Withdrawal | Pink | #ec4899 |

---

## Dashboard Layout (v15.4)

### Render Pipeline
```
renderYourStory()
  &rarr; calculateWallAges()
  &rarr; calculateSustainableSpending()
  &rarr; renderHeroLifespan(walls)
  &rarr; updateHeroMetrics()
  &rarr; renderWallInsights(walls)
  &rarr; renderCompactBudget(walls)
  &rarr; renderBudgetBars()
  &rarr; renderInputsSummary()
  &rarr; renderLeversOrOpportunities()
  &rarr; GSAP animations
updateReportsView()          // Always refresh Reports data post-simulation
```

### Hero Row Layout
```
.dashboard-hero-row (grid: 280px 1fr 280px, gap: 24px)
+-- .hero-gauge-card (280px, success rate gauge)
+-- .hero-lifespan-card (flexible middle)
|   +-- Progress bar with milestone dots
|   +-- 3 metric pills: Runway, Legacy (Today's $ toggle), Lifetime Tax
+-- .hero-inputs-card (280px, "Your Inputs" summary, 12 key/value rows)
```

---

## Feature Inventory

All features present in v15.4. This is the complete set of configurable inputs and toggles:

**Core Inputs:** currentAge, retireAge, endAge, spouseAge, spouseRetireAge, numPaths

**Portfolio:** userPreTaxBalance, userRothBalance, spousePreTaxBalance, spouseRothBalance, taxableBalance, taxableGainRatio

**Income:** currentSalary, userSavingsRate, userSavingsDest, spouseCurrentSalary, spouseSavingsRate, spouseSavingsDest

**Social Security:** userSS (monthly), userClaimAge, spouseSS (monthly), spouseClaimAge, enableSpousalBenefit

**Pension:** pension (annual), pensionAge, spousePension (annual), spousePensionAge, enablePensionCOLA, enableSpousePensionCOLA

**Part-Time Work:** enablePartTime, partTimeIncome, partTimeStartAge, partTimeEndAge

**Windfall:** enableWindfall, windfallAmount, windfallAge

**Roth Conversion:** enableRothConversion, rothConversionAmount, rothConversionStartAge, rothConversionEndAge

**Spending:** lifestyleSpending, lifestyleInflation, enableSpendingReduction, spendingReductionAge, spendingReductionPercent

**Guardrails (Guyton-Klinger style):** enableGuardrails, guardrailCeiling, guardrailFloor, guardrailAdjustment

**Market Assumptions:** stockAllocation, enableGlidePath, endingStockAllocation, stockReturn, stockVol, bondReturn, bondVol

**Tax:** bracketGrowth, enableTCJASunset, stateTaxRate

**Housing:** housingType (own/rent), mortgagePrincipal, mortgageLastAge, propertyTax, monthlyRent

**Healthcare:** healthcarePre65, healthcare65, healthcareInflation

---

## Auto-Save System

- **Key:** `retirementArchitect_autoSave`
- **Interval:** 30 seconds, plus debounced on input (2s) and change (1s) events
- **On unload:** Saves via `beforeunload` event
- **Recovery:** Prompts user to restore if saved within 7 days AND has meaningful data (checks 8 key fields for non-zero values)
- **Capture method:** `getAllInputValues()` generically captures all inputs by ID &mdash; number/text values, checkbox checked states, radio selections, select values. New inputs with `id` attributes are automatically included.
- **Version migration:** `localStorage.getItem('retirementCalcVersion')` checked on load. Flag-only update (no data reset in v15.4).
- **Engine version:** Auto-save data stores `version: '9.9'` (simulation engine baseline, never changes). UI version (V15.4) stored separately.

---

## Learnings &amp; Pitfalls

### Data Consistency Is Critical
Any time a new data field is added to the simulation, it must be propagated to ALL consumers:
1. `pathLog.push({})` in `simulatePath()`
2. `lastSimulationResults.paths` mapping
3. Dashboard charts
4. Charts tab charts
5. Budget bars
6. Year-by-Year table

Deriving values (e.g., `withdrawal = spending - ss - pension`) instead of using actual simulation data leads to mismatches. Always use the source data.

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

### Input Units Vary: Annual vs Monthly
Pension inputs (`params.pension`, `params.spousePension`) are **annual** amounts. Social Security inputs (`params.userSS`, `params.spouseSS`) are **monthly** amounts requiring `* 12` for annual display. Always check input field labels before applying multipliers.

### Tax-Aware Display vs Blanket Ratios
When showing net (after-tax) income segments in budget bars, Roth withdrawals display at full value (tax-free). Only taxable sources (SS, Pension, Part-Time, RMD, Taxable, Pre-Tax) share the tax burden via `taxableNetRatio`. This is display-level only &mdash; the simulation engine correctly handles Roth as untaxed.

### DOM Element Dependencies (CRITICAL)
When removing HTML elements that JavaScript references, ALL code paths must be updated. Use scripted analysis (e.g., regex to extract all `getElementById` IDs from JS, compare against all `id=` in HTML) to find EVERY orphaned reference. Manual searching misses references. The v15.0 crash was caused by a single unguarded `.checked = false` on a removed checkbox.

**Pattern for safe element removal:**
1. Script-scan for all JS references to the element ID
2. Add null checks to every reference OR add hidden replacement element
3. If the element had interactive features, decide whether to relocate or remove

### Param Name Consistency
Never invent param names in render functions. Always verify against `collectInputs()` which is the single source of truth. Use `params.lifestyleSpending` for current spending. There is no `desiredSpending` param &mdash; use `sustainableSpendingResult` (solver output) for the retirement spending level.

### Display Labels vs Internal Field Names
Chart/budget bar/legend labels are user-facing and can differ from internal field names:
- `wdPreTax` &rarr; "401k/IRA"
- `wdTaxable` &rarr; "Taxable"
- `wdRoth` &rarr; "Roth"

### Toggle Button Positioning
Placing interactive elements inside a container with `overflow: hidden` will clip them when the container collapses. Keep toggle buttons outside the collapsible container.

### Sidebar Has Split Background
`.input-panel` has dark background (`#0f172a`), but `.input-scroll-area` child has `background: white`. Labels need dark colors (`#334155`) for the white form area, not light colors designed for the dark panel. Only the `.panel-header` at top uses the dark background.

### Charts Tab: Separate Age Ranges per Chart
Portfolio Balance chart uses `allAges` (currentAge&rarr;endAge) with offset 0. Income Sources and other charts use `ages` (retireAge&rarr;endAge) with `retireOffset`. When extending one chart's range, create separate variables &mdash; do NOT change the shared `ages`/`retireOffset`.

### Inputs Summary Must Mirror Spouse Patterns
Every row in `renderInputsSummary()` that has a spouse equivalent must use the spouse-aware pattern: check `hasSpouse && spouseValue > 0`, show combined total with "You X + Spouse Y" detail. Audit against `collectInputs()` for spouse param existence when adding rows.

### Taxable Account Tax Drag Is Real
A 100% taxable portfolio with 60% gain ratio loses ~10&ndash;15% of every withdrawal to capital gains tax + NIIT + state tax. For $1M taxable-only with $70k spending over 30 years, 0% success is mathematically correct.

### Input Validation Prevents Downstream Bugs
`validateInputs()` gates `initiateSimulation()`. Catches impossible inputs before they reach the engine. More user-friendly than null guards deep in the code.

### Reports Tab Needs Post-Simulation Refresh
`updateReportsView()` reads from Dashboard DOM elements. Must be called from the post-simulation render pipeline (after `renderYourStory()`), not just on tab switch, to avoid stale data.

### Inputs Summary Is Display-Only
`renderInputsSummary()` reads from `params` and writes to a DOM element. No form inputs, no auto-save impact, no effect on simulation. Safe to modify without affecting calculations.

### Lifespan Bar Must Align with Metric Pills
The hero lifespan card contains both the progress bar and the metric pills (Runway, Legacy, Lifetime Tax). The pills use median (P50) data, so the bar fill must also use P50 to avoid visual contradiction. P10 (poor markets) is shown as a secondary marker, not the primary bar state. When only P10 depletes but median survives, use a warning gradient with light amber hatching from the P10 wall.

### Milestone Label Collision Prevention
When milestone dots are close together on the lifespan bar, labels overlap. Use proximity-triggered alternation: scan sorted milestones, when consecutive pairs are within 5 years, flip the second label above the bar (CSS class `label-above`). This only activates when needed &mdash; well-spaced milestones all stay below.

### Wizard Feature Toggles Must Match Sidebar Toggles
Optional features in the wizard (Windfall, Part-Time, Spending Reduction, Guardrails, Glide Path, Roth Conversion) need explicit on/off toggle switches, not accordion open/closed as a proxy for enabled/disabled. The accordion pattern caused two bugs: (1) returning users saw enabled features as collapsed/off, and (2) `finishWizard()` would silently disable active features because it checked `.classList.contains('open')` instead of an actual toggle state. The fix uses dedicated wizard checkboxes (`wizEnableWindfall`, `wizEnableParttime`, etc.) synced bidirectionally with sidebar toggles via `setWizFeatureState()` and `populateWizardFromSidebar()`.

### Wizard Feature Toggle ID Mapping
Wizard feature sections use a naming convention: `wiz{Section}Toggle` (bar), `wizEnable{Section}` (checkbox), `wiz{Section}Section` (content). The `{Section}` name uses lowercase with first letter capitalized in IDs (e.g., `wizEnableWindfall`, `wizParttimeToggle`). The sidebar uses different naming (e.g., `enablePartTime` with camelCase). Always verify both sides of the mapping when adding new wizard features.

---

## Version History (Summary)

| Version | Key Changes |
|---------|-------------|
| v9.9 | Mathematically verified Monte Carlo baseline |
| v14.8 | Dark sidebar, card styling, typography refresh, budget bars |
| v14.9 | Withdrawal breakdown by account type (`wdTaxable`/`wdPreTax`/`wdRoth`), pension COLA toggle, data consistency across all views, tax-aware budget bar segments |
| v15.0 | Dashboard reorg: hero row (gauge + lifespan + metrics), wall insights, compact budget. Crash fix for removed DOM elements. |
| v15.1 | Seven bug fixes from formal test plan: SS double-inflation fix, SSA tiered early claiming, RMD start age correction, input validation gate, unguarded simulationResults[0], housingType null guard, PDF null guards. Reports post-simulation refresh. |
| v15.2 | Portfolio Balance chart extended to currentAge with retirement line plugin. Inputs Summary card added to hero row. Pension row spouse-awareness fix. Sidebar label contrast fix. |
| v15.3 | RMD start age corrected to 75 (SECURE 2.0, born 1960+). Stock-bond correlation via Cholesky decomposition (&rho; = -0.3). Expanded input validation (return/volatility bounds, mortgage/Roth/part-time conditional checks). |
| v15.4 | Lifespan bar aligned to median (P50) instead of P10. Dual wall markers: P10 "Poor Mkts" (red) + P50 "Avg Mkts" (orange). Proximity-triggered label alternation (above/below bar) to prevent label collisions. Wizard feature toggles replaced accordion-as-proxy pattern with explicit on/off switches synced to sidebar. |
| v15.5 | Focus accessibility (`:focus-visible` rings, Escape key closes modals, focus trap in wizard/solver). Chart tooltips on all 4 Charts tab charts. Zoom/pan on Portfolio Balance chart. Clickable wizard steps with bidirectional navigation. Compute vs Solver button hierarchy. |
| v15.6 | Click-to-toggle tooltips (77 info icons converted from hover). Revert to Last Run (3-snapshot undo stack, `inputSnapshots[]`). |
| v16.0 | Mobile responsive layout (`@media max-width: 768px`): icon rail hidden, sidebar becomes full-screen overlay via FAB button, hero row stacks vertically, charts single-column, sticky table first column, mobile nav bar. ARIA: gauge `role="meter"`, lifespan `role="progressbar"`, dynamic `aria-label` on metric pills and budget bar segments. |

**Archived files kept for reference:** v9.9 (baseline), v14.8, v14.9, v14.9 013126, v15.1, v15.2, v15.3, v15.4

---

## Token Management
- Keep responses succinct
- Alert at 75% context capacity before compaction needed
