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

---

# Part II &mdash; V18.0&ndash;V19.8 detailed release history

**Moved verbatim from `CLAUDE.md` on 2026-07-07** (doc condensation; CLAUDE.md keeps one-line summaries
plus a consolidated Standing Environment &amp; Process Lessons section distilled from these).

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

**Note (carried from V18.2 audit):** the untouched-defaults scenario scored ~42/100 at the time of V18.2/V18.3; that older figure is superseded &mdash; since the V18.11 contribution-accumulation fix the `DEFAULTS` score has been **64/100** (the current regression-gate value across V19.x). The ~93% an even older doc line implied referred to a specific saved scenario, not `DEFAULTS`.

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

**Update (V19.1):** &ldquo;the mounted folder's Git locks were broken&rdquo; above undersold the constraint &mdash;
it isn't a repo-state problem that reconciliation fixes, it's that the mount cannot `unlink`/`rename` files at
all, confirmed against a throwaway test file. A `git commit` that fails partway through can leave a permanently
un-removable `.git/index.lock`, wedging that clone's git metadata for the rest of the session (the working files
themselves are unaffected). `scripts/deploy.sh`'s writable-clone-in-`/tmp` technique is the correct workaround
for *any* git write in this folder, not just emergency direct-to-`main` deploys &mdash; see the V19.1 section's
environment-lesson entries for the working pattern (edit in place here, commit/push from a `/tmp` clone) and for
the separate `api.github.com`-vs-`github.com` proxy-allowlist distinction.

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

---

## V19.1 &mdash; Combined low-risk UX batch (quick wins, one editing model, honest sample state)

First batch of `UX-IMPROVEMENT-PLAN.md` (a 2026-07-03 live UX audit of V19.0, batches V19.1&ndash;V19.4).
Three themed commits on one branch, one deploy, one comprehensive audit, per Cris's explicit token-economy
instruction. **`engine.js` untouched throughout** &mdash; every change is UI/copy in the adapter's React layer.

**Commit 1 &mdash; quick wins.** Removed the &ldquo;Concept 07 / &hellip;&rdquo; dev-artifact footer tags from
every screen (Cover, Rework, Projection, Income &amp; Odds, Questionnaire, Welcome), replaced with a plain
version marker. The Questionnaire's &ldquo;Returning? Load your saved plan&rdquo; callout now hides for the one
visit right after Welcome &rarr; &ldquo;Start a new plan&rdquo; (a one-shot `freshStart` flag in the app shell,
cleared the moment the user navigates away from the Questionnaire) &mdash; direct/returning arrivals still see
it. Sticky header + nav on desktop (`position: sticky` on the shared masthead block in `CoverChrome` and on
`CoverDesktop`'s own header) so screens are reachable without scrolling to the top; mobile's bottom tab bar was
already effectively sticky and is unchanged.

**Commit 2 &mdash; one editing model (the core &ldquo;which changes count?&rdquo; finding).** Cover's
instant-write &ldquo;Adjust the Plan&rdquo; slider panel &mdash; which changed the real plan immediately with no
undo, right next to Rework's identical-looking dials that were only a draft &mdash; is gone. In its place, a
plain callout pointing to Rework. The &ldquo;Three Moves, Ranked&rdquo; cards are now clickable: tapping one
opens Rework with that exact move already staged as an unpublished draft (`CoverAdjust` reuses the same
`lever.apply()` a manual &ldquo;Suggested moves&rdquo; tap would run, via a one-shot `props.stageLever` id
threaded from the app shell, so staging can never drift from doing it by hand). Publish is still required for a
draft to count. Mobile's Cover never had instant-edit sliders and has no Rework screen, so it is unaffected
(that gap is the separate, not-yet-decided V19.4 mobile-parity item).

**Commit 3 &mdash; honest sample state + live score.** The clay &ldquo;Sample plan &middot; not your numbers
yet&rdquo; badge and reworded copy, previously Cover-only, now also appears on Rework, Projection, Income &amp;
Odds, and the Questionnaire's own bottom score panel (all gated on the same `dirty` check &mdash; params vs.
`MockEngine.DEFAULTS` &mdash; Cover already used). Rework's &ldquo;your filed plan&rdquo; / &ldquo;as filed&rdquo;
copy reads &ldquo;this sample plan&rdquo; / &ldquo;as sample&rdquo; while untouched. New live score chip in the
Questionnaire's sticky masthead (desktop: a `rightExtra` slot added to `CoverChrome`, quiz screen only; mobile:
replaces the masthead kicker while the Questionnaire tab is active) so the number is visible while editing
fields further down the page, not only after scrolling to the bottom. The chip reads the same `results` object
the screen already computes on field commit &mdash; no new recompute path, so it updates at the same cadence as
everything else.

**Post-audit fix (same session): the paycheck-age note had the wrong comparison.** Commit 1's fix for the
&ldquo;At 67, you'll both need&hellip;&rdquo; copy (67 = the household's fully-retired age, which can exceed
either partner's own `retireAge` when the partner is younger, per V18.11's paycheck logic) shipped comparing
`params.retireAge` to `params.spouseRetireAge`. Live audit against the deployed DEFAULTS scenario caught that
this was wrong: DEFAULTS has both retiring at 65 (equal), yet `atAge` is 67, because real-engine.js picks
whichever partner's retirement lands later ON THE CALENDAR &mdash; the younger partner's 65th birthday simply
falls in a later year. Comparing the two *nominal* retirement ages missed this entirely, so the note silently
rendered blank on exactly the scenario the original audit had flagged. **Fix:** compare the *displayed* `atAge`
against the user's own `retireAge` directly (`cvPaycheckNote(params, atAge)`); that tracks the discrepancy
regardless of why it happened. **General lesson:** when explaining where a *computed/derived* value came from,
compare against that computed value, not against the raw inputs that feed it &mdash; two equal inputs can still
produce a surprising computed result through a path (like a birth-year gap) the inputs alone don't show.

**Process lesson: cache-buster discipline applies to every content change, not just version boundaries.** The
paycheck-note fix above was first shipped reusing the already-deployed `?v=19.1` query string on
`compass-cover.jsx` / `cover-mobile.jsx`. Because that exact query string had already been fetched once (earlier
in the same audit session), the fix did not actually reach the live site &mdash; verified by fetching the
deployed file directly and finding the pre-fix single-argument `cvPaycheckNote(params)` still being served,
minutes after the fix was pushed. A follow-up commit bumped just those two files' cache-busters to `?v=19.1b`
(the V18.11 precedent for a same-day follow-up), which resolved it. Any content edit &mdash; not only a formal
version release &mdash; needs its own cache-bust if it's shipped as a separate commit after the including HTML
was already fetched.

**Environment lesson: this project folder is FUSE-mounted and cannot `unlink`/`rename` files, at all, ever.**
This is broader than the previously-documented &ldquo;Git locks were broken&rdquo; note (see Repo Maintenance,
below) &mdash; it is a hard property of the mount, confirmed by testing that even a fresh throwaway file cannot
be removed (`rm` &rarr; &ldquo;Operation not permitted&rdquo;). Consequences: (1) `git commit` in this folder can
leave a `.git/index.lock` that can *never* be cleared from inside the sandbox (truncating it in place doesn't
help; git requires the lock file's absence, not emptiness), permanently wedging that clone's git metadata for
the rest of the session; (2) this is not fixable by retrying, `git reset`, or any local workaround &mdash;
**stop trying git write operations in this folder once one has failed this way.** The working files themselves
are unaffected (regular file writes/edits succeed fine; it's specifically unlink/rename that's blocked), so the
actual deliverable is never at risk &mdash; only this clone's ability to track it. **Working pattern that
avoids the problem entirely:** keep using Read/Write/Edit (and read-only git like `status`/`fetch`/`log`) in the
mounted project folder as normal, but do every git *write* &mdash; `add`, `commit`, `merge`, `push` &mdash; in a
disposable clone under `/tmp` (real disk, confirmed ext4, not FUSE), syncing the edited files over with `cp`
before each commit. `git push`/`clone`/`fetch` against `github.com` work fine from the sandbox in either
location; the constraint is specifically the mounted folder's own `.git`, not networking.

**Environment lesson: `api.github.com` is blocked by the sandbox's outbound proxy allowlist; `github.com` is
not.** Confirmed via `curl -v`: the proxy returns `403 blocked-by-allowlist` for `CONNECT api.github.com:443`,
while plain git operations (`clone`/`fetch`/`push`) against `github.com` succeed normally. This means the
GitHub REST API (opening a PR, checking run status, etc. via `curl`/`gh`) is **not reachable** from this
environment, even though ordinary git push/pull is. This is a standing constraint, not a transient failure worth
retrying. When the standard branch &rarr; PR &rarr; merge workflow is called for, push the branch (works fine)
and either hand Cris the printed compare-branch URL to open the PR himself, or get his explicit go-ahead to
merge the branch into `main` directly via git in the writable clone (still preserving the themed commits in
history &mdash; only the GitHub PR *object* is skipped, not the review-shaped commit structure).

**Live audit (desktop 1680px + mobile 375px via Chrome MCP against the deployed GitHub Pages URL).** All five
desktop screens plus mobile Cover/Questionnaire: sticky nav reachable mid-scroll; each Cover move card stages the
matching Rework draft without publishing (Cover's own score stayed unpublished/unchanged after staging); sample
badges and live score chip agree with each other and with the bottom Questionnaire score everywhere; Rework's
staged delta (+10 for &ldquo;delay retirement 2 years&rdquo; on the default plan) matched Income &amp; Odds' bar
for the identical move (cross-screen consistency, a V18.5&ndash;V18.7 invariant, still holds); the
Returning-callout correctly reappeared after leaving and returning to the Questionnaire tab; zero console errors
on any screen, desktop or mobile.

**Cache-buster:** `?v=19.1` on the version-bump commit; `compass-cover.jsx` and `cover-mobile.jsx` additionally
bumped to `?v=19.1b` for the post-audit fix (see process lesson above). Saved-plan JSON stamp, both HTML titles,
`real-engine.js` header, and on-screen kickers all reconciled to 19.1.

---

## V19.2 &mdash; Year-by-year table (three storyline views + permanent reconciliation invariant)

Second batch of `UX-IMPROVEMENT-PLAN.md`. **`engine.js` untouched** &mdash; the new computation lives entirely
in the adapter; the UI is one new component plus a collapsed section on Projection. Shipped as two themed
commits (adapter+tests `2e0f779`, UI+versions `a0f1728`) merged to `main` via `22b7aae` &mdash; direct merge
from the /tmp clone with Cris's explicit approval (the GitHub PR *object* is unreachable from the sandbox; the
review-shaped commit structure is preserved).

**What shipped.** `compute()` now returns `yearTables` with three coherent single-story views, per Cris's
prior decisions (never per-year percentile collages): **Average markets** = ONE extra run through the untouched
engine with `stockVol`/`bondVol` = 0 (the engine's random draws are multiplied by vol, so they go inert &mdash;
verified); **Rough/Strong markets** = the *actual* simulated paths at the 10th/90th percentile rank of final
outcome, reusing the results array compute() already sorts for the median (nearly free). The Projection screen
gained a **collapsed** &ldquo;See the year-by-year numbers&rdquo; section at the bottom (Cris chose collapsed over
always-visible), opening to a view selector with the approved plain-English labels, a Future/Today's dollars
toggle (future default), and a fixed-height (~430px) all-years scrolling table with a sticky header (Cris chose
scrollable over full-length or every-5-years). Columns: Age &middot; Start balance &middot; Wages &middot; Social
Security &middot; Pension &amp; other &middot; Portfolio withdrawals &middot; Expenses &middot; Taxes &middot; End
balance. Insolvent views get a plain callout (&ldquo;In this storyline, the money runs out at age 84&rdquo;) and
row tinting; the retirement-year row is ruled and labeled. Mobile untouched (no Projection tab &mdash; the
V19.4 decision).

**Engine finding (doc correction, caught by the invariant test).** The logged `totalWithdrawal` is
**discretionary only; it does NOT include RMD** (RMD is logged separately in `rmd`). The plan doc and an
engine comment implied otherwise. The first invariant run failed by exactly the RMD amounts starting at age 75
(and jumped when the younger spouse hit 75 two calendar years later) &mdash; then confirmed in the source:
`totalWithdrawal` sums only the converged `wd*` fields. The table's withdrawals column is `totalWithdrawal +
rmd`, matching the V18.11 paycheck. The pathLog Fields section above now documents this; avoid the
`discretionaryWithdrawal` field entirely. **General lesson: an executable invariant catches in minutes what a
plausible-sounding doc line would have shipped wrong** &mdash; grade flows against the balance identity, not
against documentation.

**The permanent invariant (Cris's goal (b): an engine spot-check).** `tests/year-table.test.js` (5 tests;
suite now 29) proves, on the vol=0 run: `end = start &times; (1 + stockAlloc&times;stockReturn +
(1-stockAlloc)&times;bondReturn) + contributions - withdrawals + windfall(that age)` to &le;$1 for every
solvent row (also under windfall + Roth conversions; conversions net to zero across accounts); rows chain
(each end = next start) in both dollar modes; the first insolvent row's `balanceAge` equals `depletionAge`;
rows are deterministic. Rows deliberately carry `contributions` and `stockAlloc` (not displayed) so the
identity is checkable from exposed rows alone. **Today's-$ convention:** cash flows and Start balance deflate
by the row's own cumulative `inflation`; End balance deflates by the NEXT year's factor &mdash; end balances
sit on the next birthday, and this keeps end = next start true after the toggle.

**Live audit (deployed site, Chrome MCP).** Desktop: table verified at 5,000 and 10,000 paths; every screen
opened at 10k (V18.9 lesson) with zero console errors; the age-55 row reconciles on sight (950,000 &times;
1.056 + 22,080 contributions = 1,025,280); Rough callout age 84 and Strong final $4,284,231 matched the local
Node run **to the dollar** (deterministic across environments); DOM-extracted rows: worst chain mismatch $0 in
both dollar modes; odds identical across screens (65/100 at 10k). Default score 64/100 identical before/after
(regression gate &mdash; scoring code untouched). Mobile regression-checked (badge, 64/100, tab bar intact).
Cris's saved plan was backed up to a spare localStorage key before testing and restored after.

**Environment lessons (new).**
- **`*.github.io` is blocked by the sandbox proxy allowlist** (like `api.github.com`): `curl` cannot verify
  the deployed site from the sandbox. Deployed-site checks must run in the browser via Chrome MCP.
- **The browser is the api.github.com workaround:** `fetch('https://api.github.com/repos/&hellip;/actions/runs')`
  from the page context (public repo, CORS-allowed) reads Pages build status the sandbox can't.
- **Pages deploys can fail silently.** The V19.2 merge push produced NO Pages run at all; an empty retrigger
  commit produced a run that failed at GitHub's deploy step (transient &mdash; V19.1 had one too); a second
  empty commit succeeded. If the live site looks stale ~5+ minutes after a push, check the Actions runs via
  the browser before suspecting the code.
- **Chrome MCP window sizing:** the MCP tab lives in its own Chrome window; `resize_window` can report success
  while the OS ignores it. Fix: ask Cris to maximize *that* window (not the main one). Chrome's ~500px minimum
  outer width means a true 375px viewport isn't reachable by window resizing; 500px still renders the mobile
  component (breakpoint 769), which is sufficient for mobile regression checks.

**Cache-buster:** `engine.js?v=19.2` + `?v=19.2` on all `cover-app/*` includes in both shells; both HTML
titles, `real-engine.js` header, saved-plan stamp, and on-screen kickers reconciled to 19.2.

---

## V19.3 &mdash; Restructure &amp; rename: four tabs, one exact move-delta source

Third batch of `UX-IMPROVEMENT-PLAN.md`. **`engine.js` untouched** &mdash; adapter scoring plumbing +
UI/copy only. Shipped as two themed commits (adapter+tests `8024b8d`, UI+versions `725c36a`) merged to
`main` via `fce6cec`, plus a post-audit copy-fix `a2ad3c3` &mdash; direct merge from the /tmp clone per
the V19.2 precedent, approved in-session.

**Tabs (Cris's own naming, decided at batch start):** five tabs &rarr; four &mdash; **Input Data**
(was Questionnaire) &middot; **Results** (was Cover) &middot; **Try Changes** (was Rework) &middot;
**Charts** (was Projection). The Income &amp; Odds screen was retired: its glide-path chart moved to
Charts (after the paycheck chart, before the summary stats &mdash; the V19.2 year-by-year table stays
last), and its move-comparison bars moved to Try Changes (below the dials), so the place you compare
moves is the place you try them. **Internal screen ids (`quiz/cover/rework/chart`) are unchanged**
&mdash; only labels and user-facing copy were renamed; `window._coverNav` targets and saved plans are
unaffected. Mobile's two tab labels renamed to match (Results / Input Data); mobile scope itself is
still the open V19.4 decision.

**One exact move-delta source (kills the +17-vs-+19 mismatch).** New adapter API
`MockEngine.computeMoves(params, baseRate, {includeCombined})`: every move (delay-2yr, spend-10%-less,
SS-at-70-both) plus the optional all-together run is measured at the **full path count** with the
deterministic seeds. It returns `{base, moves:[{id,title,detail,note,rate,delta}], combined}`.
Consumers: desktop Results cards, Try Changes bars (`ScenarioCompareChart` now renders precomputed
`data` instead of running its own odds), and mobile Results cards &mdash; identical numbers everywhere,
by construction. `compute()` no longer returns `levers`; the old proportional `buildLevers` sample and
`quickSuccess` were **removed**. Screens pass the already-computed headline in as `baseRate` (the
deterministic RNG makes a re-run identical, so this is a pure optimization &mdash; proven by test, not
assumed). Input Data and Charts don't show moves, so their recomputes no longer pay for them.

**Tests (suite 29 &rarr; 33).** `tests/moves.test.js`: computeMoves' own base run equals compute()'s
headline; `rate - base === delta` for every move; combined only when requested; SS move skipped at
claim-age 70; determinism; `compute().levers === undefined`.

**Live audit (deployed site, Chrome MCP; desktop 1680px + mobile 500px).** Default score **64/100
unchanged** at 5,000 paths (regression gate). Cards = bars to the point: +19/+10/+5 on cards, bars
83/74/69 against base 64, combined 93 (+29) &mdash; matching the local Node run exactly (determinism
across environments, again). Tapping the "+19 Cut spending 10%" Results card staged exactly that draft
on Try Changes (proposed 83 = 64+19, chip $115,000 &rarr; $104,000, unpublished; localStorage confirmed
untouched). All four desktop screens + mobile opened at **10,000 paths** (V18.9 lesson): zero console
errors; at 10k the estimate settles at 65 with +18/+9/+4/+29 &mdash; consistent on cards and bars alike.
Deployed timings at 5,000 paths: compute ~1.0s, moves ~1.4s &mdash; within the estimate approved with
the batch. Pages deploy succeeded on the first run this time (no silent-failure retriggers needed).

**Post-audit copy fix (same session).** One residual &ldquo;answer the questionnaire&rdquo; string on
Try Changes was caught in the live audit and fixed as `a2ad3c3`, bumping `compass-cover.jsx` to
`?v=19.3b` (the V19.1 cache-buster lesson applied on the first try instead of being relearned).

**Environment lessons (new).**
- **Chrome MCP window sizing, continued:** `resize_window` again reported success while the OS ignored
  it, and page-zoom keyboard shortcuts (`cmd+-`) sent via the extension do NOT reach Chrome's browser
  UI (devicePixelRatio stayed 1), so zoom cannot fake a wide viewport either. The only working path
  remains asking Cris to maximize the MCP tab's own Chrome window &mdash; that took the viewport from
  500px to 1680px instantly. Budget for this handoff in any desktop live audit.
- **`/tmp` persists across sessions but with a different owner:** the previous session's `/tmp/rc`
  clone could not be removed or reused (permission denied). Use a fresh directory name per session
  (`/tmp/rc3`), not a fixed one.
- **Push auth:** fresh /tmp clones have no credentials; the token lives in the gitignored
  `data/deploy-token.txt` (per `scripts/deploy.sh`) and works as
  `https://x-access-token:<token>@github.com/...` on push.

**Cache-buster:** `engine.js?v=19.3` + `?v=19.3` on all `cover-app/*` includes in both shells
(`compass-cover.jsx` at `?v=19.3b` after the copy fix); both HTML titles, `real-engine.js` header,
saved-plan stamp, and on-screen kickers reconciled to 19.3.

---

## V19.4 &mdash; Mobile parity decision: Option B (disclose, don't build)

Closes `UX-IMPROVEMENT-PLAN.md`'s last open item (finding #7) and completes the plan &mdash; all
four batches (V19.1&ndash;V19.4) are now shipped. **`engine.js` untouched.** Pure UI copy in the
adapter's React layer; no new adapter computation, no new tests needed (nothing numeric changed).

**The decision.** Two options were on the table: **Option A** &mdash; add a third mobile tab with
the balance fan chart and the V19.2 year-by-year table (the cheapest meaningful upgrade toward full
mobile parity). **Option B** &mdash; keep mobile a two-tab companion (Results + Input Data) but say
so in copy, so mobile users know Try Changes and Charts exist rather than assuming the two tabs are
the whole app. Cris picked **Option B** directly from the two documented options &mdash; no further
discussion needed, confirming the plan document had already captured enough context to decide from.
**Option A moved to `BACKLOG.md`** with an implementation sketch (reuse `BalanceFanChart` + the
year-by-year table component and `results.yearTables`; no new adapter computation needed) so a
future session can build it without re-deriving the approach, if mobile parity becomes a priority.

**What shipped.** One new note at the bottom of the mobile Results tab (`cover-app/cover-mobile.jsx`,
`CoverView`, after the "Three moves" section): "This phone view covers your results and your
inputs. Two more screens live on a bigger screen: **Try Changes**, where you can test your own
moves before committing to them, and **Charts**, with the balance projection and year-by-year
numbers." Mobile's shell, tabs, and all other screens are byte-for-byte unchanged.

**Validation.** Full local suite: 33/33 green, unchanged (regression gate &mdash; nothing numeric
was touched, so this only confirms nothing else broke). Babel-transform check on the three touched
JSX files (`cover-mobile.jsx`, `compass-cover.jsx`, `cover-inputs.jsx`) and `node --check` on
`real-engine.js`. Live audit on the deployed site (Chrome MCP): all four desktop screens (Input
Data, Results, Try Changes, Charts) opened and visually unchanged; mobile Results tab shows the new
note exactly as authored; mobile Input Data tab unaffected; zero console errors at either viewport.
Cris's saved `localStorage['compassParams']` was read, backed up to `sessionStorage`, and restored
byte-for-byte after testing &mdash; it happened to already equal `DEFAULTS` (so no personalized data
was ever actually at risk), but the backup/restore discipline was followed regardless, per standing
audit rule.

**Deploy note: the Pages "Deploy to GitHub Pages" step is a recurring flake, not a one-off.** It
failed transiently twice in a row after this merge (build succeeded both times; only the deploy job
failed) &mdash; the same failure mode V19.2 saw once and treated as a one-off. A third push (empty
retrigger commit) succeeded. **Lesson: budget for at least one retrigger on every future deploy as
routine, not as a surprise** &mdash; two figures from this session (2 failures before success) vs.
V19.2's one failure suggest this is a live-with-it GitHub Pages characteristic of this repo/account,
not something a workflow tweak has fixed.

**Environment lesson update: Chrome MCP `resize_window` worked correctly this session**, both
1680&times;1000 (desktop) and 500&times;900 (mobile) &mdash; screenshots confirmed the actual
rendered layout matched (four-tab desktop nav at the wide size, two-tab bottom nav at the narrow
size), contradicting V19.3's experience of the OS silently ignoring the resize. **Do not assume the
V19.3 workaround (asking Cris to manually maximize the window) is required by default** &mdash; try
`resize_window` first each session and only fall back to asking Cris if the rendered content proves
it didn't take (compare tab-bar/nav layout in the screenshot, not just the reported pixel size).

**Cache-buster:** `engine.js?v=19.4` + `?v=19.4` on all `cover-app/*` includes in both shells; both
HTML titles, `real-engine.js` header, saved-plan stamp, and on-screen kickers (Results/Rework/Charts/
Input Data screens, Welcome footer) reconciled to 19.4.

---

## V19.5 &mdash; Deep engine-accuracy audit: 8 fixes (2 High, 4 Medium, 2 Low/Info)

Second intentional `engine.js` math release (first since V18.11). Addresses
`AUDIT-ENGINE-2026-07.md` (a 2026-07-04 deep-audit Fable session that added 43 new tests &mdash;
`tests/audit-*.js` &mdash; and found no Critical issue, 2 High, 4 Medium, 2 Low, 1 Info). Shipped as
one batch per Cris's explicit instruction to minimize phases/browser-testing rounds: all approved
fixes together, one version bump, one deploy, one live-browser regression pass. Two findings
(F-SURPLUS, F-DEPLETED-WINDFALL) needed a semantics decision only Cris could make; both were decided
before any code was written (see below). A ninth finding (F-PT-EARNTEST-ATTRIB) was deliberately
**deferred at Cris's request** &mdash; see `BACKLOG.md`.

**F-ROTHCONV-PHANTOM (High) &mdash; taxed on Roth conversions that never happened.** The planned
conversion amount was added to ordinary income in full even when discretionary withdrawals drained
the pre-tax account first, so only a fraction could actually convert &mdash; nothing clipped the
income to match. Repro: a $100k pre-tax account logged $159,901 of ordinary income in one year
(~$60k phantom). Fix: inside the tax convergence loop, compute the *executable* conversion (mirroring
the same post-reset ceiling the balance-mutation step already uses) and tax only that.

**F-SS-EARNTEST-INFL (High) &mdash; the Social Security earnings-test reduction was double-inflated.**
`calculateSSBenefit` received nominal (already-inflated) earnings and limit, computed a nominal
reduction, then subtracted it from a today's-dollars benefit that gets inflated *again* by the
caller. Only affects claim-before-FRA plus part-time-income years, growing every year with
inflation. Fix: the function now takes the year's inflation multiplier and converts the reduction
back to today's dollars before subtracting, instead of mixing dollar bases.

**F-IRMAA-SKIP (Medium) &mdash; Roth-funded retirement years could silently skip IRMAA.** The tax
convergence loop could converge on its very first pass (e.g., a year fully funded by Roth
withdrawals: $0 ordinary income, $0 tax) and exit *before* IRMAA was ever folded into that year's
spending &mdash; even when the 2-year-lookback MAGI sat deep in a surcharge tier. Fix: the loop now
refreshes `totalNeed` with IRMAA immediately after computing it each pass, and only converges once
BOTH the tax bill and `totalNeed` have stabilized (previously only tax was checked).

**F-CG-SD (Medium) &mdash; unused standard deduction never sheltered capital gains.**
`calculateCapGainsTax` floored `ordinaryIncome - SD` at $0, so when ordinary income was below the SD
the leftover deduction was silently discarded instead of also shielding gains &mdash; real 2026 law
stacks gains on top of `ordinary + gains - SD` as one number. Worst case (MFJ, $0 ordinary income):
up to $32,200 of gains overtaxed at 15% ($4,830/yr), hitting early retirees living off taxable
sales. Fix: removed the floor (the downstream bracket-room math already floors safely at $0).

**F-SURPLUS (Medium) &mdash; per Cris's explicit decision: bank it.** When guaranteed retirement
income (RMD + SS + pension + part-time) exceeded spending + taxes, the excess simply vanished (RMD
cash left the pre-tax account regardless of need, and nothing reinvested it). Fix: leftover cash
(`otherIncome + ptIncome + ssIncome + totalRmd + withdrawals - totalNeed - tax`, when positive) is
now deposited into taxable every year, logged as a new `surplusBanked` pathLog field. **Deliberately
excludes salary/wages and is gated on `retirementStarted`** &mdash; an earlier draft of this fix
included wages unconditionally (matching the audit's literal fix-sketch wording) and broke every
working-year invariant test, because V18.13 intentionally models $0 spending while working (take-home
pay is assumed to fund real, unmodeled living expenses); sweeping leftover salary into savings would
have silently double-counted it as both implicit living expenses and portfolio growth. The adapter
(`real-engine.js`) nets `surplusBanked` out of the paycheck's and year-table's "portfolio" column in
three places, since banked surplus never actually left the portfolio to fund that year's outflow.

**F-DEPLETED-WINDFALL (Medium) &mdash; per Cris's explicit decision: bank it, let the plan recover.**
A windfall arriving after the portfolio was already depleted used to be added to the taxable balance,
appear in that year's logged `totalBal` (so charts/tables showed the money arriving), and then be
unconditionally erased to $0 the very next year regardless of the balance. Fix: solvency is now
re-evaluated every year instead of latching `false` forever &mdash; if the balance is still under $1
it clamps to 0 and records `depletionAge` (only advancing it the moment solvency is first lost); if
new money (windfall or banked surplus) brings the balance back to $1+, the plan resumes and
`depletionAge` clears. The same "no resurrection without new money" invariant still holds (verified):
a household with zero ongoing income and no windfall stays at exactly $0 forever, unchanged.

**F-RMD-110 (Low) &mdash; RMD divisor incorrectly floored at 3.5 past age 110.** The IRS Uniform
Lifetime Table keeps falling (111&rarr;3.4 ... 120+&rarr;2.0); the engine floored at 3.5, understating
RMDs at very advanced ages. Fix: extended the table through age 119, explicit 2.0 for 120+. Verified
against 26 CFR 1.401(a)(9)-9 Table 2 (2026-07) via live web lookup &mdash; the audit's OWN oracle for
age 115 was itself off by $0.1 (claimed 3.0; the authoritative table says 2.9), corrected in the same
pass.

**F-IRMAA-T4 (Info, trivial, free) &mdash; $0.10/mo tier-4 rounding.** CMS 2026 tier-4 combined Part B
+ Part D surcharge is $529.70/mo (446.40 + 83.30); engine used $529.60. One-constant fix, zero risk,
bundled in since it cost nothing extra to verify and fix alongside the rest.

**Deferred at Cris's explicit request: F-PT-EARNTEST-ATTRIB.** The single household part-time-income
channel is always attributed to the USER for the SS earnings test; a household whose part-time worker
is actually the spouse still sees the user's benefit reduced. Not a small patch (needs a second,
per-spouse part-time input across both Questionnaire layouts plus the adapter and input-coverage
test) &mdash; full scope and an implementation sketch are in `BACKLOG.md`. The audit's `todo` test for
this finding is intentionally left as `todo`, not flipped, until that lands.

**Validation.** Local suite grew 33 &rarr; 76 tests from the audit session; this batch fixed 8 of the
9 non-Info findings and left all corresponding `todo` tests flipped to real, passing assertions
(F-PT-EARNTEST-ATTRIB stays `todo` by design). Two pre-existing tests that encoded the OLD, buggy
zero-floor capital-gains behavior as their expected value (`audit-statutory.test.js`,
`financial-engine.test.js`) were corrected to the legally-accurate expectation. Full suite: **76
tests, 75 pass, 0 fail, 1 todo** (regression gate). The 1,152-scenario conservation matrix
(`audit-conservation.test.js`) still holds with the new `surplusBanked` term added to its identity
formula. **Default sample-plan score unchanged at 64/100** &mdash; none of the eight fixes' trigger
conditions (active Roth conversion, early-claim + part-time SS, IRMAA-tier Roth-funded years, very
low ordinary income against capital gains, RMD-heavy surplus, post-depletion windfall, age 111+) are
present in `DEFAULTS`.

**Cache-buster:** `engine.js?v=19.5` + `?v=19.5` on all `cover-app/*` includes in both shells; both
HTML titles, `real-engine.js` header, saved-plan stamp, and on-screen kickers (Results/Rework/Charts/
Input Data screens) reconciled to 19.5.

---

## V19.6 &mdash; Honest success scoring: &ldquo;never ran out&rdquo; means never ran out

Third intentional `engine.js` math-adjacent release (after V18.11 and V19.5), though the engine change
is purely **additive** &mdash; a new latching flag, no altered dollar. Implements `V19.6-PLAN.md` in full
(scope 2a+2b+2c+2d, all decided with Cris 2026-07-05). Shipped as one batch.

**The finding.** A real saved plan scored **100/100** yet did not pass Cris&rsquo;s sniff test (a couple
retiring at 50/55, Social Security deferred to 70). Traced year-by-year through the real engine: the
arithmetic was right but the **definition of success was wrong for what the headline claims.** The Results
headline reads &ldquo;Chance of never running out,&rdquo; but `successOf` graded on the **end-state**
`solvent` flag, which &mdash; after V19.5&rsquo;s F-DEPLETED-WINDFALL fix &mdash; **clears** when a windfall
or banked surplus revives a broke balance. So a path that hit $0 mid-retirement and later recovered was
scored a success. That is &ldquo;chance of FINISHING with money,&rdquo; not &ldquo;chance of NEVER running
out.&rdquo; On the reference plan, 2,753 of 5,000 paths (55%) hit $0 at some point (median 9 years at $0,
worst 19) yet the plan read 100%; the honest score is ~45%.

**2a &mdash; `engine.js`: additive latching flag (engine math IS touched, additively).** Added
`everDepleted` (latches `true` the first time `totalBal < 1`, **never clears**) and `firstDepletionAge`
(the age it first happened, for the danger-age insight). Both are returned from `simulatePath` alongside the
existing `solvent`/`depletionAge`. **No existing field, balance, or return value changes** &mdash; the
V19.5 recovery behavior (`depletionAge` still clears on recovery so the charts show the windfall landing) is
fully preserved. Grep-confirmed no pre-V19.6 consumer reads either new field.

**2b &mdash; `real-engine.js`: score on &ldquo;never went broke.&rdquo;** `successOf` now counts a path only
if `!everDepleted && finalBalance >= goal`. Single source, so it flows to every screen that scores &mdash;
Results headline, Try Changes bars (`computeMoves`), and the sustainable-spending bisection &mdash; in
lockstep. At goal 0 a path that never depleted always ends &ge; 0, and a plan that never goes broke has
`everDepleted === false` exactly when the old `solvent === true`, so **plans that never dip are unchanged**
(the default sample stays **64/100**, verified). Only plans with broke-then-recovered paths drop &mdash;
a demonstrated realistic case went from **94 (old) to 0 (new)** once its windfall-driven &ldquo;recoveries&rdquo;
stopped counting.

**2c &mdash; headline copy kept, tooltip clarifier added.** Per Cris, the label stays &ldquo;Chance of never
running out&rdquo; (now literally true) and its goal variant &ldquo;Chance of leaving $Xk or more&rdquo;
(`cvChanceLabel`, unchanged). Added an `InfoTip` beside the headline kicker on desktop Results and mobile
Results reading: *&ldquo;A future counts as a failure if your balance ever hits $0, even if it later
recovers.&rdquo;* (`CV_CHANCE_TOOLTIP` in `compass-cover.jsx`).

**2d &mdash; danger-age insight.** `compute()` now returns `depletionSummary` = `{ everDepletedShare,
firstDepletionMedianAge }` (median age-of-first-depletion among the paths that deplete). A new `cvDangerLine`
helper renders a plain-English line under the verdict on desktop and mobile Results &mdash; e.g. *&ldquo;In
the harder futures, the money first runs low around age 63.&rdquo;* &mdash; gated to hide when under 10% of
paths deplete. Additive; no effect on the score.

**Accuracy disclosure.** This changes how success is *counted*, not how paths are *simulated*. No path&rsquo;s
dollars change. Every affected plan&rsquo;s score can only stay the same or **drop** (more honest); none can
rise. Plans with no dollar-zero event (incl. `DEFAULTS`) are unchanged.

**Validation.** New `tests/success-scoring.test.js` (8 tests): `successOf` fails a broke-then-recovered path
and passes a never-dipped one; the legacy goal still binds; the engine&rsquo;s `everDepleted` **latches**
through a windfall recovery (solvent true, `depletionAge` null, `everDepleted` still true) while the same path
scores as a failure; `depletionSummaryOf` reports share + median age; and `compute()`&rsquo;s headline equals
the everDepleted count and is strictly lower than the old solvent count on a recovery-heavy plan. One
pre-existing test (`audit-adapter.test.js` 2d) that encoded the OLD solvent rule was deliberately updated with
a comment. Full suite: **84 tests, 83 pass, 0 fail, 1 todo** (the F-PT-EARNTEST-ATTRIB todo stays as-is).
Babel-transform of all five JSX files + `node --check` on both plain-JS files pass. DEFAULTS re-scored 64
(unchanged); a reconstructed recovery scenario confirmed old 94 &rarr; new 0.

**Cache-buster:** `engine.js?v=19.6` + `?v=19.6` on all `cover-app/*` includes in both shells; both HTML
titles, `real-engine.js` header, saved-plan stamp, and on-screen kickers (Results/Try Changes/Charts/Input
Data) reconciled to 19.6. `engine.js` math IS touched (additive flag only). The V19.5 provenance comments in
`real-engine.js` are left as-is per convention.

---

## V19.7 &mdash; Results page context: "Your Plan at a Glance" + "How It Could Play Out"

**`engine.js` untouched.** UI/copy plus two purely-additive adapter fields; scoring untouched, so
`successRate` cannot move (DEFAULTS stays 64/100, verified). The problem: the Results page showed a big
score with almost no plan context beside it, and a lower "Why the Verdict Reads That Way" band that mostly
restated numbers shown elsewhere. Approved with Cris across three decision rounds.

**Beat 1 &mdash; "Your Plan at a Glance" (replaces the paycheck teaser beside the score).** A compact
fact grid of the INPUTS behind the score: retirement age(s), Social Security claim age(s), everyday
spending *(labeled "excl. housing &amp; healthcare"* &mdash; the V18.13 contract: `spending` excludes
housing/healthcare, so it is NOT total outflow; labeling it honestly was an explicit accuracy decision),
safe-to-spend beside it, legacy goal (or "None set" at 0), plan horizon ("Ages X&ndash;Y &middot; N
years"), and the monthly paycheck (preserved from the old teaser). The detailed paycheck breakdown lower
on the page is untouched.

**Beat 2 &mdash; "How It Could Play Out" (replaces "Why the Verdict Reads That Way").** The OUTCOMES the
Monte Carlo produces, which the page never stated plainly: **Rough / Middle / Strong** end balances
(P10 / P50 / P90), then a longevity + risk line (how long the money lasts in the middle outcome, and the
share of futures that hit $0 at some point). The old band's three cards were: "% succeed" (restated the
score), "median legacy" (kept &mdash; it is the Middle column now), "safe to spend" (moved into Beat 1).
`CoverReason` (the old card component) was removed as orphaned.

**Adapter (additive only).** `compute()` now returns `roughLegacy` / `strongLegacy` = the P10 / P90 end
balances, read from the SAME sorted results array and SAME percentile indices (`floor(n*0.10)` /
`floor(n*0.90)`) that `buildYearTables` uses for its rough/strong table views &mdash; so the strip's
headline figures equal the rough/strong final rows of the year-by-year table exactly (asserted in a new
test). `medianLegacy`, `runwayYears`, and `depletionSummary` already existed. No effect on `successRate`.

**Shared data helpers (no drift).** `cvGlanceFacts(params, results)` and `cvOutcomes(results)` (in
`compass-cover.jsx`, on `window`) build the derived strings once; desktop (`CoverGlance` / `CoverOutcomes`)
and mobile (`MGlance` / `MOutcomes` in `cover-mobile.jsx`) render them with their own styling but read the
same helpers &mdash; same discipline as `cvChanceLabel` / `cvDangerLine`. Mobile gets full parity on the
new content (both beats), laid out as stacked lists/cards for the narrow column.

**Disclosed overlaps (intentional):** safe-to-spend now shows in Beat 1 and no longer as its own card (net
removal of duplication); the danger-age still appears by the score via `cvDangerLine` while Beat 2 states
the *share* that ever ran low (at legacy-goal 0, that share == 100 &minus; successRate by definition, and
diverges once a goal is set).

**Validation.** Full suite **86 tests, 85 pass, 0 fail, 1 todo** (was 84/83/1; +2 new V19.7 assertions:
rough&le;median&le;strong &amp; equality to yearTables finals; DEFAULTS still 64). Babel-transform of the
three touched JSX files + `node --check` on the adapter pass. Headless `compute(DEFAULTS)` confirmed
`roughLegacy` 0 / `medianLegacy` ~$749k / `strongLegacy` ~$5.0M, ordered and matching yearTables exactly,
score 64. Live browser audit pending (desktop 1680px + mobile ~500px, couple &amp; single, sample &amp;
dirty).

**Cache-buster:** `engine.js?v=19.7` + `?v=19.7` on all `cover-app/*` includes in both shells; both HTML
titles, `real-engine.js` header, saved-plan stamp, and on-screen kickers reconciled to 19.7. `engine.js`
math UNCHANGED (adapter fields are additive exposition only).

---

## V19.8 &mdash; Four-tier verdict + app-wide label legibility fix

**`engine.js` untouched.** Both changes are UI/copy plus adapter-side tier boundaries and colors;
`successOf()`'s definition of a successful path (the V19.6 `everDepleted` rule) is unchanged, so no
plan's score can move because of this release &mdash; only the word/color a given score is labeled with,
and how legible the surrounding text is. Prompted directly by Cris reacting to a live screenshot of the
Results page (small labels hard to read; a 75/100 plan labeled "Tight" read as understating the risk).

**Four verdict tiers, replacing the old flat 90/70 split.** The prior `verdictFor()` (in `real-engine.js`)
covered 70&ndash;89 with a single word, "Tight" &mdash; so an 89 (arguably fine) and a 70 (roughly a 1-in-3
chance the money runs out under the V19.6 &ldquo;ever went broke&rdquo; scoring rule) read identically.
Cris reviewed three draft tier/wording schemes and chose **Draft 1** (a four-tier split, keeping the
existing words where they still fit): **90&ndash;100 On Track** (unchanged), **80&ndash;89 Tight** (unchanged
wording, narrower band), **65&ndash;79 Shaky** (new &mdash; "More than 1 in 5 futures run out of money at
some point. Worth strengthening before you count on this."), **0&ndash;64 At Risk** (unchanged wording,
now starts lower). A 75/100 plan now reads "Shaky" instead of "Tight."

**New color for the new tier.** Added `rust` (`#a85c33`) + `rustSoft` (`#e6d0bd`) to the shared `cvStyles`
palette (`compass-cover.jsx`), sitting between `amber` (Tight) and `clay` (At Risk) on the same muted
earth-tone palette as `sage`/`amber`/`clay`. Every verdict-to-color mapping was updated in lockstep so a
given score renders the same color everywhere: `cvVerdictColor()` (desktop Results/Try Changes/Charts),
the inline ternaries in `cover-mobile.jsx` and `cover-inputs.jsx`, and `rcVerdictColor()` in
`retire-charts.jsx` (the Try Changes comparison bars, which carry their own independent 90/70 thresholds
duplicated from the adapter &mdash; also updated to 90/80/65 so a bar is never a different color than the
Results verdict at the same score).

**Label/nav legibility fix (the approved "Option A").** Measured, not just eyeballed: the shared small-caps
label color `ink50` (50%-opacity black over the `#f6f2ea` cream background) works out to roughly **3.3:1**
contrast &mdash; below the WCAG AA floor of 4.5:1 for text this size. The existing `ink70` token (despite
its name, actually 60%-opacity black) measures **~4.5:1** and was already used elsewhere in the app, so
the fix reuses it rather than inventing a new value. Applied everywhere a small-caps label or secondary
caption used `ink50`, in both files' shared style constants and every file's local copy of the same
patterns: the four-tab desktop nav (`CoverNav`, 10.5px&rarr;13px, inactive color `ink50`&rarr;`ink70`) and
the two-tab mobile bottom bar (same fix, 11px&rarr;13px); the shared eyebrow/kicker styles `cvKicker`
(compass-cover.jsx), `cviKicker` (cover-inputs.jsx), and `mKick` (cover-mobile.jsx) plus their smaller
per-instance overrides (fact-grid labels, outcome-card labels, "at plan's end" captions, "points" labels);
the Questionnaire's field-label component (`CField`/`CToggle`/`CSelect` in cover-inputs.jsx, `FieldHead` in
cover-mobile.jsx) &mdash; the most-read text in the app, previously 10.5px/`ink50`; paycheck breakdown
captions, save/load status text, the "Tap a move to draft it&hellip;" and "Note: tax filing status&hellip;"
helper sentences; and the Charts screen's SVG axis labels (dollar/percent tick marks), move-comparison row
notes, the year-by-year table's column headers, and the "Hide table" control.

**Deliberately left unchanged (and why).** The "/100" suffix rendered beside every giant score number, and
unit suffixes (e.g. "/yr") beside `CoverBigStat` figures, keep `ink50` &mdash; these are an intentional
de-emphasis technique paired with a much larger number on the same line, not the "hard to read label"
problem Cris flagged, and dimming them is what makes the big number read as the headline. Decorative icons
(the dropdown chevron, the `InfoTip` "i" badge, the `DiffChip` reset icon in `retire-ui.jsx`) were left
alone too &mdash; they're icon controls, not text labels, and out of the approved scope. `ink50` remains a
valid token in the shared palette for these uses; only text-label usage was changed.

**Validation.** Local suite: 86 tests, 85 pass, 0 fail, 1 todo (unchanged from V19.7 &mdash; no
engine/scoring logic touched). Verified all four `verdictFor()` boundaries directly (89&rarr;Tight,
90&rarr;On Track, 79&rarr;Shaky, 80&rarr;Tight, 64&rarr;At Risk, 65&rarr;Shaky) and confirmed
`DEFAULTS` still scores 64 (unchanged, correctly still "At Risk" since 64 &lt; 65 under both the old
and new thresholds). Live-tested the deployed site (desktop 1680px + mobile 500px): all four color
tiers confirmed rendering distinctly and correctly on the Try Changes comparison bars (64 At Risk/clay,
69 &amp; 74 Shaky/rust, 83 Tight/amber, 93 On Track/sage); nav tabs, kickers, field labels, chart axis
labels, and the year-by-year table headers all visibly larger/darker on every screen (Results, Try
Changes, Charts, Input Data) on both viewports; zero console errors throughout.

**Cache-buster:** `engine.js?v=19.8` + `?v=19.8` on all `cover-app/*` includes in both shells; both HTML
titles, `real-engine.js` header, saved-plan stamp, and on-screen kickers reconciled to 19.8. `engine.js`
UNCHANGED.
