// cover-inputs.jsx — 07 · Cover · Input Data (chapter wizard)
// V19.15 (design_handoff_input_chapters): the intake is an 8-chapter wizard — a left
// chapter rail, one topic per screen, a plain-English "Why we ask" explainer opening
// each chapter, Back/Next in a pinned footer, and NO score shown anywhere until the
// user finishes (score anxiety mid-entry was the core problem the redesign solves).
// The score chip (CviScoreChip), the reveal panel, and this screen's compute() call
// are all gone — the number appears only after "See your results →" on Results.
// Field primitives (CField / CToggle / CSelect / CSegment) are IDENTICAL to the
// previous single-page layout; only the shell around them changed. All engine inputs
// are preserved with their existing conditional rules, mins/maxes, and formats —
// tests/input-coverage.test.js enforces that against MockEngine.DEFAULTS.
//
// Reuses window.cvStyles / window.CoverChrome (fill mode) / window.cvTheme from
// compass-cover.jsx and window.InfoTip / window.FIELD_INFO from retire-ui.jsx.

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
        <span style={{ fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: cvi.ink70 }}>{label}</span>
        {info && <window.InfoTip field={field} label={label} theme={theme} />}
      </div>
      {info && <div style={{ fontSize: 11.5, lineHeight: 1.4, color: cvi.ink70, marginBottom: 8,
        textWrap: 'pretty' }}>{info.help}</div>}
      {/* V19.14 (Release 3, item 6): caret sits immediately next to the value (inline-flex,
          content-width), so "Roth ▾" reads as a single control regardless of row width. */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: `1px solid ${cvi.ink}`, paddingBottom: 6 }}>
        <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} style={{
          flex: '0 1 auto', minWidth: 0, fontFamily: cvi.display, fontSize: 19, color: cvi.ink,
          background: 'transparent', border: 'none', outline: 'none', cursor: 'pointer',
          WebkitAppearance: 'none', appearance: 'none', padding: '2px 0' }}>
          {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <span aria-hidden="true" style={{ marginLeft: 6, pointerEvents: 'none',
          fontSize: 11, color: cvi.ink50 }}>▾</span>
      </div>
    </div>
  );
}

// Sub-group: serif header with a hairline rule above (the handoff's deliberate tier
// between the chapter title and the field labels) + a 3-up grid. role="group" +
// aria-labelledby ties the fields inside to the heading as their accessible group name
// (V19.12 accessible-name fix, carried forward through the restyle).
function CSub({ title, children }) {
  const headingId = React.useId();
  return (
    <div role="group" aria-labelledby={headingId} style={{ marginBottom: 30 }}>
      <div id={headingId} style={{ fontFamily: cvi.display, fontSize: 20, color: cvi.ink,
        borderTop: `1px solid ${cvi.rule}`, paddingTop: 14, marginBottom: 16 }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px 28px' }}>{children}</div>
    </div>
  );
}

const CVI_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH',
  'OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'].map(s => ({ v: s, label: s }));

// The 8 chapters — titles, blurbs, and "Why we ask" copy are final per the
// design_handoff_input_chapters prototype (lifted verbatim from its ch2data).
// Shared by desktop (here) and mobile (cover-mobile.jsx) via window.CV_CHAPTERS.
const CV_CHAPTERS = [
  { title: 'The people',
    blurb: 'Who the plan covers and how long it has to last.',
    why: 'Every other answer scales off these three. Retiring at 62 instead of 65 means three fewer years of saving and three more years of spending — the plan feels that twice.' },
  { title: "What you've saved",
    blurb: 'Balances as of today — rough numbers are fine; you can refine them any time.',
    why: 'Pre-tax, Roth, and taxable money are taxed differently on the way out, and the order you spend them in can add years to a plan. Ballpark each one; precision can come later.' },
  { title: 'Salary & contributions',
    blurb: 'Pay and what you put away while you’re still working.',
    why: 'Salary and contribution rate decide how much new fuel goes into the tank each year until you retire. The employer match is free money — we count it too.' },
  { title: 'Spending',
    blurb: 'A year of your life, in dollars — not counting your home; that has its own chapter.',
    why: 'Spending is the single most powerful number in the plan: a $10,000 change here moves your result more than almost any market assumption. Healthcare is asked separately because it changes shape at 65, when Medicare takes over.' },
  { title: 'Guaranteed income',
    blurb: 'Money that shows up whether markets cooperate or not.',
    why: 'Social Security is inflation-protected income for life, and each year you wait past 62 permanently raises the check — about 8% a year. Your statement at ssa.gov has the exact figure.' },
  { title: 'Your home',
    blurb: 'Where you’ll live in retirement, and what it costs.',
    why: 'A mortgage is a big cost with an end date; rent is a smaller cost that never ends and rises with inflation. The plan treats them differently, so this one answer reshapes your whole spending curve.' },
  { title: 'Investments',
    blurb: 'How your savings are positioned.',
    why: 'More stocks means a higher typical outcome but a wider spread of possibilities; more bonds narrows the range. There’s no right answer — the simulation shows you the consequences of yours.' },
  { title: 'Fine-tuning',
    blurb: 'Tax, market, and strategy settings — most people leave these at our defaults.',
    why: 'These shape the simulation, not your life. Nudging a return assumption is how you test optimism — not a decision you have to get right today.',
    note: 'Tax filing status follows your “Just me / Me + partner” choice (single vs. married-joint). State tax is modeled as one flat rate on income and gains.' },
];

// V19.17: one shared privacy line rendered by BOTH layouts on chapter 1 (same can't-drift
// discipline as CV_CHAPTERS). Factually verified 2026-07-16: the app has no network calls,
// no analytics, and no backend — inputs exist only on the user's own device.
const CV_PRIVACY_NOTE = 'Private by design: your answers stay on this device — saving a plan just downloads a file to your computer.';

// sessionStorage keys shared by desktop and mobile so crossing the 769px breakpoint
// keeps the reader on the same chapter (same discipline as the shared shell `screen`).
const CV_CHAPTER_KEY = 'compassChapter';
const CV_VISITED_KEY = 'compassChaptersVisited';
function cvLoadChapter() {
  try { const n = parseInt(sessionStorage.getItem(CV_CHAPTER_KEY), 10);
    if (n >= 0 && n < CV_CHAPTERS.length) return n; } catch (e) {}
  return 0;
}
function cvLoadVisited() {
  try { const v = JSON.parse(sessionStorage.getItem(CV_VISITED_KEY) || '[]');
    if (Array.isArray(v)) return v.filter(n => Number.isInteger(n) && n >= 0 && n < CV_CHAPTERS.length); } catch (e) {}
  return [];
}
function cvStoreChapter(n, visited) {
  try { sessionStorage.setItem(CV_CHAPTER_KEY, String(n));
    sessionStorage.setItem(CV_VISITED_KEY, JSON.stringify(visited)); } catch (e) {}
}

function CoverInputs(props) { const { params: extP, setParams: extSP, freshStart, adjustNote } = props || {};
  const [localParams, setLocalParams] = React.useState(window.MockEngine.DEFAULTS); const params = extP || localParams; const setParams = extSP || setLocalParams;
  const update = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const fmt = window.MockEngine.formatCurrency;
  // No compute() here — the score is deliberately never rendered during entry, so this
  // screen no longer re-runs the simulation on every field commit (typing got snappier).
  const theme = window.cvTheme();
  const partner = params.hasPartner;
  // Questionnaire values stay exact after entry; compact rounding belongs on summary screens.
  const money = v => fmt(v);

  const [chapter, setChapter] = React.useState(cvLoadChapter);
  const [visited, setVisited] = React.useState(cvLoadVisited);
  const [saveMsg, setSaveMsg] = React.useState(null); // { text, ok }
  const scrollRef = React.useRef(null);
  const saveTimer = React.useRef(null);

  const goTo = (i) => {
    const next = Math.max(0, Math.min(CV_CHAPTERS.length - 1, i));
    setVisited(prev => {
      const v = prev.includes(chapter) ? prev : [...prev, chapter];
      cvStoreChapter(next, v);
      return v;
    });
    setChapter(next);
  };
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [chapter]);
  React.useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);

  const savePlan = () => {
    const r = window.CompassIO.savePlan(params);
    setSaveMsg({ text: r.ok ? 'Saved to your downloads.' : (r.error || 'Could not save.'), ok: r.ok });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveMsg(null), 5000);
  };
  const finish = () => {
    setVisited(prev => {
      const v = prev.includes(chapter) ? prev : [...prev, chapter];
      cvStoreChapter(chapter, v);
      return v;
    });
    if (window._coverNav) window._coverNav('cover');
  };

  const ch = CV_CHAPTERS[chapter];
  const grid3 = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '24px 28px' };
  const last = chapter === CV_CHAPTERS.length - 1;

  return (
    <window.CoverChrome active="quiz" fill>
      {/* Progress bar — 3px, fill tracks (chapter+1)/8 */}
      <div style={{ height: 3, background: 'rgba(26,24,21,0.12)', flex: '0 0 auto' }}>
        <div style={{ height: 3, background: cvi.ink,
          width: `${((chapter + 1) / CV_CHAPTERS.length * 100).toFixed(1)}%`, transition: 'width 300ms' }} />
      </div>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Chapter rail */}
        <div style={{ width: 264, flex: '0 0 auto', borderRight: `1px solid ${cvi.rule}`,
          padding: '28px 0 24px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ fontFamily: cvi.body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
            color: cvi.ink70, padding: '0 26px', marginBottom: 14 }}>Chapters</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {CV_CHAPTERS.map((c, i) => {
              const current = i === chapter;
              const done = visited.includes(i) && !current;
              return (
                <button key={c.title} type="button" onClick={() => goTo(i)}
                  aria-current={current ? 'step' : undefined}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 23px',
                    background: current ? cvi.paperWarm : 'transparent', border: 'none',
                    borderLeft: `3px solid ${current ? cvi.ink : 'transparent'}`, cursor: 'pointer',
                    textAlign: 'left', fontFamily: cvi.body }}>
                  <span style={{ fontFamily: cvi.display, fontSize: 13, width: 18, flex: '0 0 auto',
                    color: done ? cvi.sage : cvi.ink50 }}>{done ? '✓' : String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontFamily: cvi.display, fontSize: 16.5,
                    color: current ? cvi.ink : cvi.ink70 }}>{c.title}</span>
                </button>
              );
            })}
          </div>
          {/* On-screen version stamp (lives here since fill-mode chrome has no footer tag). */}
          <div style={{ marginTop: 'auto', padding: '18px 26px 0', fontFamily: cvi.body, fontSize: 10,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: cvi.ink50 }}>V19.17</div>
        </div>

        {/* Chapter content + pinned footer */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '36px 56px 12px' }}>
            {adjustNote && adjustNote.length > 0 && (
              <div style={{ maxWidth: 680, marginBottom: 20, padding: '10px 14px',
                border: `1px solid ${cvi.amber}`, background: cvi.amberSoft, color: cvi.ink,
                fontFamily: cvi.body, fontSize: 13.5, lineHeight: 1.5 }}>
                {window.cvAdjustMessage(adjustNote)}
              </div>
            )}
            {!freshStart && chapter === 0 && (
              <div style={{ maxWidth: 680, marginBottom: 24 }}>
                <window.CoverSaveLoadCallout params={params} setParams={setParams}
                  prompt="Returning? Load your saved plan — no need to re-enter everything." primary="load" compact />
              </div>
            )}

            <div style={{ fontFamily: cvi.body, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: cvi.ink70, marginBottom: 10 }}>Chapter {chapter + 1} of {CV_CHAPTERS.length}</div>
            <h1 style={{ fontFamily: cvi.display, fontSize: 38, lineHeight: 1.05, letterSpacing: '-0.01em',
              margin: '0 0 8px' }}>{ch.title}</h1>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: cvi.ink70, maxWidth: 560,
              margin: '0 0 18px', textWrap: 'pretty' }}>{ch.blurb}</p>
            <div style={{ background: cvi.paperWarm, border: `1px solid ${cvi.rule}`, padding: '14px 18px',
              maxWidth: 680, marginBottom: 30 }}>
              <div style={{ fontFamily: cvi.body, fontSize: 10.5, letterSpacing: '0.18em',
                textTransform: 'uppercase', color: cvi.ink70, marginBottom: 6 }}>Why we ask</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: cvi.ink, textWrap: 'pretty' }}>{ch.why}</div>
            </div>

            {chapter === 0 && (
              <p style={{ fontSize: 12.5, lineHeight: 1.55, color: cvi.ink70, maxWidth: 560,
                margin: '-14px 0 26px' }}>{CV_PRIVACY_NOTE}</p>
            )}

            {chapter === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 30, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: cvi.body, fontSize: 12, letterSpacing: '0.18em',
                  textTransform: 'uppercase', color: cvi.ink70 }}>This plan is for</span>
                <CSegment value={partner} onChange={v => update('hasPartner', v)} theme={theme} />
                <span style={{ fontSize: 12, color: cvi.ink70 }}>Partner fields appear in the chapters where they belong.</span>
              </div>
            )}

            {/* ── Chapter 1 · The people (flat) ── */}
            {chapter === 0 && (
              <div style={grid3}>
                <CField field="currentAge" label="Your age" value={params.currentAge} onChange={v => update('currentAge', v)} min={20} max={85} theme={theme} />
                <CField field="retireAge" label="You retire at" value={params.retireAge} onChange={v => update('retireAge', v)} min={params.currentAge + 1} max={80} theme={theme} />
                <CField field="endAge" label="Plan to age" value={params.endAge} onChange={v => update('endAge', v)} min={params.retireAge + 1} max={110} theme={theme} />
                {partner && <CField field="spouseAge" label="Partner's age" value={params.spouseAge} onChange={v => update('spouseAge', v)} min={20} max={85} theme={theme} />}
                {partner && <CField field="spouseRetireAge" label="Partner retires at" value={params.spouseRetireAge} onChange={v => update('spouseRetireAge', v)} min={params.spouseAge + 1} max={80} theme={theme} />}
              </div>
            )}

            {/* ── Chapter 2 · What you've saved ── */}
            {chapter === 1 && (<React.Fragment>
              <CSub title="Accounts">
                <CField field="preTax" label={partner ? 'Your pre-tax (401k/IRA)' : 'Pre-tax (401k/IRA)'} value={params.userPreTax} step={10000} min={0} max={5000000} onChange={v => update('userPreTax', v)} format={money} theme={theme} />
                <CField field="roth" label={partner ? 'Your Roth' : 'Roth'} value={params.userRoth} step={10000} min={0} max={3000000} onChange={v => update('userRoth', v)} format={money} theme={theme} />
                <CField field="taxable" label="Taxable (joint)" value={params.taxable} step={10000} min={0} max={3000000} onChange={v => update('taxable', v)} format={money} theme={theme} />
                {partner && <CField field="spousePreTax" label="Partner's pre-tax" value={params.spousePreTax} step={10000} min={0} max={5000000} onChange={v => update('spousePreTax', v)} format={money} theme={theme} />}
                {partner && <CField field="spouseRoth" label="Partner's Roth" value={params.spouseRoth} step={10000} min={0} max={3000000} onChange={v => update('spouseRoth', v)} format={money} theme={theme} />}
              </CSub>
              <CSub title="One-time windfall">
                <CToggle field="windfall" label="One-time windfall" value={params.enableWindfall}
                  onChange={v => update('enableWindfall', v)} theme={theme} />
                {params.enableWindfall && <CField field="windfallAmount" label="Amount" value={params.windfallAmount} step={10000} min={0} max={5000000}
                  onChange={v => update('windfallAmount', v)} format={money} theme={theme} />}
                {params.enableWindfall && <CField field="windfallAge" label="At age" value={params.windfallAge} min={params.currentAge} max={params.endAge}
                  onChange={v => update('windfallAge', v)} theme={theme} />}
              </CSub>
            </React.Fragment>)}

            {/* ── Chapter 3 · Salary & contributions ── */}
            {chapter === 2 && (<React.Fragment>
              <CSub title="You">
                <CField field="salary" label={partner ? 'Your salary' : 'Salary'} value={params.salary} step={5000} min={0} max={1000000} onChange={v => update('salary', v)} format={money} theme={theme} />
                <CField field="savingsRate" label="Your contribution rate" value={params.savingsRate} min={0} max={60} onChange={v => update('savingsRate', v)} suffix="%" theme={theme} />
                {params.currentAge >= 50 && <CField field="priorYearWages" label="Your prior-year W-2 wages" value={params.priorYearWages} step={5000} min={0} max={1000000} onChange={v => update('priorYearWages', v)} format={money} theme={theme} />}
                <CField field="employerContributionRate" label="Your employer adds" value={params.employerContributionRate} min={0} max={60} onChange={v => update('employerContributionRate', v)} suffix="%" theme={theme} />
                <CSelect field="savingsDest" label="Your contributions go to" value={params.savingsDest} onChange={v => update('savingsDest', v)} theme={theme}
                  options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />
                {/* V19.14 (item 9): long label, last field in its sub-group — span 2 for room. */}
                {params.employerContributionRate > 0 && (
                  <div style={{ gridColumn: 'span 2' }}>
                    <CSelect field="employerContributionDest" label="Your employer contributions go to" value={params.employerContributionDest} onChange={v => update('employerContributionDest', v)} theme={theme}
                      options={[{ v: 'pretax', label: 'Pre-tax (traditional)' }, { v: 'roth', label: 'Roth' }]} />
                  </div>
                )}
              </CSub>
              {partner && (
                <CSub title="Your partner">
                  <CField field="spouseSalary" label="Partner's salary" value={params.spouseSalary} step={5000} min={0} max={1000000} onChange={v => update('spouseSalary', v)} format={money} theme={theme} />
                  <CField field="spouseSavingsRate" label="Partner's contribution rate" value={params.spouseSavingsRate} min={0} max={60} onChange={v => update('spouseSavingsRate', v)} suffix="%" theme={theme} />
                  {params.spouseAge >= 50 && <CField field="spousePriorYearWages" label="Partner's prior-year W-2 wages" value={params.spousePriorYearWages} step={5000} min={0} max={1000000} onChange={v => update('spousePriorYearWages', v)} format={money} theme={theme} />}
                  <CField field="spouseEmployerContributionRate" label="Partner's employer adds" value={params.spouseEmployerContributionRate} min={0} max={60} onChange={v => update('spouseEmployerContributionRate', v)} suffix="%" theme={theme} />
                  <CSelect field="spouseSavingsDest" label="Partner's contributions go to" value={params.spouseSavingsDest} onChange={v => update('spouseSavingsDest', v)} theme={theme}
                    options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />
                  {params.spouseEmployerContributionRate > 0 && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <CSelect field="spouseEmployerContributionDest" label="Partner's employer contributions go to" value={params.spouseEmployerContributionDest} onChange={v => update('spouseEmployerContributionDest', v)} theme={theme}
                        options={[{ v: 'pretax', label: 'Pre-tax (traditional)' }, { v: 'roth', label: 'Roth' }]} />
                    </div>
                  )}
                </CSub>
              )}
            </React.Fragment>)}

            {/* ── Chapter 4 · Spending ── */}
            {chapter === 3 && (<React.Fragment>
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
            </React.Fragment>)}

            {/* ── Chapter 5 · Guaranteed income ── */}
            {chapter === 4 && (<React.Fragment>
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
              {/* Amount/yr labels below stay owner-prefixed ("Your" / "Partner's") — the
                  V19.12 accessible-name fix for the two otherwise-identical short labels. */}
              <CSub title="Part-time / other income">
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
            </React.Fragment>)}

            {/* ── Chapter 6 · Your home (flat) ── */}
            {chapter === 5 && (
              <div style={grid3}>
                <CSelect field="housingType" label="Own or rent" value={params.housingType} onChange={v => update('housingType', v)} theme={theme}
                  options={[{ v: 'own', label: 'Own your home' }, { v: 'rent', label: 'Rent' }]} />
                {params.housingType === 'own' && <CField field="mortgagePayment" label="Mortgage P&I / mo" value={params.mortgagePayment} step={250} min={0} max={20000} onChange={v => update('mortgagePayment', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
                {params.housingType === 'own' && params.mortgagePayment > 0 && <CField field="mortgageLastAge" label="Mortgage paid off at" value={params.mortgageLastAge} min={params.currentAge} max={params.endAge} onChange={v => update('mortgageLastAge', v)} theme={theme} />}
                {params.housingType === 'own' && <CField field="propertyTax" label="Tax + home insurance / yr" value={params.propertyTax} step={500} min={0} max={60000} onChange={v => update('propertyTax', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
                {params.housingType === 'rent' && <CField field="monthlyRent" label="Rent / mo" value={params.monthlyRent} step={250} min={0} max={20000} onChange={v => update('monthlyRent', v)} format={v => '$' + v.toLocaleString()} theme={theme} />}
              </div>
            )}

            {/* ── Chapter 7 · Investments ── */}
            {chapter === 6 && (<React.Fragment>
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
            </React.Fragment>)}

            {/* ── Chapter 8 · Fine-tuning ── */}
            {chapter === 7 && (<React.Fragment>
              <CSub title="Tax & residence">
                <CField field="stateTaxRate" label="State tax rate" value={params.stateTaxRate} step={0.5} min={0} max={14}
                  onChange={v => update('stateTaxRate', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
                <CField field="taxableGainRatio" label="Taxable account gain %" value={params.taxableGainRatio} step={5} min={0} max={100}
                  onChange={v => update('taxableGainRatio', v)} suffix="%" theme={theme} />
                <CField field="bracketGrowth" label="Tax bracket growth" value={params.bracketGrowth} step={0.1} min={0} max={5}
                  onChange={v => update('bracketGrowth', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" theme={theme} />
                {/* V19.14 (item 9): long label alone in its row — span 2 for breathing room. */}
                <div style={{ gridColumn: 'span 2' }}>
                  <CToggle field="tcjaSunset" label="Assume higher future tax rates" value={params.enableTCJASunset}
                    onChange={v => update('enableTCJASunset', v)} theme={theme} />
                </div>
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
            </React.Fragment>)}

            {ch.note && (
              <div style={{ fontSize: 12, lineHeight: 1.5, color: cvi.ink70, maxWidth: 680,
                marginBottom: 20, textWrap: 'pretty' }}>{ch.note}</div>
            )}
          </div>

          {/* Pinned footer */}
          <div style={{ borderTop: `1px solid ${cvi.rule}`, padding: '18px 56px 22px', flex: '0 0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
              <button type="button" onClick={() => goTo(chapter - 1)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: cvi.body,
                  fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: cvi.ink70,
                  padding: 0, visibility: chapter === 0 ? 'hidden' : 'visible' }}>← Back</button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
                {/* Small mid-entry save (Cris's addition to the handoff): numbers already
                    auto-save in this browser; this writes a portable file without having
                    to finish the wizard first. */}
                <button type="button" onClick={savePlan}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: cvi.body,
                    fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: cvi.ink70,
                    padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>Save plan ↓</button>
                <button type="button" onClick={() => (last ? finish() : goTo(chapter + 1))}
                  style={{ padding: '13px 26px', background: cvi.ink, color: cvi.paper, border: 'none',
                    cursor: 'pointer', fontFamily: cvi.body, fontSize: 11.5, letterSpacing: '0.12em',
                    textTransform: 'uppercase', fontWeight: 600 }}>
                  {last ? 'See your results →' : `Next: ${CV_CHAPTERS[chapter + 1].title} →`}</button>
              </div>
            </div>
            {saveMsg && (
              <div role="status" style={{ textAlign: 'right', fontSize: 11.5, marginTop: 8,
                color: saveMsg.ok ? cvi.sage : cvi.clay, fontWeight: 600 }}>{saveMsg.text}</div>
            )}
          </div>
        </div>
      </div>
    </window.CoverChrome>
  );
}

Object.assign(window, { CoverInputs, CVI_STATES, CV_CHAPTERS, CV_PRIVACY_NOTE });
