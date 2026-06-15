// cover-inputs.jsx — 07 · Cover · Questionnaire
// The intake screen, in two depth variants so we can compare approaches:
//   mode="essentials" → a curated front page; each section reveals its deeper
//                       inputs behind a "Show more" expander (progressive).
//   mode="detailed"   → every input shown at once, grouped by category.
// Both carry: plain-English helper lines + an "i" for deeper detail on every
// field, and a "Just me / Me + partner" toggle that reveals partner fields.
//
// Reuses window.cvStyles / window.CoverChrome / window.cvTheme from compass-cover.jsx
// and window.InfoTip / window.FIELD_INFO from retire-ui.jsx.

const cvi = window.cvStyles;
const cviKicker = { fontFamily: cvi.body, fontSize: 10.5, letterSpacing: '0.22em',
  textTransform: 'uppercase', color: cvi.ink50 };

// Stepper field with helper line + info icon.
function CField({ field, label, value, onChange, min = 0, max = 9999999, step = 1, suffix, format, theme }) {
  const info = field && window.FIELD_INFO[field];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: cvi.body, fontSize: 10.5, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: cvi.ink50 }}>{label}</span>
        {info && <window.InfoTip field={field} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: `1px solid ${cvi.ink}`, paddingBottom: 6 }}>
        <button onClick={() => onChange(Math.max(min, value - step))} style={cviStepBtn}>−</button>
        <span style={{ fontFamily: cvi.display, fontSize: 26, color: cvi.ink,
          fontVariantNumeric: 'tabular-nums' }}>{format ? format(value) : value}{suffix || ''}</span>
        <button onClick={() => onChange(Math.min(max, value + step))} style={cviStepBtn}>+</button>
      </div>
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
        <span style={{ fontFamily: cvi.body, fontSize: 10.5, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: cvi.ink50 }}>{label}</span>
        {info && <window.InfoTip field={field} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      <button onClick={() => onChange(!value)} style={{ display: 'flex', alignItems: 'center', gap: 10,
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

// Section wrapper: essential children always shown; advanced revealed inline
// (detailed mode) or behind a "Show more" expander (essentials mode).
function CGroup({ title, children, advanced, mode, last }) {
  const [open, setOpen] = React.useState(false);
  const detailed = mode === 'detailed';
  const advCount = React.Children.count(advanced);
  const showAdv = detailed || open;
  return (
    <div style={{ paddingBottom: last ? 0 : 30, marginBottom: last ? 0 : 30,
      borderBottom: last ? 'none' : `1px solid ${cvi.rule}` }}>
      <div style={{ fontFamily: cvi.display, fontSize: 24, marginBottom: 18, letterSpacing: '-0.01em' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 28px' }}>
        {children}
        {showAdv && advanced}
      </div>
      {advCount > 0 && !detailed && (
        <button onClick={() => setOpen(o => !o)} style={{ marginTop: 18, background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: cvi.body, fontSize: 11.5, letterSpacing: '0.08em', color: cvi.ink70,
          textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 7, padding: 0 }}>
          {open ? '▾ Hide' : `▸ Show ${advCount} more`} {open ? '' : `· ${title.toLowerCase()}`}
        </button>
      )}
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

// Dropdown field — same label + helper + info treatment as CField.
function CSelect({ field, label, value, onChange, options, theme }) {
  const info = field && window.FIELD_INFO[field];
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontFamily: cvi.body, fontSize: 10.5, letterSpacing: '0.13em',
          textTransform: 'uppercase', color: cvi.ink50 }}>{label}</span>
        {info && <window.InfoTip field={field} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      <div style={{ position: 'relative', borderBottom: `1px solid ${cvi.ink}`, paddingBottom: 6 }}>
        <select value={value} onChange={e => onChange(e.target.value)} style={{
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

// Sub-group inside the advanced block: small caps label + a 3-up grid.
function CSub({ title, children }) {
  return (
    <div>
      <div style={{ ...cviKicker, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px 28px' }}>{children}</div>
    </div>
  );
}

const CVI_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => ({ v: s, label: s }));

function CoverInputs(props) { const { mode = 'essentials', params: extP, setParams: extSP } = props || {};
  const [localParams, setLocalParams] = React.useState(window.MockEngine.DEFAULTS); const params = extP || localParams; const setParams = extSP || setLocalParams;
  const results = React.useMemo(() => window.MockEngine.compute(params), [params]);
  const update = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const fmt = window.MockEngine.formatCurrency;
  const vc = results.verdict === 'green' ? cvi.sage : results.verdict === 'yellow' ? cvi.amber : cvi.clay;
  const theme = window.cvTheme(vc);
  const partner = params.hasPartner;
  const money = v => fmt(v, { compact: true });
  const detailed = mode === 'detailed';

  return (
    <window.CoverChrome active="quiz" tag={`Concept 07 / Cover · Questionnaire · ${detailed ? 'Option B — everything shown' : 'Option A — essentials + reveal'}`}>
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cviKicker, textAlign: 'center', marginBottom: 12 }}>
          The Questionnaire · {detailed ? 'Detailed' : 'Essentials'}
        </div>
        <h1 style={{ fontFamily: cvi.display, fontSize: 58, lineHeight: 1.04, textAlign: 'center',
          margin: '0 0 14px', letterSpacing: '-0.01em' }}>A few questions.</h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.6, color: cvi.ink70, textAlign: 'center',
          maxWidth: 560, margin: '0 auto 30px' }}>
          {detailed
            ? 'Every input the cover uses, in plain language. Hover any “i” for the why behind it; sensible defaults cover anything you skip.'
            : 'Answer the essentials; open “Show more” in any section for the finer dials. Every field explains itself, and the number on your cover updates as you go.'}
        </p>

        {/* Who the plan is for */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
          marginBottom: 40 }}>
          <span style={{ ...cviKicker }}>This plan is for</span>
          <CSegment value={partner} onChange={v => update('hasPartner', v)} theme={theme} />
        </div>

        {/* The people */}
        <CGroup title="The people" mode={mode}
          advanced={[
            partner && <CField key="sret" field="retireAge" label="Partner retires at" value={params.spouseRetireAge}
              onChange={v => update('spouseRetireAge', v)} min={params.spouseAge + 1} max={80} theme={theme} />,
          ].filter(Boolean)}>
          <CField field="currentAge" label="Your age" value={params.currentAge} onChange={v => update('currentAge', v)} min={20} max={85} theme={theme} />
          <CField field="retireAge" label="You retire at" value={params.retireAge} onChange={v => update('retireAge', v)} min={params.currentAge + 1} max={80} theme={theme} />
          <CField field="endAge" label="Plan to age" value={params.endAge} onChange={v => update('endAge', v)} min={params.retireAge + 1} max={110} theme={theme} />
          {partner && <CField field="spouseAge" label="Partner's age" value={params.spouseAge} onChange={v => update('spouseAge', v)} min={20} max={85} theme={theme} />}
        </CGroup>

        {/* Savings */}
        <CGroup title="What you've saved" mode={mode}
          advanced={[
            partner && <CField key="sp" field="preTax" label="Partner's pre-tax" value={params.spousePreTax} step={10000} min={0} max={5000000} onChange={v => update('spousePreTax', v)} format={money} theme={theme} />,
            partner && <CField key="sr" field="roth" label="Partner's Roth" value={params.spouseRoth} step={10000} min={0} max={3000000} onChange={v => update('spouseRoth', v)} format={money} theme={theme} />,
          ].filter(Boolean)}>
          <CField field="preTax" label={partner ? 'Your pre-tax (401k/IRA)' : 'Pre-tax (401k/IRA)'} value={params.userPreTax} step={10000} min={0} max={5000000} onChange={v => update('userPreTax', v)} format={money} theme={theme} />
          <CField field="roth" label={partner ? 'Your Roth' : 'Roth'} value={params.userRoth} step={10000} min={0} max={3000000} onChange={v => update('userRoth', v)} format={money} theme={theme} />
          <CField field="taxable" label="Taxable (joint)" value={params.taxable} step={10000} min={0} max={3000000} onChange={v => update('taxable', v)} format={money} theme={theme} />
        </CGroup>

        {/* Income today */}
        <CGroup title="What comes in" mode={mode}
          advanced={[
            <CField key="sav" field="savingsRate" label="Your saving rate" value={params.savingsRate} min={0} max={60} onChange={v => update('savingsRate', v)} suffix="%" theme={theme} />,
            <CSelect key="dest" field="savingsDest" label="Your savings go to" value={params.savingsDest} onChange={v => update('savingsDest', v)} theme={theme}
              options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />,
            partner && <CField key="ssal" field="spouseSalary" label="Partner's salary" value={params.spouseSalary} step={5000} min={0} max={1000000} onChange={v => update('spouseSalary', v)} format={money} theme={theme} />,
            partner && <CField key="ssav" field="spouseSavingsRate" label="Partner's saving rate" value={params.spouseSavingsRate} min={0} max={60} onChange={v => update('spouseSavingsRate', v)} suffix="%" theme={theme} />,
            partner && <CSelect key="sdest" field="savingsDest" label="Partner's savings go to" value={params.spouseSavingsDest} onChange={v => update('spouseSavingsDest', v)} theme={theme}
              options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />,
          ].filter(Boolean)}>
          <CField field="salary" label={partner ? 'Your salary' : 'Salary'} value={params.salary} step={5000} min={0} max={1000000} onChange={v => update('salary', v)} format={money} theme={theme} />
        </CGroup>

        {/* Spending */}
        <CGroup title="What goes out" mode={mode}
          advanced={[
            <CField key="hc" field="healthcare" label="Healthcare / yr to 65" value={params.healthcare} step={1000} min={0} max={60000} onChange={v => update('healthcare', v)} format={money} theme={theme} />,
            <CField key="hc65" field="healthcare65" label="Healthcare / yr from 65" value={params.healthcare65} step={1000} min={0} max={60000} onChange={v => update('healthcare65', v)} format={money} theme={theme} />,
            <CField key="hci" field="healthcareInflation" label="Healthcare inflation" value={params.healthcareInflation} step={0.5} min={0} max={12} onChange={v => update('healthcareInflation', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />,
            <CField key="inf" field="inflation" label="Inflation" value={params.inflation} step={0.1} min={0} max={8} onChange={v => update('inflation', Math.round(v * 10) / 10)} suffix="%" theme={theme} />,
            <CField key="leg" field="legacyGoal" label="Legacy goal" value={params.legacyGoal} step={25000} min={0} max={3000000} onChange={v => update('legacyGoal', v)} format={money} theme={theme} />,
            <CToggle key="srt" field="spendingReduction" label="Spend less later in life" value={params.enableSpendingReduction} onChange={v => update('enableSpendingReduction', v)} theme={theme} />,
            params.enableSpendingReduction && <CField key="sra" field="spendingReductionAge" label="Slow-down age" value={params.spendingReductionAge} min={params.retireAge} max={params.endAge} onChange={v => update('spendingReductionAge', v)} theme={theme} />,
            params.enableSpendingReduction && <CField key="srp" field="spendingReductionPercent" label="Cut spending by" value={params.spendingReductionPercent} min={0} max={60} onChange={v => update('spendingReductionPercent', v)} suffix="%" theme={theme} />,
          ].filter(Boolean)}>
          <CField field="spending" label="Spending / yr" value={params.spending} step={5000} min={40000} max={250000} onChange={v => update('spending', v)} format={money} theme={theme} />
        </CGroup>

        {/* Guaranteed income */}
        <CGroup title="Guaranteed income" mode={mode}
          advanced={[
            partner && <CToggle key="spb" field="enableSpousalBenefit" label="Apply SS spousal benefit" value={params.enableSpousalBenefit} onChange={v => update('enableSpousalBenefit', v)} theme={theme} />,
            <CField key="pen" field="pension" label="Your pension / yr" value={params.pension} step={1000} min={0} max={200000} onChange={v => update('pension', v)} format={v => '$' + v.toLocaleString()} theme={theme} />,
            params.pension > 0 && <CField key="pena" field="pensionStartAge" label="Your pension starts at" value={params.pensionStartAge} min={50} max={75} onChange={v => update('pensionStartAge', v)} theme={theme} />,
            params.pension > 0 && <CToggle key="penc" field="pensionCOLA" label="Your pension has COLA" value={params.enablePensionCOLA} onChange={v => update('enablePensionCOLA', v)} theme={theme} />,
            partner && <CField key="spen" field="spousePension" label="Partner's pension / yr" value={params.spousePension} step={1000} min={0} max={200000} onChange={v => update('spousePension', v)} format={v => '$' + v.toLocaleString()} theme={theme} />,
            partner && params.spousePension > 0 && <CField key="spena" field="pensionStartAge" label="Partner's pension starts at" value={params.spousePensionStartAge} min={50} max={75} onChange={v => update('spousePensionStartAge', v)} theme={theme} />,
            partner && params.spousePension > 0 && <CToggle key="spenc" field="pensionCOLA" label="Partner's pension has COLA" value={params.enableSpousePensionCOLA} onChange={v => update('enableSpousePensionCOLA', v)} theme={theme} />,
            <CToggle key="ptt" field="partTime" label="Part-time / other income" value={params.enablePartTime} onChange={v => update('enablePartTime', v)} theme={theme} />,
            params.enablePartTime && <CField key="pti" field="partTimeIncome" label="Amount / yr" value={params.partTimeIncome} step={1000} min={0} max={200000} onChange={v => update('partTimeIncome', v)} format={v => '$' + v.toLocaleString()} theme={theme} />,
            params.enablePartTime && <CField key="pts" field="partTimeStartAge" label="From age" value={params.partTimeStartAge} min={params.currentAge} max={params.endAge} onChange={v => update('partTimeStartAge', v)} theme={theme} />,
            params.enablePartTime && <CField key="pte" field="partTimeEndAge" label="To age" value={params.partTimeEndAge} min={params.partTimeStartAge} max={params.endAge} onChange={v => update('partTimeEndAge', v)} theme={theme} />,
          ].filter(Boolean)}>
          <CField field="ssBenefit" label={partner ? 'Your SS / yr (at 67)' : 'SS / yr (at 67)'} value={params.ssBenefit} step={1000} min={0} max={80000} onChange={v => update('ssBenefit', v)} format={v => '$' + v.toLocaleString()} theme={theme} />
          <CField field="ssClaimAge" label="You claim SS at" value={params.ssClaimAge} min={62} max={70} onChange={v => update('ssClaimAge', v)} theme={theme} />
          {partner && <CField field="spouseSS" label="Partner's SS / yr" value={params.spouseSS} step={1000} min={0} max={80000} onChange={v => update('spouseSS', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
          {partner && <CField field="spouseClaimAge" label="Partner claims at" value={params.spouseClaimAge} min={62} max={70} onChange={v => update('spouseClaimAge', v)} theme={theme} />}
        </CGroup>

        {/* Your home */}
        <CGroup title="Your home" mode={mode}>
          <CSelect field="housingType" label="In retirement you" value={params.housingType} onChange={v => update('housingType', v)} theme={theme}
            options={[{ v: 'own', label: 'Own your home' }, { v: 'rent', label: 'Rent' }]} />
          {params.housingType === 'own' && <CField field="mortgagePayment" label="Mortgage / mo" value={params.mortgagePayment} step={250} min={0} max={20000} onChange={v => update('mortgagePayment', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
          {params.housingType === 'own' && params.mortgagePayment > 0 && <CField field="mortgageLastAge" label="Mortgage paid off at" value={params.mortgageLastAge} min={params.currentAge} max={params.endAge} onChange={v => update('mortgageLastAge', v)} theme={theme} />}
          {params.housingType === 'own' && <CField field="propertyTax" label="Property tax / yr" value={params.propertyTax} step={500} min={0} max={60000} onChange={v => update('propertyTax', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
          {params.housingType === 'rent' && <CField field="monthlyRent" label="Rent / mo" value={params.monthlyRent} step={250} min={0} max={20000} onChange={v => update('monthlyRent', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
        </CGroup>

        {/* Investments */}
        <CGroup title="Investments" mode={mode} last
          advanced={[
            <CToggle key="gp" field="glidePath" label="Glide path" value={params.enableGlidePath} onChange={v => update('enableGlidePath', v)} theme={theme} />,
            params.enableGlidePath && <CField key="gpe" label="Stocks by end" value={params.glidePathEndStock} min={0} max={params.stockAllocation} onChange={v => update('glidePathEndStock', v)} suffix="%" theme={theme} />,
          ].filter(Boolean)}>
          <CField field="stockAllocation" label="Stocks now" value={params.stockAllocation} min={0} max={100} onChange={v => update('stockAllocation', v)} suffix="%" theme={theme} />
        </CGroup>

        {/* Advanced assumptions — the remaining engine inputs, collapsed by default */}
        <CAdvanced count={18}>
          <CSub title="Tax & residence">
            <CField field="stateTaxRate" label="State tax rate" value={params.stateTaxRate} step={0.5} min={0} max={14}
              onChange={v => update('stateTaxRate', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CField field="taxableGainRatio" label="Taxable account gain %" value={params.taxableGainRatio} step={5} min={0} max={100}
              onChange={v => update('taxableGainRatio', v)} suffix="%" theme={theme} />
            <CField field="bracketGrowth" label="Tax bracket growth" value={params.bracketGrowth} step={0.1} min={0} max={5}
              onChange={v => update('bracketGrowth', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
            <CToggle field="tcjaSunset" label="TCJA expires 2026" value={params.enableTCJASunset}
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
          <CSub title="Windfall & conversions">
            <CToggle field="windfall" label="One-time windfall" value={params.enableWindfall}
              onChange={v => update('enableWindfall', v)} theme={theme} />
            {params.enableWindfall && <CField field="windfallAmount" label="Amount" value={params.windfallAmount} step={10000} min={0} max={5000000}
              onChange={v => update('windfallAmount', v)} format={money} theme={theme} />}
            {params.enableWindfall && <CField field="windfallAge" label="At age" value={params.windfallAge} min={params.currentAge} max={params.endAge}
              onChange={v => update('windfallAge', v)} theme={theme} />}
            <CToggle field="rothConversion" label="Roth conversions" value={params.enableRothConversion}
              onChange={v => update('enableRothConversion', v)} theme={theme} />
            {params.enableRothConversion && <CField field="rothConversionAmount" label="Amount / yr" value={params.rothConversionAmount} step={5000} min={0} max={500000}
              onChange={v => update('rothConversionAmount', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
            {params.enableRothConversion && <CField field="rothConversionStartAge" label="From age" value={params.rothConversionStartAge} min={params.currentAge} max={params.endAge}
              onChange={v => update('rothConversionStartAge', v)} theme={theme} />}
            {params.enableRothConversion && <CField field="rothConversionEndAge" label="To age" value={params.rothConversionEndAge} min={params.rothConversionStartAge} max={params.endAge}
              onChange={v => update('rothConversionEndAge', v)} theme={theme} />}
          </CSub>
          <div style={{ fontSize: 11.5, lineHeight: 1.5, color: cvi.ink50, textWrap: 'pretty' }}>
            Note: tax filing status follows your “Just me / Me + partner” choice above (single vs. married-joint).
            State tax is modeled as one flat rate on income and gains — it does not apply state-specific Social Security or pension exemptions.
          </div>
        </CAdvanced>

        {/* Reveal panel */}
        <div style={{ marginTop: 44, border: `1px solid ${cvi.ink}`, background: cvi.paperWarm,
          padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
          <div>
            <div style={{ ...cviKicker, marginBottom: 6 }}>Your number, so far</div>
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
              cursor: 'pointer', fontWeight: 600 }}>See the cover →</button>
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
