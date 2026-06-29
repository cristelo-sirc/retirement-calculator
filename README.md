# Compass Retirement Calculator

Compass is a browser-based retirement planning calculator. It turns household savings, income,
spending, housing, Social Security, pensions, taxes, and investment assumptions into a Monte Carlo
projection with a plain-English verdict.

[Open the live calculator](https://cristelo-sirc.github.io/retirement-calculator/)

## Current release

**V19.0** uses an explicit elapsed-year timeline. The balance shown at today’s age is exactly the
balance entered by the user. Each later balance belongs to the following birthday, so a projection
from age 50 through age 53 contains three years of returns and cash flows—not four.

V19 also adds explicit prior-year W-2 wage fields for the 2026 Roth catch-up rule, allows employer
contributions to be modeled as traditional or Roth, and verifies that every saved-plan setting has
an explained desktop and phone input.

See [CHANGELOG.md](CHANGELOG.md) for the complete release history.

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

## Verification

The automated checks cover timeline boundaries, contribution growth and limits, tax and Medicare
baselines, Social Security, housing, healthcare, saved-plan compatibility, exact numerical entry,
and complete input/help coverage.

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
- `cover-app/` — questionnaire, Cover, Rework, Projection, and chart components.
- `tests/` — executable financial, adapter, entry, and input-coverage checks.
- `CLAUDE.md` — detailed architecture, decisions, lessons, and version history.
- `CLAUDE-legacy.md` — pre-V18 architecture and history.
- `CHANGELOG.md` — concise release notes.

Personal financial files, working backlogs, and audit notes remain local and are intentionally not
published.
