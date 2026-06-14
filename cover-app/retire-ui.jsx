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
    help: 'Your monthly Social Security at full age (67).',
    detail: 'Your estimated benefit at full retirement age (67) — find it on your Social Security statement at ssa.gov. Claiming earlier reduces it; waiting until 70 increases it about 8% per year.',
  },
  ssClaimAge: { help: 'The age you start Social Security.', detail: 'You can claim anywhere from 62 to 70. Each year you wait past 67 adds roughly 8% to your monthly check — a guaranteed, inflation-protected raise for life.' },
  spouseSS: { help: 'Your partner’s monthly benefit at age 67.', detail: 'Your partner’s estimated Social Security at their full retirement age. Couples can stagger claim ages to balance income and survivor benefits.' },
  spouseClaimAge: { help: 'The age your partner starts Social Security.', detail: 'Set independently from yours — it’s often worth having the higher earner wait until 70 for the larger survivor benefit.' },

  pension: { help: 'A monthly pension, if you have one.', detail: 'Guaranteed monthly income from an employer or government pension. Counts alongside Social Security as income you don’t have to draw from savings.' },
  spousePension: { help: 'Your partner’s monthly pension, if any.', detail: 'Guaranteed monthly pension income for your partner.' },
  otherIncome: { help: 'Any other steady monthly income.', detail: 'Rental income, an annuity, part-time work — anything dependable that reduces what you pull from the portfolio.' },

  stockAllocation: { help: 'Share of the portfolio in stocks.', detail: 'The rest sits in bonds. More stock means higher expected growth but bigger swings — the balance between reward and the risk of a bad sequence early in retirement.' },
  glidePath: { help: 'Shift toward bonds as you age.', detail: 'Automatically dials stock exposure down over retirement, reducing the chance a market crash hits while you’re drawing heavily. Trades some growth for stability.' },

  // ── Advanced assumptions ──
  filingStatus: { help: 'How you file your taxes.', detail: 'Single, married filing jointly, or head of household. Sets the tax brackets and standard deduction the plan uses when estimating what you keep after tax.' },
  stateOfResidence: { help: 'Where you’ll live in retirement.', detail: 'State income tax varies widely — some states tax retirement income heavily, others not at all. Used to estimate state tax on withdrawals and Social Security.' },
  pensionStartAge: { help: 'When pension payments begin.', detail: 'Many pensions start at a set age that may differ from when you retire. Income needed before this age has to come from savings or Social Security.' },
  stockReturn: { help: 'Expected long-run stock return.', detail: 'The average yearly growth assumed for the stock portion, before inflation. The default reflects a broadly diversified equity portfolio; lowering it makes for a more conservative plan.' },
  bondReturn: { help: 'Expected long-run bond return.', detail: 'The average yearly growth assumed for the bond portion, before inflation. Bonds are steadier than stocks but grow more slowly.' },
  stockVol: { help: 'How much stock returns swing.', detail: 'Volatility — the size of the year-to-year ups and downs. Higher volatility widens the range of outcomes and raises the risk of a damaging loss early in retirement.' },
  guardrails: { help: 'Adjust spending as markets move.', detail: 'Dynamic guardrails trim spending after bad years and allow a little more after good ones, keeping the plan on course. A flexible budget is one of the most powerful ways to avoid running out.' },
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
