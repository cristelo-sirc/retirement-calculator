# CLAUDE-legacy.md &mdash; Pre-V18 UI Reference (Archived)

This file archives documentation for the **legacy imperative-DOM front end** (v9.9&ndash;v17.6),
which V18.0 replaced with the React "Compass" app. The Monte Carlo **engine (`engine.js`) is
unchanged** and reused by the new app, so engine/math facts live in the main `CLAUDE.md`. The
material below describes UI architecture, render functions, DOM layouts, and mobile/iOS behaviors
that **no longer ship** &mdash; kept for reference and recoverable via git history (branch
`pre-reskin-v17.6`, commit a436eea).

Line numbers in the function table and elsewhere refer to the old file structure and are not
reliable against the current code.

---

## Architecture &amp; Data Flow (legacy)

### File Structure (v17.0)
- `index.html` &mdash; HTML structure, CSS (mobile-first base + desktop `@media (min-width: 769px)` enhancement), bottom sheet/nav wiring
- `engine.js` &mdash; All simulation logic, render functions, auto-save, tour, scenarios, levers. Loaded via `<script src="engine.js?v=<current version>">` before `</body>` (cache-buster &mdash; bump with every release)
- Reverting to single-file: copy engine.js contents back into index.html at the script tag location

### Mobile-First Layout (v17.0)
Base CSS targets 375px mobile. Key mobile elements: `app-header-mobile` (dark navy header with Edit Inputs button), `bottom-nav` (fixed 4-item nav: Dashboard/Charts/Reports/Scenarios), `bottom-sheet` (slide-up input editor). Desktop layout restored via `@media (min-width: 769px)` &mdash; shows top-nav, icon sidebar, input panel, hides mobile elements.

`openBottomSheet()` transfers `.input-scroll-area` and `.sidebar-footer` DOM nodes into `#bottomSheetBody`; `closeBottomSheet()` returns them. All 69 input elements, event listeners, and auto-save hooks preserved across transfers.

### Simulation Pipeline (legacy DOM consumers)
```
simulatePath(params) &rarr; pathLog[] &rarr; medianPathData[] &rarr; Dashboard (budget bars, charts)
                                       &rarr; lastSimulationResults.paths &rarr; Charts tab (charts, Year-by-Year table)
```

### Key Function Locations (v17.0 &mdash; engine.js ~6,200 lines, index.html ~9,200 lines)

Note: Line numbers below refer to `engine.js` unless prefixed with `index.html:`. Functions in engine.js shifted by ~-8700 lines compared to the old single-file references.

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
| `prepareChartData()` | ~8100 | Shared chart data extraction from simulation results |
| `renderPDFCharts()` | ~12000 | Offscreen PDF-optimized chart renderer (700&times;350px, DPR 3) |
| `generatePDF()` | 12042 | PDF report generation (synchronous, no setTimeout) |
| `getAllInputValues()` | 12468 | Generic input capture for auto-save |
| `applyLever()` | ~12670 | Applies lever changes to inputs, snapshots, re-runs simulation |
| `showLeverToast()` | ~12700 | Before/after success rate toast notification |
| `renderScenarioTray()` | 12683 | Scenario comparison tray |
| `renderScenarioComparisonTable()` | ~12750 | Side-by-side scenario metrics with delta indicators |
| `persistScenarios()` | ~13720 | Saves scenarios to localStorage |
| `loadPersistedScenarios()` | ~13730 | Restores scenarios from localStorage on load |
| `startTour()` | ~13800 | Initiates 6-step onboarding tooltip tour |
| `renderTourTooltip()` | ~13840 | Positions and renders individual tour step |
| `positionTourTooltip()` | ~13870 | Calculates tooltip placement via getBoundingClientRect |
| `toggleWizFeature()` | ~12901 | Wizard feature toggle on/off with section expand |
| `setWizFeatureState()` | ~12924 | Programmatic setter for wizard feature toggles |
| `showSetupWizard()` | ~12796 | Guided setup wizard modal |
| `populateWizardFromSidebar()` | ~12948 | Syncs sidebar values AND toggle states into wizard |
| `finishWizard()` | ~13040 | Applies wizard values and toggle states back to sidebar |

### Income Source Color Scheme (legacy &mdash; consistent across all legacy views)

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
.dashboard-hero-row (grid: 220px 1fr 280px, gap: 24px)
+-- .hero-gauge-card (220px, success rate gauge)
+-- .hero-lifespan-card (flexible middle)
|   +-- Progress bar with milestone dots
|   +-- 3 metric pills: Runway, Legacy (Today's $ toggle), Lifetime Tax
+-- .hero-inputs-card (280px, "Your Inputs" summary, 12 key/value rows)
```

---

## Feature Inventory (v15.4 snapshot)

Note: the V18.1 Questionnaire now exposes the full engine input set; this is the legacy snapshot.

**Core Inputs:** currentAge, retireAge, endAge, spouseAge, spouseRetireAge, numPaths

**Portfolio:** userPreTaxBalance, userRothBalance, spousePreTaxBalance, spouseRothBalance, taxableBalance, taxableGainRatio

**Income:** currentSalary, userSavingsRate, userSavingsDest, spouseCurrentSalary, spouseSavingsRate, spouseSavingsDest

**Social Security:** userSS (annual), userClaimAge, spouseSS (annual), spouseClaimAge, enableSpousalBenefit

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

## Auto-Save System (legacy `retirementArchitect_autoSave`)

Note: the V18 Compass app persists params to `localStorage['compassParams']`; importing the legacy auto-save plan is deferred.

- **Key:** `retirementArchitect_autoSave`
- **Interval:** 30 seconds, plus debounced on input (2s) and change (1s) events
- **On unload:** Saves via `beforeunload` event
- **Recovery:** Prompts user to restore if saved within 7 days AND has meaningful data (checks 8 key fields for non-zero values)
- **Capture method:** `getAllInputValues()` generically captures all inputs by ID &mdash; number/text values, checkbox checked states, radio selections, select values. New inputs with `id` attributes are automatically included.
- **Version migration:** `localStorage.getItem('retirementCalcVersion')` checked on load. Flag-only update (no data reset in v15.4).
- **Engine version:** Auto-save data stores `version: '9.9'` (simulation engine baseline, never changes). UI version (V15.4) stored separately.

---

## Legacy UI Learnings &amp; Pitfalls

### Data Consistency Is Critical
Any time a new data field is added to the simulation, it must be propagated to ALL consumers:
1. `pathLog.push({})` in `simulatePath()`
2. `lastSimulationResults.paths` mapping
3. Dashboard charts
4. Charts tab charts
5. Budget bars
6. Year-by-Year table

Deriving values (e.g., `withdrawal = spending - ss - pension`) instead of using actual simulation data leads to mismatches. Always use the source data. (The engine-side version of this lesson lives in the main `CLAUDE.md`.)

### Display Labels vs Internal Field Names
Chart/budget bar/legend labels are user-facing and can differ from internal field names:
- `wdPreTax` &rarr; "401k/IRA"
- `wdTaxable` &rarr; "Taxable"
- `wdRoth` &rarr; "Roth"

### Input Validation Prevents Downstream Bugs
`validateInputs()` gates `initiateSimulation()`. Catches impossible inputs before they reach the engine. More user-friendly than null guards deep in the code. (Legacy entry point; the V18 adapter calls `simulatePath` directly.)

### Reports Tab Needs Post-Simulation Refresh
`updateReportsView()` reads from Dashboard DOM elements. Must be called from the post-simulation render pipeline (after `renderYourStory()`), not just on tab switch, to avoid stale data.

### Inputs Summary Must Mirror Spouse Patterns
Every row in `renderInputsSummary()` that has a spouse equivalent must use the spouse-aware pattern: check `hasSpouse && spouseValue > 0`, show combined total with "You X + Spouse Y" detail. Audit against `collectInputs()` for spouse param existence when adding rows.

### Inputs Summary Is Display-Only
`renderInputsSummary()` reads from `params` and writes to a DOM element. No form inputs, no auto-save impact, no effect on simulation. Safe to modify without affecting calculations.

### DOM Element Dependencies (CRITICAL)
When removing HTML elements that JavaScript references, ALL code paths must be updated. Use scripted analysis (e.g., regex to extract all `getElementById` IDs from JS, compare against all `id=` in HTML) to find EVERY orphaned reference. Manual searching misses references. The v15.0 crash was caused by a single unguarded `.checked = false` on a removed checkbox.

**Pattern for safe element removal:**
1. Script-scan for all JS references to the element ID
2. Add null checks to every reference OR add hidden replacement element
3. If the element had interactive features, decide whether to relocate or remove

### Toggle Button Positioning
Placing interactive elements inside a container with `overflow: hidden` will clip them when the container collapses. Keep toggle buttons outside the collapsible container.

### Sidebar Has Split Background
`.input-panel` has dark background (`#0f172a`), but `.input-scroll-area` child has `background: white`. Labels need dark colors (`#334155`) for the white form area, not light colors designed for the dark panel. Only the `.panel-header` at top uses the dark background.

### Charts Tab: Separate Age Ranges per Chart
Portfolio Balance chart uses `allAges` (currentAge&rarr;endAge) with offset 0. Income Sources and other charts use `ages` (retireAge&rarr;endAge) with `retireOffset`. When extending one chart's range, create separate variables &mdash; do NOT change the shared `ages`/`retireOffset`.

### Lifespan Bar Must Align with Metric Pills
The hero lifespan card contains both the progress bar and the metric pills (Runway, Legacy, Lifetime Tax). The pills use median (P50) data, so the bar fill must also use P50 to avoid visual contradiction. P10 (poor markets) is shown as a secondary marker, not the primary bar state. When only P10 depletes but median survives, use a warning gradient with light amber hatching from the P10 wall.

### Milestone Label Collision Prevention
When milestone dots are close together on the lifespan bar, labels overlap. Use proximity-triggered alternation: scan sorted milestones, when consecutive pairs are within 5 years, flip the second label above the bar (CSS class `label-above`). This only activates when needed &mdash; well-spaced milestones all stay below.

### Wizard Feature Toggles Must Match Sidebar Toggles
Optional features in the wizard (Windfall, Part-Time, Spending Reduction, Guardrails, Glide Path, Roth Conversion) need explicit on/off toggle switches, not accordion open/closed as a proxy for enabled/disabled. The accordion pattern caused two bugs: (1) returning users saw enabled features as collapsed/off, and (2) `finishWizard()` would silently disable active features because it checked `.classList.contains('open')` instead of an actual toggle state. The fix uses dedicated wizard checkboxes (`wizEnableWindfall`, `wizEnableParttime`, etc.) synced bidirectionally with sidebar toggles via `setWizFeatureState()` and `populateWizardFromSidebar()`.

### Wizard Feature Toggle ID Mapping
Wizard feature sections use a naming convention: `wiz{Section}Toggle` (bar), `wizEnable{Section}` (checkbox), `wiz{Section}Section` (content). The `{Section}` name uses lowercase with first letter capitalized in IDs (e.g., `wizEnableWindfall`, `wizParttimeToggle`). The sidebar uses different naming (e.g., `enablePartTime` with camelCase). Always verify both sides of the mapping when adding new wizard features.

### Lever Apply &amp; Snapshot Coordination
`applyLever()` pushes a snapshot before modifying inputs, then sets `window._skipNextSnapshot = true` so `initiateSimulation()` doesn't push a second snapshot. Without this flag, Revert pops the wrong state (post-lever instead of pre-lever). The `_leverApplyCallback` hook runs after simulation completes to show the before/after toast.

### iOS Safe-Area Requires viewport-fit=cover
`env(safe-area-inset-bottom)` returns 0 unless the viewport meta tag includes `viewport-fit=cover`. This is a prerequisite for any safe-area-aware CSS. Added in v16.5.

### Fixed Bottom Nav Cascading Positioning
When a fixed bottom nav bar is added, ALL other fixed-bottom elements (FAB, toast, done bar) must account for the nav bar height + safe-area inset. Use `calc(56px + env(safe-area-inset-bottom) + margin)` pattern. Main content also needs matching `padding-bottom` to prevent content from hiding behind the nav bar.

### Horizontal Scroll Containers Need Visual Hints on Mobile
Mobile browsers hide scrollbars on overflow containers. Users may not realize content extends beyond the viewport. Use CSS `mask-image` or `::before`/`::after` gradient overlays toggled by scroll position classes (`fade-left`, `fade-right`) to signal scrollable content.

### iOS Safari backdrop-filter Creates Containing Block
`backdrop-filter` (and `-webkit-backdrop-filter`) creates a new containing block, making `position: fixed` children behave like `position: absolute`. On mobile wizard overlays, this prevents the wizard card from sizing to the full viewport. Fix: disable `backdrop-filter` on mobile and use a solid/semi-transparent background instead.

### iOS Safari vh Units Include Hidden Chrome
`100vh` (and `90vh`, etc.) includes the area behind Safari's URL bar and bottom toolbar, which are not visible. Elements sized with `vh` will overflow the visible area. Prefer `position: fixed; inset: 0` for full-viewport overlays on iOS, or use `dvh` units with `vh` fallback (cascade order matters &mdash; `vh` first, `dvh` second so `dvh` wins when supported).

### iOS Touch Scrolling: overflow-x scroll vs auto
On iOS Safari, `overflow-x: auto` sometimes fails to enable touch-based horizontal scrolling. Use `overflow-x: scroll` with `-webkit-overflow-scrolling: touch` for reliable behavior.

### Mobile-First Achieved (v17.0)
v17.0 rewrote the HTML/CSS mobile-first, replacing the v16.x desktop-first responsive approach. Base CSS targets 375px; desktop is a media query enhancement. iOS status bar overlap resolved in v17.3 via `100dvh` body height.

### Bottom Sheet DOM Node Transfer (v17.0)
`openBottomSheet()` moves `.input-scroll-area` and `.sidebar-footer` DOM nodes (not clones) from `#inputPanel` into `#bottomSheetBody`. This preserves all event listeners, form state, and auto-save hooks. `closeBottomSheet()` returns them. A `window.resize` handler auto-returns nodes to sidebar if viewport grows past 769px (orientation change safety). Guard: `window.innerWidth < 769` prevents transfer on desktop.

### Mobile Chart Type Selector (v17.0)
On mobile, Charts tab shows a 3&times;2 button grid (`selectChartType()`) that toggles visibility of individual chart cards via `mobile-hidden` class. Desktop CSS overrides make all cards always visible and hides the selector. The `activeChartType` variable tracks current selection.

### Scenario localStorage Persistence
Scenarios are stored under `retirementArchitect_scenarios` (separate from auto-save). Max 5 enforced at save time. Each scenario stores full `getAllInputValues()` plus computed results (`successRate`, `sustainableSpending`, `medianLegacy`, `lifetimeTax`, wall ages). `loadPersistedScenarios()` runs on `DOMContentLoaded`.

### Tour Tooltip Positioning
Tour tooltips use `getBoundingClientRect()` on the target element to calculate absolute position. On mobile, tooltips are forced to `position: fixed` with full-width layout. The tour only triggers on first simulation for users without `retirementArchitect_tourDismissed` in localStorage and without existing auto-save data.

### Offscreen Chart Rendering for PDF (v17.2)
PDF charts use a dedicated offscreen pipeline (`renderPDFCharts()`) that renders to a hidden 700&times;350px canvas (`#pdfRenderStage`), completely decoupled from the viewport. Key requirements:
- `responsive: false` is critical &mdash; without it, Chart.js tries to fit to the 0&times;0 offscreen parent
- `animation: false` makes rendering synchronous &mdash; `toDataURL()` is safe immediately after construction, eliminating the old 800ms setTimeout gamble
- `devicePixelRatio: 3` produces crisp text on mobile (375px canvas &rarr; 1125px captured PNG)
- DPR must be scoped within `renderPDFCharts()`, not set globally in `generatePDF()`, to prevent user interaction triggering screen charts at elevated DPR during any async window
- Tooltips disabled (`enabled: false`) since they serve no purpose in static images
- Chart.js plugins (e.g., retirement line) need unique IDs (`retirementLinePDF`) to avoid conflicts with screen chart plugin registrations

### Shared Chart Data Extraction (v17.2)
`prepareChartData()` extracts simulation data (ages, percentiles, income arrays, spending, tax) from `lastSimulationResults` into a shared object consumed by both `renderChartsViewCharts()` (screen) and `renderPDFCharts()` (PDF). This eliminated duplicate data extraction across 4 chart sections. When adding new chart data fields, update `prepareChartData()` once rather than both render functions.

### PDF Chart Layout Thresholds
Two-charts-per-page uses 280px image height. At 280px + 16px padding + 15px margin-bottom per chart + section title, two charts fit within a single html2pdf page. Going above ~320px risks page overflow. `page-break-inside: avoid` on `.pdf-charts-page` and html2pdf's `pagebreak.avoid` array both reference the same class &mdash; both mechanisms reinforce each other.

### Merging Async Functions Exposes Scope Conflicts
When `generatePDFContinue()` was merged back into `generatePDF()` (no longer needed after synchronous offscreen rendering), a duplicate `const btn` declaration surfaced that was previously hidden in separate function scopes. Always check for variable name collisions when collapsing split functions.

### Outcome Distribution Histogram Not in PDF
The 5th chart (Outcome Distribution histogram) is intentionally excluded from PDF capture. If added in the future, it needs entries in both `prepareChartData()` and `renderPDFCharts()`.

### PDF Print Color Palette
`renderPDFCharts()` uses slightly muted colors optimized for ink rendering (e.g., SS #4a8af5 vs screen #3b82f6). Screen charts are unchanged. The `#fafbfc` background on `.pdf-chart-box-full` is invisible on screen (`#pdfReport` is `display: none`) but provides subtle contrast in the PDF against white pages.

### Promise-Based Modal Pattern (v17.3)
Native `prompt()`/`confirm()` blocked the page and could not be driven by Chrome MCP. v17.3 replaced them with in-app modals (`showScenarioNameModal()`, `showRestoreSessionModal()`) that return Promises resolving when the user clicks a button. The restore modal resolves `true`/`false`; the naming modal resolves with the name string or `null`. Event listeners are added per-show and cleaned up on resolution to prevent stacking. For `checkAutoSave()`, the async flow means `startAutoSave()` is called in the `.then()` callback rather than at the end of the function.

### dvh Units Fix iOS Safari Viewport (v17.3)
`100vh` on iOS Safari includes the area behind the URL bar and bottom toolbar. `100dvh` (dynamic viewport height) excludes browser chrome. CSS cascade order matters: `height: 100vh` first (fallback), then `height: 100dvh` (wins when supported). This resolves the known cosmetic overlap issue from v17.0.

### Top Nav Has Light Background (v17.5)
The desktop `.top-nav` uses a white/light background with dark text (`#1e293b`). Any buttons styled for the nav must use dark text and visible borders against white &mdash; not `rgba(255,255,255,...)` which is invisible. The Guided Setup button was initially invisible after demotion because white text was used against the light nav.

### Version Badge Location (v17.5)
Version badge removed from both mobile header (`app-header-mobile`) and desktop header (`top-nav .brand`). Relocated to a `<div class="version-footer">` at the bottom of the Scenarios view. Title tag, PDF report header, PDF footer, and data export object still carry the version. When bumping versions, update: title tag, Scenarios footer, PDF report header, PDF footer, `engine.js` export object `version` field, `engine.js` localStorage migration check, AND the `engine.js?v=` cache-buster on the script tag in index.html (missing from this list pre-v17.6; without it browsers can serve a stale engine against new HTML).

### Report Buttons All Disabled Pre-Simulation (v17.5)
All three report download buttons (PDF, CSV, JSON) start `disabled` in HTML and are enabled by `updateReportsView()` after simulation. Previously JSON was always enabled, creating visual inconsistency.

### Empty Numeric Inputs Silently Become 0 (v17.6)
`getNumberValue()` returns 0 for a blank input (`parseFloat('') || 0`), and `validateInputs()` range checks pass 0 for fields where 0 is legal. Any always-used numeric input that ships `value=""` therefore runs the engine with a silent 0 &mdash; this is how a blank Stock Allocation produced an all-bond simulation labeled "70/30" (the Inputs Summary's `\|\| 0.7` display fallback masked it). Rules: (1) always-used numeric fields must ship a real default in the HTML; (2) `validateInputs()` should explicitly reject blank critical fields (check the RAW string, not `getNumberValue`); (3) never display a param via `\|\| <default>` when 0 is a legitimate value &mdash; show the actual value, and use `??` (not `\|\|`) for per-year arrays where 0 is meaningful.

### Async Modals Break Load-Time Ordering (v17.6)
v17.3 replaced blocking native dialogs with promise-based modals. Anything at load time that implicitly depended on the dialog having been ANSWERED before it ran &mdash; like the wizard's has-data check and the post-restore auto-run &mdash; silently broke, because the DOMContentLoaded handlers now run before the user clicks. Pattern: expose a settled-promise (`_autoSaveSettledPromise`, resolved on every checkAutoSave exit path) and have dependent load-time logic `.then()` on it. When converting any remaining blocking dialog to a modal, audit every load-time consumer of its outcome.

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
| v16.1 | Bug fixes from live testing: sticky Done bar for mobile input panel close, Escape key dismisses mobile overlay, lifespan label proximity threshold increased (5&rarr;8) with `<=` comparison, compute button visual loading state (gray + spinner). |
| v16.2 | Clickable improvement levers with Apply buttons (`applyLever()`), before/after success rate toast, `_skipNextSnapshot` flag for revert integration. Named scenario save &amp; compare (`savedScenarios[]`, `retirementArchitect_scenarios` localStorage key, max 5), comparison table with baseline deltas. 6-step onboarding tour (`tourSteps[]`, tooltip positioning via `getBoundingClientRect()`, `retirementArchitect_tourDismissed` localStorage key). |
| v16.3 | Outcome Distribution histogram on Charts tab &mdash; shows depleted vs. survived paths by age. Zero engine changes, uses existing `depletionAge` data. |
| v16.4 | UX polish: gauge card reduced from 280px to 220px, budget bar gap label clarified to "/yr shortfall" with tooltip, What-If empty state replaced with workflow guidance steps, lever cards show which inputs they change, scenario comparison table uses `table-layout: fixed` to eliminate horizontal scroll for 2&ndash;3 scenarios. |
| v16.5 | Mobile fix cycle: fixed bottom nav bar (replaces scroll-away top nav, z-index 1000), `viewport-fit=cover` + `env(safe-area-inset-bottom)` on nav/FAB/done bar/wizard footer/toast for iPhone notch/home indicator, scrollable wizard progress bar with fade-hint gradients and auto-scroll to active step, wizard mobile CSS (grids collapse to 1-column, reduced padding), FAB repositioned above bottom nav, toast repositioned above bottom nav. Hotfixes: wizard full-screen sheet (iOS `backdrop-filter` containing-block bug), progress bar `overflow-x: scroll` for iOS touch, sticky top nav with safe-area padding. **Known issue (resolved v17.3):** minor top-of-screen content overlap on iOS Safari &mdash; fixed via `100dvh` body height. Zero engine changes. |
| v17.0 | Mobile-first shell rewrite. File split: `engine.js` (6,200 lines) extracted from `index.html` (9,200 lines). HTML restructured mobile-first with base CSS targeting 375px. New elements: `app-header-mobile` (dark navy header + Edit Inputs button), `bottom-nav` (fixed 4-item nav: Dashboard/Charts/Reports/Scenarios), `bottom-sheet` (slide-up input editor with DOM node transfer of 69 inputs). Desktop layout restored via `@media (min-width: 769px)` &mdash; top-nav, icon sidebar, input panel, hero grid all preserved. Chart type 3&times;2 button grid on mobile (no horizontal scroll). v16.0&ndash;16.5 `@media (max-width: 768px)` blocks removed (styles moved to base). Zero engine changes. |
| v17.1 | PDF chart polish Phase 1: chart titles on all 4 PDF-captured charts, compact legends (pointStyle circle, boxWidth 8), horizontal axis labels (maxRotation 0, maxTicksLimit 10), devicePixelRatio 3 for mobile sharpness. Tax chart now identifiable without context. engine.js only, zero engine changes. |
| v17.2 | PDF offscreen render pipeline. `prepareChartData()` extracts shared chart data; `renderPDFCharts()` renders to hidden 700&times;350px canvas with `responsive: false`, `animation: false` (synchronous, no setTimeout). `generatePDFContinue()` eliminated. Print color palette for ink optimization. Two-charts-per-page layout (280px height), PDF reduced from 6 to 4 pages. Section titles: "Portfolio &amp; Income Projections" and "Spending &amp; Tax Analysis". |
| v17.3 | Native browser dialog replacement. Auto-save restore `confirm()` replaced with styled in-app modal (`showRestoreSessionModal()`, promise-based). Scenario naming `prompt()` replaced with in-app modal (`showScenarioNameModal()`, Enter/Escape key support). Both modals use dark card design matching app aesthetic. iOS Safari top overlap fix: `body` height changed from `100vh` to `100dvh` (with `vh` fallback) so viewport excludes Safari URL bar/status bar chrome. `app-header-mobile` already had `env(safe-area-inset-top)` padding from v17.0. Zero engine changes. |
| v17.5 | UX remediation (items 1&ndash;9). Mobile empty state copy now viewport-aware ("Edit Inputs" vs "sidebar"). Skip Setup converted from `<span>` to `<button>` (a11y). 76 info icons get `tabindex="0"`, `role="button"`, `aria-label`, keydown handler (a11y). Mobile nav "Settings" renamed to "Scenarios" with `ph-shuffle` icon. Guided Setup button demoted to subtle outline style. All 3 report download buttons disabled pre-simulation for visual consistency. Version badge removed from headers, relocated to Scenarios view footer. "INPUTS" section label added above sidebar icon nav to disambiguate input vs output navigation. Zero engine changes. |
| v17.6 | Input-integrity + restore-flow fixes from the 2026-06-10 audit. (1) Stock Allocation no longer ships blank: default `70` in sidebar + wizard fields; `validateInputs()` blocks a blank Stock Allocation, and blocks a blank Ending Stock Allocation when Glide Path is enabled (blank parsed silently to 0% stocks). Inputs Summary now shows the allocation the engine actually used (removed `\|\| 0.7` display fallback that showed "70/30" while the engine ran 0/100); falsy-zero `\|\|` fallbacks on stockAlloc display paths (chart tooltip data, `stockAllocations` mapping) changed to `??`. (2) Returning-user flow: setup wizard now waits for the restore-session decision via `_autoSaveSettledPromise` before its has-data check, fixing the v17.3 regression (wizard opened on top of the restore modal; post-restore auto-run + toast were unreachable; auto-save didn't start until the modal was answered). (3) CLAUDE.md corrected: SS inputs are ANNUAL, not monthly. (4) `.gitignore` now ignores `*.json` (personal data files in a public repo). Zero engine changes. |

**Archived HTML files kept for reference:** v9.9 (baseline), v14.8, v14.9, v14.9 013126, v15.1, v15.2, v15.3, v15.4, v16.5
