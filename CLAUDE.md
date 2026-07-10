# CLAUDE.md &mdash; Retirement Architect

---

## Project Overview

Browser-based retirement planning calculator with Monte Carlo simulations. As of **V18.0** the
front end is a React "Compass" app: `index.html` is a thin shell that loads the
components in `cover-app/`, backed by the **real Monte Carlo engine** (`engine.js`) through the
`real-engine.js` adapter. `engine.js` is reused as a pure math library &mdash; only its DOM init is
bypassed. **Note (V19.11):** the app previously shipped a second, byte-identical entry page
(`cover.html`, a leftover staging URL from the V18 redesign) &mdash; removed in V19.11 since nothing
in the code, tests, or deploy pipeline referenced it and keeping two files in sync was a standing
drift risk. There is now exactly one entry page. **Note:** five releases intentionally modify `engine.js` math: **V18.11** (contribution accumulation, IRMAA per-person + 2yr lookback, growing caps), **V19.5** (deep engine-accuracy audit), **V19.6** (additive &ldquo;ever went broke&rdquo; flag), **V19.9**, and **V19.10**. V19.9/V19.10 are detailed below; earlier releases are summarized in the Version History section and detailed in `CLAUDE-legacy.md`.

Pre-V18 UI architecture (legacy imperative-DOM app, full v9.9&ndash;v17.6 history) AND the detailed
V18.0&ndash;V19.8 release sections (moved 2026-07-07) are archived in **`CLAUDE-legacy.md`**.

**Current Version:** 19.11
**Project Location:** `/Users/cristelogarza/Claude Code/Retirement Calculator`
**GitHub Repo:** https://github.com/cristelo-sirc/retirement-calculator
**GitHub Pages:** https://cristelo-sirc.github.io/retirement-calculator/
**Tech Stack:** HTML5, CSS3, React + Babel (self-hosted in `vendor/` as of V19.11; previously CDN), Chart.js v3.9.1, localStorage (`compassParams`)
**Encoding:** Use HTML entities (`&mdash;` `&rarr;` `&middot;`) not Unicode to prevent mojibake

**Documentation map:** `README.md` is the short public orientation; `CHANGELOG.md` is the concise release
record; this file is the technical source of truth; `CLAUDE-legacy.md` preserves the pre-V18 architecture and the detailed V18.0&ndash;V19.8 release history.
`BACKLOG.md` and audit reports are local working records and are intentionally not published.

---

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

### Model &amp; Subagent Policy (standing rule, added 2026-07-03)

Two-layer workflow to conserve usage without compromising accuracy:

- **The session model is the brain.** Planning, risk analysis, code review, deploy/git operations, and the
  final live-browser audit are done by the main chat session model &mdash; never delegated. Cris selects the
  session model in the app (Fable while available; Opus thereafter).
- **Sonnet subagents execute mechanical steps.** Once a plan is approved, well-specified mechanical work
  (version/cache-buster bumps, copy changes, UI relocations, test boilerplate) may be delegated to a subagent.
  **Always explicitly set the subagent model to Sonnet** &mdash; an unspecified subagent inherits the session
  model, silently defeating the savings.
- **Subagent briefs must be self-contained.** Subagents start cold with none of the chat context. Each brief
  must include: exact files and exact changes, completion criteria, and the relevant environment gotchas
  (FUSE mount cannot unlink/rename &mdash; no git writes in this folder; cache-buster discipline on every
  content change; HTML entities not Unicode).
- **Never delegate:** `engine.js` math, adapter scoring logic (`real-engine.js` success/scoring), anything
  where accuracy risk was flagged, git/deploy, or verification. The session model audits ALL subagent output
  against the plan before proceeding.

---

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

---

## Development Workflow
1. Propose changes and await approval
2. Implement after approval
3. Work on a scoped branch; stage only intended files; commit and publish through a pull request into `main`
4. Let GitHub Pages deploy the merged `main` checkpoint
5. Live browser test against the deployed URL &mdash; desktop and mobile
6. Comprehensive audit (pre/post) confirming outcomes, not just implementation
7. Version increment: run `node scripts/bump-version.mjs <new-version>` (added 2026-07-07) &mdash; it updates ALL 17 live version references at once (both `<title>` tags, every `?v=` cache-buster, and the `engine.js?v=` cache-buster in `real-engine.js` &mdash; without that one browsers can serve a stale engine against new HTML). Never bump versions by hand; manual bumps shipped a 19.10/19.10b mix.

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
- **`totalWithdrawal` is DISCRETIONARY ONLY (verified 2026-07-03, V19.2):** it sums the converged
  `wdTaxable + wdPreTax + wdRoth` and does NOT include RMD. Total portfolio outflow = `rmd +
  totalWithdrawal` (how the V18.11 paycheck and the V19.2 table both compute it). The
  `discretionaryWithdrawal` field (`max(0, totalWithdrawal - totalRmd)`) is therefore misleading
  &mdash; it subtracts RMD from a figure that never contained it; do not use it for new features.

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
Per the SECURE 2.0 Act, RMDs begin at age 75 for individuals born in 1960 or later. `getDistributionPeriod()` returns 0 for ages < 75. Distribution periods extend through age 119 with an explicit 2.0 for ages 120+ (V19.5, F-RMD-110 fix, verified against 26 CFR 1.401(a)(9)-9 Table 2). An earlier version of this note said the divisor floored at 3.5 beyond age 110 &mdash; that described pre-V19.5 behavior and is no longer correct.

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

## Version History (V18.0&ndash;V19.8) &mdash; summaries only

Full detailed sections for these releases were moved verbatim to **`CLAUDE-legacy.md`** (Part II) on 2026-07-07.

- **V18.0** &mdash; React "Compass" rebuild; `engine.js` reused as pure math via the `real-engine.js` adapter; rollback branch `pre-reskin-v17.6`.
- **V18.1** &mdash; every engine input exposed in the Questionnaire; flat state-tax %; filing status derived from partner toggle.
- **V18.2** &mdash; Welcome launch screen; file Save/Load (`CompassIO`; defensive `parsePlan` merges only known DEFAULTS keys).
- **V18.3** &mdash; Save/Load callouts surfaced at the top of Cover + Questionnaire.
- **V18.5** &mdash; deterministic seeded RNG &rarr; identical odds on every screen; TCJA toggle relabeled "Assume higher future tax rates"; version-string hygiene.
- **V18.6** &mdash; `numPaths` single source + user-facing path-count control.
- **V18.7** &mdash; `legacyGoal` binds the success test (flat future-dollar amount, graded on `finalBalance` in the adapter); lever deltas apples-to-apples.
- **Repo maintenance 2026-06-15** &mdash; superseded files removed from repo; `scripts/deploy.sh` added (now fallback-only); `.gitignore` tightened.
- **V18.8** &mdash; default 5,000 paths (max 10,000); helper estimates proportional to path count.
- **V18.9** &mdash; hotfix: fan-chart max via linear scan (spread-args `RangeError` blanked the app at high path counts).
- **V18.10** &mdash; audit pass 1 (app-only): SS move = both partners everywhere; goal-aware headline label; `normalizeParams` validation + path cap; true P10/P50/P90 fan chart.
- **V18.11** &mdash; audit pass 2 (ENGINE MATH): contribution-accumulation fix (contributions were silently discarded every year; DEFAULTS 42&rarr;61); IRMAA per-person + 2-yr lookback; contribution caps grow with inflation; wages in pathLog + paycheck reconciliation.
- **V18.12** &mdash; exact typed questionnaire entry (`numeric-entry.js` + tests).
- **V18.13** &mdash; V17 spending contract restored (`spending` EXCLUDES housing &amp; healthcare; `propertyTax` = property tax + homeowners insurance combined); no spending drawn during accumulation; fixed mortgage not inflated.
- **V18.14** &mdash; employee/employer contribution split per person; 2026 statutory limits/brackets/IRMAA baselines.
- **V19.0** &mdash; explicit elapsed-year timeline (`age` vs `balanceAge`; inherited off-by-one fixed); `priorYearWages` + employer-contribution destinations; input-coverage test contract.
- **V19.1** &mdash; UX batch: one editing model (Cover moves stage Rework drafts), sticky nav, honest sample state, live score chip.
- **V19.2** &mdash; year-by-year table (Average/Rough/Strong storyline views) + permanent balance-identity invariant; confirmed `totalWithdrawal` excludes RMD.
- **V19.3** &mdash; four tabs (Input Data &middot; Results &middot; Try Changes &middot; Charts); `computeMoves` = single full-count source for every move delta.
- **V19.4** &mdash; mobile parity decision: two-tab companion, disclosed in copy (Option A sketch in BACKLOG.md).
- **V19.5** &mdash; ENGINE MATH: 8 accuracy fixes (phantom Roth-conversion tax; SS earnings-test double-inflation; IRMAA convergence skip; cap-gains standard-deduction floor; surplus banked to taxable as `surplusBanked`; post-depletion recovery on new money; RMD table through 119; IRMAA tier-4 cent).
- **V19.6** &mdash; honest scoring: additive `everDepleted` latching flag; success = never went broke; `firstDepletionAge` danger-age insight.
- **V19.7** &mdash; Results context: "Your Plan at a Glance" + "How It Could Play Out" (`roughLegacy`/`strongLegacy` additive, equal to yearTables finals).
- **V19.8** &mdash; four-tier verdict (On Track 90 / Tight 80 / Shaky 65 / At Risk) + app-wide small-label legibility (`ink70`).

---

## Standing Environment &amp; Process Lessons

Consolidated from the release sections above (full context in `CLAUDE-legacy.md`); these hold regardless of version.

- **This project folder is FUSE-mounted: `unlink`/`rename` are normally blocked.** A failed `git commit` here can leave a permanent `.git/index.lock`, so do all git WRITES (`add`/`commit`/`merge`/`push`) in a disposable clone under `/tmp`, syncing edited files over with `cp`. Read/Write/Edit and read-only git in this folder are fine. File deletion CAN be enabled per-session via Cowork's delete-permission prompt (used for the 2026-07-07 doc cleanup), but the /tmp-clone pattern remains the standard for git writes.
- **`/tmp` persists across sessions with a different owner** &mdash; use a fresh clone directory name each session.
- **Push auth:** fresh /tmp clones have no credentials; the token lives in gitignored `data/deploy-token.txt`, used as `https://x-access-token:<token>@github.com/...`. The token lacks `workflow` scope &mdash; any change under `.github/workflows/` needs Cris's web-UI commit.
- **`api.github.com` and `*.github.io` are blocked by the sandbox proxy allowlist.** Deployed-site checks must run in the browser (Chrome MCP); Actions/Pages status is readable via a browser-context `fetch('https://api.github.com/...')` (public repo, CORS-allowed).
- **Cache-buster discipline applies to EVERY content change,** not just version boundaries: any edit shipped after the including HTML was already fetched needs its own `?v=` bump (V19.1 lesson).
- **Live-test discipline:** back up `localStorage['compassParams']` before testing and restore after; open every screen at 10,000 paths (V18.9 lesson); the untouched-DEFAULTS regression gate is **64/100**; Chrome MCP `resize_window` is intermittently ignored &mdash; verify the rendered layout in the screenshot, fall back to asking Cris to resize (Chrome's ~500px minimum still renders the mobile component, breakpoint 769).
- **Grade flows against executable invariants, not documentation** (V19.2 lesson); when explaining a computed/derived value, compare against the computed value itself, not the raw inputs that feed it (V19.1 lesson).
- **Use HTML entities, not Unicode,** in app copy and docs (mojibake prevention).

---

## Deploy pipeline replaced — 2026-07-04 (legacy branch-build &rarr; custom Actions workflow)

Not an app version (no `?v=` bump; nothing in `cover-app/` or `engine.js` touched). Fixes the
GitHub Pages "Deploy to GitHub Pages" step that had failed transiently three times across
V19.2&ndash;V19.4 (build always succeeded; only the publish step flaked, for no reason visible from
outside GitHub's own infrastructure).

**Root cause, as far as it's diagnosable from outside GitHub.** The repo was on Pages' legacy
**"Deploy from a branch"** source. In that mode GitHub runs its own hidden build+deploy pipeline
(visible in Actions only as an opaque **"pages build and deployment"** run with no workflow file in
the repo) &mdash; unrelated to Jekyll content, it ran a Jekyll build step regardless (this site is
plain HTML/JS and never needed one), and there was no file we could edit to add a safety net when
the publish step flaked. We could not get GitHub's exact error text for the failures: an
unauthenticated log request came back `403`, and a follow-up attempt using the stored deploy token
to authenticate was correctly refused by a safety check before the token could be printed into a
visible tool call. The diagnosis is therefore built from the observable pattern (build succeeds,
deploy fails in ~8 seconds, no fixed correlation to push timing) plus the fact that this is a
widely-reported class of flakiness in that legacy pipeline specifically.

**Fix shipped:** `.github/workflows/deploy.yml` &mdash; checkout &rarr; `actions/configure-pages` &rarr;
`actions/upload-pages-artifact` (path `.`, no Jekyll) &rarr; `actions/deploy-pages`, with the deploy
step retrying itself up to **3 attempts** (20s then 30s backoff) before failing the job. Confirmed
free on GitHub Free for public repos (no plan upgrade needed) and not subject to the legacy
pipeline's 10-builds/hour soft cap.

**Manual step required, done by Cris:** repo Settings &rarr; Pages &rarr; Build and deployment &rarr;
Source, switched from "Deploy from a branch" to "GitHub Actions". Verified via the Actions API
(browser-context fetch, since `api.github.com` is blocked by the sandbox proxy) that the very next
push after the switch triggered **only** the new "Deploy to GitHub Pages" workflow &mdash; the
legacy "pages build and deployment" run did not fire &mdash; and that run succeeded on its first
attempt.

**Environment/process lesson: the deploy token lacks `workflow` scope, by design.** Pushing
`.github/workflows/deploy.yml` from the `/tmp` clone was rejected: `refusing to allow a Personal
Access Token to create or update workflow ".github/workflows/deploy.yml" without \`workflow\`
scope`. This is GitHub enforcing least-privilege on the token, not a bug. Cris added the file
himself via the GitHub web UI (Add file &rarr; Create new file) instead of us broadening the
token's scope. **Any future change to a file under `.github/workflows/` needs the same
web-UI hand-off (or Cris granting the token `workflow` scope first)** &mdash; a normal content push
from the `/tmp` clone will not work for that one directory.

**Standing reminder added:** if a future Pages deploy ever fails again, check which pipeline
produced the failing run first (`"pages build and deployment"` = legacy, should not exist anymore;
`"Deploy to GitHub Pages"` = ours). If it's ours, the 3-attempt retry already ran and still lost —
that's a stronger signal than the old single-shot legacy failures ever gave, and is worth showing
Cris directly rather than silently re-pushing.

---

## V19.9 &mdash; Deep-review fix batch (AUDIT-2026-07-06-DEEP-REVIEW): 4 release-blockers + P2/P3 + 1 new input

Fourth intentional `engine.js` math release (after V18.11, V19.5, V19.6). Addresses
`AUDIT-2026-07-06-DEEP-REVIEW.md` in one batch, per Cris's instruction to fix everything in one pass.
Two-tier verification (Cris's explicit choice): Tier A (app-only) got light verification; the engine-math
release-blockers (B1&ndash;B4, B6) each got targeted permanent invariant tests. Suite grew **86 &rarr; 95
tests, all passing, 0 todo** (the F-PT-EARNTEST-ATTRIB todo is now a real passing test). `DEFAULTS` score
**unchanged at 64** (regression gate held through every change).

### Tier A (UI / copy / adapter-exposition; zero Monte Carlo math change)

- **A1 &mdash; IRMAA tier-4 corrected: $529.70 &rarr; $529.60** (`engine.js`). CMS 2026 tier-4 is Part B
  **$446.30** + Part D $83.30 = **$529.60**; V19.5 changed it to $529.70 citing Part B 446.40, which was
  wrong per the official CMS 2026 fact sheet (re-verified live 2026-07-06). Test oracle in
  `audit-statutory.test.js` corrected too. **This reverses a V19.5 "fix"** &mdash; documented as a dated
  correction, not a silent rewrite.
- **A2 &mdash; recovery-semantics display (audit P1 #4), display-only.** Plans that went broke then
  recovered read "money lasts the full plan" while scoring 0/100, because runway/longevity/banner display
  logic still read the end-state `depletionAge` (which V19.5 clears on recovery) instead of the V19.6
  latching `everDepleted`/`firstDepletionAge`. Adapter now exposes `medianDepletion`
  `{everDepleted, firstDepletionAge, recovered, endAge}` and an honest `runwayYears` (based on the median
  path's FIRST depletion); `cvOutcomes` (shared desktop+mobile) and the year-table banner
  (`retire-charts.jsx`) state both facts on recovery. No dollar changed.
- **A3 &mdash; move-card boundary honesty (audit P2).** `computeMoves()` and the Rework levers now hide the
  "delay retirement" move when the 80-cap leaves no room, and decide SS-move eligibility PER-PARTNER (was
  user-only, so "all together" silently moved a spouse the card never listed). Cards, bars, and staged
  drafts derive from the same applicable-patch set.
- **A4 &mdash; future-dollar labels (audit P2).** Rough/median/strong ending balances and the legacy goal
  are labeled future (nominal) dollars, with a note pointing to the Charts today's-dollars toggle. Copy only.
- **A5 &mdash; accessibility (audit P2/P3).** Primary desktop nav is now real `<button>`s (tab stop,
  Enter/Space, `aria-current`); the Results masthead was lifted OUT of the 900px hero section so it stays
  sticky down the whole page; `ink70` darkened 60%&rarr;65% opacity (`#1a1815a6`) to clear WCAG AA (measured
  5.28:1 / 5.11:1 on the two creams, vs the sub-4.5:1 before); `aria-pressed` added to the year-table
  segmented controls.
- **A6 &mdash; responsive polish (audit P3).** Mobile tab selection now syncs to the shared shell `screen`
  so crossing the desktop/mobile breakpoint keeps the same screen; the giant Results score uses
  `clamp(200px,26vw,360px)` so it stops dominating at the 769px breakpoint; welcome masthead gap + "No. 5"
  wrap fixed; mobile paycheck note rewritten as a standalone sentence.
- **A7 &mdash; CI test gate + scratch cleanup.** `.github/workflows/deploy.yml` gains a required `test` job
  (`node --test tests/*.test.js`) that `build` depends on, so a red suite can't publish. `_harness.js`/`_h2.js`
  gitignored. **NOTE:** the workflow file needs Cris's web-UI commit (the deploy token lacks `workflow` scope).

### Tier B (engine math / broad surface; each with a permanent invariant test)

- **B1 &mdash; tax convergence + household-cash invariant (audit P1 #2). `engine.js` math changed.** The
  convergence loop hard-stopped after 5 passes even when unconverged, so tax-heavy years (e.g. large Roth
  conversions) left thousands of dollars of spending/tax UNFUNDED while the path was still solvent (the audit
  repro: $1M pre-tax / $200k spend / $500k conversion left a $4,011 shortfall). Fix: raised the pass cap to
  100 and converge only when BOTH tax and need are stable within $1; normal years still break in 3&ndash;5
  passes (no perf cost). **New permanent invariant** (`audit-cash-identity.test.js`): for every fully-retired
  solvent year, `guaranteed income + portfolio withdrawals == spending + taxes + surplus banked` within $2,
  across a scenario grid. The audit repro now funds to $0.52. This is the lens that was missing when the bug
  shipped (portfolio conservation stayed true throughout).
- **B2 &mdash; sustainable-spending solver rebuilt (audit P1 #1).** Old solver assumed $20k was feasible
  (reported "$20,000 safe" for 0/100 plans), capped the ceiling at max($80k, 2&times;spend) and never
  expanded it, and reported an unverified figure. Rebuilt with **adaptive bracketing** (walks the floor down
  toward $0; expands the ceiling up to a $2M cap while it still passes) and returns **null ("None")** when no
  level reaches ~90%. **Cris's speed/accuracy decision:** the figure is a FAST bisection ESTIMATE at the
  sample count (keeps live recompute ~1s) rather than a full-count-verified number (which tripled recompute
  time), and is LABELED an estimate ("~" prefix + "estimate for ~90% success"). Test:
  `sustainable-spending.test.js`.
- **B3 &mdash; shared parameter normalization (audit P1 #3). Broadest UI surface.** Cross-field rules
  (age ordering, ranges) were enforced only inside a private copy in `compute()`, so the form could show
  current age 65 / retirement 65 while the engine used 66 &mdash; displayed, persisted, saved, and computed
  params disagreed. Fix: BOTH HTML shells now normalize every params write at the single `setParams`
  boundary (`normalizeParams`), so displayed == persisted == saved-file == `results.params`, always. When a
  dependent field is auto-corrected, a friendly note (`cvAdjustMessage`, surfaced in both questionnaire
  layouts) tells the user what changed. Invariant relies on `normalizeParams` idempotence (tested,
  `param-normalization.test.js`).
- **B4 &mdash; paycheck surplus + horizon (audit P2). `engine.js` UNCHANGED; adapter + UI.** V19.5 netted
  banked surplus INTO the portfolio segment, which went negative in surplus years and broke the bar (positive
  segments summed past 100%). Now presented as GROSS sources vs EXPLICIT uses: gross portfolio outflow
  (RMD + discretionary, never negative) as a source, leftover guaranteed income as a separate "saved back to
  portfolio" use; `total` = gross sources = spending + taxes + saved (the B1 identity). The year-table shows a
  surplus year's negative net as a green "+$X saved" deposit, not a confusing "-$143,925 withdrawal". Also, if
  the later partner's retirement falls beyond the plan horizon, `paycheck.fullyRetired=false` and the UI says
  a fully-retired paycheck is unavailable instead of labeling a still-working year "once fully retired".
- **B5 &mdash; FRA-year SS earnings test disclosed (audit P2), per Cris: disclose, don't build.** The engine
  always applies the under-FRA earnings limit and does not model the special rule for the single year a person
  REACHES FRA (needs birth month the annual model lacks). Disclosed in the SS claim-age tooltip, an
  `engine.js` comment at `SS_EARNINGS_LIMIT`, and the README &mdash; no longer presented as exact.
- **B6 &mdash; per-person part-time SS attribution BUILT (audit P2), per Cris: build now. `engine.js` math
  changed.** New `partTimeOwner` input (user | spouse), exposed in both questionnaire layouts (couples only),
  mapped through the adapter, with a `FIELD_INFO` tooltip and full `input-coverage` coverage. The engine gates
  the part-time channel on the OWNER's age and applies the SS earnings test to only the OWNER's benefit
  (previously always the user, so a spouse-earned paycheck wrongly reduced the user's early benefit). The
  former `todo` test is now a real passing test (`audit-properties.test.js`) using an asymmetric-benefit pair
  to prove attribution actually changes the household total.

### Validation
Full suite **95 tests, 95 pass, 0 fail, 0 todo**. `DEFAULTS` re-scored **64** at every stage (regression
gate). New permanent tests: household-cash identity (B1), sustainable-spending feasibility/ceiling/estimate
(B2), param-normalization idempotence + identity (B3), gross-source paycheck reconciliation (B4), per-owner
earnings-test attribution (B6). All five JSX files Babel-transform clean; both HTML inline scripts transform;
`node --check` on both plain-JS files. Live browser audit: see the deploy log for the desktop 1680px + mobile
~500px pass against the deployed GitHub Pages URL.

**Cache-buster:** `engine.js?v=19.9` + `?v=19.9` on all `cover-app/*` includes in both shells; both HTML
titles, `real-engine.js` header, saved-plan stamp (`19.9`), and on-screen kickers/tags reconciled to 19.9.
`engine.js` math IS changed (B1 tax-loop cap, B6 earnings-test attribution, A1 IRMAA constant; A2 exposition
via adapter). The audit report and this batch's fix plan (`V19.9-FIX-PLAN.md`) are kept local (gitignored
`*.md`), not published.

---

## V19.10 &mdash; Per-partner part-time income channels (two channels, partTimeOwner retired)

Fifth intentional `engine.js` math release (after V18.11, V19.5, V19.6, V19.9). Builds the full
two-channel model the F-PT-EARNTEST-ATTRIB backlog entry originally sketched, superseding V19.9's
B6 single-channel `partTimeOwner` selector. Approved by Cris 2026-07-07 from a plan with scope,
risks, and validation; shipped as one batch.

**Engine (`engine.js` math IS changed, one localized block).** The V19.9 owner-switch block is
replaced by two independent computations: the user's channel (`enablePartTime` / `partTimeIncome` /
`partTimeStartAge` / `partTimeEndAge` &mdash; names unchanged) gates on the USER's age window, and a
new spouse channel (`spouseEnablePartTime` / `spousePartTimeIncome` / `spousePartTimeStartAge` /
`spousePartTimeEndAge`) gates on the SPOUSE's age window. Each partner's SS earnings test receives
only THEIR own earnings (the two `calculateSSBenefit` call sites already took per-person earnings
since V19.9). Household cash, ordinary income, and the logged `partTimeIncome` pathLog field all
use the SUM, so every downstream consumer (tax convergence, surplus banking, paycheck, year table)
is unchanged. The legacy DOM app's part-time controls (single channel) still work: the undefined
spouse params are falsy, so the spouse channel is simply $0 there.

**Adapter (`real-engine.js`).** Four new DEFAULTS keys (spouse channel), RANGES for the two new
ages, `partTimeOwner` removed from ENUMS/DEFAULTS, and mapToReal emits both channels (spouse channel
zeroed for singles). **Migration in `normalizeParams`:** a plan with `partTimeOwner: 'spouse'` and
no actively-used spouse channel has its user-channel values MOVED to the spouse channel (user channel
zeroed) &mdash; same income stream, same attribution, no double-counting. Trigger is
`raw.partTimeOwner === 'spouse' && !raw.spouseEnablePartTime` (NOT `=== undefined`: plans merged
over DEFAULTS arrive with the key already present as `false` &mdash; caught by the migration test on
its first run). `partTimeOwner` itself is dropped by the known-keys merge, which also makes the
migration idempotent. Old user-owned and single plans pass through byte-identical.

**UI (both questionnaire layouts).** The user's toggle relabels to "Your part-time / other income"
for couples; a partner block (toggle + Amount / yr + "From partner's age" + "To partner's age")
renders for couples only, styled identically to the user's. The "Who earns it" selector is gone.
Partner fields alias to the shared FIELD_INFO help entries (pension-block precedent) via
HELP_ALIASES in `tests/input-coverage.test.js`; the partTime tooltips now explain per-person
earnings-test attribution; the `partTimeOwner` FIELD_INFO entry is removed.

**Tests (97 total, 97 pass, 0 todo; was 95).** The V19.9 attribution test is rewritten for the
two-channel model; new: both jobs pay simultaneously (household = sum), the two earnings-test
reductions are independent and ADDITIVE (each measured against a no-jobs baseline; both amounts
chosen above the $24,480 exempt amount so each produces a nonzero reduction), the spouse channel
gates on the spouse's own start age, and the partTimeOwner:'spouse' migration (values moved,
user channel zeroed, idempotent, user-owned plans untouched). `audit-adapter.test.js`'s
ENGINE_PARAM_NAMES contract swaps `partTimeOwner` for the four new names. **DEFAULTS still 64/100**
(regression gate) &mdash; the new channel defaults OFF everywhere.

**Cache-buster:** `engine.js?v=19.10` + `?v=19.10` on all `cover-app/*` includes in both shells;
both HTML titles, `real-engine.js` header, saved-plan stamp (`19.10`), and on-screen kickers/tags
reconciled to 19.10.

---

## V19.11 &mdash; Production hardening batch (self-hosted vendor libs, single entry page, failure screen, a11y)

Approved by Cris 2026-07-10 from the "Production hardening" backlog item, scoped down to the five
lowest-risk pieces after working through trade-offs together; `engine.js` math is UNCHANGED (no
Tier B item touched). Two backlog ideas (extracting the engine from the legacy DOM file; moving
heavy comparison work off the main thread) were deliberately left deferred &mdash; no user-visible
payoff for the accuracy risk in the first case, no observed symptom yet in the second.

- **Self-hosted vendor libraries.** `index.html` previously loaded React, ReactDOM, and Babel from
  `unpkg.com` on every visit &mdash; if that third-party host ever had an outage, the app would not
  start, and we had zero control over it. The exact pinned versions (React/ReactDOM 18.3.1, Babel
  standalone 7.29.0) now ship inside the repo under `vendor/`. Provenance: downloaded the official
  npm tarballs directly from `registry.npmjs.org` (reachable from the sandbox; `unpkg.com`,
  `cdnjs.cloudflare.com`, and `cdn.jsdelivr.net` are not) and verified each tarball's sha1 against
  npm's own published `shasum` before extracting anything &mdash; all three matched exactly. The
  extracted `babel.min.js` was additionally confirmed byte-identical to the file the CDN had been
  serving (its sha384 matches the `integrity` hash already in the pre-V19.11 `index.html`), since
  Babel standalone ships one build regardless of dev/prod. New `integrity` (SRI) hashes were
  computed for all three vendored files and kept on the `<script>` tags as a tripwire against the
  local copy itself ever getting corrupted.
- **Switched React/ReactDOM to their production builds** (was the development build of each,
  meant for in-progress coding and noticeably larger/slower; behavior is identical, the only loss
  is React's own console warnings, which we don't need in the shipped app).
- **Engine-load failure screen.** `index.html`'s app-shell script used to await
  `window._engineReady` (set by `real-engine.js`, resolves `true`/`false`, never hangs) and always
  rendered `<App/>` regardless of the result &mdash; so if `engine.js` itself failed to load, the
  app looked fine until the first screen tried to compute a plan and crashed. Now a `false` result
  renders a plain "Something did not load, please check your connection and refresh" screen
  instead. A second, independent plain-JS safety net (no React/Babel dependency, since those are
  exactly what might have failed) shows the same message via `onerror` on the vendor `<script>`
  tags themselves, guarded by a `root.dataset.appRendered` flag so it never clobbers a working app.
- **Removed the second front door (`cover.html`).** Traced its origin: a staging URL from the V18
  redesign, kept afterward only so old bookmarks wouldn't 404. Verified with `grep` that nothing in
  the code, tests, or `.github/workflows/deploy.yml` referenced it &mdash; only documentation
  mentioned it. Cris's call: delete outright, no redirect (small trusted audience, actively
  developed). `scripts/bump-version.mjs`'s `FILES` list updated to drop it (previously bumped both
  files' version strings in lockstep).
- **Accessibility:** the one remaining unlabeled control (the age/spending dials on the "Try
  Changes" screen, `CoverSlider` in `compass-cover.jsx`) now has `aria-labelledby` tied to its
  visible label and an `aria-valuetext` carrying the already-formatted display value (e.g.
  "$120,000") instead of the raw number.
- **Housekeeping found and folded in:** `scripts/bump-version.mjs` (documented since 2026-07-07 as
  the standard release step) had never actually been pushed to GitHub &mdash; it only existed as a
  local file in the project folder. Confirmed via `git ls-tree` against every branch on the remote
  (none had it). Committed for the first time in this batch; a fresh clone of the repo now matches
  what the docs have described all along.
- **Process gap caught by the post-deploy live check, then fixed same-release:** `bump-version.mjs`
  only ever rewrites `<title>` tags and `?v=` cache-busters (documented, deliberate scope). It does
  NOT touch the five hardcoded on-screen version kickers/tags (Welcome and Desktop-cover footers,
  the Rework/Charts/Questionnaire `CoverChrome` `tag=` prop) or the `real-engine.js` header comment
  &mdash; those have apparently been reconciled BY HAND every release, and this batch's first push
  missed them (deployed V19.11 briefly showed a "V19.10" footer/tags while the title and cache-buster
  correctly read V19.11). Caught by the live-browser check below, fixed in the same release with a
  second small commit. Flagged here rather than silently patched: a future release should either
  keep remembering this manual step or (separate, not-yet-approved follow-up) extend
  `bump-version.mjs` to cover these five spots too so this can't be missed again.

**Validation.** Full suite **97 pass, 0 fail** (unchanged count &mdash; no engine/adapter logic
touched, so no new invariant tests were needed). `DEFAULTS` regression gate confirmed still **64**
(`audit-adapter.test.js` asserts this directly). All five JSX files and the one inline
`<script type="text/babel">` block in `index.html` re-verified to Babel-transform clean (via
`@babel/standalone`, already vendored, run headlessly in Node against every file); `node --check`
clean on `engine.js`, `real-engine.js`, `numeric-entry.js`, and `bump-version.mjs`.

**Cache-buster:** `engine.js?v=19.11` + `?v=19.11` on all `cover-app/*` includes; HTML title,
`real-engine.js` header, and on-screen kickers/tags reconciled to 19.11. Single entry page now
(`cover.html` deleted), so `bump-version.mjs` only touches `index.html` + `real-engine.js`.
