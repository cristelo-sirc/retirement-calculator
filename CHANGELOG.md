# Change log

## 19.15.0 — 2026-07-16

- Input Data is now an 8-chapter guided wizard instead of one long 40+ field page. A chapter list runs down the left side (The people · What you've saved · Salary & contributions · Spending · Guaranteed income · Your home · Investments · Fine-tuning), each chapter opens with a plain-English "Why we ask" explainer, and Back / Next buttons walk you through in order — though you can jump to any chapter from the list at any time. Chapters you've been through get a checkmark, and a thin progress bar tracks where you are.
- Your score is no longer shown anywhere while you're entering data — no live chip in the header, no number at the bottom of the page. Watching the score jump around mid-entry caused more anxiety than insight. The number now appears only after you press "See your results" at the end of chapter 8.
- The navigation at the top of every screen is reorganized into two labeled steps: "Step 1 · Enter" (Input Data) and "Step 2 · Your plan" (Results, Try Changes, Charts), so the intended order of use is visible at a glance.
- A small "Save plan" link now lives in the wizard's footer on every chapter, so you can save your progress to a file mid-entry without finishing first. (Your numbers also continue to auto-save in the browser as you type, exactly as before.)
- On the phone, the chapter list becomes a "Contents" sheet that slides up from the bottom, the same Step 1 / Step 2 switcher sits in the header, and the +/- buttons and switches are bigger for easier tapping.
- The one-line helper under each field label was rewritten to shorter, more concrete phrasing (the deeper "i" explanations are unchanged), and the home question is now labeled plainly "Own or rent."
- The former "Advanced assumptions" collapsed section is now a normal final chapter, "Fine-tuning."
- If you refresh the page mid-entry, the wizard reopens on the chapter you were on.
- A pleasant side effect: because no score is shown during entry, the app no longer re-runs the full simulation after every keystroke on this screen, so typing feels snappier.
- No changes to any calculation, score, or on-screen figure. The built-in sample still reads 64/100.

## 19.14.0 — 2026-07-10

- Fixed a spot on Results that overclaimed what Try Changes offers ("Every dial lives on Try Changes") — it now says how many levers actually live there (four for a couple, three if it's just you).
- The glide-path chart on Charts used to describe your mix as "easing out of stocks" even when that setting is turned off and the line is flat. The description now matches whichever way the toggle is actually set.
- The two balance and income charts were showing y-axis numbers like "$5110k" instead of "$5.11M" — switched to the same clean dollar formatting used everywhere else in the app.
- The year-by-year numbers table was clipping its own last column (ending balance) even on a reasonably wide screen. Gave the table more room to breathe without changing anything else on the page.
- Added a one-line hint on Input Data telling you that you can tap any number to type it exactly, instead of only dragging the +/- buttons.
- Dropdown menus (like "where your contributions go") used to show the value on one side and a tiny arrow pinned far away on the other. The arrow now sits right next to the value, so it reads as one control.
- Removed a duplicate "save or load your plan" box that was showing up twice on the same screen.
- Fixed two field labels that were wrapping awkwardly onto two lines ("Your employer contributions go to" and "Assume higher future tax rates") by giving them more horizontal room.
- No changes to any calculation, score, or on-screen figure. The built-in sample still reads 64/100.

## 19.13.0 — 2026-07-10

- Fixed a trust problem on plans that are already doing great: at 100 (or close to it), the "Three Moves, Ranked" section used to show three cards all reading "+0 points" — changes that don't actually buy you anything. A move now only shows up if it's worth at least a full point. When your plan is already at the top of the range and nothing we test can improve it, you'll see a plain note saying so instead of empty cards. This applies everywhere moves are shown — Results, Try Changes, and the phone view.
- The "Try Changes" comparison chart had the same problem in reverse: near a perfect score, it could show several bars that all looked identical. Same fix — only real improvements are shown, and a short note now explains that the individual moves overlap, which is why they don't add up past 100.
- The four sliders on Try Changes (retire age, spending, and Social Security claim ages) now show the low and high end of their range underneath the track, plus small tick marks, so you have a sense of where you're dragging to. You can also click or tap the number next to any slider and type an exact value, the same way you can elsewhere in the app.
- No changes to any calculation or scoring logic — this release only changes what's displayed and when. The built-in sample still reads 64/100.

## 19.12.0 — 2026-07-10

- Reorganized the Input Data questionnaire. Related fields used to all pour into one flat grid per section, so a large section like "Guaranteed income" could hold 18 fields across five topics with nothing visually tying them together, and toggling one setting on or off could reflow everything below it. Fields are now grouped under small labeled headers (for example, Social Security · Your pension · Partner's pension · Your part-time income · Partner's part-time income), so related fields stay together and turning something on or off only moves its own small group.
- Fixed the two part-time-income "Amount / yr" fields reading identically when both you and your partner have one. They're now "Your amount / yr" and "Partner's amount / yr" — clear at a glance and to a screen reader.
- Removed an unused, unreachable variant of the questionnaire that was never actually shown to anyone (a leftover from early design exploration). No visible change; the questionnaire you see is unchanged in content, only its section grouping and labels above.
- No changes to any calculation, score, or on-screen figure. The built-in sample still reads 64/100.

## 19.11.0 — 2026-07-10

- The app no longer depends on any outside server to load. It used to fetch React and its code-translator (Babel) from a third-party public host every time someone opened it; if that host ever had an outage, the app wouldn't start. Those files now live inside this project and are served with it. Verified byte-for-byte against the official published files before being added.
- Faster load: switched from the "development" build of React (larger, with extra console warnings for people writing code) to the "production" build (smaller, no change in behavior).
- If a required file still fails to load for some other reason (e.g. a bad connection), the app now shows a plain message — "Something did not load, please check your connection and refresh" — instead of leaving the screen stuck on "Running your plan..." forever.
- Removed a second, duplicate copy of the app's front page (`cover.html`) that dated back to an early redesign and had no remaining purpose; the app has one entry page now. This also removes a long-standing risk of the two copies drifting out of sync.
- Fixed one remaining slider (the "Try Changes" age/spending dials) that a screen reader announced with no name or readable value.
- No changes to any calculation, score, or on-screen figure. The built-in sample still reads 64/100.

## 19.10.0 — 2026-07-07

- Part-time income is now one channel per partner. Instead of V19.9's single income with a "who earns it" choice, couples get two independent part-time / other-income sections — yours and your partner's — each with its own on/off switch, annual amount, and start/stop ages. A household where both of you work part-time (different amounts, different years) can finally be modeled as it really is.
- Each income is timed against its earner's own age, and the Social Security earnings test reduces only the earner's own early-claimed benefit — never the partner's. The two reductions are fully independent.
- Plans saved under V19.9 with "who earns it" set to your partner are migrated automatically on load: the same income stream simply moves to the partner's new section. Plans where you were the earner, and all single-person plans, are unchanged.
- Added automated checks: both jobs pay into the household simultaneously, the two earnings-test reductions are independent and additive, each channel gates on its own earner's age, and old saved plans migrate correctly. The built-in sample still reads 64/100.

## 19.9.0 — 2026-07-06

- Fixed the tax calculation so every fully-retired year is funded exactly. Previously, in tax-heavy years (for example a large Roth conversion), the calculation could stop before it finished and leave thousands of dollars of spending or taxes unfunded while still marking the plan on track. Money in the accounts always balanced, but the household's cash didn't; now income plus withdrawals equals spending plus taxes plus any saved surplus, to the dollar.
- Rebuilt "Safe to spend." It used to show "$20,000" even for a plan that scored 0/100 at that spending, and it could understate strong plans. Now it shows **None** when no spending level reaches about 90% success, expands above its old cap for well-funded plans, and is clearly labeled an estimate.
- Made what you see match what the app uses. If an edit makes two values contradict (for example, raising your current age to your retirement age), the dependent value is corrected immediately and everywhere — on screen, in the saved file, and in the calculation — with a short note telling you what changed. Before, the screen could show one thing while the engine quietly used another.
- Fixed plans that go broke and later recover so they no longer claim "the money lasts the full plan." They now say both facts: it ran out around age X, then recovered later. The year-by-year table and the danger-age line use the same honest wording.
- Added a "who earns it" choice to part-time income for couples. The Social Security earnings test now reduces only that person's benefit, instead of always reducing yours even when your partner is the one working.
- Fixed the retirement paycheck in surplus years (when guaranteed income covers everything): it no longer breaks the bar with a negative slice, and instead shows the leftover as saved back into your portfolio. If one partner is still working at the plan's end, the paycheck now says a fully-retired snapshot isn't available yet instead of mislabeling a still-working year.
- Corrected the 2026 Medicare IRMAA top-tier surcharge to the official $529.60 (a July 2026 change had set it to $529.70 in error).
- Disclosed, in the app and the README, that the special Social Security earnings limit for the single year you reach full retirement age is not modeled.
- Accessibility and layout: the main navigation is now keyboard-operable and stays in view down the whole Results page, small labels are darker for readability, the big score scales down on smaller screens, and switching between phone and desktop keeps you on the same screen.
- Added automated checks for each of the accuracy fixes above (household-cash funding, the spending estimate, the see-what-the-engine-uses guarantee, the surplus paycheck, and per-earner Social Security). The built-in sample still reads 64/100.

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
