# Compass Retirement Calculator

Compass is a browser-based retirement planning calculator. It turns household savings, income,
spending, housing, Social Security, pensions, taxes, and investment assumptions into a Monte Carlo
projection with a plain-English verdict.

[Open the live calculator](https://cristelo-sirc.github.io/retirement-calculator/)

## Current release

**V19.9** is a deep-review accuracy and honesty batch. The app is organized into four screens:
**Input Data** (the questionnaire), **Results** (score, verdict, plan-at-a-glance, paycheck,
outcomes), **Try Changes** (test moves before committing), and **Charts** (projection + year-by-year
table). Highlights of this release:

- The tax loop now runs to full convergence, so every fully-retired year is funded exactly (income
  plus withdrawals equals spending plus taxes plus any saved surplus).
- "Safe to spend" no longer reports a false floor: it shows **None** when no spending level reaches
  about 90% success, expands above the old cap for well-funded plans, and is labeled an estimate.
- What you see always matches what the engine uses and what a saved file contains — dependent values
  (like ages) are reconciled the moment you edit, with a note when something is adjusted.
- Recovery-after-broke plans no longer claim "the money lasts the full plan"; they state both that it
  ran out and that it later recovered.
- Part-time income now carries an earner (you or your partner), so the Social Security earnings test
  affects only that person's benefit.
- The 2026 Medicare IRMAA tier-4 surcharge is corrected to the official $529.60, and accessibility
  and responsive-layout fixes improve nav, contrast, and small-screen behavior.

Earlier, **V19.0** established the explicit elapsed-year timeline (the balance shown at today's age is
exactly what you entered; each later balance belongs to the following birthday). See
[CHANGELOG.md](CHANGELOG.md) for the complete release history.

## How the model works

- The default calculation runs 5,000 deterministic market scenarios so identical inputs produce
  stable comparisons.
- Salary, contributions, retirement spending, Social Security, Medicare, pensions, RMDs, housing,
  and conversions are applied during the age when they occur.
- The resulting portfolio balance is assigned to the next birthday.
- A path succeeds when it remains solvent and, when entered, also meets the legacy goal.
- Projection charts show today’s entered balance followed by annual ending balances through the
  planning age.

## Important limitations

Compass is an educational planning tool, not financial, tax, legal, or investment advice. It uses
simplified assumptions rather than a complete financial-planning model. In particular, it does not
model individual mortality, survivor transitions, long-term-care events, investment fees, or every
state-specific tax rule. RMD age 75 and Social Security full retirement age 67 are intentional
audience assumptions for people born in 1960 or later.

Additional disclosed limitations:

- **Ending balances and the legacy goal are future (nominal) dollars** — not adjusted for inflation,
  so they buy less than the same number today. The Charts year-by-year table has a today's-dollars
  toggle.
- **"Safe to spend" is a fast estimate**, not a full-precision figure; it is labeled as such.
- **The full-retirement-age-year Social Security earnings test is not modeled.** Compass always
  applies the standard under-67 earnings limit and does not apply the more generous special rule for
  the single year a person reaches full retirement age (that rule needs a birth month the annual
  model does not track). Only affects people who claim before 67 while still earning.
- The flat state-tax rate does not honor state-specific Social Security or pension exemptions.

## Verification

The automated checks (95 tests) cover timeline boundaries, contribution growth and limits, tax and
Medicare baselines, Social Security, housing, healthcare, saved-plan compatibility, exact numerical
entry, and complete input/help coverage. V19.9 adds permanent invariants for the household-cash
identity (every retired year is funded), the sustainable-spending solver, shared parameter
normalization, gross-source paycheck reconciliation, and per-earner Social Security attribution.

```sh
node --test tests/*.test.js
```

Every release is also tested in the running app at desktop and phone sizes, then checked again on
the public GitHub Pages site.

## Safe release workflow

1. Agree on scope, risks, alternatives, and validation before changing files.
2. Work on a dedicated branch and stage only the intended files.
3. Run the automated checks and audit affected screens on desktop and phone.
4. Publish through a pull request into `main`.
5. Verify the exact public release after GitHub Pages finishes rebuilding.

`scripts/deploy.sh` is retained only as an emergency direct-to-production fallback. It bypasses the
pull-request review gate and should be used only with explicit approval.

## Project map

- `index.html` / `cover.html` — browser entry pages.
- `engine.js` — retirement simulation and financial calculations.
- `cover-app/real-engine.js` — adapter between the interface and calculation engine.
- `cover-app/` — the Input Data, Results, Try Changes, and Charts screen components.
- `tests/` — executable financial, adapter, entry, and input-coverage checks.
- `CLAUDE.md` — detailed architecture, decisions, lessons, and version history.
- `CLAUDE-legacy.md` — pre-V18 architecture and history.
- `CHANGELOG.md` — concise release notes.

Personal financial files, working backlogs, and audit notes remain local and are intentionally not
published.
