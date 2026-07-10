// cover-inputs.jsx — 07 · Cover · Questionnaire
// The intake screen: every input shown at once, grouped by category, with
// related fields further split into labeled sub-groups (CSub) so toggling a
// field on/off reflows only its own block, not the whole section
// (UX-FIX-PLAN-2026-07-10 Release 1). Previously had a second
// mode="essentials" progressive-disclosure variant; index.html always
// rendered mode="detailed", so "essentials" was unreachable dead code and was
// removed in this same release along with the mode plumbing.
// Carries: plain-English helper lines + an "i" for deeper detail on every
// field, and a "Just me / Me + partner" toggle that reveals partner fields.
//
// Reuses window.cvStyles / window.CoverChrome / window.cvTheme from compass-cover.jsx
// and window.InfoTip / window.FIELD_INFO from retire-ui.jsx.

const cvi = window.cvStyles;
// V19.8: matches cvKicker's contrast/size fix in compass-cover.jsx.
const cviKicker = { fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: cvi.ink70 };

// Editable field with optional step buttons, helper line + info icon.
function CField({ field, label, value, onChange, min = 0, max = 9999999, step = 1, suffix, format, theme }) {
  const info = field && window.FIELD_INFO[field];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: cvi.ink70 }}>{label}</span>
        {info && <window.InfoTip field={field} label={label} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      <window.NumericStepper label={label} value={value} onChange={onChange} min={min} max={max}
        step={step} suffix={suffix} format={format} buttonStyle={cviStepBtn}
        rowStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${cvi.ink}`, paddingBottom: 6 }}
        inputStyle={{ width: '100%', minWidth: 0, margin: '0 8px', padding: '2px 4px', border: 'none',
          borderRadius: 2, textAlign: 'center', fontFamily: cvi.display, fontSize: 26, color: cvi.ink,
          fontVariantNumeric: 'tabular-nums', cursor: 'text' }}
        errorStyle={{ marginTop: 6, color: cvi.clay, fontSize: 10.5, lineHeight: 1.35 }} />
    </div>
  );
}
const cviStepBtn = {
  width: 28, height: 28, borderRadius: '50%', border: `1px solid ${cvi.ink20}`,
  background: 'transparent', color: cvi.ink, cursor: 'pointer', fontSize: 17, lineHeight: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cvi.body, flex: '0 0 auto',
};

// On/off toggle field (e.g. glide path).
function CToggle({ field, label, value, onChange, theme }) {
  const info = field && window.FIELD_INFO[field];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: cvi.ink70 }}>{label}</span>
        {info && <window.InfoTip field={field} label={label} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      <button onClick={() => onChange(!value)} aria-label={label} aria-pressed={value} style={{ display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
        <span style={{ width: 40, height: 22, borderRadius: 99, background: value ? cvi.sage : cvi.ink20,
          position: 'relative', transition: 'background 180ms', flex: '0 0 auto' }}>
          <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18,
            borderRadius: '50%', background: cvi.paper, transition: 'left 180ms' }} />
        </span>
        <span style={{ fontFamily: cvi.display, fontSize: 18, color: cvi.ink }}>{value ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
}

// Section wrapper. `flat` sections (small, no natural sub-topic split — "The
// people", "Your home") render their fields directly in one 3-col grid, same
// as before. Larger sections render a stack of CSub sub-groups instead, each
// with its own 3-col grid, so a toggle only reflows its own sub-group.
function CGroup({ title, children, last, flat }) {
  return (
    <div style={{ paddingBottom: last ? 0 : 30, marginBottom: last ? 0 : 30,
      borderBottom: last ? 'none' : `1px solid ${cvi.rule}` }}>
      <div style={{ fontFamily: cvi.display, fontSize: 24, marginBottom: 18, letterSpacing: '-0.01em' }}>{title}</div>
      {flat
        ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 28px' }}>{children}</div>
        : <div style={{ display: 'grid', gap: 26 }}>{children}</div>}
    </div>
  );
}

function CSegment({ value, onChange, theme }) {
  const opts = [{ v: false, label: 'Just me' }, { v: true, label: 'Me + partner' }];
  return (
    <div style={{ display: 'inline-flex', border: `1px solid ${cvi.ink}`, background: cvi.paper }}>
      {opts.map((o, i) => (
        <button key={String(o.v)} onClick={() => onChange(o.v)} style={{
          fontFamily: cvi.body, fontSize: 11.5, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '9px 18px', cursor: 'pointer', border: 'none', fontWeight: 600,
          borderLeft: i ? `1px solid ${cvi.ink}` : 'none',
          background: value === o.v ? cvi.ink : 'transparent',
          color: value === o.v ? cvi.paper : cvi.ink70 }}>{o.label}</button>
      ))}
    </div>
  );
}

// V19.1: small persistent score readout in the sticky masthead (via CoverChrome's
// rightExtra) so the number is visible while editing fields further down the page,
// not only at the bottom. Reads the same `results` the rest of the screen already
// computes — no extra recompute, so it updates exactly when a field commit does.
function CviScoreChip({ score, vc, dirty }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 10px',
      border: `1px solid ${vc}`, whiteSpace: 'nowrap' }}>
      {!dirty && <span style={{ fontFamily: cvi.body, fontSize: 8.5, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: cvi.clay }}>Sample</span>}
      <span style={{ fontFamily: cvi.display, fontSize: 19, color: vc, lineHeight: 1 }}>{score}</span>
      <span style={{ fontFamily: cvi.display, fontSize: 10.5, color: cvi.ink50 }}>/100</span>
    </div>
  );
}

// Dropdown field — same label + helper + info treatment as CField.
function CSelect({ field, label, value, onChange, options, theme }) {
  const info = field && window.FIELD_INFO[field];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: cvi.ink70 }}>{label}</span>
        {info && <window.InfoTip field={field} label={label} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      <div style={{ position: 'relative', borderBottom: `1px solid ${cvi.ink}`, paddingBottom: 6 }}>
        <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', fontFamily: cvi.display, fontSize: 19, color: cvi.ink, background: 'transparent',
          border: 'none', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none',
          appearance: 'none', padding: '2px 18px 2px 0' }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 0, bottom: 9, pointerEvents: 'none',
          fontSize: 11, color: cvi.ink50 }}>▾</span>
      </div>
    </div>
  );
}

// Collapsible "Advanced assumptions" block at the foot of the questionnaire.
function CAdvanced({ count, children }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ marginTop: 38, borderTop: `1px solid ${cvi.ink}`, paddingTop: 26 }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex',
        alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, background: 'none',
        border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
        <div>
          <div style={{ fontFamily: cvi.display, fontSize: 24, letterSpacing: '-0.01em' }}>Advanced assumptions</div>
          <div style={{ fontSize: 12.5, lineHeight: 1.45, color: cvi.ink70, marginTop: 5, maxWidth: 440 }}>
            Tax, market, and strategy settings. Most people leave these at our defaults — open them only if you want to fine-tune.
          </div>
        </div>
        <span style={{ fontFamily: cvi.body, fontSize: 11.5, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: cvi.ink70, display: 'inline-flex', alignItems: 'center',
          gap: 7, flex: '0 0 auto', paddingTop: 6, whiteSpace: 'nowrap' }}>
          {open ? '▾ Hide' : `▸ Show ${count} settings`}
        </span>
      </button>
      {open && <div style={{ marginTop: 30, display: 'grid', gap: 30 }}>{children}</div>}
    </div>
  );
}

// Sub-group: small-caps label + a 3-up grid. Used both inside the Advanced
// assumptions block and (Release 1) inside the main CGroup sections.
// role="group" + aria-labelledby ties the fields inside to this heading as
// their accessible group name — the actual fix (not just visual proximity)
// for fields whose short labels alone would read identically to a screen
// reader (e.g. two "Amount / yr" fields under "Your..." vs "Partner's...").
function CSub({ title, children }) {
  const headingId = React.useId();
  return (
    <div role="group" aria-labelledby={headingId}>
      <div id={headingId} style={{ ...cviKicker, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 28px' }}>{children}</div>
    </div>
  );
}

const CVI_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => ({ v: s, label: s }));

function CoverInputs(props) { const { params: extP, setParams: extSP, freshStart, adjustNote } = props || {};
  const [localParams, setLocalParams] = React.useState(window.MockEngine.DEFAULTS); const params = extP || localParams; const setParams = extSP || setLocalParams;
  const results = React.useMemo(() => window.MockEngine.compute(params), [params]);
  const update = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const fmt = window.MockEngine.formatCurrency;
  const vc = results.verdict === 'green' ? cvi.sage : results.verdict === 'yellow' ? cvi.amber
    : results.verdict === 'orange' ? cvi.rust : cvi.clay;
  const theme = window.cvTheme(vc);
  const partner = params.hasPartner;
  // Questionnaire values stay exact after entry; compact rounding belongs on summary screens.
  const money = v => fmt(v);
  // V19.1: dirty = the plan has been touched at least once (vs. sitting on DEFAULTS).
  // Drives the "sample" labeling and the live score chip below, matching every other screen.
  const dirty = JSON.stringify(params) !== JSON.stringify(window.MockEngine.DEFAULTS);

  return (
    <window.CoverChrome active="quiz" tag="V19.13"
      rightExtra={<CviScoreChip score={results.successRate} vc={vc} dirty={dirty} />}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cviKicker, textAlign: 'center', marginBottom: 12 }}>
          Input Data
        </div>
        <h1 style={{ fontFamily: cvi.display, fontSize: 58, lineHeight: 1.04, textAlign: 'center',
          margin: '0 0 14px', letterSpacing: '-0.01em' }}>A few questions.</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: cvi.ink70, textAlign: 'center',
          maxWidth: 560, margin: '0 auto 30px' }}>
          Every input your results use, in plain language. Hover any “i” for the why behind it; sensible defaults cover anything you skip.
        </p>

        {adjustNote && adjustNote.length > 0 && (
          <div style={{ maxWidth: 760, margin: '0 auto 20px', padding: '10px 14px',
            border: `1px solid ${cvi.amber}`, background: cvi.amberSoft, color: cvi.ink,
            fontFamily: cvi.body, fontSize: 13.5, lineHeight: 1.5 }}>
            {window.cvAdjustMessage(adjustNote)}
          </div>
        )}

        {!freshStart && (
          <div style={{ maxWidth: 760, margin: '0 auto 36px' }}>
            <window.CoverSaveLoadCallout params={params} setParams={setParams}
              prompt="Returning? Load your saved plan — no need to re-enter everything." primary="load" />
          </div>
        )}

        {/* Who the plan is for */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          marginBottom: 40 }}>
          <span style={{ ...cviKicker }}>This plan is for</span>
          <CSegment value={partner} onChange={v => update('hasPartner', v)} theme={theme} />
        </div>

        {/* The people — small, no natural sub-topic split; stays flat. */}
        <CGroup title="The people" flat>
          <CField field="currentAge" label="Your age" value={params.currentAge} onChange={v => update('currentAge', v)} min={20} max={85} theme={theme} />
          <CField field="retireAge" label="You retire at" value={params.retireAge} onChange={v => update('retireAge', v)} min={params.currentAge + 1} max={80} theme={theme} />
          <CField field="endAge" label="Plan to age" value={params.endAge} onChange={v => update('endAge', v)} min={params.retireAge + 1} max={110} theme={theme} />
          {partner && <CField field="spouseAge" label="Partner's age" value={params.spouseAge} onChange={v => update('spouseAge', v)} min={20} max={85} theme={theme} />}
          {partner && <CField field="spouseRetireAge" label="Partner retires at" value={params.spouseRetireAge} onChange={v => update('spouseRetireAge', v)} min={params.spouseAge + 1} max={80} theme={theme} />}
        </CGroup>

        {/* Savings */}
        <CGroup title="What you've saved">
          <CSub title="Accounts">
            <CField field="preTax" label={partner ? 'Your pre-tax (401k/IRA)' : 'Pre-tax (401k/IRA)'} value={params.userPreTax} step={10000} min={0} max={5000000} onChange={v => update('userPreTax', v)} format={money} theme={theme} />
            <CField field="roth" label={partner ? 'Your Roth' : 'Roth'} value={params.userRoth} step={10000} min={0} max={3000000} onChange={v => update('userRoth', v)} format={money} theme={theme} />
            <CField field="taxable" label="Taxable (joint)" value={params.taxable} step={10000} min={0} max={3000000} onChange={v => update('taxable', v)} format={money} theme={theme} />
            {partner && <CField field="preTax" label="Partner's pre-tax" value={params.spousePreTax} step={10000} min={0} max={5000000} onChange={v => update('spousePreTax', v)} format={money} theme={theme} />}
            {partner && <CField field="roth" label="Partner's Roth" value={params.spouseRoth} step={10000} min={0} max={3000000} onChange={v => update('spouseRoth', v)} format={money} theme={theme} />}
          </CSub>
          <CSub title="One-time windfall">
            <CToggle field="windfall" label="One-time windfall" value={params.enableWindfall}
              onChange={v => update('enableWindfall', v)} theme={theme} />
            {params.enableWindfall && <CField field="windfallAmount" label="Amount" value={params.windfallAmount} step={10000} min={0} max={5000000}
              onChange={v => update('windfallAmount', v)} format={money} theme={theme} />}
            {params.enableWindfall && <CField field="windfallAge" label="At age" value={params.windfallAge} min={params.currentAge} max={params.endAge}
              onChange={v => update('windfallAge', v)} theme={theme} />}
          </CSub>
        </CGroup>

        {/* Income today */}
        <CGroup title="What comes in">
          <CSub title="You">
            <CField field="salary" label={partner ? 'Your salary' : 'Salary'} value={params.salary} step={5000} min={0} max={1000000} onChange={v => update('salary', v)} format={money} theme={theme} />
            <CField field="savingsRate" label="Your contribution rate" value={params.savingsRate} min={0} max={60} onChange={v => update('savingsRate', v)} suffix="%" theme={theme} />
            {params.currentAge >= 50 && <CField field="priorYearWages" label="Your prior-year W-2 wages" value={params.priorYearWages} step={5000} min={0} max={1000000} onChange={v => update('priorYearWages', v)} format={money} theme={theme} />}
            <CField field="employerContributionRate" label="Your employer adds" value={params.employerContributionRate} min={0} max={60} onChange={v => update('employerContributionRate', v)} suffix="%" theme={theme} />
            <CSelect field="savingsDest" label="Your contributions go to" value={params.savingsDest} onChange={v => update('savingsDest', v)} theme={theme}
              options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />
            {params.employerContributionRate > 0 && <CSelect field="employerContributionDest" label="Your employer contributions go to" value={params.employerContributionDest} onChange={v => update('employerContributionDest', v)} theme={theme}
              options={[{ v: 'pretax', label: 'Pre-tax (traditional)' }, { v: 'roth', label: 'Roth' }]} />}
          </CSub>
          {partner && (
            <CSub title="Your partner">
              <CField field="spouseSalary" label="Partner's salary" value={params.spouseSalary} step={5000} min={0} max={1000000} onChange={v => update('spouseSalary', v)} format={money} theme={theme} />
              <CField field="spouseSavingsRate" label="Partner's contribution rate" value={params.spouseSavingsRate} min={0} max={60} onChange={v => update('spouseSavingsRate', v)} suffix="%" theme={theme} />
              {params.spouseAge >= 50 && <CField field="spousePriorYearWages" label="Partner's prior-year W-2 wages" value={params.spousePriorYearWages} step={5000} min={0} max={1000000} onChange={v => update('spousePriorYearWages', v)} format={money} theme={theme} />}
              <CField field="spouseEmployerContributionRate" label="Partner's employer adds" value={params.spouseEmployerContributionRate} min={0} max={60} onChange={v => update('spouseEmployerContributionRate', v)} suffix="%" theme={theme} />
              <CSelect field="spouseSavingsDest" label="Partner's contributions go to" value={params.spouseSavingsDest} onChange={v => update('spouseSavingsDest', v)} theme={theme}
                options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />
              {params.spouseEmployerContributionRate > 0 && <CSelect field="spouseEmployerContributionDest" label="Partner's employer contributions go to" value={params.spouseEmployerContributionDest} onChange={v => update('spouseEmployerContributionDest', v)} theme={theme}
                options={[{ v: 'pretax', label: 'Pre-tax (traditional)' }, { v: 'roth', label: 'Roth' }]} />}
            </CSub>
          )}
        </CGroup>

        {/* Spending */}
        <CGroup title="What goes out">
          <CSub title="Everyday spending">
            <CField field="spending" label="Other spending / yr" value={params.spending} step={5000} min={40000} max={250000} onChange={v => update('spending', v)} format={money} theme={theme} />
          </CSub>
          <CSub title="Healthcare">
            <CField field="healthcare" label="Healthcare / yr to 65" value={params.healthcare} step={1000} min={0} max={60000} onChange={v => update('healthcare', v)} format={money} theme={theme} />
            <CField field="healthcare65" label="Healthcare / yr from 65" value={params.healthcare65} step={1000} min={0} max={60000} onChange={v => update('healthcare65', v)} format={money} theme={theme} />
            <CField field="healthcareInflation" label="Healthcare inflation" value={params.healthcareInflation} step={0.5} min={0} max={12} onChange={v => update('healthcareInflation', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
          </CSub>
          <CSub title="Later-life changes">
            <CToggle field="spendingReduction" label="Spend less later in life" value={params.enableSpendingReduction} onChange={v => update('enableSpendingReduction', v)} theme={theme} />
            {params.enableSpendingReduction && <CField field="spendingReductionAge" label="Slow-down age" value={params.spendingReductionAge} min={params.retireAge} max={params.endAge} onChange={v => update('spendingReductionAge', v)} theme={theme} />}
            {params.enableSpendingReduction && <CField field="spendingReductionPercent" label="Cut spending by" value={params.spendingReductionPercent} min={0} max={60} onChange={v => update('spendingReductionPercent', v)} suffix="%" theme={theme} />}
          </CSub>
          <CSub title="Legacy goal & inflation">
            <CField field="legacyGoal" label="Legacy goal" value={params.legacyGoal} step={25000} min={0} max={3000000} onChange={v => update('legacyGoal', v)} format={money} theme={theme} />
            <CField field="inflation" label="Inflation" value={params.inflation} step={0.1} min={0} max={8} onChange={v => update('inflation', Math.round(v * 10) / 10)} suffix="%" theme={theme} />
          </CSub>
        </CGroup>

        {/* Guaranteed income */}
        <CGroup title="Guaranteed income">
          <CSub title="Social Security">
            <CField field="ssBenefit" label={partner ? 'Your SS / yr (at 67)' : 'SS / yr (at 67)'} value={params.ssBenefit} step={1000} min={0} max={80000} onChange={v => update('ssBenefit', v)} format={v => '$' + v.toLocaleString()} theme={theme} />
            <CField field="ssClaimAge" label="You claim SS at" value={params.ssClaimAge} min={62} max={70} onChange={v => update('ssClaimAge', v)} theme={theme} />
            {partner && <CField field="spouseSS" label="Partner's SS / yr" value={params.spouseSS} step={1000} min={0} max={80000} onChange={v => update('spouseSS', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
            {partner && <CField field="spouseClaimAge" label="Partner claims at" value={params.spouseClaimAge} min={62} max={70} onChange={v => update('spouseClaimAge', v)} theme={theme} />}
            {partner && <CToggle field="enableSpousalBenefit" label="Apply SS spousal benefit" value={params.enableSpousalBenefit} onChange={v => update('enableSpousalBenefit', v)} theme={theme} />}
          </CSub>
          <CSub title="Your pension">
            <CField field="pension" label="Your pension / yr" value={params.pension} step={1000} min={0} max={200000} onChange={v => update('pension', v)} format={v => '$' + v.toLocaleString()} theme={theme} />
            {params.pension > 0 && <CField field="pensionStartAge" label="Your pension starts at" value={params.pensionStartAge} min={50} max={75} onChange={v => update('pensionStartAge', v)} theme={theme} />}
            {params.pension > 0 && <CToggle field="pensionCOLA" label="Your pension has COLA" value={params.enablePensionCOLA} onChange={v => update('enablePensionCOLA', v)} theme={theme} />}
          </CSub>
          {partner && (
            <CSub title="Partner's pension">
              <CField field="spousePension" label="Partner's pension / yr" value={params.spousePension} step={1000} min={0} max={200000} onChange={v => update('spousePension', v)} format={v => '$' + v.toLocaleString()} theme={theme} />
              {params.spousePension > 0 && <CField field="pensionStartAge" label="Partner's pension starts at" value={params.spousePensionStartAge} min={50} max={75} onChange={v => update('spousePensionStartAge', v)} theme={theme} />}
              {params.spousePension > 0 && <CToggle field="pensionCOLA" label="Partner's pension has COLA" value={params.enableSpousePensionCOLA} onChange={v => update('enableSpousePensionCOLA', v)} theme={theme} />}
            </CSub>
          )}
          {/* Amount/yr labels below are deliberately owner-prefixed ("Your" / "Partner's") even
              though the CSub heading already carries the owner — the two amount fields shared
              identical short labels before this release, an accessible-name collision for screen
              readers that visual containment alone doesn't fix (flagged in the 2026-07-10 critique). */}
          <CSub title={partner ? "Your part-time / other income" : "Part-time / other income"}>
            <CToggle field="partTime" label={partner ? 'Your part-time / other income' : 'Part-time / other income'} value={params.enablePartTime} onChange={v => update('enablePartTime', v)} theme={theme} />
            {params.enablePartTime && <CField field="partTimeIncome" label="Your amount / yr" value={params.partTimeIncome} step={1000} min={0} max={200000} onChange={v => update('partTimeIncome', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
            {params.enablePartTime && <CField field="partTimeStartAge" label="From your age" value={params.partTimeStartAge} min={params.currentAge} max={params.endAge} onChange={v => update('partTimeStartAge', v)} theme={theme} />}
            {params.enablePartTime && <CField field="partTimeEndAge" label="To your age" value={params.partTimeEndAge} min={params.partTimeStartAge} max={params.endAge} onChange={v => update('partTimeEndAge', v)} theme={theme} />}
          </CSub>
          {partner && (
            <CSub title="Partner's part-time income">
              <CToggle field="partTime" label="Partner's part-time income" value={params.spouseEnablePartTime} onChange={v => update('spouseEnablePartTime', v)} theme={theme} />
              {params.spouseEnablePartTime && <CField field="partTimeIncome" label="Partner's amount / yr" value={params.spousePartTimeIncome} step={1000} min={0} max={200000} onChange={v => update('spousePartTimeIncome', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
              {params.spouseEnablePartTime && <CField field="partTimeStartAge" label="From partner's age" value={params.spousePartTimeStartAge} min={params.spouseAge} max={params.endAge} onChange={v => update('spousePartTimeStartAge', v)} theme={theme} />}
              {params.spouseEnablePartTime && <CField field="partTimeEndAge" label="To partner's age" value={params.spousePartTimeEndAge} min={params.spousePartTimeStartAge} max={params.endAge} onChange={v => update('spousePartTimeEndAge', v)} theme={theme} />}
            </CSub>
          )}
        </CGroup>

        {/* Your home — small, no natural sub-topic split; stays flat. */}
        <CGroup title="Your home" flat>
          <CSelect field="housingType" label="In retirement you" value={params.housingType} onChange={v => update('housingType', v)} theme={theme}
            options={[{ v: 'own', label: 'Own your home' }, { v: 'rent', label: 'Rent' }]} />
          {params.housingType === 'own' && <CField field="mortgagePayment" label="Mortgage P&I / mo" value={params.mortgagePayment} step={250} min={0} max={20000} onChange={v => update('mortgagePayment', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
          {params.housingType === 'own' && params.mortgagePayment > 0 && <CField field="mortgageLastAge" label="Mortgage paid off at" value={params.mortgageLastAge} min={params.currentAge} max={params.endAge} onChange={v => update('mortgageLastAge', v)} theme={theme} />}
          {params.housingType === 'own' && <CField field="propertyTax" label="Tax + home insurance / yr" value={params.propertyTax} step={500} min={0} max={60000} onChange={v => update('propertyTax', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
          {params.housingType === 'rent' && <CField field="monthlyRent" label="Rent / mo" value={params.monthlyRent} step={250} min={0} max={20000} onChange={v => update('monthlyRent', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
        </CGroup>

        {/* Investments */}
        <CGroup title="Investments" last>
          <CSub title="Mix today">
            <CField field="stockAllocation" label="Stocks now" value={params.stockAllocation} min={0} max={100} onChange={v => update('stockAllocation', v)} suffix="%" theme={theme} />
          </CSub>
          <CSub title="Glide path">
            <CToggle field="glidePath" label="Glide path" value={params.enableGlidePath} onChange={v => update('enableGlidePath', v)} theme={theme} />
            {params.enableGlidePath && <CField field="glidePathEndStock" label="Stocks by end" value={params.glidePathEndStock} min={0} max={params.stockAllocation} onChange={v => update('glidePathEndStock', v)} suffix="%" theme={theme} />}
          </CSub>
          <CSub title="Roth conversions">
            <CToggle field="rothConversion" label="Roth conversions" value={params.enableRothConversion} onChange={v => update('enableRothConversion', v)} theme={theme} />
            {params.enableRothConversion && <CField field="rothConversionAmount" label="Amount / yr" value={params.rothConversionAmount} step={5000} min={0} max={500000} onChange={v => update('rothConversionAmount', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
            {params.enableRothConversion && <CField field="rothConversionStartAge" label="From age" value={params.rothConversionStartAge} min={params.currentAge} max={params.endAge} onChange={v => update('rothConversionStartAge', v)} theme={theme} />}
            {params.enableRothConversion && <CField field="rothConversionEndAge" label="To age" value={params.rothConversionEndAge} min={params.rothConversionStartAge} max={params.endAge} onChange={v => update('rothConversionEndAge', v)} theme={theme} />}
          </CSub>
        </CGroup>

        {/* Advanced assumptions — the remaining engine inputs, collapsed by default */}
        <CAdvanced count={13}>
          <CSub title="Tax & residence">
            <CField field="stateTaxRate" label="State tax rate" value={params.stateTaxRate} step={0.5} min={0} max={14}
              onChange={v => update('stateTaxRate', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CField field="taxableGainRatio" label="Taxable account gain %" value={params.taxableGainRatio} step={5} min={0} max={100}
              onChange={v => update('taxableGainRatio', v)} suffix="%" theme={theme} />
            <CField field="bracketGrowth" label="Tax bracket growth" value={params.bracketGrowth} step={0.1} min={0} max={5}
              onChange={v => update('bracketGrowth', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CToggle field="tcjaSunset" label="Assume higher future tax rates" value={params.enableTCJASunset}
              onChange={v => update('enableTCJASunset', v)} theme={theme} />
          </CSub>
          <CSub title="Market assumptions">
            <CField field="stockReturn" label="Stock return" value={params.stockReturn} step={0.1} min={3} max={12}
              onChange={v => update('stockReturn', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CField field="bondReturn" label="Bond return" value={params.bondReturn} step={0.1} min={1} max={7}
              onChange={v => update('bondReturn', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CField field="stockVol" label="Stock volatility" value={params.stockVol} min={8} max={30}
              onChange={v => update('stockVol', v)} suffix="%" theme={theme} />
            <CField field="bondVol" label="Bond volatility" value={params.bondVol} step={0.5} min={1} max={15}
              onChange={v => update('bondVol', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CField field="numPaths" label="Simulation paths" value={params.numPaths} step={500} min={500} max={10000}
              onChange={v => update('numPaths', v)} format={v => v.toLocaleString()} theme={theme} />
          </CSub>
          <CSub title="Strategy">
            <CToggle field="guardrails" label="Spending guardrails" value={params.enableGuardrails}
              onChange={v => update('enableGuardrails', v)} theme={theme} />
            {params.enableGuardrails && <CField field="guardrailCeiling" label="Ceiling (cut above)" value={params.guardrailCeiling} step={0.5} min={1} max={12}
              onChange={v => update('guardrailCeiling', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />}
            {params.enableGuardrails && <CField field="guardrailFloor" label="Floor (raise below)" value={params.guardrailFloor} step={0.5} min={1} max={12}
              onChange={v => update('guardrailFloor', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />}
            {params.enableGuardrails && <CField field="guardrailAdjustment" label="Adjustment size" value={params.guardrailAdjustment} step={1} min={1} max={30}
              onChange={v => update('guardrailAdjustment', v)} suffix="%" theme={theme} />}
          </CSub>
          <div style={{ fontSize: 12, lineHeight: 1.5, color: cvi.ink70, textWrap: 'pretty' }}>
            Note: tax filing status follows your “Just me / Me + partner” choice above (single vs. married-joint).
            State tax is modeled as one flat rate on income and gains — it does not apply state-specific Social Security or pension exemptions.
          </div>
        </CAdvanced>

        {/* Reveal panel */}
        <div style={{ marginTop: 44, border: `1px solid ${cvi.ink}`, background: cvi.paperWarm,
          padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div>
            {!dirty && (
              <div style={{ display: 'inline-block', marginBottom: 10, padding: '4px 10px',
                border: `1px solid ${cvi.clay}`, color: cvi.clay, background: cvi.claySoft,
                fontFamily: cvi.body, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                Sample plan · not your numbers yet</div>
            )}
            <div style={{ ...cviKicker, marginBottom: 6 }}>{dirty ? 'Your number, so far' : 'Sample number, so far'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: cvi.display, fontSize: 96, lineHeight: 0.9, color: vc, transition: 'color 300ms' }}>{results.successRate}</span>
              <span style={{ fontFamily: cvi.display, fontSize: 30, color: cvi.ink50 }}>/100</span>
            </div>
            <div style={{ fontSize: 12.5, color: cvi.ink70, marginTop: 4 }}>
              {partner ? 'Modeled as a couple' : 'Modeled for one'} · {money(results.totalSavings)} saved today
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: cvi.display, fontSize: 34, color: vc, marginBottom: 14, transition: 'color 300ms' }}>{results.verdictWord}.</div>
            <button onClick={() => window._coverNav && window._coverNav('cover')} style={{ padding: '15px 30px', background: cvi.ink, color: cvi.paper, border: 'none',
              fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
              cursor: 'pointer', fontWeight: 600 }}>See your results →</button>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <window.CoverSaveLoad params={params} setParams={setParams} align="left" />
        </div>
      </div>
    </window.CoverChrome>
  );
}

Object.assign(window, { CoverInputs, CVI_STATES });
