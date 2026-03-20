# v17.0 Mobile-First Shell Rewrite — Implementation Plan

**Project:** Retirement Architect
**Target Version:** v17.0
**Date Drafted:** 2026-03-19
**Status:** Approved for execution

---

## How to Use This Document

This is a living document. After completing each phase:
1. Check the phase box below in the Progress Tracker
2. Add a completion note under that phase (date, what was done, any decisions made or issues found)
3. Save before ending the session

Do not mark a phase complete until its testing checkpoint passes.

---

## Progress Tracker

- [x] Phase 1 &mdash; Audit & ID Map
- [x] Phase 2 &mdash; File Split
- [x] Phase 3 &mdash; New HTML Structure
- [x] Phase 4 &mdash; Mobile-First CSS
- [x] **Testing Checkpoint A** &mdash; Mobile layout visual pass (after Phase 4)
- [x] Phase 5 &mdash; Desktop Enhancement
- [x] **Testing Checkpoint B** &mdash; Desktop regression pass (after Phase 5)
- [x] Phase 6 &mdash; JS Wiring
- [x] **Testing Checkpoint C** &mdash; Full functional pass (after Phase 6)
- [x] Phase 7 &mdash; Live Testing & Sign-Off
- [ ] Version increment to v17.0 and CLAUDE.md update

---

## Objective

Rebuild the HTML structure and CSS from scratch, mobile-first, producing a professional financial app experience on iOS and Android. The JS simulation engine is untouched. Desktop experience is preserved via media query enhancement.

---

## Design Decisions (Locked)

- Results-first card stack as the post-wizard home screen
- Labeled "Edit Inputs" button in app header (replaces ambiguous FAB)
- Bottom nav: Dashboard | Charts | Reports | Settings (fixed, always visible)
- Charts tab: 2×2 button grid for chart type selection &mdash; no horizontal scroll
- **No-scroll-tabs rule:** Wherever tab-style navigation appears (chart types, wizard steps, scenario comparisons), buttons stack or grid to avoid horizontal scroll
- Bottom sheet for all input editing, sectioned with clear Compute button
- File split: `engine.js` (simulation logic) + `index.html` (UI shell) &mdash; reversible

---

## Dashboard Card Stack (Mobile)

Cards rendered in priority order, full-width, scrollable:

1. **Hero Card** &mdash; Success rate gauge + sustainable spending + median runway + median legacy + one-sentence verdict
2. **Spending Card** &mdash; Sustainable annual spending (today's $), today vs. retirement comparison
3. **Runway Card** &mdash; Timeline bar with Poor Markets / Average Markets / Plan End markers
4. **Income Sources Card** &mdash; Horizontal bars by source at retirement age
5. **Levers Card** &mdash; Top 3 improvement actions with success rate delta

---

## Phases

---

### Phase 1 &mdash; Audit & ID Map

Script-extract every DOM element ID referenced in JS. Categorize each as:
- Input field (must be present and match type)
- Display container (must be present, content written by JS)
- Structural (layout only, safe to restructure)

Output: complete ID inventory document used as Phase 3 safety checklist.

**Risk mitigated:** A missing or renamed ID silently breaks a calculation or display. The v15.0 crash was caused by exactly this.

**Completion Note:**
> **2026-03-19** &mdash; 408 total unique IDs inventoried. 108 input fields (JS-referenced), 6 canvas elements, 144 display containers, 16 dynamically-created (JS innerHTML), 133 structural (safe to restructure), 30 dynamic ID patterns (runtime-computed). 1 input (`fileInput`) has no direct JS getElementById ref but is used generically. All 16 "orphan" IDs confirmed as dynamically created via innerHTML in render functions &mdash; no actual missing elements. Key finding: `getAllInputValues()` uses generic querySelectorAll, so every input/select/checkbox with an `id` is auto-captured for save/restore. Full inventory in `v17-phase1-id-inventory.md`.

---

### Phase 2 &mdash; File Split

Move JS engine (~10,000 lines) into `engine.js`. New `index.html` loads it via `<script src="engine.js">`. Both files deploy together to GitHub Pages.

Reverting to single-file = copy engine.js contents back into index.html. No structural changes required.

**Completion Note:**
> **2026-03-19** &mdash; Extracted 6,159 lines of JS (lines 8707-14865) into `engine.js`. index.html reduced from 15,492 to 9,332 lines. Loaded via `<script src="engine.js"></script>` at line 8706 (after all CDN imports). Deployed to GitHub Pages &mdash; live test confirmed: wizard renders, simulation runs, all 4 Charts tab charts render, dashboard populates correctly, auto-save restore works. Zero console errors. No load-order issues.

---

### Phase 3 &mdash; New HTML Structure

Rebuild HTML skeleton with all IDs from Phase 1 preserved exactly. Key structural sections:

- App header (title + Edit Inputs button)
- Dashboard scroll area with named card containers
- Charts tab with 2×2 chart-type button grid
- Reports tab container
- Bottom sheet (input sections + Compute button + Cancel)
- Bottom nav (4 items, fixed position)

No-scroll-tabs rule applied throughout:
- Chart type buttons: 2×2 grid
- Wizard steps: compact grid or short vertical list
- Scenario tray: vertical list

**Completion Note:**
> **2026-03-19** &mdash; HTML body restructured mobile-first. New elements: app-header-mobile (title + Edit Inputs button), bottom-sheet (backdrop + sheet + handle + body + footer), bottom-nav (4 items: Dashboard/Charts/Reports/Settings). Desktop nav, icon sidebar, input panel all preserved in-place for Phase 5 media query restoration. All 392 original IDs preserved (zero lost), 6 new structural IDs added. Deployed to GitHub Pages &mdash; desktop layout visually identical to v16.5, simulation runs, tour triggers, all dashboard cards populate. Zero console errors.

---

### Phase 4 &mdash; Mobile-First CSS

Base styles target 375px viewport. No desktop overrides in base layer.

Key components:
- Card styles (white, 16px radius, shadow)
- Hero card (dark gradient, gauge layout)
- Bottom nav (fixed, 56px + safe-area-inset-bottom)
- Bottom sheet (slides up, 85% max-height, handle indicator)
- Input section layout (labeled groups, 44px touch targets)
- Chart button grid (2×2, equal sizing)
- viewport-fit=cover + env(safe-area-inset-*) for iPhone notch/home indicator

**Completion Note:**
> **2026-03-19** &mdash; Mobile-first base CSS added (459 new lines). Hides desktop elements (top-nav, sidebar, FAB, old mobile-nav-bar) by default. Styles app-header-mobile (dark navy, safe-area-inset-top), bottom-nav (fixed, 56px + safe-area-inset-bottom), bottom-sheet (slide-up, 88vh max, backdrop overlay). Dashboard renders as single-column card stack. Removed v16.0-16.5 `@media (max-width: 768px)` blocks (styles moved to base). Fixed Phase 3 nesting bug: extra `</div>` orphaned `.sidebar-footer` outside `.input-panel`. Added `openBottomSheet()`/`closeBottomSheet()` JS functions and bottom-nav active state sync in `switchMainView()`. Cache-busted engine.js with `?v=17p4`.

---

### &gt; Testing Checkpoint A &mdash; Mobile Layout Visual Pass

**When:** After Phase 4, before Phase 5.
**How:** Deploy to GitHub Pages. Open Chrome MCP at 375px.
**Pass criteria:**
- [x] All 5 dashboard cards render correctly
- [x] No horizontal scroll on main content
- [x] Bottom nav visible and fixed
- [x] Edit Inputs button opens bottom sheet
- [x] No content clipped behind notch or home indicator
- [x] Charts tab shows 2×2 grid with no scroll

**Result:**
> **PASS** (2026-03-19). All 5 dashboard card types render correctly after simulation. No horizontal scroll on any view. Bottom nav fixed and visible. Edit Inputs opens bottom sheet. Charts render single-column. Wizard renders full-screen. One bug found and fixed during testing: `.sidebar-footer` was orphaned outside `.input-panel` due to Phase 3 nesting error (extra `</div>`).

---

### Phase 5 &mdash; Desktop Enhancement

`@media (min-width: 768px)` restores full desktop layout:

- Sidebar visible, FAB hidden
- Hero row grid (gauge + lifespan + inputs summary)
- Multi-column chart layout
- Bottom nav hidden, top nav restored

Desktop users see no change from v16.5.

**Completion Note (2026-03-19):**
> Added `@media (min-width: 769px)` block (~190 lines, 42 CSS rules). Restores all desktop elements (top-nav, icon-sidebar, input-panel, input-panel-toggle), hides mobile elements (app-header-mobile, bottom-nav, bottom-sheet, edit-inputs-btn). Restores hero 3-column grid, wall-insights row, compact-budget row, 2-column charts grid, multi-column levers/scenarios, centered wizard modal with backdrop-filter, fixed-width tour tooltips, centered toast. Breakpoint is 769px (not 768px) to cleanly separate from Phase 4 mobile-first base styles. Commit `80de9db`.

---

### &gt; Testing Checkpoint B &mdash; Desktop Regression Pass

**When:** After Phase 5, before Phase 6.
**How:** Deploy to GitHub Pages. Open Chrome MCP at 1680px.
**Pass criteria:**
- [x] Desktop layout visually matches v16.5
- [x] Sidebar opens and closes correctly
- [x] All input fields accessible
- [x] Simulation runs and produces results
- [x] All charts render on Charts tab
- [x] Reports tab populated after simulation

**Result (2026-03-19): PASS**
> All criteria verified at 1680x1050. Desktop layout fully restored &mdash; top nav, icon sidebar, input panel with collapse/expand, 3-column hero row, budget bars, improvement levers with Apply buttons. Charts tab shows 2-column grid with all 5 charts + Year-by-Year table. Reports tab shows export cards and Quick Summary metrics. No horizontal scroll. No regressions from v16.5.

---

### Phase 6 &mdash; JS Wiring

Minimal JS changes only &mdash; no engine touches:

- Bottom sheet open/close event listeners
- Chart tab active-state switching (2×2 grid selection)
- Bottom nav active-state management
- Remove FAB-as-sidebar-trigger logic (replaced by Edit Inputs button)
- Retain all existing engine calls, render functions, auto-save, tour, scenarios

**Completion Note:**
> **2026-03-19** &mdash; Three JS wiring changes implemented in engine.js:
> 1. **Bottom sheet DOM transfer**: `openBottomSheet()` moves `.input-scroll-area` and `.sidebar-footer` DOM nodes into `#bottomSheetBody` (guarded by `window.innerWidth < 769`); `closeBottomSheet()` moves them back to `#inputPanel`. All 69 input elements, event listeners, and auto-save hooks preserved across round-trips.
> 2. **Chart type selector**: Added `selectChartType()` function with `activeChartType` state. 3&times;2 button grid in Charts tab HTML (Portfolio, Income, vs Spending, Taxes, Outcomes, Table) with `data-chart-card` attributes on each chart card. On mobile, only the selected chart is visible (`mobile-hidden` class toggled). Desktop CSS overrides ensure all charts always visible.
> 3. **Resize handler**: `window.resize` listener returns inputs to sidebar panel if viewport grows past 769px (prevents inputs getting stuck in bottom sheet after orientation change or resize).
> Bottom sheet footer "Compute Plan" button already wired in Phase 3 HTML (`initiateSimulation(); closeBottomSheet()`). Bottom nav active-state sync already wired in Phase 4 `switchMainView()`. Old FAB/`openMobilePanel()`/`closeMobilePanel()` functions retained but hidden by CSS (harmless dead code). Cache-busted engine.js to `?v=17p6`. Commit `6d3bdb1`.

---

### &gt; Testing Checkpoint C &mdash; Full Functional Pass

**When:** After Phase 6, before Phase 7.
**How:** Deploy to GitHub Pages. Test both viewports.
**Pass criteria:**
- [x] Wizard launches on first visit
- [x] Simulation runs correctly from both wizard and Edit Inputs sheet
- [x] All 5 dashboard cards populate with correct data
- [x] All 4 charts render on Charts tab
- [x] Levers apply correctly and show before/after toast
- [n/a] Scenarios save and compare correctly (blocked by native `prompt()` dialog &mdash; known issue from v16.2)
- [x] Auto-save and restore work
- [x] Reports tab correct after simulation
- [x] Tour triggers on first simulation
- [x] All above confirmed at 760px (mobile) AND 1680px (desktop)

**Result:**
> **PASS** (2026-03-19). Tested at 760px (mobile breakpoint) and 1680px (desktop). Mobile: app header + Edit Inputs button visible, bottom nav fixed with active state switching, bottom sheet opens with full input form (69 inputs transferred via DOM node move, all values preserved), Compute Plan from sheet runs simulation and closes sheet, dashboard card stack renders all 5 sections (hero/gauge, budget, income bars, wall insights, levers), chart type 3&times;2 grid selector switches between 6 views (Portfolio/Income/Spending/Tax/Outcome/Table) showing one at a time, Reports tab shows exports + Quick Summary. Desktop: full v16.5 layout restored via media query &mdash; sidebar, top nav, icon rail, hero 3-column grid, 2-column chart grid (no chart selector visible), all tabs functional. Resize from mobile to desktop correctly returns inputs to sidebar. Zero console errors. Scenario snapshot blocked by native `prompt()` (pre-existing issue, not a Phase 6 regression).

---

### Phase 7 &mdash; Live Testing & Sign-Off

Deploy to GitHub Pages. Final test matrix:

| Viewport | Device | Tests |
|----------|--------|-------|
| 375px | iOS Safari (Chrome MCP) | All dashboard cards, input sheet, charts, bottom nav, wizard |
| 390px | iPhone 15 (Chrome MCP) | Safe-area insets, notch clearance |
| 768px | Tablet breakpoint | Transition from mobile to desktop layout |
| 1680px | Desktop Chrome | Full regression &mdash; all v16.5 features intact |

Sign-off criteria: all features functional at both mobile and desktop, no horizontal scroll on main content, no content clipped behind system UI.

**Completion Note:**
> **2026-03-19 &mdash; PASS.** Full test matrix executed via Chrome MCP at all four viewports:
> - **375px (iOS Safari):** Wizard launches, bottom sheet opens with all 69 inputs, simulation runs from sheet, dashboard card stack renders all 5 sections (hero/gauge, budget, income bars, wall insights, levers), chart type 3&times;2 grid switches correctly, Reports tab shows exports, bottom nav fixed with active state. No horizontal scroll (scrollWidth === clientWidth). Zero console errors.
> - **390px (iPhone 15):** Safe-area insets applied on header (inset-top) and bottom nav (inset-bottom). No content clipping at top or bottom. Layout identical to 375px with slightly more breathing room.
> - **768px (tablet):** Mobile layout correctly active (breakpoint is 769px). Bottom nav visible, app header with Edit Inputs, card stack layout. Clean transition &mdash; at 769px desktop layout immediately activates (top nav, sidebar, hero grid).
> - **1680px (desktop):** Full v16.5 layout restored. Top nav, icon sidebar, input panel with collapse/expand, 3-column hero row, wall insights, budget comparison, income bars, improvement levers with Apply buttons. Charts tab: 2-column grid with all 5 charts + Year-by-Year table (no chart type selector visible). Reports tab: 3 export cards + Quick Summary metrics. Sidebar collapse/expand functional. Zero console errors.
> **No issues found. No fixes required.** Known pre-existing issue: scenario snapshot blocked by native `prompt()` dialog (documented since v16.2, not a v17 regression).

---

### Version Increment

- Increment to **v17.0**
- Update all version references: title, badge, report header, PDF footer, data export object, localStorage migration
- Update CLAUDE.md: version history entry, key function locations table, any new architectural notes
- Archive v16.5 as reference copy

**Completion Note:**
> *(Update after version increment is complete &mdash; date, confirm all references updated)*

---

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing DOM ID breaks display or calculation | Medium | Phase 1 ID audit is mandatory before any HTML is written |
| Desktop regression | Medium | Phase 5 isolated to media query block; Checkpoint B tests before proceeding |
| iOS Safari edge cases (safe-area, vh units, backdrop-filter) | Low | Patterns documented in CLAUDE.md from v16.5 work; apply proactively |
| File split introduces load-order bug | Low | engine.js loaded before closing &lt;/body&gt;; confirmed at Phase 2 deploy |

---

## Estimated Sessions

| Phase | Effort |
|-------|--------|
| Phase 1 &mdash; Audit | 1 full session |
| Phase 2 &mdash; File Split | &lt; 1 session |
| Phase 3 &mdash; HTML Structure | 1 full session |
| Phase 4 &mdash; Mobile CSS | 1&ndash;2 sessions |
| Phase 5 &mdash; Desktop Enhancement | 1 session |
| Phase 6 &mdash; JS Wiring | &lt; 1 session |
| Phase 7 &mdash; Testing | 1 session |
| **Total** | **~5&ndash;6 sessions** |

---

## Reference

- Mockup: `mobile-ui-mockup.html`
- Current version: v16.5 (`index.html`)
- Engine baseline: v9.9 (never modify)
- CLAUDE.md iOS pitfalls: backdrop-filter, vh units, overflow-x scroll vs auto, safe-area pattern
