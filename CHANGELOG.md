# Change log

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
