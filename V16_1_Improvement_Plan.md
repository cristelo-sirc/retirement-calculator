# Retirement Architect &mdash; V16.1+ Improvement Plan

**Based on:** V16.0 live testing + feature gap analysis
**Date:** 2026-03-18
**Status:** Phase 1 COMPLETE (v16.1), Phase 2 COMPLETE (v16.2), Phase 2.5 COMPLETE (v16.3), Phase 2.6 COMPLETE (v16.4) &mdash; Phase 3 awaiting approval
**GitHub Repo:** https://github.com/cristelo-sirc/retirement-calculator
**GitHub Pages:** https://cristelo-sirc.github.io/retirement-calculator/

---

## Context

After shipping v16.0 (Mobile &amp; Accessibility), a live UX review via Chrome revealed two bugs and several high-value improvement opportunities. This plan combines bug fixes, UX enhancements, functional gaps, and modeling depth into a phased roadmap.

---

## Phase 1: Bug Fixes &amp; Quick Wins (v16.1)

Target: Fix confirmed bugs from live testing. No new features. Low risk.

**STATUS: COMPLETE &mdash; Shipped as v16.1 on 2026-03-18**

### 1.1 Mobile Input Panel &mdash; Missing Close Button &checkmark;

**Severity:** Critical (users are trapped)
**Finding:** At 375px viewport, the input panel overlay fills the entire screen. The X close button HTML/CSS existed but was in the panel header (scrolls off-screen). Escape did not dismiss it. Users who scrolled down in the panel had no visible way to close it.

**Implementation:**
- X close button was already wired (existed in v16.0 HTML + CSS) &mdash; confirmed functional
- Added Escape key handler for mobile panel in global keydown listener
- Added sticky "Done" bar at bottom of panel (always visible regardless of scroll position, thumb-friendly)
- Done bar hidden on desktop via `display: none` / `@media` override

**Validation:**
- [x] Done bar visible and functional at 375px
- [x] Escape key dismisses mobile overlay
- [x] Desktop layout unaffected (Done bar, close button, FAB all hidden)
- [x] Panel state preserved after close/reopen cycle

### 1.2 Lifespan Bar Label Collision &checkmark;

**Severity:** Minor (cosmetic, but looks broken)
**Finding:** At ages 77 (Poor Mkts) and 83 (Avg Mkts), the labels visibly overlap. The proximity threshold was 5 years with strict `<` comparison, so the 6-year gap at 77&ndash;83 was not caught.

**Implementation:**
- Increased `PROXIMITY_THRESHOLD` from 5 to 8
- Changed comparison from `gap < PROXIMITY_THRESHOLD` to `gap <= PROXIMITY_THRESHOLD`
- Result: 77/83 labels now alternate (Poor Mkts below, Avg Mkts above)

**Validation:**
- [x] Labels readable at 77/83 gap (confirmed desktop + mobile)
- [x] Well-spaced labels still display below bar (no unnecessary alternation at wide gaps)
- [x] Mobile lifespan bar labels clear and readable

### 1.3 Loading State for Compute &checkmark;

**Severity:** Low (UX polish)
**Finding:** v16.0 already had "Computing..." text and a 4px progress bar, but the button itself looked unchanged (same green, same icon). Easy to miss on fast runs.

**Implementation:**
- Button gets `.computing` class: gray background + `cursor: wait` + reduced opacity
- Rocket icon swaps to spinning `ph-spinner` with CSS `@keyframes spin`
- Extracted `restoreComputeButton()` helper for consistent state restoration (used by both normal completion and empty-results guard)
- Existing `setTimeout` already allows UI paint before simulation loop

**Validation:**
- [x] Button visually distinct during computation (gray + spinner)
- [x] Button re-enables with rocket icon after simulation completes
- [x] No interference with solver or revert

---

## Phase 2: UX Enhancements (v16.2)

Target: Interaction improvements that make existing features more useful. Moderate DOM changes, no simulation engine modifications.

**STATUS: COMPLETE &mdash; Shipped as v16.2 on 2026-03-18**

### 2.1 Clickable Improvement Levers &checkmark;

**Rationale:** The "Ways to Improve Your Plan" section currently shows static text suggestions (e.g., "Delay retirement by 5 years"). Users see the advice but have to manually find and change the inputs themselves. Making these one-click actions is the single biggest engagement opportunity.

**Proposed approach:**
- Each lever card gets an "Apply" button
- Clicking "Apply" programmatically updates the relevant input(s) in the sidebar:
  - "Delay retirement by 5 years" &rarr; set `retireAge` += 5
  - "Reduce spending by 20%" &rarr; set `lifestyleSpending` *= 0.8
  - "Reduce spending by 10%" &rarr; set `lifestyleSpending` *= 0.9
  - (Other levers TBD based on `calculateLevers()` output)
- Auto-triggers `initiateSimulation()` after applying
- Shows a brief before/after comparison toast: "Success rate: 8% &rarr; 34%"
- "Undo" option via existing Revert to Last Run (snapshot captured pre-apply)

**Risks:**
- Levers that modify multiple inputs simultaneously need careful sequencing
- Some levers may conflict (e.g., applying "delay retirement" twice)
- Need to handle levers that reference optional features (e.g., "Enable part-time work" lever when the toggle is off)

**Alternatives considered:**
- Preview-only mode (show projected improvement without applying) &mdash; lower friction but less actionable
- Side-by-side before/after dashboard &mdash; higher complexity, better suited for Phase 3 scenario comparison

**Validation:**
- [x] Each lever card has clickable "Apply" button
- [x] Inputs update correctly after apply
- [x] Simulation re-runs automatically
- [x] Revert to Last Run restores pre-apply state (fixed double-snapshot bug)
- [x] Applied lever is visually indicated (disabled + green "Applied" state)
- [x] No double-apply issues

### 2.2 Scenario Save &amp; Compare Enhancement &checkmark;

**Rationale:** The What-If Scenarios tab has a "Saved Snapshots" area and "Snapshot Current Plan" button, but the current implementation is basic &mdash; no naming, no side-by-side comparison, no persistence across sessions. This is the most natural "what happens if I..." workflow.

**Proposed approach:**
- **Name scenarios:** Prompt for a name when saving (default: "Scenario 1", "Scenario 2", etc.)
- **Comparison table:** When 2+ scenarios are saved, show a comparison table with key metrics side-by-side:
  - Success rate, sustainable spending, runway age, legacy, lifetime tax
  - Delta column highlighting improvements/regressions (green up-arrow / red down-arrow)
- **Persist to localStorage:** Save scenarios alongside auto-save data (separate key: `retirementArchitect_scenarios`)
- **Limit:** Max 5 saved scenarios (prevent localStorage bloat)
- **Delete:** Allow removing individual scenarios
- **Load:** Click a scenario to restore its inputs (with confirmation prompt since it overwrites current inputs)

**Risks:**
- localStorage has ~5MB limit; 5 scenarios with full input sets should be well under 100KB
- Version migration needed if input schema changes in future versions
- "Load" action overwrites current state &mdash; must integrate with Revert to Last Run

**Validation:**
- [x] Can name and save scenarios
- [x] Comparison table renders with 2+ scenarios
- [x] Delta indicators correct (green for better, red for worse)
- [x] Scenarios persist across page reloads (localStorage)
- [x] Can delete individual scenarios
- [x] Loading a scenario restores all inputs including toggle states (with confirm dialog + revert snapshot)
- [x] Max 5 scenario limit enforced with user-friendly message

### 2.3 New User Onboarding Tour &checkmark;

**Rationale:** The Guided Setup wizard is great for input collection, but first-time users who complete it land on a dashboard full of unfamiliar visualizations (gauge, lifespan bar, budget bars, wall insights) with no explanation of what they mean or what to do next.

**Proposed approach:**
- Lightweight tooltip-based tour (not a modal wizard) triggered on first simulation
- 5&ndash;6 steps highlighting key dashboard elements:
  1. Success gauge: "This is your plan's probability of lasting through retirement"
  2. Lifespan bar: "This timeline shows when your money may run out under different market conditions"
  3. Budget comparison: "Your spending today vs. what the plan can sustain"
  4. Budget bars: "Where your retirement income comes from at each life stage"
  5. Improvement levers: "Quick actions to strengthen your plan"
  6. What-If tab: "Save and compare different scenarios"
- Dismissible, with "Don't show again" preference stored in localStorage
- Re-accessible from a help menu or footer link

**Risks:**
- Tour elements depend on DOM IDs that could change
- Must not trigger for returning users with auto-save data
- Mobile layout positions elements differently &mdash; tour positioning must adapt

**Alternatives considered:**
- Inline contextual hints (persistent "?" badges near each section) &mdash; less intrusive but less discoverable
- Video walkthrough link &mdash; lowest implementation effort but requires external hosting

**Validation:**
- [x] Tour triggers on first simulation for new users
- [x] Does not trigger for returning users
- [x] All 5&ndash;6 steps position correctly on desktop
- [x] All steps position correctly on mobile (375px)
- [x] "Don't show again" persists across reloads
- [x] Can be re-triggered from help/footer link
- [x] Tour doesn't interfere with tooltips or modals

---

## Phase 3: Modeling Depth (v16.3 / v17.0)

Target: Simulation engine enhancements. Higher risk &mdash; touches core math. Requires rigorous validation against v9.9 baseline where applicable.

### 3.1 Roth Conversion Optimizer

**Rationale:** The current Roth conversion feature is a simple toggle with a fixed annual amount. Users have no guidance on the *optimal* conversion amount &mdash; the amount that minimizes lifetime tax by filling up lower tax brackets without triggering IRMAA surcharges or pushing into higher brackets.

**Proposed approach:**
- New solver mode in the What-If Scenarios tab: "Optimize Roth Conversions"
- Uses the existing binary search solver pattern (`calculateSustainableSpending`) adapted for a different objective function
- **Objective:** Minimize lifetime tax (sum of federal + state + IRMAA across all years)
- **Decision variable:** Annual Roth conversion amount (tested across range, e.g., $0 to $200K in $5K increments)
- **Constraints:**
  - Don't exceed a specified tax bracket ceiling (user-selectable: 22%, 24%, 32%)
  - Don't trigger IRMAA (or allow user to accept IRMAA if net benefit is positive)
  - Only convert during the "gap years" (retirement to RMD start at 75)
- **Output:** Recommended annual conversion amount, projected tax savings vs. no conversion, year-by-year comparison chart

**Risks:**
- This is a multi-variable optimization (conversion amount AND conversion window) that interacts with SS taxation, IRMAA, state tax
- The current simulation runs a single conversion amount for all years in the window; a truly optimal strategy varies by year
- TCJA sunset (2026) changes the bracket landscape mid-plan
- Computationally heavier: may need to run multiple full simulations (grid search, not just binary search)

**Alternatives:**
- **Option A: Bracket-filling heuristic** (simpler) &mdash; Calculate available room in the target bracket each year, convert up to that amount. No optimization loop needed. Fast but not globally optimal.
- **Option B: Grid search** (moderate) &mdash; Test 10&ndash;20 conversion amounts, pick the one with lowest lifetime tax. Runs 10&ndash;20x simulations. Good enough for most cases.
- **Option C: Year-by-year dynamic optimization** (complex) &mdash; Optimize each year's conversion independently. Most accurate but dramatically more complex and slower.

**Recommendation:** Option B (grid search) balances accuracy with complexity. Option A as a fast preview/estimate shown before running the full solver.

**Validation:**
- [ ] Recommended amount is within the target tax bracket
- [ ] Lifetime tax with optimization < lifetime tax without (verified numerically)
- [ ] IRMAA threshold respected when constraint is active
- [ ] Results consistent across multiple runs (deterministic PRNG)
- [ ] Edge case: no pre-tax balance &rarr; optimizer gracefully reports "nothing to convert"
- [ ] Edge case: already in retirement &rarr; shorter conversion window

### 3.2 Sequence-of-Returns Visualization

**Rationale:** Monte Carlo success rate tells you *how often* plans fail but not *why*. The primary driver of failure is sequence-of-returns risk: poor market returns in the first 5&ndash;10 years of retirement deplete the portfolio before recovery can help. Showing this builds intuition and motivates the guardrails feature.

**Proposed approach:**
- New visualization on the Charts tab or Dashboard: "Why Plans Fail"
- **Chart type:** Scatter or strip plot showing first-5-year annualized return (x-axis) vs. portfolio depletion age (y-axis) for all simulated paths
- Color-coded: green dots (survived to end), red dots (depleted early)
- Clear visual cluster: failed paths overwhelmingly have negative early returns
- Optional: overlay a "danger zone" shading for first-5-year returns below -2%

**Data source:** Already available in `lastSimulationResults.paths` &mdash; just needs to extract the first N years of returns per path and the depletion age. No simulation engine changes.

**Risks:**
- 500 dots on a scatter plot may be visually noisy &mdash; may need jitter or density binning
- Need to store per-year return data in pathLog (currently not tracked &mdash; only `stockAlloc` is stored, not the actual return drawn)
- Adding `annualReturn` to pathLog increases memory per path

**Alternatives:**
- **Histogram of depletion ages** (simpler) &mdash; shows distribution of outcomes without the return correlation. Less educational but no engine changes.
- **"Bad decade" annotation** on the existing Portfolio Balance chart &mdash; highlight the P10 band's first 10 years with a red overlay. Minimal new code.

**Recommendation:** Start with the histogram alternative (zero engine changes, quick win) and add the scatter plot in a later version when pathLog tracks returns.

**Validation:**
- [ ] Chart renders with current simulation data
- [ ] Visual clearly shows the return&ndash;failure correlation
- [ ] No performance degradation at 500+ paths
- [ ] Chart responsive on mobile
- [ ] Existing charts unaffected

### 3.3 Survivor Modeling

**Rationale:** For couples, the death of one spouse is the biggest financial discontinuity in the plan: one Social Security benefit drops (replaced by survivor benefit if higher), spending decreases, filing status changes from MFJ to Single (higher tax rates at same income), and one set of healthcare costs disappears. Currently the simulation assumes both spouses live to `endAge`.

**Proposed approach:**
- New optional toggle in the Profile section: "Model Spouse Mortality"
- **Input:** Spouse life expectancy (or mortality age), default = endAge (current behavior)
- **Simulation changes** (in `simulatePath()`):
  - At spouse death age:
    - SS switches to max(own benefit, survivor benefit) &mdash; the lower one drops
    - Spouse pension income stops (unless survivor benefit specified)
    - Spending reduces by a configurable percentage (default: 25%, based on USDA equivalence scale)
    - Filing status changes from MFJ to Single (affects tax brackets, standard deduction, IRMAA thresholds)
    - Spouse healthcare costs stop; survivor Medicare costs continue
    - Spouse retirement accounts become inherited (no separate RMD schedule change for surviving spouse)
  - Before spouse death age: everything works as today

**Risks:**
- **This modifies the core simulation engine** &mdash; highest-risk change in this plan
- Tax bracket switching mid-simulation (MFJ &rarr; Single) requires conditional bracket tables
- SS survivor benefit calculation has its own rules (different from spousal benefit)
- Many edge cases: spouse dies before retirement, before SS claiming, before RMD age
- Must maintain backward compatibility: when toggle is off, behavior is identical to current

**Scope estimate:** This is likely a v17.0-level change (major version) due to the breadth of simulation engine impact.

**Validation:**
- [ ] Toggle off: simulation results identical to v16.x (byte-for-byte on deterministic seed)
- [ ] Toggle on, spouse mortality = endAge: results identical to toggle off
- [ ] SS correctly switches to survivor benefit at spouse death
- [ ] Spending reduction applied at spouse death
- [ ] Tax brackets switch from MFJ to Single at spouse death
- [ ] Spouse pension stops at spouse death
- [ ] All downstream consumers updated: pathLog, charts, budget bars, Year-by-Year table, PDF report
- [ ] Edge case: spouse younger than user, dies after user's endAge &rarr; no change
- [ ] Edge case: spouse dies before retirement &rarr; SS/pension adjustments still correct

---

## Phase 2.5: Outcome Distribution Chart (v16.3)

Target: New visualization on Charts tab. Zero simulation engine changes.

**STATUS: COMPLETE &mdash; Shipped as v16.3 on 2026-03-19**

### Outcome Distribution Histogram &checkmark;

- New "When Plans Fail" histogram on Charts tab showing how simulated paths end
- Green bar for paths surviving to plan end, red gradient for depletion ages
- Uses existing `depletionAge` data from `lastSimulationResults.paths`
- Tooltips show path count and percentage at each age
- Responsive on mobile

---

## Phase 2.6: UX Polish (v16.4)

Target: Address lower-priority UX issues noted during live testing. Display-only changes, no engine impact.

**STATUS: COMPLETE &mdash; Shipped as v16.4 on 2026-03-19**

### Items Addressed &checkmark;

| Issue | Fix |
|-------|-----|
| Gauge takes disproportionate space | Reduced hero row grid from 280px to 220px; gauge wrapper 160px&rarr;140px, padding tightened |
| Budget bar "gap" label confusing | Changed to "&minus;$Xk/yr shortfall" with title tooltip explaining it&rsquo;s annual |
| SS display format mismatch | Verified: input label says "Annual SS Benefit" and Inputs card shows "/yr" &mdash; already consistent, no change needed |
| What-If empty state lacks guidance | Replaced with 4-step workflow instructions: run simulation &rarr; adjust inputs &rarr; snapshot &rarr; compare |
| Levers don&rsquo;t show which inputs change | Added "Changes: Retirement Age" (etc.) detail line below each lever description |
| Scenario comparison table horizontal scroll | Removed `overflow-x: auto` on desktop, added `table-layout: fixed`, removed `white-space: nowrap` from headers/labels. Mobile retains `overflow-x: auto` as fallback. |

---

## Phase Summary &amp; Version Roadmap

| Version | Phase | Scope | Risk | Engine Changes |
|---------|-------|-------|------|----------------|
| **v16.1** | Phase 1 | Bug fixes: mobile close, label collision, loading state | Low | None | **SHIPPED** |
| **v16.2** | Phase 2 | Clickable levers, scenario compare, onboarding tour | Medium | None | **SHIPPED** |
| **v16.3** | Phase 2.5 | Outcome Distribution histogram | Low | None | **SHIPPED** |
| **v16.4** | Phase 2.6 | UX polish (gauge, gap label, empty state, levers, comparison table) | Low | None | **SHIPPED** |
| **v17.0** | Phase 3 | Survivor modeling | High | Major (simulatePath core changes) |

---

## Implementation Rules (All Phases)

Per CLAUDE.md and project working style:

1. **No code changes without explicit approval** of each phase
2. **Version increment** with systematic updates to all version references
3. **Post-change audit** verifying outcomes: "Is it fixed AND is everything else still working?"
4. **Zero-trust on AI output** &mdash; verify changes work before delivery
5. **Simulation engine changes (Phase 3 only)** require deterministic seed comparison against v16.0 baseline
6. **Mobile regression** required for all phases (375px viewport test)
7. **Claude is responsible for all testing** &mdash; including live browser testing against the deployed GitHub Pages URL via Chrome MCP. This means running the app, interacting with UI elements, verifying visual output, testing at both desktop (1680px) and mobile (375px) viewports, and confirming functionality end-to-end. Cris does not code or test; Claude must validate before delivering.

---

## Change Log

| Date | Change |
|------|--------|
| 2026-03-18 | Initial plan drafted from live UX review and feature gap analysis |
| 2026-03-18 | Phase 1 (v16.1) implemented, deployed, and live-tested at 1680px + 375px viewports. All 3 fixes validated. |
| 2026-03-18 | Phase 2 (v16.2) implemented and deployed. Clickable improvement levers with Apply buttons, before/after toast, and revert integration. Scenario save &amp; compare with named scenarios, localStorage persistence, max 5 limit, comparison table with delta indicators. Onboarding tour with 6-step tooltip walkthrough, localStorage dismissal, re-trigger link. Live-tested at desktop + mobile viewports. |
| 2026-03-19 | Phase 2.5 (v16.3) implemented and deployed. Outcome Distribution histogram on Charts tab showing depleted vs. survived paths by age. Zero engine changes. Live-tested at desktop + mobile. |
| 2026-03-19 | Phase 2.6 (v16.4) implemented and deployed. UX polish: gauge sizing reduced (280px&rarr;220px), gap label clarified ("/yr shortfall" + tooltip), What-If empty state with workflow guidance, lever detail text showing changed inputs, scenario comparison table horizontal scroll fixed via `table-layout: fixed`. Live-tested at desktop + mobile. |
