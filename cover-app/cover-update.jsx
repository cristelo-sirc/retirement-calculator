// cover-app/cover-update.jsx — V19.19
// The update flow: the short walk through the numbers that go stale on their own while a
// plan sits unopened. Bucket 1 only (see WELCOME-UPDATE-PLAN-2026-08-10.md) — figures
// somebody else authored and restates: ages, balances, pay, Social Security, pension.
//
// Everything a user DECIDES (spending, housing, retirement age, healthcare, claim age,
// part-time, pensions they don't have yet) sits behind the single life-change question at
// the end, which hands off to Input Data. That is what keeps this flow a fixed five steps
// however many parameters the app grows.
//
// Assumptions and settings — inflation, returns, glide path, guardrails, tax settings — are
// deliberately absent. Someone whose score just dropped, being walked through editable
// fields, will find the expected-returns box. That is how people talk themselves into a
// better answer.
//
// FIELD BEHAVIOUR: every input arrives holding the stored value, in grey. Typing turns it
// dark. There is never an empty box, so there is never a moment where the code has to decide
// what an empty box means. Only fields the user actually touched are sent to the writer; the
// rest are not in the edit map at all and cannot be altered. Clearing a field to nothing is
// caught by PlanRefresh.parseEntry and keeps the stored value.
//
// Reaching the end of a step IS the confirmation that its numbers are still right — the flow
// cannot be skipped past, so "untouched" here means "seen and left alone", not "never read".

const cvu = window.cvStyles;
const cvuKicker = { fontFamily: cvu.body, fontSize: 12, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: cvu.ink70 };

// Labels and input kind per field. Only bucket-1 fields appear here by design.
const CVU_FIELDS = {
  currentAge:    { label: 'Your age', kind: 'age' },
  spouseAge:     { label: 'Your spouse’s age', kind: 'age' },
  userPreTax:    { label: 'Your pre-tax — 401(k), traditional IRA', kind: 'money' },
  userRoth:      { label: 'Your Roth', kind: 'money' },
  spousePreTax:  { label: 'Spouse pre-tax', kind: 'money' },
  spouseRoth:    { label: 'Spouse Roth', kind: 'money' },
  taxable:       { label: 'Taxable — brokerage, savings', kind: 'money' },
  salary:        { label: 'Your salary', kind: 'money' },
  spouseSalary:  { label: 'Your spouse’s salary', kind: 'money' },
  ssBenefit:     { label: 'Your benefit, per year', kind: 'money' },
  spouseSS:      { label: 'Your spouse’s benefit, per year', kind: 'money' },
  pension:       { label: 'Your pension, per year', kind: 'money' },
  spousePension: { label: 'Your spouse’s pension, per year', kind: 'money' },
};

const CVU_STEPS = {
  ages: {
    kicker: 'Ages', head: 'How old are you now?',
    body: 'The one thing that moves whether or not you open this app.',
    source: 'The calendar',
  },
  balances: {
    kicker: 'Balances', head: 'What are your accounts worth today?',
    body: 'Compass keeps these separate because each is taxed differently on the way out. One combined figure would change your answer.',
    source: 'Your latest account statements',
  },
  salaries: {
    kicker: 'Pay', head: 'What are you earning now?',
    body: 'Raises since you last opened this aren’t in the plan yet.',
    source: 'A recent pay stub',
  },
  socialSecurity: {
    kicker: 'Social Security', head: 'What does SSA estimate now?',
    body: 'Social Security restates your estimate every year as more earnings post to your record.',
    source: 'ssa.gov',
  },
  pension: {
    kicker: 'Pension', head: 'What will your pension pay?',
    // The distinction that matters: for a pension without a COLA, Compass treats what you
    // type as a fixed amount for the whole plan and never grows it. So the figure it wants
    // is the projected benefit AT RETIREMENT, not the amount accrued to date.
    body: 'Use the estimated benefit at retirement — not the amount earned so far, which assumes you stop accruing today.',
    source: 'Your plan administrator’s annual statement',
  },
};

// ---------------------------------------------------------------------------
// One field. Pre-filled, grey until touched, select-all on focus.
// ---------------------------------------------------------------------------
function CvuField({ name, raw, touched, onChange, isMobile }) {
  const meta = CVU_FIELDS[name];
  const money = meta.kind === 'money';
  return (
    <div style={{ padding: isMobile ? '13px 0' : '16px 0', borderBottom: `1px solid ${cvu.rule}` }}>
      <label htmlFor={'cvu-' + name} style={{ fontSize: isMobile ? 13.5 : 14.5, fontWeight: 500, display: 'block' }}>
        {meta.label}
      </label>
      <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', border: `1px solid ${cvu.ink}`,
          background: cvu.paper, padding: isMobile ? '9px 12px' : '10px 14px', flex: '0 0 auto' }}>
          {money && <span style={{ fontFamily: cvu.display, fontSize: isMobile ? 18 : 20,
            color: touched ? cvu.ink : cvu.ink50, marginRight: 2 }}>$</span>}
          <input
            id={'cvu-' + name}
            type="text"
            inputMode="numeric"
            value={raw}
            onFocus={e => e.target.select()}
            onChange={e => onChange(name, e.target.value)}
            style={{ width: money ? (isMobile ? 118 : 140) : 62, border: 'none', background: 'transparent',
              padding: 0, fontFamily: cvu.display, fontSize: isMobile ? 20 : 22,
              color: touched ? cvu.ink : cvu.ink50, fontVariantNumeric: 'tabular-nums', outline: 'none' }} />
        </div>
        <span style={{ fontSize: 12.5, color: cvu.ink50 }}>
          {touched ? 'changed' : 'unchanged'}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// The flow.
// ---------------------------------------------------------------------------
function CoverUpdate({ params, setParams, beforeScore, onFinish, onOpenInputs, onCancel }) {
  const PR = window.PlanRefresh;
  const ME = window.MockEngine;
  const fmt = ME.formatCurrency;

  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 769);
  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 769);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Steps are fixed for the life of the flow — recomputing them from params mid-flow would
  // let a changed age remove the salary step out from under someone standing on it.
  const [steps] = React.useState(() => PR.stepsFor(params));
  const [startParams] = React.useState(params);

  // raw holds what is IN each box; touched records which boxes the user actually typed in.
  // Only touched fields are ever sent to the writer.
  const [raw, setRaw] = React.useState(() => {
    const o = {};
    steps.forEach(s => s.fields.forEach(f => { o[f] = String(params[f] != null ? params[f] : ''); }));
    return o;
  });
  const [touched, setTouched] = React.useState({});
  const [idx, setIdx] = React.useState(0);          // 0..steps.length-1, then life, then done
  const [phase, setPhase] = React.useState('steps'); // 'steps' | 'life' | 'done'
  const [afterScore, setAfterScore] = React.useState(null);
  const [applied, setApplied] = React.useState(null);
  const cancelRun = React.useRef(null);
  React.useEffect(() => () => { if (cancelRun.current) cancelRun.current(); }, []);

  const onChange = (name, value) => {
    setRaw(r => ({ ...r, [name]: value }));
    setTouched(t => (t[name] ? t : { ...t, [name]: true }));
  };

  // Collect only the boxes the user typed in, hand them to the tested writer, then keep
  // prior-year wages in step with any salary that moved. Every write goes through setParams,
  // the app's single normalize boundary, so the flow cannot produce a state the rest of the
  // app disagrees with.
  const commit = () => {
    const edits = {};
    Object.keys(touched).forEach(f => { if (touched[f]) edits[f] = raw[f]; });
    const res = PR.applyFieldEdits(startParams, edits);
    const withWages = PR.syncPriorWages(startParams, res.params);
    setParams(withWages);
    setApplied(res);
    return withWages;
  };

  const finishSteps = () => { commit(); setPhase('life'); };

  // The score after the update. scoreAsync runs the same seeded 5,000 paths compute() would,
  // in slices, so the summary paints immediately and stays clickable while the number lands.
  // Directly comparable with the score Welcome showed — same function, same seed.
  const runAfter = (nextParams) => {
    setPhase('done');
    cancelRun.current = ME.scoreAsync(nextParams, (r) => setAfterScore(r));
  };

  const answerLife = (changed) => {
    if (changed) { onOpenInputs(); return; }
    runAfter(params);
  };

  // ---- shared chrome ----
  const shell = (children) => (
    <div style={{ width: '100%', minHeight: '100%', background: cvu.paper, color: cvu.ink,
      fontFamily: cvu.body, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ maxWidth: isMobile ? 560 : 1180, margin: '0 auto',
        padding: isMobile ? '26px 22px 34px' : '40px 56px 52px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          gap: 16, borderBottom: `1px solid ${cvu.ink}`, paddingBottom: isMobile ? 12 : 14 }}>
          <div style={{ fontFamily: cvu.display, fontSize: isMobile ? 27 : 30, lineHeight: 1 }}>Compass</div>
          <div style={{ ...cvuKicker, fontSize: isMobile ? 9.5 : 12, letterSpacing: '0.12em',
            whiteSpace: 'nowrap' }}>Updating your plan</div>
        </div>
        {children}
      </div>
    </div>
  );

  const btn = (primary) => ({
    padding: isMobile ? '14px 18px' : '13px 24px', cursor: 'pointer', fontFamily: cvu.display,
    fontSize: isMobile ? 16 : 17, border: `1px solid ${cvu.ink}`,
    background: primary ? cvu.ink : 'transparent', color: primary ? cvu.paper : cvu.ink,
  });

  const progress = (n) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: isMobile ? 18 : 20 }}>
      {steps.map((s, i) => (
        <span key={s.id} style={{ display: 'inline-block', width: isMobile ? 26 : 34, height: 3,
          background: i <= n ? cvu.ink : cvu.ink20 }} />
      ))}
      <span style={{ fontSize: 11.5, color: cvu.ink70, marginLeft: 8 }}>
        Step {n + 1} of {steps.length}
      </span>
    </div>
  );

  // ---- steps ----
  if (phase === 'steps') {
    const step = steps[idx];
    const copy = CVU_STEPS[step.id];
    const last = idx === steps.length - 1;
    const left = (
      <div>
        {progress(idx)}
        <div style={{ ...cvuKicker, marginBottom: 12 }}>{copy.kicker}</div>
        <h2 style={{ fontFamily: cvu.display, fontSize: isMobile ? 28 : 40, lineHeight: 1.06,
          letterSpacing: '-0.01em', margin: '0 0 14px' }}>{copy.head}</h2>
        <p style={{ fontSize: isMobile ? 13.5 : 14.5, lineHeight: 1.65, color: cvu.ink70,
          maxWidth: 400, margin: '0 0 18px' }}>{copy.body}</p>
        <div style={{ border: `1px solid ${cvu.rule}`, background: cvu.paperWarm,
          padding: '13px 16px', maxWidth: 400 }}>
          <div style={{ ...cvuKicker, fontSize: 11, marginBottom: 5 }}>Where to look</div>
          <div style={{ fontSize: 13, color: cvu.ink }}>{copy.source}</div>
        </div>
      </div>
    );
    const right = (
      <div>
        <div style={{ borderTop: `1px solid ${cvu.ink}` }}>
          {step.fields.map(f => (
            <CvuField key={f} name={f} raw={raw[f]} touched={!!touched[f]}
              onChange={onChange} isMobile={isMobile} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          {idx > 0 && <button style={btn(false)} onClick={() => setIdx(idx - 1)}>Back</button>}
          <button style={btn(true)} onClick={() => (last ? finishSteps() : setIdx(idx + 1))}>
            {last ? 'Next — anything else' : 'Next — ' + CVU_STEPS[steps[idx + 1].id].kicker.toLowerCase()} &rarr;
          </button>
        </div>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', padding: 0,
          marginTop: 16, cursor: 'pointer', fontFamily: cvu.body, fontSize: 13,
          color: cvu.ink70, textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Leave without updating
        </button>
      </div>
    );
    return shell(
      isMobile
        ? <div style={{ marginTop: 24 }}>{left}<div style={{ marginTop: 22 }}>{right}</div></div>
        : <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 72,
            marginTop: 38, alignItems: 'start' }}>{left}{right}</div>
    );
  }

  // ---- the life-change question ----
  if (phase === 'life') {
    return shell(
      <div style={{ marginTop: isMobile ? 24 : 40, maxWidth: 620 }}>
        <div style={{ ...cvuKicker, marginBottom: 12 }}>Anything else</div>
        <h2 style={{ fontFamily: cvu.display, fontSize: isMobile ? 28 : 40, lineHeight: 1.06,
          letterSpacing: '-0.01em', margin: '0 0 14px' }}>Has anything changed in your life?</h2>
        <p style={{ fontSize: isMobile ? 13.5 : 15, lineHeight: 1.65, color: cvu.ink70, margin: '0 0 22px' }}>
          A new job or pension, a move, a mortgage paid off, a change in your health or what you
          expect healthcare to cost, a change of mind about when you retire &mdash; or a change in
          who&rsquo;s in the plan.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 430 }}>
          <button style={{ ...btn(false), textAlign: 'left' }} onClick={() => answerLife(true)}>
            Yes &mdash; let me review everything <span style={{ float: 'right' }}>&rarr;</span>
          </button>
          <button style={{ ...btn(true), textAlign: 'left' }} onClick={() => answerLife(false)}>
            No &mdash; show my results <span style={{ float: 'right' }}>&rarr;</span>
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: cvu.ink50, lineHeight: 1.6, margin: '22px 0 0', maxWidth: 430 }}>
          Assumptions like inflation, expected returns and your glide path aren&rsquo;t part of this
          refresh. They live in Input Data.
        </p>
      </div>
    );
  }

  // ---- the payoff ----
  const before = beforeScore ? beforeScore.successRate : null;
  const after = afterScore ? afterScore.successRate : null;
  const delta = (before != null && after != null) ? after - before : null;
  const changedList = (applied && applied.changed) || [];
  const deltaColor = delta == null ? cvu.ink : delta > 0 ? cvu.sage : delta < 0 ? cvu.clay : cvu.ink;

  return shell(
    <div style={{ marginTop: isMobile ? 24 : 40, maxWidth: 720 }}>
      <div style={{ ...cvuKicker, marginBottom: 12 }}>Updated</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, minHeight: isMobile ? 64 : 84 }}>
        {before != null && (
          <span style={{ fontFamily: cvu.display, fontSize: isMobile ? 34 : 44, color: cvu.ink50,
            textDecoration: 'line-through' }}>{before}</span>
        )}
        <span style={{ fontFamily: cvu.display, fontSize: isMobile ? 24 : 30, color: cvu.ink50 }}>&rarr;</span>
        <span style={{ fontFamily: cvu.display, fontSize: isMobile ? 64 : 84, lineHeight: .9,
          color: after == null ? cvu.ink20 : deltaColor }}>
          {after == null ? '—' : after}
        </span>
        <span style={{ fontFamily: cvu.display, fontSize: isMobile ? 20 : 26, color: cvu.ink50 }}>/100</span>
      </div>
      <h2 style={{ fontFamily: cvu.display, fontSize: isMobile ? 30 : 40, lineHeight: 1.06,
        letterSpacing: '-0.01em', margin: '18px 0 12px' }}>
        {after == null ? 'Working out where that leaves you…'
          : delta > 0 ? 'Better than you left it.'
          : delta < 0 ? 'Worth a closer look.'
          : 'Right where you left it.'}
      </h2>
      <p style={{ fontSize: isMobile ? 13.5 : 15, lineHeight: 1.65, color: cvu.ink70,
        margin: '0 0 22px', maxWidth: 520 }}>
        {after == null
          ? 'Your numbers are saved. Re-scoring the plan against them now.'
          : afterScore && afterScore.verdictWord
            ? 'Your plan now reads ' + afterScore.verdictWord + '. ' +
              (changedList.length
                ? 'You changed ' + changedList.length + (changedList.length === 1 ? ' figure' : ' figures') + '; the rest you confirmed unchanged.'
                : 'You confirmed every figure unchanged.')
            : ''}
      </p>

      {changedList.length > 0 && (
        <div style={{ borderTop: `1px solid ${cvu.ink}`, marginBottom: 24 }}>
          {changedList.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'baseline', gap: 12,
              padding: '10px 0', borderBottom: `1px solid ${cvu.rule}` }}>
              <span style={{ fontSize: isMobile ? 13.5 : 14, flex: '1 1 auto' }}>{CVU_FIELDS[f].label}</span>
              <span style={{ fontFamily: cvu.display, fontSize: isMobile ? 16 : 18, color: cvu.ink70,
                whiteSpace: 'nowrap' }}>
                {CVU_FIELDS[f].kind === 'money'
                  ? fmt(startParams[f], { compact: true }) + ' → ' + fmt(params[f], { compact: true })
                  : startParams[f] + ' → ' + params[f]}
              </span>
            </div>
          ))}
        </div>
      )}

      <button style={btn(true)} onClick={() => onFinish()}>See the full plan &rarr;</button>
    </div>
  );
}

Object.assign(window, { CoverUpdate });
