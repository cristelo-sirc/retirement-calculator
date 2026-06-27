// compass-cover.jsx — 07 · Cover
// Compass sibling pushed toward a magazine COVER: the hero art IS the success
// number, set enormous. Low density, lots of air. DM Serif Display.
//
// This file holds the Cover, Rework, Projection and Charts screens plus shared
// display primitives. The questionnaire lives in cover-inputs.jsx (loaded after
// this one) and reuses window.cvStyles / window.CoverChrome / window.cvTheme.

const cvStyles = {
  paper: '#f6f2ea',
  paperWarm: '#efe9dc',
  ink: '#1a1815',
  ink70: '#1a181599',
  ink50: '#1a181580',
  ink20: '#1a181530',
  rule: '#d8cfbe',
  sage: '#5a7a5e',
  sageSoft: '#cdd9ce',
  amber: '#b8843a',
  amberSoft: '#ead9bd',
  clay: '#9c4b3e',
  claySoft: '#e6c7c0',
  display: '"DM Serif Display", Georgia, serif',
  body: 'Inter, -apple-system, system-ui, sans-serif',
};
window.cvStyles = cvStyles;

const cvKicker = { fontFamily: cvStyles.body, fontSize: 10.5, letterSpacing: '0.22em',
  textTransform: 'uppercase', color: cvStyles.ink50 };

function cvVerdictColor(v) {
  return v === 'green' ? cvStyles.sage : v === 'yellow' ? cvStyles.amber : cvStyles.clay;
}
// Theme object handed to the shared charts + ui helpers.
function cvTheme(accent) { return { ...cvStyles, accent: accent || cvStyles.ink }; }
window.cvTheme = cvTheme;

// ============================================================================
// CompassIO — file Save / Load (V18.2). Pure-validate path merges over the
// engine DEFAULTS using only known keys, so a foreign or partial file can
// never feed unknown/garbage fields into the engine.
// ============================================================================
window.CompassIO = {
  SCHEMA: 'compass-retirement-plan',
  buildPlanJSON: function (params) {
    return JSON.stringify({
      schema: this.SCHEMA, version: '18.8', savedAt: new Date().toISOString(),
      params: params || {}
    }, null, 2);
  },
  savePlan: function (params) {
    try {
      var blob = new Blob([this.buildPlanJSON(params)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var d = new Date();
      var stamp = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var a = document.createElement('a');
      a.href = url; a.download = 'compass-plan-' + stamp + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      return { ok: true };
    } catch (e) { return { ok: false, error: 'Could not save: ' + e }; }
  },
  parsePlan: function (text) {
    var DEF = (window.MockEngine && window.MockEngine.DEFAULTS) || {};
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) { return { ok: false, error: 'That file isn’t valid JSON.' }; }
    var raw = (obj && obj.params && typeof obj.params === 'object') ? obj.params : obj;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'That doesn’t look like a Compass plan file.' };
    }
    var merged = Object.assign({}, DEF);
    var keys = Object.keys(DEF), hit = 0;
    for (var i = 0; i < keys.length; i++) {
      if (raw[keys[i]] !== undefined) { merged[keys[i]] = raw[keys[i]]; hit++; }
    }
    if (hit === 0) return { ok: false, error: 'No recognizable plan settings in that file.' };
    return { ok: true, params: merged };
  },
  pickPlanFile: function (onResult) {
    try {
      var self = this;
      var input = document.createElement('input');
      input.type = 'file'; input.accept = 'application/json,.json';
      input.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) { onResult({ ok: false, error: 'No file selected.' }); return; }
        var reader = new FileReader();
        reader.onload = function () { onResult(self.parsePlan(String(reader.result))); };
        reader.onerror = function () { onResult({ ok: false, error: 'Could not read that file.' }); };
        reader.readAsText(f);
      };
      input.click();
    } catch (e) { onResult({ ok: false, error: 'Could not open the file picker.' }); }
  }
};

// Small shared Save/Load control row used on the cover + questionnaire.
function CoverSaveLoad({ params, setParams, align }) {
  const [msg, setMsg] = React.useState('');
  const link = { background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
    color: cvStyles.ink70, textDecoration: 'underline', textUnderlineOffset: 3 };
  const save = () => { const r = window.CompassIO.savePlan(params); setMsg(r.ok ? 'Plan saved to your downloads.' : r.error); };
  const load = () => { setMsg(''); window.CompassIO.pickPlanFile(r => {
    if (r && r.ok) { setParams(r.params); setMsg('Plan loaded.'); } else { setMsg((r && r.error) || 'Could not load that file.'); }
  }); };
  return (
    <div style={{ textAlign: align || 'center' }}>
      <div style={{ display: 'flex', gap: 22, justifyContent: align === 'left' ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
        <button onClick={save} style={link}>Save plan to a file ↓</button>
        <button onClick={load} style={link}>Load a saved plan ↑</button>
      </div>
      <div style={{ fontSize: 11, color: cvStyles.ink50, marginTop: 8 }}>
        {msg || 'Your plan auto-saves in this browser. Save to a file to keep a copy or move it between devices.'}
      </div>
    </div>
  );
}
window.CoverSaveLoad = CoverSaveLoad;

// Prominent Save/Load callout (V18.4) — sits at the TOP of the cover and the
// questionnaire so a returning user sees Load before re-entering anything.
function CoverSaveLoadCallout({ params, setParams, prompt, primary, compact }) {
  const [msg, setMsg] = React.useState(null); // { text, ok }
  const save = () => { const r = window.CompassIO.savePlan(params); setMsg({ text: r.ok ? 'Saved to your downloads.' : (r.error || 'Could not save.'), ok: r.ok }); };
  const load = () => { setMsg(null); window.CompassIO.pickPlanFile(r => {
    if (r && r.ok) { setParams(r.params); setMsg({ text: 'Plan loaded.', ok: true }); }
    else { setMsg({ text: (r && r.error) || 'Could not load that file.', ok: false }); }
  }); };
  const loadPrimary = primary !== 'save';
  const btn = (filled) => ({ padding: compact ? '10px 16px' : '13px 22px', cursor: 'pointer',
    border: `1px solid ${cvStyles.ink}`, background: filled ? cvStyles.ink : 'transparent',
    color: filled ? cvStyles.paper : cvStyles.ink, fontFamily: cvStyles.body, fontSize: 11.5,
    letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' });
  return (
    <div style={{ border: `1px solid ${cvStyles.ink}`, background: cvStyles.paperWarm,
      padding: compact ? '12px 16px' : '16px 22px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 240px', minWidth: 200 }}>
        <div style={{ ...cvKicker, marginBottom: 4 }}>Saved plan</div>
        <div style={{ fontFamily: cvStyles.display, fontSize: compact ? 16 : 18, lineHeight: 1.25,
          letterSpacing: '-0.01em' }}>{prompt}</div>
        {msg && <div style={{ fontSize: 11.5, color: msg.ok ? cvStyles.sage : cvStyles.clay, marginTop: 5, fontWeight: 600 }}>{msg.text}</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, flex: '0 0 auto', flexWrap: 'wrap' }}>
        <button onClick={load} style={btn(loadPrimary)}>Load a saved plan ↑</button>
        <button onClick={save} style={btn(!loadPrimary)}>Save plan ↓</button>
      </div>
    </div>
  );
}
window.CoverSaveLoadCallout = CoverSaveLoadCallout;

function CoverDesktop(props) {
  props = props || {}; const [localParams, setLocalParams] = React.useState(window.MockEngine.DEFAULTS); const params = props.params || localParams; const setParams = props.setParams || setLocalParams;
  const results = React.useMemo(() => window.MockEngine.compute(params), [params]);
  const update = (k, v) => setParams(p => ({ ...p, [k]: v }));
  const reset = () => setParams(window.MockEngine.DEFAULTS);
  const fmt = window.MockEngine.formatCurrency;
  const vc = cvVerdictColor(results.verdict);
  const dirty = JSON.stringify(params) !== JSON.stringify(window.MockEngine.DEFAULTS);

  return (
    <div style={{
      width: '100%', height: '100%', background: cvStyles.paper, color: cvStyles.ink,
      fontFamily: cvStyles.body, overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* ===== COVER ===== */}
      <section style={{ height: 900, minHeight: 900, padding: '34px 64px 40px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          borderBottom: `1px solid ${cvStyles.ink}`, paddingBottom: 14 }}>
          <div style={{ fontFamily: cvStyles.display, fontSize: 34, lineHeight: 1 }}>Compass</div>
          <div style={{ ...cvKicker }}>The Retirement Issue · May 2026 · No. 5</div>
        </div>
        <CoverNav active="cover" emphasizeQuiz={!dirty} />
        <div style={{ marginTop: 16 }}>
          <CoverSaveLoadCallout params={params} setParams={setParams}
            prompt="Have a saved plan? Load it — or save this one to a file." primary="save" compact />
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '0.85fr 1.15fr',
          alignItems: 'center', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
            <CoverLine kicker={dirty ? 'The Verdict' : 'Sample Verdict'}
              title={`${dirty ? 'Your plan' : 'This sample plan'} is ${results.verdictWord.toLowerCase()}.`}
              body={dirty ? results.verdictBlurb : 'These are example numbers, not yours yet. Answer the questionnaire and this cover fills in with your real plan.'}
              accent={vc} big />
            <CoverLine kicker="Your Paycheck, Explained"
              title={`${fmt(results.paycheck.total)} a month`}
              body={`Where every dollar comes from once ${params.hasPartner ? 'you both stop' : 'you stop'} working at ${results.params.retireAge}.`} />
            <CoverLine kicker="Inside"
              title="Three moves that buy better odds"
              body="Small, specific changes — and exactly how many points each is worth." />
            {!dirty && (
              <button onClick={() => window._coverNav && window._coverNav('quiz')}
                style={{ alignSelf: 'flex-start', padding: '14px 26px', background: cvStyles.ink, color: cvStyles.paper,
                  border: 'none', cursor: 'pointer', fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.14em',
                  textTransform: 'uppercase', fontWeight: 600 }}>
                Answer the questionnaire →</button>
            )}
          </div>

          <div style={{ textAlign: 'center', position: 'relative' }}>
            {!dirty && (
              <div style={{ display: 'inline-block', marginBottom: 14, padding: '5px 12px',
                border: `1px solid ${cvStyles.clay}`, color: cvStyles.clay, background: cvStyles.claySoft,
                fontFamily: cvStyles.body, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Sample plan · not your numbers yet</div>
            )}
            <div style={{ ...cvKicker, marginBottom: -6 }}>Chance of never running out</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ fontFamily: cvStyles.display, fontSize: 360, lineHeight: 0.82,
                color: cvStyles.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
                transition: 'color 300ms' }}>{results.successRate}</div>
              <div style={{ fontFamily: cvStyles.display, fontSize: 64, color: cvStyles.ink50,
                marginTop: 36 }}>/100</div>
            </div>
            <div style={{ width: 220, height: 5, background: vc, margin: '4px auto 14px',
              transition: 'background 300ms' }} />
            <div style={{ fontFamily: cvStyles.display, fontSize: 56, color: vc, lineHeight: 1,
              transition: 'color 300ms' }}>{results.verdictWord}.</div>
          </div>
        </div>

        <div style={{ ...cvKicker, textAlign: 'center', paddingTop: 8 }}>The full plan, below ↓</div>
      </section>

      {/* ===== ARTICLE ===== */}
      <section style={{ background: cvStyles.paperWarm, borderTop: `1px solid ${cvStyles.ink}`,
        padding: '56px 64px 64px' }}>
        <div style={{ maxWidth: 940, margin: '0 auto' }}>
          <div style={{ ...cvKicker, marginBottom: 18 }}>Feature · Your Paycheck in Retirement</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
            marginBottom: 64 }}>
            <h2 style={{ fontFamily: cvStyles.display, fontSize: 40, lineHeight: 1.12, margin: 0,
              letterSpacing: '-0.01em' }}>
              {fmt(results.paycheck.total)} a month, and most of the worry is in one part.
            </h2>
            <div>
              <CoverPaycheck paycheck={results.paycheck} />
              <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, marginTop: 18 }}>
                Social Security arrives first, inflation-protected and certain. The rest is sold from
                your portfolio each year — the part a bad market sequence can squeeze.
              </p>
            </div>
          </div>

          <div style={{ ...cvKicker, marginBottom: 18 }}>Why the Verdict Reads That Way</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36,
            paddingBottom: 56, borderBottom: `1px solid ${cvStyles.rule}`, marginBottom: 56 }}>
            <CoverReason big={`${results.successRate}%`}
              head="of futures succeed"
              body={`Across ${(results.numPaths || 0).toLocaleString()} simulated histories, ${results.successRate}% finish with money still in the account at ${results.params.endAge}.`} />
            <CoverReason big={fmt(results.medianLegacy, { compact: true })}
              head="median legacy"
              body="The middle outcome leaves this for heirs or late-life care — more in fair markets, less in foul." />
            <CoverReason big={fmt(results.sustainableSpending, { compact: true })}
              head="safe to spend / yr"
              body={`For near-certain odds, this is the level that gets you there — ${results.sustainableSpending >= results.params.spending ? 'above' : 'below'} today's plan.`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 56,
            alignItems: 'start' }}>
            <div>
              <div style={{ ...cvKicker, marginBottom: 18 }}>Three Moves, Ranked</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {results.levers.map(l => (
                  <div key={l.id} style={{
                    display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center',
                    background: cvStyles.paper, width: '100%',
                    border: `1px solid ${cvStyles.ink}`, padding: '16px 20px' }}>
                    <div>
                      <div style={{ fontFamily: cvStyles.display, fontSize: 21, lineHeight: 1.15 }}>{l.title}</div>
                      <div style={{ fontSize: 12.5, color: cvStyles.ink70, marginTop: 3 }}>{l.detail}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: cvStyles.display, fontSize: 30, color: cvStyles.sage,
                        lineHeight: 1 }}>+{l.delta}</div>
                      <div style={{ ...cvKicker, fontSize: 9 }}>points</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: cvStyles.ink50, marginTop: 14 }}>
                Test any of these on the <strong style={{ color: cvStyles.ink70 }}>Rework</strong> page —
                nothing changes here until you choose to publish it.
              </div>
            </div>
            <div style={{ border: `1px solid ${cvStyles.ink}`, padding: '22px 24px',
              background: cvStyles.paper }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
                marginBottom: 18 }}>
                <div style={{ ...cvKicker }}>Adjust the Plan</div>
                {dirty && (
                  <button onClick={reset} style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: cvStyles.body, fontSize: 11, color: cvStyles.clay, letterSpacing: '0.04em',
                    padding: 0, textDecoration: 'underline' }}>Reset to defaults</button>
                )}
              </div>
              <CoverSlider label="Retire at" value={params.retireAge}
                onChange={v => update('retireAge', v)} min={params.currentAge + 1} max={80}
                display={params.retireAge} accent={vc} />
              <CoverSlider label="Spending / yr" value={params.spending}
                onChange={v => update('spending', v)} min={40000} max={250000} step={5000}
                display={fmt(params.spending)} accent={vc} />
              <CoverSlider label="Claim SS at" value={params.ssClaimAge}
                onChange={v => update('ssClaimAge', v)} min={62} max={70}
                display={params.ssClaimAge} accent={vc} last />
              <div style={{ fontSize: 11, color: cvStyles.ink50, marginTop: 14, lineHeight: 1.5 }}>
                Drag a dial and the cover number above moves with it. Sliders set a value directly —
                there's nothing to stack or undo.
              </div>
            </div>
          </div>

          <div style={{ ...cvKicker, textAlign: 'center', marginTop: 48 }}>Concept 07 / Cover · V18.8</div>
        </div>
      </section>
    </div>
  );
}

function CoverLine({ kicker, title, body, accent, big }) {
  return (
    <div style={{ borderLeft: `3px solid ${accent || cvStyles.ink}`, paddingLeft: 16 }}>
      <div style={{ fontFamily: cvStyles.body, fontSize: 10, letterSpacing: '0.2em',
        textTransform: 'uppercase', color: cvStyles.ink50, marginBottom: 6 }}>{kicker}</div>
      <div style={{ fontFamily: cvStyles.display, fontSize: big ? 30 : 23, lineHeight: 1.1,
        marginBottom: 6, letterSpacing: '-0.01em', color: accent || cvStyles.ink }}>{title}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: cvStyles.ink70, maxWidth: 320 }}>{body}</div>
    </div>
  );
}

function CoverPaycheck({ paycheck }) {
  const fmt = window.MockEngine.formatCurrency;
  const total = paycheck.total || 1;
  const segs = [
    { key: 'ss', label: 'Social Security', val: paycheck.ss, bg: cvStyles.sage, fg: cvStyles.paper },
    { key: 'pension', label: 'Pension & other', val: paycheck.pension, bg: cvStyles.amber, fg: cvStyles.paper },
    { key: 'port', label: 'Portfolio', val: paycheck.portfolio, bg: cvStyles.paperWarm, fg: cvStyles.ink },
  ].filter(s => s.val > 0.5);
  return (
    <div>
      <div style={{ display: 'flex', height: 54, border: `1px solid ${cvStyles.ink}` }}>
        {segs.map((s, i) => (
          <div key={s.key} style={{ width: `${(s.val / total) * 100}%`, background: s.bg, color: s.fg,
            borderLeft: i ? `1px solid ${cvStyles.ink}` : 'none', display: 'flex', alignItems: 'center',
            paddingLeft: 12, fontFamily: cvStyles.display, fontSize: 18, overflow: 'hidden',
            whiteSpace: 'nowrap' }}>{fmt(s.val)}</div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10.5,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: cvStyles.ink70, flexWrap: 'wrap', gap: 8 }}>
        {segs.map(s => <span key={s.key}>{s.label} {Math.round((s.val / total) * 100)}%</span>)}
      </div>
    </div>
  );
}

function CoverReason({ big, head, body }) {
  return (
    <div>
      <div style={{ fontFamily: cvStyles.display, fontSize: 48, lineHeight: 1, marginBottom: 6,
        letterSpacing: '-0.02em' }}>{big}</div>
      <div style={{ fontFamily: cvStyles.body, fontSize: 11, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: cvStyles.ink50, marginBottom: 10 }}>{head}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: cvStyles.ink70 }}>{body}</div>
    </div>
  );
}

function CoverSlider({ label, value, onChange, min, max, step = 1, display, accent, last }) {
  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 8 }}>
        <span style={{ fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: cvStyles.ink50 }}>{label}</span>
        <span style={{ fontFamily: cvStyles.display, fontSize: 24, color: cvStyles.ink,
          fontVariantNumeric: 'tabular-nums' }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent, color: accent }} />
    </div>
  );
}

// ============================================================================
// SHARED CHROME + NAV
// ============================================================================
function CoverNav({ active, emphasizeQuiz }) {
  const tabs = [
    { id: 'quiz', label: 'Questionnaire' },
    { id: 'cover', label: 'Cover' },
    { id: 'rework', label: 'Rework' },
    { id: 'chart', label: 'Projection' },
    { id: 'charts2', label: 'Income & Odds' },
  ];
  return (
    <nav style={{ display: 'flex', gap: 26, justifyContent: 'center', alignItems: 'center', paddingTop: 14, flexWrap: 'wrap' }}>
      {tabs.map(t => {
        const isCTA = emphasizeQuiz && t.id === 'quiz' && active !== 'quiz';
        if (isCTA) return (
          <span key={t.id} onClick={() => window._coverNav && window._coverNav(t.id)}
            style={{ cursor: 'pointer', fontFamily: cvStyles.body, fontSize: 10.5, letterSpacing: '0.16em',
              textTransform: 'uppercase', fontWeight: 600, color: cvStyles.paper, background: cvStyles.sage,
              padding: '6px 14px', borderRadius: 99 }}>
            Start here · {t.label}</span>
        );
        return (
          <span key={t.id} onClick={() => window._coverNav && window._coverNav(t.id)} style={{ cursor: 'pointer', fontFamily: cvStyles.body, fontSize: 10.5, letterSpacing: '0.18em',
            textTransform: 'uppercase', paddingBottom: 7,
            color: active === t.id ? cvStyles.ink : cvStyles.ink50,
            fontWeight: active === t.id ? 600 : 400,
            borderBottom: active === t.id ? `2px solid ${cvStyles.ink}` : '2px solid transparent' }}>
            {t.label}</span>
        );
      })}
    </nav>
  );
}

function CoverChrome({ active, children, bg, tag }) {
  return (
    <div style={{ width: '100%', height: '100%', background: bg || cvStyles.paper, color: cvStyles.ink,
      fontFamily: cvStyles.body, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ padding: '30px 64px 0', background: cvStyles.paper,
        borderBottom: `1px solid ${cvStyles.ink}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: cvStyles.display, fontSize: 30, lineHeight: 1 }}>Compass</div>
          <div style={{ ...cvKicker }}>The Retirement Issue · May 2026 · No. 5</div>
        </div>
        <CoverNav active={active} />
      </div>
      {children}
      <div style={{ ...cvKicker, textAlign: 'center', padding: '36px 0 48px' }}>{tag}</div>
    </div>
  );
}
window.CoverChrome = CoverChrome;
window.CoverSlider = CoverSlider;

// ============================================================================
// ③ REWORK — what-if with diff chips + per-field reset + idempotent levers
// ============================================================================
function CoverAdjust(props) {
  props = props || {}; const [localParams, setLocalParams] = React.useState(window.MockEngine.DEFAULTS); const params = props.params || localParams; const setParams = props.setParams || setLocalParams;
  const base = React.useMemo(() => window.MockEngine.compute(params), [params]);
  // scenario (uncommitted) overrides
  const [sc, setSc] = React.useState({ retireAge: params.retireAge, spending: params.spending, ssClaimAge: params.ssClaimAge });
  const proposed = React.useMemo(() => window.MockEngine.compute({ ...params, ...sc }), [params, sc]);
  const fmt = window.MockEngine.formatCurrency;
  const delta = proposed.successRate - base.successRate;
  const vc = cvVerdictColor(proposed.verdict);
  const theme = cvTheme(vc);
  const setField = (k, v) => setSc(s => ({ ...s, [k]: v }));
  const resetField = (k) => setSc(s => ({ ...s, [k]: params[k] }));
  const resetAll = () => setSc({ retireAge: params.retireAge, spending: params.spending, ssClaimAge: params.ssClaimAge });
  const commit = () => setParams(p => ({ ...p, ...sc }));
  const anyChange = sc.retireAge !== params.retireAge || sc.spending !== params.spending || sc.ssClaimAge !== params.ssClaimAge;

  // Idempotent lever targets — pressing again just re-sets the same value.
  const levers = [
    { id: 'delay', title: 'Retire 2 years later', apply: () => setField('retireAge', Math.min(80, params.retireAge + 2)), active: sc.retireAge === Math.min(80, params.retireAge + 2) },
    { id: 'spend', title: 'Spend 10% less', apply: () => setField('spending', Math.round(params.spending * 0.9 / 1000) * 1000), active: sc.spending === Math.round(params.spending * 0.9 / 1000) * 1000 },
    { id: 'ss', title: 'Claim SS at 70', apply: () => setField('ssClaimAge', 70), active: sc.ssClaimAge === 70 },
  ];

  const Chip = ({ k, fromTxt, toTxt }) => (sc[k] !== params[k]
    ? <div style={{ marginTop: 8 }}><DiffChip from={fromTxt} to={toTxt} onReset={() => resetField(k)} theme={theme} /></div>
    : null);

  return (
    <CoverChrome active="rework" tag="Concept 07 / Cover · Rework">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cvKicker, textAlign: 'center', marginBottom: 10 }}>Rework the Cover · live</div>
        <h1 style={{ fontFamily: cvStyles.display, fontSize: 44, textAlign: 'center', margin: '0 0 8px',
          letterSpacing: '-0.01em' }}>Move a dial. Watch the number.</h1>
        <p style={{ textAlign: 'center', fontSize: 14, color: cvStyles.ink70, margin: '0 auto 36px', maxWidth: 520, lineHeight: 1.6 }}>
          Every change is just a draft — your filed plan ({base.successRate}/100) stays put until you publish.
          A tag shows exactly what you've changed, and resets it in one click.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'start' }}>
          <div style={{ textAlign: 'center', paddingTop: 8 }}>
            <div style={{ ...cvKicker, marginBottom: -4 }}>As proposed</div>
            <div style={{ fontFamily: cvStyles.display, fontSize: 200, lineHeight: 0.85, color: cvStyles.ink,
              letterSpacing: '-0.03em', transition: 'color 300ms' }}>{proposed.successRate}</div>
            <div style={{ width: 160, height: 4, background: vc, margin: '6px auto 12px', transition: 'background 300ms' }} />
            <div style={{ fontFamily: cvStyles.display, fontSize: 40, color: vc, lineHeight: 1 }}>{proposed.verdictWord}.</div>
            <div style={{ fontSize: 14, marginTop: 14, color: delta >= 0 ? cvStyles.sage : cvStyles.clay,
              fontWeight: 600 }}>
              {delta > 0 ? `↑ ${delta} better than as filed (${base.successRate})`
                : delta < 0 ? `↓ ${Math.abs(delta)} worse than as filed (${base.successRate})`
                : `Same as filed (${base.successRate})`}
            </div>
          </div>

          <div>
            <div style={{ border: `1px solid ${cvStyles.ink}`, padding: '24px 26px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
                <div style={{ ...cvKicker }}>The dials</div>
                {anyChange && (
                  <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: cvStyles.body, fontSize: 11, color: cvStyles.clay, padding: 0, textDecoration: 'underline' }}>
                    Reset all
                  </button>
                )}
              </div>
              <CoverSlider label="Retire at" value={sc.retireAge} onChange={v => setField('retireAge', v)}
                min={params.currentAge + 1} max={80} display={sc.retireAge} accent={vc} />
              <Chip k="retireAge" fromTxt={params.retireAge} toTxt={sc.retireAge} />
              <div style={{ height: 16 }} />
              <CoverSlider label="Spending / yr" value={sc.spending} onChange={v => setField('spending', v)}
                min={40000} max={250000} step={5000} display={fmt(sc.spending)} accent={vc} />
              <Chip k="spending" fromTxt={fmt(params.spending)} toTxt={fmt(sc.spending)} />
              <div style={{ height: 16 }} />
              <CoverSlider label="Claim SS at" value={sc.ssClaimAge} onChange={v => setField('ssClaimAge', v)}
                min={62} max={70} display={sc.ssClaimAge} accent={vc} last />
              <Chip k="ssClaimAge" fromTxt={params.ssClaimAge} toTxt={sc.ssClaimAge} />
              <button onClick={commit} disabled={!anyChange} style={{ width: '100%', marginTop: 22, padding: '14px',
                background: anyChange ? cvStyles.ink : cvStyles.ink20, color: cvStyles.paper, border: 'none',
                fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: anyChange ? 'pointer' : 'default', fontWeight: 600 }}>Publish as the new cover</button>
            </div>
            <div style={{ ...cvKicker, marginBottom: 12 }}>Suggested moves · tap to set</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {levers.map(l => (
                <button key={l.id} onClick={l.apply} style={{ display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', gap: 14, textAlign: 'left',
                  background: l.active ? cvStyles.sageSoft : cvStyles.paperWarm,
                  border: `1px solid ${l.active ? cvStyles.sage : cvStyles.rule}`, cursor: 'pointer',
                  padding: '12px 16px', transition: 'background 150ms' }}>
                  <span style={{ fontFamily: cvStyles.display, fontSize: 18 }}>{l.title}</span>
                  <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: l.active ? cvStyles.sage : cvStyles.ink50, fontWeight: 600 }}>
                    {l.active ? '✓ Applied' : 'Set'}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </CoverChrome>
  );
}

// ============================================================================
// ④ PROJECTION — balance fan + income by source
// ============================================================================
function CoverCharts(props) {
  props = props || {}; const [localParams] = React.useState(window.MockEngine.DEFAULTS); const params = props.params || localParams;
  const results = React.useMemo(() => window.MockEngine.compute(params), [params]);
  const fmt = window.MockEngine.formatCurrency;
  const theme = cvTheme(cvVerdictColor(results.verdict));
  return (
    <CoverChrome active="chart" bg={cvStyles.paperWarm} tag="Concept 07 / Cover · Projection">
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cvKicker, marginBottom: 10 }}>The Projection · {(results.numPaths || 0).toLocaleString()} paths</div>
        <h1 style={{ fontFamily: cvStyles.display, fontSize: 52, margin: '0 0 8px',
          letterSpacing: '-0.01em', lineHeight: 1.05 }}>Where the money goes,<br />year by year.</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 600, margin: '0 0 32px' }}>
          The bold line is the most likely path. The band around it is the distance between fortune
          and misfortune in the markets you might actually live through.
        </p>
        <BalanceFanChart results={results} theme={theme} width={960} height={360} />

        <div style={{ marginTop: 56 }}>
          <div style={{ ...cvKicker, marginBottom: 8 }}>Your paycheck, year by year</div>
          <h2 style={{ fontFamily: cvStyles.display, fontSize: 34, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Guaranteed income on the bottom. The portfolio fills the gap.
          </h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 620, margin: '0 0 24px' }}>
            Social Security is fixed and inflation-protected. The hatched band on top is what you sell
            from investments — the slice a rough market makes you think twice about.
          </p>
          <IncomeSourceChart results={results} theme={theme} width={960} height={300} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, marginTop: 48,
          paddingTop: 32, borderTop: `1px solid ${cvStyles.rule}` }}>
          <CoverBigStat big={`${results.successRate}`} unit="/100" label="Plans that succeed" />
          <CoverBigStat big={fmt(results.medianLegacy, { compact: true })} label={`Median legacy at ${params.endAge}`} />
          <CoverBigStat big={fmt(results.sustainableSpending, { compact: true })} label="Safe to spend / yr" />
          <CoverBigStat big={`${results.runwayYears}`} unit="yrs" label="Runway in retirement" />
        </div>
      </div>
    </CoverChrome>
  );
}

// ============================================================================
// ⑤ INCOME & ODDS — glide path + scenario comparison
// ============================================================================
function CoverCharts2(props) {
  props = props || {}; const [localParams] = React.useState(window.MockEngine.DEFAULTS); const params = props.params || localParams;
  const results = React.useMemo(() => window.MockEngine.compute(params), [params]);
  const theme = cvTheme(cvVerdictColor(results.verdict));
  return (
    <CoverChrome active="charts2" tag="Concept 07 / Cover · Income & Odds">
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cvKicker, marginBottom: 10 }}>How your mix shifts</div>
        <h1 style={{ fontFamily: cvStyles.display, fontSize: 46, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
          Stocks now, steadier later.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 620, margin: '0 0 24px' }}>
          Your glide path eases out of stocks as you age, so a crash late in retirement does less damage
          when you can least afford it.
        </p>
        <GlidePathChart results={results} theme={theme} width={960} height={240} />

        <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${cvStyles.rule}` }}>
          <div style={{ ...cvKicker, marginBottom: 10 }}>The moves, side by side</div>
          <h2 style={{ fontFamily: cvStyles.display, fontSize: 40, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
            What each change is worth.
          </h2>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 620, margin: '0 0 32px' }}>
            The same odds, run five ways. Combine all three and the plan moves from tight to comfortable.
          </p>
          <ScenarioCompareChart params={params} theme={theme} labelWidth={176} />
        </div>
      </div>
    </CoverChrome>
  );
}

function CoverBigStat({ big, unit, label }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
        <span style={{ fontFamily: cvStyles.display, fontSize: 46, lineHeight: 1,
          letterSpacing: '-0.02em' }}>{big}</span>
        {unit && <span style={{ fontFamily: cvStyles.display, fontSize: 20, color: cvStyles.ink50 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: cvStyles.body, fontSize: 11, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: cvStyles.ink50, marginTop: 8 }}>{label}</div>
    </div>
  );
}

// ============================================================================
// WELCOME — launch screen shown on every load (Continue / Start new / Load).
// Responsive: same component renders at desktop and 375px.
// ============================================================================
function CoverWelcome({ hasSession, onContinue, onStartNew, onLoaded }) {
  const [err, setErr] = React.useState('');
  const doLoad = () => {
    setErr('');
    window.CompassIO.pickPlanFile(res => {
      if (res && res.ok) onLoaded(res.params);
      else setErr((res && res.error) || 'Could not load that file.');
    });
  };
  const sub = { display: 'block', fontSize: 12, marginTop: 3, opacity: 0.7,
    letterSpacing: 0, textTransform: 'none', fontWeight: 400 };
  const btn = (primary) => ({
    width: '100%', padding: '15px 20px', textAlign: 'left', cursor: 'pointer',
    fontFamily: cvStyles.body, border: `1px solid ${cvStyles.ink}`,
    background: primary ? cvStyles.ink : 'transparent',
    color: primary ? cvStyles.paper : cvStyles.ink,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 });
  const ActionButton = ({ primary, onClick, title, note, glyph }) => (
    <button onClick={onClick} style={btn(primary)}>
      <span style={{ display: 'block' }}>
        <span style={{ fontFamily: cvStyles.display, fontSize: 18, display: 'block' }}>{title}</span>
        <span style={sub}>{note}</span>
      </span>
      <span style={{ flex: '0 0 auto', fontSize: 18 }}>{glyph}</span>
    </button>
  );
  return (
    <div style={{ width: '100%', height: '100%', background: cvStyles.paper, color: cvStyles.ink,
      fontFamily: cvStyles.body, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 560, width: '100%', margin: '0 auto', minHeight: '100%',
        padding: 'clamp(28px,6vw,64px) 24px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          borderBottom: `1px solid ${cvStyles.ink}`, paddingBottom: 14, marginBottom: 'clamp(28px,6vw,52px)' }}>
          <div style={{ fontFamily: cvStyles.display, fontSize: 'clamp(28px,7vw,34px)', lineHeight: 1 }}>Compass</div>
          <div style={{ ...cvKicker }}>The Retirement Issue · No. 5</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ ...cvKicker, marginBottom: 14 }}>Welcome</div>
          <h1 style={{ fontFamily: cvStyles.display, fontSize: 'clamp(34px,8vw,54px)', lineHeight: 1.05,
            letterSpacing: '-0.01em', margin: '0 0 16px' }}>
            {hasSession ? 'Welcome back.' : 'Let’s build your plan.'}
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 430, margin: '0 0 32px' }}>
            {hasSession
              ? 'Pick up where you left off, load a plan you saved, or start fresh. Your answers stay in this browser unless you save them to a file.'
              : 'Answer a few questions and the cover fills in with your real numbers — about 3–5 minutes. Your answers stay in this browser unless you save them to a file.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 430 }}>
            {hasSession && <ActionButton primary onClick={onContinue}
              title="Continue your plan" note="Reopen your saved session" glyph="→" />}
            <ActionButton primary={!hasSession} onClick={onStartNew}
              title="Start a new plan" note="Enter your details from scratch" glyph="→" />
            <ActionButton primary={false} onClick={doLoad}
              title="Load a saved plan" note="Open a .json file you saved before" glyph="↑" />
          </div>
          {err && <div style={{ color: cvStyles.clay, fontSize: 13, marginTop: 16, maxWidth: 430 }}>{err}</div>}
        </div>
        <div style={{ ...cvKicker, marginTop: 'clamp(28px,6vw,48px)' }}>Concept 07 / Cover · Welcome · V18.8</div>
      </div>
    </div>
  );
}

Object.assign(window, { CoverDesktop, CoverAdjust, CoverCharts, CoverCharts2, CoverWelcome });
