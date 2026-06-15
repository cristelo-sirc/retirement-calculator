// retire-ui.jsx — Shared, themeable UI helpers for the Compass + Cover concepts.
//   • FIELD_INFO  — plain-English glossary: one-line helper + deeper detail per input
//   • InfoTip     — small "i" that reveals the deeper detail on hover/focus/tap
//   • DiffChip    — "65 → 67  ⟲" chip with a per-field reset, for what-if screens
// All are theme-driven (pass {ink, ink70, ink50, paper, paperWarm, rule, accent, body}).

const FIELD_INFO = {
  hasPartner: {
    help: 'Plan for one person or two.',
    detail: 'A couple is modeled jointly — two salaries, two pots of savings, and two Social Security benefits that may start at different ages.',
  },
  currentAge: { help: 'How old you are today.', detail: 'Sets the starting point of the projection. Everything before your retirement age is treated as years you’re still saving.' },
  retireAge: { help: 'The age you stop working for pay.', detail: 'Saving stops and withdrawals begin here. Retiring later usually helps a lot: more saving, fewer years to fund, and a bigger Social Security check.' },
  endAge: { help: 'How long the money has to last.', detail: 'The age the plan must fund you through — your planning horizon. Many couples use the mid-90s to stay safe, since one of you may live longer than average.' },
  spouseAge: { help: 'Your partner’s age today.', detail: 'Used to time your partner’s retirement and Social Security separately from yours.' },

  preTax: { help: 'Retirement accounts taxed when you withdraw.', detail: 'Traditional 401(k), 403(b), and IRA balances. You got a tax break going in, so withdrawals are taxed as ordinary income — and required minimum distributions start at 73–75.' },
  roth: { help: 'Accounts you’ve already paid tax on.', detail: 'Roth IRA / Roth 401(k). Withdrawals in retirement are tax-free, which makes these valuable for managing your tax bill later.' },
  taxable: {
    help: 'Ordinary investment & savings accounts.',
    detail: 'A regular brokerage or bank account — not a retirement account. There’s no withdrawal penalty, but you owe tax on dividends and on gains when you sell. Think of it as your flexible, get-at-it-anytime money.',
  },

  salary: { help: 'Your gross pay per year, before tax.', detail: 'Drives how much you add to savings each year between now and retirement.' },
  savingsRate: { help: 'The share of pay you save each year.', detail: 'Includes your own contributions plus any employer match. A higher rate builds the portfolio faster.' },
  spouseSalary: { help: 'Your partner’s gross annual pay.', detail: 'Combined with their savings rate to model their yearly contributions.' },
  spouseSavingsRate: { help: 'The share of pay your partner saves.', detail: 'Your partner’s own contributions plus any employer match.' },

  spending: { help: 'What you’ll spend per year in retirement.', detail: 'Your target annual budget in today’s dollars — housing, food, travel, everything. This is the single biggest lever on whether the plan holds.' },
  healthcare: {
    help: 'Extra health costs before Medicare at 65.',
    detail: 'Premiums and out-of-pocket costs to bridge from retirement to Medicare eligibility at 65. Added on top of your spending only for those early years, where coverage is often most expensive.',
  },
  inflation: { help: 'How fast prices rise each year.', detail: 'Erodes the buying power of your money over time. We project in today’s dollars, so a higher figure means your portfolio has to work harder.' },
  legacyGoal: { help: 'Money you want left at the end.', detail: 'An amount you’d like to leave to heirs or charity. Set it above zero and the plan treats it as a balance that must survive to your planning age.' },

  ssBenefit: {
    help: 'Your annual Social Security at full age (67).',
    detail: 'Your estimated yearly benefit at full retirement age (67) — take the monthly figure on your Social Security statement at ssa.gov and multiply by 12. Claiming earlier reduces it; waiting until 70 increases it about 8% per year.',
  },
  ssClaimAge: { help: 'The age you start Social Security.', detail: 'You can claim anywhere from 62 to 70. Each year you wait past 67 adds roughly 8% to your check — a guaranteed, inflation-protected raise for life.' },
  spouseSS: { help: 'Your partner’s annual benefit at age 67.', detail: 'Your partner’s estimated yearly Social Security at their full retirement age. Couples can stagger claim ages to balance income and survivor benefits.' },
  spouseClaimAge: { help: 'The age your partner starts Social Security.', detail: 'Set independently from yours — it’s often worth having the higher earner wait until 70 for the larger survivor benefit.' },
  enableSpousalBenefit: { help: 'Pay the spousal Social Security benefit.', detail: 'When on, the lower earner can receive up to half of the higher earner’s full benefit if that exceeds their own. Worth enabling when one partner earned much more than the other.' },

  pension: { help: 'Your annual pension, if you have one.', detail: 'Guaranteed yearly income from an employer or government pension (monthly amount × 12). Counts alongside Social Security as income you don’t have to draw from savings.' },
  spousePension: { help: 'Your partner’s annual pension, if any.', detail: 'Guaranteed yearly pension income for your partner (monthly amount × 12).' },
  pensionCOLA: { help: 'Does the pension rise with inflation?', detail: 'A cost-of-living adjustment keeps the pension’s buying power steady over time. Most private pensions are fixed (leave off); many government and military pensions have a COLA (turn on).' },
  partTime: { help: 'Steady extra income in retirement.', detail: 'Part-time work, an annuity, or rental income — anything dependable over a set age range. It reduces what you draw from the portfolio while it lasts. Set the amount and the years it runs.' },
  partTimeIncome: { help: 'How much that income pays per year.', detail: 'The annual amount, in today’s dollars. The plan grows it with inflation over the years you specify.' },
  partTimeStartAge: { help: 'When this income begins.', detail: 'The first age at which the extra income is received.' },
  partTimeEndAge: { help: 'When this income stops.', detail: 'The last age at which the extra income is received — for lifelong income like an annuity, set this to your planning age.' },

  savingsDest: { help: 'Where your contributions land.', detail: 'Pre-tax (traditional 401k/IRA) lowers today’s taxes but is taxed on withdrawal; Roth is taxed now but tax-free later. Split puts half in each. This shapes your future tax bill, not how much you save.' },

  healthcare65: { help: 'Health costs per year from 65 on.', detail: 'Medicare premiums plus out-of-pocket costs once you’re eligible at 65, per person, in today’s dollars. Added on top of your spending for the rest of the plan. Leaving this at $0 understates a real, lifelong cost.' },
  healthcareInflation: { help: 'How fast health costs rise.', detail: 'Medical costs have historically grown faster than general inflation, so this is set higher than the everyday inflation figure by default.' },
  spendingReduction: { help: 'Spend less in your later years.', detail: 'Research shows spending often tapers in the “slow-go” years. Turn this on to model a permanent step-down in the budget from a chosen age onward.' },
  spendingReductionAge: { help: 'When the step-down begins.', detail: 'From this age, your annual spending drops by the percentage below and stays there for the rest of the plan.' },
  spendingReductionPercent: { help: 'How much spending drops.', detail: 'The permanent reduction applied from the slow-down age — e.g. 20% turns an $80k budget into $64k.' },

  housingType: { help: 'Own your home or rent in retirement.', detail: 'Owning models a mortgage payment (until it’s paid off) plus property tax; renting models monthly rent that grows with inflation. Pick one — only its fields apply.' },
  mortgagePayment: { help: 'Your monthly mortgage payment.', detail: 'Principal and interest per month, applied until the payoff age you set. Property tax is entered separately because it continues after the mortgage ends.' },
  mortgageLastAge: { help: 'Age the mortgage is paid off.', detail: 'After this age the mortgage payment drops out of your budget. Required once a payment is entered.' },
  propertyTax: { help: 'Property tax per year.', detail: 'Annual property tax in today’s dollars. It continues for as long as you own the home and grows with inflation.' },
  monthlyRent: { help: 'Your monthly rent.', detail: 'Rent per month in today’s dollars; the plan grows it with inflation across retirement.' },

  windfall: { help: 'A one-time lump sum you expect.', detail: 'An inheritance, home sale, or other one-off amount. It lands in your taxable account in the single year you choose.' },
  windfallAmount: { help: 'Size of the lump sum.', detail: 'The amount received, in dollars at the age you specify.' },
  windfallAge: { help: 'The year it arrives.', detail: 'The age at which the windfall is added to your savings.' },
  rothConversion: { help: 'Move pre-tax money into Roth.', detail: 'Converting traditional balances to Roth during lower-income years raises taxes now but shrinks future required withdrawals and the taxes on them. A common strategy in the gap between retiring and starting Social Security.' },
  rothConversionAmount: { help: 'How much to convert each year.', detail: 'The yearly amount moved from pre-tax to Roth over the age range below. It’s taxed as ordinary income in the year converted.' },
  rothConversionStartAge: { help: 'First year of conversions.', detail: 'Conversions usually start at retirement, when income — and your tax rate — drop.' },
  rothConversionEndAge: { help: 'Last year of conversions.', detail: 'Often set just before Social Security or required withdrawals begin, to keep the conversion years in lower tax brackets.' },

  stockAllocation: { help: 'Share of the portfolio in stocks.', detail: 'The rest sits in bonds. More stock means higher expected growth but bigger swings — the balance between reward and the risk of a bad sequence early in retirement.' },
  glidePath: { help: 'Shift toward bonds as you age.', detail: 'Automatically dials stock exposure down over retirement, reducing the chance a market crash hits while you’re drawing heavily. Trades some growth for stability.' },

  // ── Advanced assumptions ──
  stateTaxRate: { help: 'Your state income tax rate.', detail: 'A single flat rate applied to income and capital gains in retirement. It does not apply state-specific exemptions (some states don’t tax Social Security or pensions) — enter an effective rate that reflects your situation, or 0 for no-income-tax states.' },
  taxableGainRatio: { help: 'Share of taxable account that’s gains.', detail: 'In a regular brokerage account, only the gain portion is taxed when you sell. A higher figure means more of each withdrawal is taxable. 60% is a reasonable default for a long-held account.' },
  bracketGrowth: { help: 'How fast tax brackets rise.', detail: 'Tax brackets are indexed to inflation each year. The default tracks long-run inflation; it’s separate from your price-inflation figure so you can stress-test bracket creep.' },
  tcjaSunset: { help: 'Let 2017 tax cuts expire in 2026.', detail: 'If on, the model reverts to the higher pre-2017 brackets and lower standard deduction from 2026, raising projected taxes. A conservative assumption about future tax policy.' },
  pensionStartAge: { help: 'When pension payments begin.', detail: 'Many pensions start at a set age that may differ from when you retire. Income needed before this age has to come from savings or Social Security.' },
  stockReturn: { help: 'Expected long-run stock return.', detail: 'The average yearly growth assumed for the stock portion, before inflation. The default reflects a broadly diversified equity portfolio; lowering it makes for a more conservative plan.' },
  bondReturn: { help: 'Expected long-run bond return.', detail: 'The average yearly growth assumed for the bond portion, before inflation. Bonds are steadier than stocks but grow more slowly.' },
  stockVol: { help: 'How much stock returns swing.', detail: 'Volatility — the size of the year-to-year ups and downs. Higher volatility widens the range of outcomes and raises the risk of a damaging loss early in retirement.' },
  bondVol: { help: 'How much bond returns swing.', detail: 'The year-to-year variability of the bond portion. Bonds are far steadier than stocks, so this is much lower than stock volatility.' },
  guardrails: { help: 'Adjust spending as markets move.', detail: 'Dynamic guardrails trim spending after bad years and allow a little more after good ones, keeping the plan on course. A flexible budget is one of the most powerful ways to avoid running out.' },
  guardrailCeiling: { help: 'Withdrawal rate that triggers a cut.', detail: 'If a market drop pushes your withdrawal rate above this level, spending is trimmed by the adjustment amount to protect the portfolio.' },
  guardrailFloor: { help: 'Withdrawal rate that allows a raise.', detail: 'If good markets pull your withdrawal rate below this level, spending is bumped up by the adjustment amount.' },
  guardrailAdjustment: { help: 'How big each adjustment is.', detail: 'The percentage spending moves when a guardrail is hit — larger values make the plan react more sharply to market swings.' },
};

// Small "i" affordance that reveals a field's deeper explanation on hover,
// focus, or tap. Theme-aware; popover floats below-right and never blocks input.
function InfoTip({ field, text, theme }) {
  const t = theme || {};
  const ink = t.ink || '#1a1815';
  const ink50 = t.ink50 || 'rgba(26,24,21,0.5)';
  const paper = t.paper || '#fff';
  const rule = t.rule || 'rgba(0,0,0,0.15)';
  const body = t.body || 'Inter, system-ui, sans-serif';
  const detail = text || (field && FIELD_INFO[field] && FIELD_INFO[field].detail) || '';
  const [open, setOpen] = React.useState(false);
  if (!detail) return null;
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); setOpen(o => !o); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="More about this input"
        style={{
          width: 15, height: 15, borderRadius: '50%', border: `1px solid ${ink50}`,
          background: 'transparent', color: ink50, cursor: 'help', padding: 0, lineHeight: 1,
          fontSize: 10, fontStyle: 'italic', fontFamily: 'Georgia, serif', fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto',
        }}
      >i</button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)',
            width: 232, background: paper, color: ink, border: `1px solid ${ink}`,
            padding: '11px 13px', fontFamily: body, fontSize: 12, lineHeight: 1.5, fontWeight: 400,
            letterSpacing: 0, textTransform: 'none', zIndex: 50,
            boxShadow: '0 6px 22px rgba(0,0,0,0.16)', textAlign: 'left',
          }}
        >
          <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
            borderBottom: `6px solid ${ink}` }} />
          {detail}
        </span>
      )}
    </span>
  );
}

// "65 → 67  ⟲" — shows a changed value and offers a one-click reset to baseline.
function DiffChip({ from, to, onReset, theme }) {
  const t = theme || {};
  const ink = t.ink || '#1a1815';
  const ink50 = t.ink50 || 'rgba(26,24,21,0.5)';
  const accent = t.accent || ink;
  const body = t.body || 'Inter, system-ui, sans-serif';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: body, fontSize: 11.5,
      color: ink, background: t.chipBg || 'rgba(0,0,0,0.04)', border: `1px solid ${t.rule || 'rgba(0,0,0,0.15)'}`,
      padding: '4px 6px 4px 10px', borderRadius: 2, fontVariantNumeric: 'tabular-nums',
    }}>
      <span style={{ color: ink50, textDecoration: 'line-through' }}>{from}</span>
      <span style={{ color: ink50 }}>→</span>
      <span style={{ fontWeight: 600, color: accent }}>{to}</span>
      <button type="button" onClick={onReset} title="Reset to your plan"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18,
          border: 'none', background: 'transparent', color: ink50, cursor: 'pointer', padding: 0, borderRadius: 2 }}
        onMouseEnter={(e) => { e.currentTarget.style.color = accent; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = ink50; }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <path d="M2.5 6a3.5 3.5 0 1 1 1 2.45" /><path d="M2.2 3.4v2.3h2.3" />
        </svg>
      </button>
    </span>
  );
}

Object.assign(window, { FIELD_INFO, InfoTip, DiffChip });
