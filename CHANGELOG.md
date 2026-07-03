# Change log

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
