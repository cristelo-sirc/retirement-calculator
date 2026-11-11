# CLAUDE.md &mdash; Retirement Architect

Browser-based retirement planning calculator with Monte Carlo simulations. `index.html` is a thin
React shell loading the "Compass" components in `cover-app/`, backed by the real Monte Carlo engine
(`engine.js`) through the `real-engine.js` adapter. `engine.js` is reused as a pure math library
&mdash; only its DOM init is bypassed.

**Current Version:** 19.21
**GitHub Repo:** https://github.com/cristelo-sirc/retirement-calculator
**GitHub Pages:** https://cristelo-sirc.github.io/retirement-calculator/
**Tech Stack:** HTML5, CSS3, React + Babel (self-hosted in `vendor/`), Chart.js v3.9.1, localStorage (`compassParams`, `compassParamsSavedAt`, `compassRetireAgeMoved`)

**Where the history lives.** `CHANGELOG.md` is the concise release record. `CLAUDE-legacy.md` holds
the pre-V18 architecture (Part I), the V18.0&ndash;V19.8 detailed releases (Part II), and the
V19.9&ndash;V19.18 detailed releases (Part III, archived 2026-08-06). Every standing lesson those
releases produced has been promoted into this file &mdash; read the archive only when you need
forensics on a specific release. `BACKLOG.md` and audit reports are local working records, not published.

Seven releases intentionally changed `engine.js` math: **V18.11**, **V19.5**, **V19.6**, **V19.9**,
**V19.10**, **V19.18**, **V19.21**. Everything else is display-layer.

---

## Working Style (project-specific)

Cris's global preferences already cover the basics &mdash; he doesn't code, no changes without an
approved plan, accuracy is non-negotiable, audit after every change. Those are not restated here.
What's specific to THIS project:

- **Claude does all testing; Cris does not test.** After every change: deploy, then live browser
  testing against the GitHub Pages URL via Chrome MCP. Interact with real UI elements, verify visual
  output, test at desktop (1680px) and mobile (375px). Not complete until live testing passes.
- **Zero-Trust Logic Protocol.** Role is Compliance Engineer / Legacy Maintainer, not Product
  Architect. Goal is logic preservation, not feature optimization. The Monte Carlo engine's v9.9
  baseline is mathematically verified &mdash; preserve it.
- **Version references show the number only** (e.g. "V18.1"), no descriptive names or subtitles.
- **Use HTML entities** (`&mdash;` `&rarr;` `&middot;`) not Unicode, in app copy and docs, to prevent mojibake.
- **Alert at 75% context capacity** before compaction is needed.

### Model &amp; Subagent Policy (standing rule, updated 2026-07-24)

- **The session model is the brain.** Design decisions, UX analysis, architecture planning, code
  review, evaluating tradeoffs, test assessment, reasoning about what to build and why, deploy/git
  operations, and final live-browser audits are never delegated. Cris selects the session model
  (Opus 5 preferred).
- **Sonnet subagents execute mechanical steps.** Once a plan is approved, well-specified mechanical
  work (version/cache-buster bumps, copy changes, UI relocations, spacing/layout changes, test
  boilerplate) may be delegated. **Always explicitly set the subagent model to Sonnet** &mdash; an
  unspecified subagent inherits the session model, silently defeating the savings.
- **Subagent briefs must be self-contained.** Subagents start cold. Each brief needs exact files,
  exact changes, completion criteria, and the relevant gotchas from this file.
- **Never delegate:** `engine.js` math, adapter scoring logic, anything with flagged accuracy risk,
  git/deploy, or verification. The session model audits ALL subagent output against the plan.
- **Haiku may be used for trivial mechanical tasks** (renaming, formatting, find-and-replace) when
  the task is unambiguous and low-risk.
- **Live-browser audit clicking may be delegated to a Sonnet subagent** &mdash; it drives Chrome and
  gathers evidence; the session model reviews and makes the final pass/fail call.

---

## Development Workflow

1. Propose, await approval, implement.
2. Work on a scoped branch; stage only intended files.
3. Merge to `main` and let GitHub Pages deploy.
4. Live browser test against the deployed URL &mdash; desktop and mobile.
5. Audit for OUTCOMES, not implementation: does the original problem still exist (search broader than
   the original diagnosis), does the same class of issue exist elsewhere, do all affected UI sections
   still hold up at both viewports, did anything else break.
6. Version increment: run `node scripts/bump-version.mjs <new-version>`. Never bump by hand &mdash;
   manual bumps once shipped a mixed 19.10/19.10b state. **See the version-stamp gotcha below: the
   script does not cover everything.**

`scripts/deploy.sh` is an emergency direct-to-`main` fallback, not the standard workflow. It bypasses
the pull-request review gate and broadly mirrors the local project folder &mdash; use it only with
explicit approval and a verified clean scope.

---

## Engine (`engine.js`) &mdash; pure math

`simulatePath` and the financial helpers are global/pure; only the engine's two DOM-init listeners
are bypassed (the adapter injects `engine.js` after `DOMContentLoaded`).

### Market Return Model
Stock and bond returns are correlated via Cholesky decomposition:
```
STOCK_BOND_CORR = -0.3
stockR = stockReturn + stockVol * z1
bondR  = bondReturn + bondVol * (STOCK_BOND_CORR * z1 + sqrt(1 - STOCK_BOND_CORR^2) * z2)
```
z1, z2 are independent standard normal draws from `gaussianRandom()`. The solver uses a deterministic
seeded PRNG (`mulberry32`) so identical market scenarios are reused across spending-level tests.

### pathLog Fields (per year per simulation)

**Core:** `age` (cash-flow period), `balanceAge` (ending-balance birthday), `startingBalance`,
`totalBal`, `rmd`, `totalWithdrawal`, `ordIncome`, `taxBill`, `effRate`, `spending`, `stockAlloc`,
`inflation`, `isSolvent`, `employeeContribution`, `employerContribution`

**Income sources:** `ssIncome`, `pensionIncome`, `partTimeIncome`

**Withdrawal breakdown:** `wdTaxable`, `wdPreTax`, `wdRoth`, `discretionaryWithdrawal`

### Tax Convergence Loop
1. Available cash (salary + SS + pension + part-time + RMD)
2. gap = totalNeed + iterationTax - availableCash
3. Waterfall: Taxable &rarr; Pre-Tax (by age) &rarr; Roth
4. Ordinary income from all sources
5. Taxable SS, IRMAA, federal/cap gains/NIIT/state tax
6. Converge only when BOTH tax and need are stable within $1 (max 100 passes; normal years break in
   3&ndash;5). The old hard stop at 5 passes left tax-heavy years underfunded &mdash; see the
   household-cash invariant below.

---

## Engine Learnings &amp; Pitfalls

### `totalWithdrawal` is DISCRETIONARY ONLY
It sums the converged `wdTaxable + wdPreTax + wdRoth` and does NOT include RMD. Total portfolio
outflow = `rmd + totalWithdrawal`. The `discretionaryWithdrawal` field (`max(0, totalWithdrawal -
totalRmd)`) is therefore **misleading** &mdash; it subtracts RMD from a figure that never contained
it. Do not use it for new features.

### RMD vs Discretionary Pre-Tax
RMDs are withdrawn first, separately, before discretionary withdrawals in the tax convergence loop:
`userPreTax = userPreTax_startOfYear - userRmd - withdrawals_converged.userPreTax`. `wdPreTax` is only
the discretionary portion beyond RMD.

### RMD Start Age Is 75 (SECURE 2.0, born 1960+)
`getDistributionPeriod()` returns 0 below 75. Distribution periods extend through 119 with an
explicit 2.0 for 120+, verified against 26 CFR 1.401(a)(9)-9 Table 2.

### SSA Early Claiming Is Tiered, Not Flat
First 36 months early: 5/9 of 1% per month (6.67%/yr). Beyond 36 months: 5/12 of 1% per month (5%/yr).
This formula lives in `calculateSSBenefit()`, `calculateSpousalBenefit()`, and
`calculateOwnBenefitAtClaiming()` &mdash; all three must stay consistent.

### SS COLA Must Be External Only
SS uses a single nominal growth mechanism: `* inflation` at the simulation loop call site. Internal
COLA would double-inflate, because the function is called every year with the same `baseFRA` (today's
dollars PIA). Pension and part-time income follow the same pattern.

### Salary Growth Is Per-Person and Independent of Inflation
`userSalaryGrowth` / `spouseSalaryGrowth` (fractions) compound each salary until that person retires.
Statutory amounts deliberately KEEP growing with inflation: contribution caps, compensation limit,
$150k Roth catch-up threshold. Absent params fall back to `lifestyleInflation` via `Number.isFinite`
checks &mdash; **not `||`**, since 0 is a meaningful rate.

### Part-Time Income Is Two Independent Channels
User channel (`enablePartTime` etc.) gates on the user's age window; spouse channel
(`spouseEnablePartTime` etc.) gates on the spouse's. Each partner's SS earnings test receives only
THEIR own earnings. Household cash and the logged `partTimeIncome` use the SUM.

### Pension COLA Is Per-Spouse
Two independent toggles: `enablePensionCOLA` (user) and `enableSpousePensionCOLA`. The simulation uses
`userPensionMult` and `spousePensionMult` independently. Most private pensions have no COLA; some
government/military pensions do.

### All Income Inputs Are Annual
Pension (`params.pension`, `params.spousePension`) AND Social Security (`params.userSS`,
`params.spouseSS`) inputs are annual. The engine applies no `* 12` anywhere; labels read "Annual SS
Benefit," and `calculateSSBenefit` is called with `params.userSS` directly. **Adapter
exception:** `mortgagePayment` and `monthlyRent` are entered MONTHLY and the adapter multiplies by 12.
(A 2026-06-10 doc error claiming SS was monthly caused a real mis-entry &mdash; verify against
`collectInputs()` and the input labels, not historical docs.)

### Spending Contract
`spending` EXCLUDES housing and healthcare. `propertyTax` = property tax + homeowners insurance
combined. No spending is drawn during accumulation. Fixed mortgage is not inflated.

### Guardrails (V19.21)
- **The gauge is what the portfolio pays**, not the lifestyle budget: (lifestyle &times; multiplier +
  housing + healthcare + tax estimate &minus; net wages &minus; pensions &minus; part-time &minus; SS) &divide;
  start-of-year balance, floored at 0. Pre-V19.21 it was lifestyle &divide; balance, so 98% of the sample
  plan's cuts fired while the real draw was under the ceiling. Housing/health are computed BEFORE the
  guardrail block for this (pure reorder; they never depend on lifestyle).
- **Tax estimate = last year's `finalTax` &times; (1 + inflation)**, used only when last year's
  `guardrailTaxState` (who is working + whether a Roth conversion ran) equals this year's. Transition
  years (first retired year, partner retires, conversions start/stop) count no tax &mdash; an accepted
  one-year understatement. The first draft used `totalSalary === 0`, which zeroed tax for every year a
  partner worked and carried a conversion year's tax into the year after (found by the Fable review).
- **IRMAA estimate** is exact from the 2-year MAGI lookback once `i >= 2`; before that, last year's
  `irmaa` under the same state rule.
- **Raises are capped at 1.0** (they only win back trims; no-op raises aren't counted). Uncapped, the
  corrected gauge (~0% when income covers the budget) drove multipliers to ~2x, and the down-year reset
  then dropped spending 25%+ in one year in ~46% of futures. The capital-preservation reset is now inert.
- **Known, accepted:** when income covers most of the budget, one 10% step can cross both thresholds,
  so trim and win-back can alternate year to year (BACKLOG).
- **`guardrailMinSpending` (fraction) floors the multiplier on cuts.** At the floor, cuts stop and no
  trigger is counted; a path that still depletes fails honestly. Absent (legacy DOM app) = no floor.
  The floor applies to lifestyle only; housing and healthcare are never trimmed.
- **`guardrailMult` is logged per year**; the adapter's `guardrailSummary` (`cutShare`, `typicalLow`)
  feeds `cvGuardrailLine` on both layouts. `null` when guardrails are off.
- Unchanged by design: cuts persist until won back; a win-back needs rate &lt; the win-back threshold AND
  a grown balance; the block gates on the USER's retire age. The floor is relative to the plan AFTER
  any slow-go reduction.
- **Guardrails-off output must stay byte-identical** across any guardrail change &mdash; that was the
  V19.21 release gate (old vs new `compute()` JSON, 15 variants, 5,000 paths).

### Taxable Account Tax Drag Is Real
A 100% taxable portfolio with 60% gain ratio loses ~10&ndash;15% of every withdrawal to cap gains +
NIIT + state tax. For $1M taxable-only with $70k spending over 30 years, 0% success is correct.

### Param Name Consistency
`collectInputs()` is the single source of truth for engine param names; the adapter maps the
questionnaire onto its shape. Never invent param names.

### Data Consistency
A new simulation field must be propagated to ALL consumers: the `pathLog.push({})` in
`simulatePath()`, the `lastSimulationResults.paths` mapping, and every downstream view/adapter.
Deriving values instead of using actual simulation data causes mismatches.

---

## Adapter &amp; App Architecture Gotchas

- **`normalizeParams` runs at the single `setParams` boundary**, so displayed == persisted ==
  saved-file == `results.params`, always. It must stay idempotent (tested).
- **Migration triggers must check the RAW object, not the merged one.** Plans merged over `DEFAULTS`
  arrive with new keys already present (as `false`, `0`, etc.), so `=== undefined` on the merged
  object never fires. Check `raw.<key>` instead. This bit V19.10 and was designed around in V19.18.
- **The app re-saves a migrated plan on first load**, so a stored plan grows after a migration
  release. Expected, not a bug.
- **Scoring reads the latching `everDepleted` flag, not end-state `depletionAge`.** A plan that went
  broke and recovered has a cleared `depletionAge` but must still score as a failure. Display logic
  (runway, longevity, banners) must read `everDepleted` / `firstDepletionAge`.
- **Shared builders exist so desktop and mobile cannot drift**: `cvGlanceFacts` (glance rows),
  `CV_CHAPTERS` + `CV_PRIVACY_NOTE` (wizard copy), `cvQualifyingMoves` (which moves are shown),
  `computeMoves` (move deltas). Add to the shared builder, never to one layout.
- **Percentages: the UI-level `params` object holds whole numbers** (inflation 2.5); the `/100`
  conversion is the adapter's job in `mapToReal`. Reading `results.params` for display shows 0.025%.
- **Responsive breakpoint is 769px**, app-wide, one switch point.

---

## Shipped Accuracy Disclosures

These are known, deliberate limits currently live in the app. Don't "fix" them silently.

- **Safe-to-spend is a labeled estimate**, not a full-count-verified number &mdash; a fast bisection
  at sample count. It's prefixed "~" and says "estimate" in the UI, and returns **null ("None")** when
  no level reaches ~90%. (This bullet claimed the bisection keeps live recompute "~1s" until V19.19.
  It does not &mdash; see the measured timings below. The sampling is still a real saving; the ~1s
  figure was simply never true.)
- **The user's age does not advance on its own.** `currentAge` is a stored number, not a birth date,
  so a plan reopened two years later still plans from the age last entered. Deliberate: deriving age
  from a birth date would move the floor under six dependent fields (retirement age, windfall age,
  part-time start, mortgage payoff, Roth conversion start, and the spouse equivalents) and silently
  clamp values the user had set. V19.19's update flow asks for age directly instead, so correctness
  depends on the user acting on the prompt rather than being guaranteed by the app.
- **No "already retired" state (V19.20).** When a person's age reaches their retirement age, the
  retirement age is moved forward and the plan models more working years, so the score reads
  optimistic. Disclosed in the update summary and by a persistent Cover note; not fixed (BACKLOG).
- **The FRA-year SS earnings test is not modeled.** The engine always applies the under-FRA limit; the
  special rule for the year a person reaches FRA needs a birth month the annual model lacks. Disclosed
  in the SS claim-age tooltip, an `engine.js` comment, and the README.
- **Ending balances are future (nominal) dollars**, labeled as such, with the today's-dollars toggle
  on Charts.
- **Guardrail adjustment displays "Off"** when `enableGuardrails` is false, since the percentage is
  inert in that state.
- **The privacy blurb claims privacy of INPUTS only.** The app makes zero network calls in app code
  and has no backend, but `index.html` still loads two Google Fonts, which receive standard request
  metadata. Do not strengthen the copy to "no outside connections" unless the fonts are vendored first.

---

## Standing Environment &amp; Process Lessons

### Git and deploy

- **This project folder is FUSE-mounted: `unlink`/`rename` are blocked.** A failed `git commit` here
  can leave a permanent `.git/index.lock`. Do all git WRITES (`add`/`commit`/`merge`/`push`) in a
  disposable clone under `/tmp`, syncing edited files over with `cp`. Read/Write/Edit and read-only
  git in this folder are fine. Delete CAN be enabled per-session via Cowork's permission prompt, but
  the /tmp-clone pattern remains standard.
- **`/tmp` persists across sessions with a different owner** &mdash; use a fresh clone directory name
  each session.
- **Push auth:** fresh /tmp clones have no credentials; the token lives in gitignored
  `data/deploy-token.txt`, used as `https://x-access-token:<token>@github.com/...`.
- **Author commits as `cristelo-sirc <cristelo-sirc@users.noreply.github.com>`.** Authoring as
  `cristelo@hotmail.com` trips GitHub's email privacy protection and the push is rejected with
  `GH007` (V19.15).
- **The deploy token lacks `workflow` scope, by design.** Any change under `.github/workflows/` needs
  Cris's web-UI commit (Add file &rarr; Create new file) &mdash; a normal content push will be
  refused. Do not broaden the token's scope to work around this.
- **PR reality:** there's no logged-in browser session, so release branches are merged into `main`
  locally with `git merge --no-ff` in the /tmp clone and pushed directly &mdash; matching the repo's
  own merge-commit history since V19.5.
- **If a Pages deploy fails, check WHICH pipeline produced it first.** `"pages build and deployment"`
  = the legacy branch-build pipeline, which should no longer exist. `"Deploy to GitHub Pages"` = ours
  (`.github/workflows/deploy.yml`, with a required `test` job and 3 deploy attempts at 20s/30s
  backoff). If ours failed, the retry already ran and still lost &mdash; show Cris directly rather
  than silently re-pushing.
- **`api.github.com` and `*.github.io` are blocked by the sandbox proxy.** Deployed-site checks must
  run in the browser (Chrome MCP); Actions/Pages status is readable via a browser-context
  `fetch('https://api.github.com/...')` (public repo, CORS-allowed).

### Versioning

- **Cache-buster discipline applies to EVERY content change,** not just version boundaries. Any edit
  shipped after the including HTML was already fetched needs its own `?v=` bump.
- **`bump-version.mjs` does NOT cover everything.** It rewrites `<title>` tags and `?v=`
  cache-busters (including the `engine.js?v=` in `real-engine.js` &mdash; without that one, browsers
  serve a stale engine against new HTML). It does NOT touch: the **five on-screen version stamps**
  (Welcome footer, Desktop-cover footer, the Rework/Charts `CoverChrome tag=` props, and the wizard
  chapter-rail stamp) or the **saved-plan `version` field** in `CompassIO.buildPlanJSON`. Those are a
  manual step every release. V19.11 shipped a mismatched footer by forgetting; the saved-plan stamp
  silently drifted from V19.10 through V19.16. **Grep the OLD version string** after running the
  script, don't trust its report.

### Performance &mdash; measured, not estimated (V19.19)

Measured in Chrome on the deployed app, 5,000 paths, three identical runs:

| | Time |
| --- | --- |
| Full `compute()` | **~5&ndash;7.5s** |
| Full `compute()` at 10,000 paths | **~14s** |
| The scoring run alone | **~2.4s** |
| The safe-to-spend bisection | **~4.4s &mdash; 65% of the total** |

- **`compute()` is synchronous and cannot go anywhere a user is waiting to click.** It blocks the main
  thread for those seconds: buttons paint, then do nothing. Entering the Cover has always paid this
  cost; a launch screen must not.
- **`MockEngine.scoreAsync(params, cb)` is the non-blocking alternative** &mdash; score/verdict only,
  run in ~40ms slices, returns a cancel function. Determinism holds by construction (every path is
  seeded from `SEED_BASE` plus its own index, so a path cannot depend on when it ran), and is asserted
  equal to `compute()` at the real 5,000-path count in `tests/score-async.test.js`. Use it anywhere a
  score is wanted without a freeze; use `compute()` when the full result object is needed.
- **Dropping safe-to-spend from a screen removes two thirds of its wait.** That is why the Welcome
  screen shows retirement age, spending and horizon rather than the safe-to-spend figure.
- **Don't batch several `compute()` calls into one Chrome MCP `javascript_tool` evaluation** &mdash;
  the CDP call times out at 45s and the tab looks frozen. Drive one screen at a time.

### The staleness stamp (V19.19)

- `compassParamsSavedAt` is a **second localStorage key**, deliberately not a field inside
  `compassParams` &mdash; that key holds the params object directly, and wrapping it would change the
  shape every existing browser has stored.
- **It is not written on the mount persist.** The app re-saves a migrated plan on first load, so
  stamping there would mark a years-old plan as edited today. `PlanRefresh.decideStamp` owns that
  decision and is tested.
- **A loaded file carries its own `savedAt`** (set by `CompassIO.parsePlan`, consumed once), so opening
  a 2025 plan does not reset the clock to today.
- **V19.20: a file's `savedAt` is the EDIT date; `exportedAt` is the save time.** V19.19 files wrote the
  save time into `savedAt`, so only a file that also has `exportedAt` is trusted
  (`PlanRefresh.fileEditStamp`). Anything else loads as `UNKNOWN_STAMP`, which CLEARS the stamp.
  `decideStamp` returns `{ write }` / `{ clear: true }` / `null` &mdash; not a bare string.
- **It cannot be backfilled.** Plans stored before V19.19 have no stamp; the Welcome screen says it
  doesn't know rather than guessing.

### The update flow's field contract (V19.19)

- Fields are **pre-filled and grey, dark once edited**. There is never an empty box, so there is never
  a moment where the code must decide what an empty box means. Only touched fields reach the writer.
- `PlanRefresh.parseEntry` is the whole risk surface: `''` must never become 0, while `'0'` must.
  Garbage keeps the stored value rather than guessing.
- `PlanRefresh.stepsFor` and `cvStaleRows` share the same conditions on purpose &mdash; the list you
  are shown and the steps you are then walked through must not disagree.
- **Prior-year wages follow salary** only when they were already in step; a deliberately different
  figure is preserved (`syncPriorWages`).
- **V19.20: every box is judged by `PlanRefresh.checkEntry`** (the questionnaire's own
  `NumericEntry.validateDraft`; whole numbers; ages 18&ndash;100; money &ge; 0). Only `'changed'` values
  reach the writer, as numbers. `'invalid'` blocks Next. A cleared box refills on blur.

### Normalizer side effects are disclosed, not silent (V19.20)

- `normalizeParams` forces `retireAge > currentAge`, so **the app has no "already retired" state**:
  `stepsFor`'s retired branch is unreachable from stored plans (pinned in `tests/state-fix.test.js`).
  A plan whose age passed its retirement age is modeled as still working. Accepted as a disclosed
  accuracy risk (Cris, 2026-11-10); the real fix is engine work, in BACKLOG.
- `PlanRefresh.trackRetireMove` runs at the `setParams` boundary and keeps a record in
  `localStorage['compassRetireAgeMoved']`; the Cover shows `CoverRetireNote` (shared desktop/mobile
  builder `cvRetireMoveNote`) while the stored retirement age still equals the moved one. The user
  setting a retirement age clears it; so do Start over and any file load.
- **`CompassIO._justLoaded`** is set on every successful `parsePlan` and consumed at the `setParams`
  boundary: a loaded file is a DIFFERENT plan, so it drops the retirement-age record and the wizard
  position (`compassChapter` / `compassChaptersVisited` in sessionStorage).
- Live testing must back up and restore `compassRetireAgeMoved` alongside the other two keys.

### Error states (V19.20)

- `_engineReady` resolves true only if `window.simulatePath` is a function &mdash; a broken engine.js
  still fires `load`.
- `<App />` is wrapped in `AppErrorBoundary`: recovery screen + `console.error`. A boundary can hide
  bugs, so **every live audit must read the console**. To test it, replace a shared builder (e.g.
  `window.cvOutcomes`) with a thrower and open the Cover; Reload restores it.
- **The phone shell keeps its own `tab` state.** A child that calls `_coverNav` while `CoverMobile` is
  mounted must also change that tab (`WizardView`'s `onFinish`), or nothing visible happens.

### Testing and verification

- **Grade flows against executable invariants, not documentation.** When explaining a computed value,
  compare against the computed value itself, not the raw inputs feeding it.
- **The untouched-DEFAULTS regression gate is 64/100**, asserted in `audit-adapter.test.js`.
- **DEFAULTS are pinned** in `tests/state-fix.test.js` (V19.20). "Sample plan" is detected by exact
  equality with DEFAULTS in five places, so changing a default relabels every stored sample plan &mdash;
  decide a migration before updating the pin. Suite: 186 checks.
- **The built-in browser can't beat the Welcome score** to the "Update my numbers" click, even at
  10,000 paths (tool round trips are slower), so the unknown-before-score path is covered by
  `updateHeadline` tests, not a live repro.
- **Permanent invariants worth knowing:** the household-cash identity (guaranteed income + portfolio
  withdrawals == spending + taxes + surplus banked, within $2, for every fully-retired solvent year),
  the balance identity, `normalizeParams` idempotence, and per-owner earnings-test attribution.
- **Back up `localStorage['compassParams']` before live testing and restore after**, verifying by
  exact string match rather than visually.
- **Open every screen at 10,000 paths** when testing (a spread-args `RangeError` once blanked the app
  at high path counts).
- **Chrome MCP `resize_window` is intermittently ignored.** Verify the rendered layout in the
  screenshot. Chrome's ~500px floor is still below the 769 breakpoint, so the mobile shell does
  render. If resize fails entirely, force-mount the mobile shell in-page with
  `Object.defineProperty(window,'innerWidth',{get:()=>500})` plus a synthetic `resize` event &mdash;
  the shell reads `innerWidth` on resize. True 375px layout still needs Cris to phone-check.
- **`@babel/standalone` under `require()` attaches to `module.exports`, not `global.window`** &mdash;
  relevant when running headless transform checks on the JSX files.
