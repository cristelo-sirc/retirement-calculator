# Change log

## 19.8.0 — 2026-07-05

- Split the "Tight" verdict band into two: scores 80–89 still read "Tight," but 65–79 now reads "Shaky" — a plainer signal that a meaningful share of futures run out of money, since that band used to share a word with scores as high as 89. "On Track" (90+) and "At Risk" (under 65) are unchanged. This only changes labels and color, not how any plan is scored.
- Made the small-caps labels and navigation tabs throughout the app bigger and darker — the main tabs, section headers, questionnaire field labels, and captions were too small and too light (measured contrast below accessibility guidelines). Fraction suffixes like "/100" next to the big score, and decorative icons, were deliberately left as-is.

## 19.7.0 — 2026-07-05

- Added a "Your Plan at a Glance" panel beside the score on Results, so the number now comes with the life it describes: retirement age(s), Social Security claim age(s), everyday spending (clearly labeled as excluding housing and healthcare) next to the safe-to-spend figure, legacy goal (or "None set"), plan horizon, and the monthly retirement paycheck.
- Replaced the old "Why the Verdict Reads That Way" section — which mostly repeated numbers now shown elsewhere — with "How It Could Play Out": the range of results a good simulation is actually for. It shows the end balance in rough markets (bottom 10%), the middle outcome, and strong markets (top 10%), plus how long the money lasts in the middle case and the share of futures that ran the balance to $0 at some point.
- Both additions appear on the phone view too, so mobile Results now carries the same plan-at-a-glance facts and the outcomes range.
- No change to how anything is simulated or scored — these are existing numbers, surfaced. The built-in sample still reads 64/100.
- Added automated checks that the new rough/middle/strong figures are correctly ordered and match the year-by-year table exactly.

## 19.6.0 — 2026-07-05

- Made the headline score honest to its own label. "Chance of never running out" now counts a future as a failure if the balance ever hits $0 — even if a later windfall or delayed Social Security brings it back on paper. Previously a plan that went broke for years mid-retirement and recovered was still counted as a success, which could badly overstate safety (one real plan read 100% when nearly half its futures spent years at $0).
- Added a short plain-English line under the score, when a meaningful share of futures deplete, pointing at *when* the money first runs low (e.g. "In the harder futures, the money first runs low around age 63").
- Added a tooltip on the score explaining the rule: a future counts as a failure if your balance ever hits $0, even if it later recovers.
- This changes only how success is *counted*, not how any future is *simulated*. No plan's dollars change; a plan's score can only stay the same or drop (more honest). Plans that never go broke — including the built-in sample — are unchanged.
- Added automated checks proving a broke-then-recovered future scores as a failure and that the "ever went broke" flag never silently clears.

## 19.5.0 — 2026-07-04

- Fixed a bug where a planned Roth conversion could be taxed as income even when the account didn't have enough money left to actually convert it.
- Fixed a bug where working part-time after claiming Social Security early could understate your benefit more and more each year as inflation compounded.
- Fixed a bug where the Medicare surcharge (IRMAA) could be silently skipped in years fully funded by Roth withdrawals, even when it was owed.
- Fixed a bug that overtaxed capital gains for retirees with little or no other income, by not letting unused standard deduction shelter those gains.
- Leftover guaranteed income (like a large required withdrawal in a low-spending year) is now saved into your account instead of disappearing from the math.
- A windfall or inheritance arriving after a plan had run out of money now stays in the plan and can make it solvent again, instead of showing up for one year and then vanishing.
- Corrected the required-withdrawal table for ages 111 and up, which had been frozen at the age-110 rate.
- Corrected a one-dollar-a-month rounding difference in the top Medicare surcharge tier.
- Added dozens of new automated checks (including a 1,152-scenario check that money is never gained or lost unaccounted for) to help keep the math this accurate going forward.

## 19.4.0 — 2026-07-03

- The phone view now tells you Try Changes and Charts exist on the desktop site, since the phone view only ever showed Results and Input Data.

## 19.3.0 — 2026-07-03

- Simplified the app from five tabs to four, renamed to say what each screen does: Input Data, Results, Try Changes, and Charts.
- Retired the Income & Odds tab: its stocks-vs-bonds glide-path chart now lives on Charts (after the paycheck chart), and its move-comparison bars now live on Try Changes — so the place you compare moves is the place you try them.
- Move point values are now computed one way, at the full simulation path count, and shared everywhere they appear. The Results cards, the Try Changes bars, and the mobile cards always show identical numbers (previously the cards used a faster estimate that could differ by a couple of points).
- Added automated checks proving the move numbers are exact, deterministic, and always agree with the headline score.
- Updated all on-screen wording that referred to the old screen names.

## 19.2.0 — 2026-07-03

- Added a year-by-year table to the Projection page (collapsed behind a "See the year-by-year numbers" button) showing age, starting balance, wages, Social Security, pension and other income, portfolio withdrawals, expenses, taxes, and ending balance for every year of the plan.
- The table offers three views: Average markets (returns at their long-run average every year), Rough markets (an actual unlucky simulated future — only 1 in 10 turn out worse), and Strong markets (an actual lucky one — only 1 in 10 turn out better).
- Amounts can be shown in future dollars (default, matching the charts) or today's dollars; each year's ending balance always equals the next year's starting balance in both modes.
- When a view runs out of money, the table says so plainly ("the money runs out at age 84") and tints the affected years.
- Added permanent automated checks proving every year's numbers reconcile exactly with the simulation — the table doubles as an ongoing engine spot-check.

## 19.1.0 — 2026-07-03

- Removed leftover internal labels from every screen's footer.
- The "load your saved plan" prompt no longer appears right after choosing to start a new plan.
- Clarified the paycheck age shown for couples: it's whichever partner finishes working later, explained when that differs from your own retirement age.
- Made the top navigation stay in view while scrolling on desktop.
- The Cover page no longer lets you change your plan directly. Its "moves" now open the Rework page with that change already queued up, so nothing is applied until you choose to publish it.
- Extended the "these are sample numbers" notice to every screen that can show sample data, not just the Cover.
- Added a live running score to the questionnaire so you can see it change as you answer, without scrolling to the bottom.

## 19.0.0 — 2026-06-29

- Rebuilt the age timeline as exact elapsed years: today’s balance is shown unchanged at today’s age, and each later balance belongs to the following birthday.
- Removed the extra return and extra ending-age spending period from every projection.
- Kept retirement, Social Security, Medicare, RMD, pension, housing, and other cash flows attached to the age when they occur.
- Added explicit prior-year W-2 wage fields for the 2026 Roth catch-up test instead of silently substituting current salary.
- Added pre-tax/Roth destination fields for employer contributions and applied the correct current-year tax treatment.
- Added executable coverage checks proving every saved-plan setting has an editable desktop and mobile field and every rendered field has both help text and a tooltip.
- Made selects, toggles, and tooltips keyboard/screen-reader accessible, and fixed tap-to-open tooltip behavior.
- Strengthened the coverage check so missing or incorrectly connected field explanations fail automatically.
- Added timeline boundary checks for contribution years, retirement, Social Security, Medicare, RMDs, mortgage payoff, and depletion age.
- Added a public project guide and reconciled technical, backlog, audit, and release-workflow documentation after deployment.

## 18.14.0 — 2026-06-28

- Split each person's employee contribution rate from the employer contribution rate.
- Employer contributions now grow the pre-tax portfolio without reducing take-home pay or receiving an employee tax deduction.
- Added the separate 2026 employee, catch-up, employer-plus-employee, and compensation limits.
- Applied the 2026 Roth catch-up rule for higher earners using current annual salary as the available wage proxy.
- Updated 2026 federal brackets, standard deductions, capital-gains brackets, Social Security earnings limit, and Medicare Part B plus Part D IRMAA surcharges.
- Added exact financial invariants for contribution flows, limits, taxes, Social Security, Medicare, and saved-plan compatibility.

## 18.13.0 — 2026-06-28

- Restored V17's intended input contract: everyday spending excludes housing and healthcare.
- Restored the combined annual property-tax and homeowners-insurance input, which continues after mortgage payoff.
- Clarified that the monthly mortgage amount is fixed principal and interest only.
- Prevented retirement spending from silently drawing down portfolios while everyone is still working.
- Prevented retirement healthcare costs from being charged before the covered person retires.
- Stopped inflating fixed mortgage principal-and-interest payments.
- Added executable financial regression tests for contributions, accumulation years, and housing costs.

## 18.12.0 — 2026-06-28

- Made every numerical questionnaire value directly editable and exactly displayed on desktop and mobile.
- Kept the plus and minus buttons for quick adjustments without forcing typed values into their increments.
- Added formatted-entry support, range and precision validation, mobile number keyboards, and accessible labels.
- Added automated checks for exact values, validation, decimal precision, and button limits.
