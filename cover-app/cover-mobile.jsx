// cover-mobile.jsx — 07 · Cover · Mobile
// Phone view of the magazine-cover concept. Two tabs (renamed V19.3 to match desktop):
//   • Results    — the hero success number, verdict, paycheck, and the moves.
//   • Input Data — the "everything shown" intake, single-column, with an
//                  Advanced toggle for the assumption-level dials.
// V19.4 (mobile-parity decision, Option B): mobile deliberately stays this two-tab
// companion — Try Changes and Charts are desktop-only — but CoverView now discloses
// that in copy so mobile users know those screens exist rather than assuming they don't.
// Option A (a native third mobile tab for the fan chart + year-by-year table) was
// considered and moved to BACKLOG.md as a possible future upgrade, not built.
// Reuses window.cvStyles / window.FIELD_INFO / window.InfoTip / window.MockEngine
// and window.CVI_STATES. Loaded after compass-cover.jsx + cover-inputs.jsx.

(function () {
  const cm = window.cvStyles;
  const ME = window.MockEngine;
  const { InfoTip, FIELD_INFO } = window;
  // Questionnaire values stay exact after entry; compact rounding belongs on summary screens.
  const money = v => ME.formatCurrency(v);

  const mKick = { fontFamily: cm.body, fontSize: 9.5, letterSpacing: '0.2em',
    textTransform: 'uppercase', color: cm.ink50 };

  // ── Field primitives (full-width, 42px touch targets) ─────────────────────
  function FieldHead({ field, label }) {
    const info = field && FIELD_INFO[field];
    return (
      <div style={{ marginBottom: 7 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: cm.body, fontSize: 10.5, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: cm.ink50 }}>{label}</span>
          {info && <InfoTip field={field} label={label} theme={cm} />}
        </div>
        {info && <div style={{ fontSize: 12, lineHeight: 1.4, color: cm.ink70, marginTop: 3,
          textWrap: 'pretty' }}>{info.help}</div>}
      </div>
    );
  }

  const mStepBtn = { width: 42, height: 42, borderRadius: '50%', border: `1px solid ${cm.ink20}`,
    background: 'transparent', color: cm.ink, fontSize: 22, lineHeight: 1, display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flex: '0 0 auto', fontFamily: cm.body };

  function MStep({ field, label, value, onChange, min = 0, max = 9999999, step = 1, format, suffix }) {
    return (
      <div style={{ marginBottom: 22 }}>
        <FieldHead field={field} label={label} />
        <window.NumericStepper label={label} value={value} onChange={onChange} min={min} max={max}
          step={step} suffix={suffix} format={format} buttonStyle={mStepBtn}
          rowStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: `1px solid ${cm.ink}`, paddingBottom: 8 }}
          inputStyle={{ width: '100%', minWidth: 0, margin: '0 10px', padding: '3px 4px', border: 'none',
            borderRadius: 2, textAlign: 'center', fontFamily: cm.display, fontSize: 28, color: cm.ink,
            fontVariantNumeric: 'tabular-nums', cursor: 'text' }}
          errorStyle={{ marginTop: 7, color: cm.clay, fontSize: 11, lineHeight: 1.35 }} />
      </div>
    );
  }

  function MToggle({ field, label, value, onChange }) {
    return (
      <div style={{ marginBottom: 22 }}>
        <FieldHead field={field} label={label} />
        <button onClick={() => onChange(!value)} aria-label={label} aria-pressed={value} style={{ display: 'flex', alignItems: 'center', gap: 12,
          background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ width: 46, height: 26, borderRadius: 99, background: value ? cm.sage : cm.ink20,
            position: 'relative', transition: 'background 180ms', flex: '0 0 auto' }}>
            <span style={{ position: 'absolute', top: 2, left: value ? 22 : 2, width: 22, height: 22,
              borderRadius: '50%', background: cm.paper, transition: 'left 180ms' }} />
          </span>
          <span style={{ fontFamily: cm.display, fontSize: 19, color: cm.ink }}>{value ? 'On' : 'Off'}</span>
        </button>
      </div>
    );
  }

  function MSelect({ field, label, value, onChange, options }) {
    return (
      <div style={{ marginBottom: 22 }}>
        <FieldHead field={field} label={label} />
        <div style={{ position: 'relative', borderBottom: `1px solid ${cm.ink}`, paddingBottom: 8 }}>
          <select aria-label={label} value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%',
            fontFamily: cm.display, fontSize: 20, color: cm.ink, background: 'transparent', border: 'none',
            outline: 'none', cursor: 'pointer', WebkitAppearance: 'none', appearance: 'none',
            padding: '4px 20px 4px 0' }}>
            {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 0, bottom: 11, pointerEvents: 'none',
            fontSize: 12, color: cm.ink50 }}>▾</span>
        </div>
      </div>
    );
  }

  function MSegment({ value, onChange }) {
    const opts = [{ v: false, label: 'Just me' }, { v: true, label: 'Me + partner' }];
    return (
      <div style={{ display: 'flex', border: `1px solid ${cm.ink}`, background: cm.paper }}>
        {opts.map((o, i) => (
          <button key={String(o.v)} onClick={() => onChange(o.v)} style={{ flex: 1, fontFamily: cm.body,
            fontSize: 11.5, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '12px 0',
            cursor: 'pointer', border: 'none', fontWeight: 600, borderLeft: i ? `1px solid ${cm.ink}` : 'none',
            background: value === o.v ? cm.ink : 'transparent', color: value === o.v ? cm.paper : cm.ink70 }}>
            {o.label}</button>
        ))}
      </div>
    );
  }

  function MGroup({ title, children }) {
    return (
      <div style={{ paddingBottom: 26, marginBottom: 26, borderBottom: `1px solid ${cm.rule}` }}>
        <div style={{ fontFamily: cm.display, fontSize: 22, marginBottom: 16, letterSpacing: '-0.01em' }}>{title}</div>
        {children}
      </div>
    );
  }

  function MSub({ title, children }) {
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ ...mKick, marginBottom: 14 }}>{title}</div>
        {children}
      </div>
    );
  }

  // ── Paycheck mini-bar ─────────────────────────────────────────────────────
  function MPaycheck({ paycheck }) {
    const total = paycheck.total || 1;
    const segs = [
      { key: 'ss', label: 'Social Security', val: paycheck.ss, bg: cm.sage, fg: cm.paper },
      { key: 'pension', label: 'Pension & other', val: paycheck.pension, bg: cm.amber, fg: cm.paper },
      { key: 'wages', label: 'Wages', val: paycheck.wages, bg: cm.clay, fg: cm.paper },
      { key: 'port', label: 'Portfolio', val: paycheck.portfolio, bg: cm.paperWarm, fg: cm.ink },
    ].filter(s => s.val > 0.5);
    return (
      <div>
        <div style={{ display: 'flex', height: 46, border: `1px solid ${cm.ink}` }}>
          {segs.map((s, i) => (
            <div key={s.key} style={{ width: `${(s.val / total) * 100}%`, background: s.bg, color: s.fg,
              borderLeft: i ? `1px solid ${cm.ink}` : 'none', display: 'flex', alignItems: 'center',
              paddingLeft: 9, fontFamily: cm.display, fontSize: 14, overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {ME.formatCurrency(s.val)}</div>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8, fontSize: 10,
          letterSpacing: '0.06em', textTransform: 'uppercase', color: cm.ink70 }}>
          {segs.map(s => <span key={s.key}>{s.label} {Math.round((s.val / total) * 100)}%</span>)}
        </div>
        {paycheck.taxes > 0.5 && (
          <div style={{ fontSize: 10.5, color: cm.ink50, marginTop: 7, lineHeight: 1.4 }}>
            Includes {ME.formatCurrency(paycheck.taxes)}/mo for taxes; {ME.formatCurrency(paycheck.spending)}/mo is what you spend.
          </div>
        )}
      </div>
    );
  }

  // ── The two views ─────────────────────────────────────────────────────────
  function CoverView({ results, vc, partner, dirty, goQuiz, params, setParams }) {
    // V19.3: exact move deltas at the FULL path count, from the same computeMoves
    // source the desktop Results cards and Try Changes bars read.
    const moves = React.useMemo(() => ME.computeMoves(params, results.successRate), [params, results]);
    const moveCards = moves.moves.filter(l => l.delta >= 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
    return (
      <div style={{ padding: '22px 20px 28px' }}>
        <div style={{ textAlign: 'center', paddingBottom: 22, marginBottom: 22,
          borderBottom: `1px solid ${cm.rule}` }}>
          {!dirty && (
            <div style={{ display: 'inline-block', marginBottom: 12, padding: '4px 10px',
              border: `1px solid ${cm.clay}`, color: cm.clay, background: cm.claySoft,
              fontFamily: cm.body, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Sample · not your numbers yet</div>
          )}
          <div style={{ ...mKick, marginBottom: 4, display: 'inline-flex', alignItems: 'center', gap: 5,
            justifyContent: 'center' }}>
            {window.cvChanceLabel ? window.cvChanceLabel(params) : 'Chance of never running out'}
            {window.InfoTip && window.CV_CHANCE_TOOLTIP && <window.InfoTip text={window.CV_CHANCE_TOOLTIP} label="how the score counts" theme={cm} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <span style={{ fontFamily: cm.display, fontSize: 150, lineHeight: 0.84, color: cm.ink,
              letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', transition: 'color 300ms' }}>{results.successRate}</span>
            <span style={{ fontFamily: cm.display, fontSize: 30, color: cm.ink50, marginTop: 14 }}>/100</span>
          </div>
          <div style={{ width: 130, height: 4, background: vc, margin: '6px auto 12px', transition: 'background 300ms' }} />
          <div style={{ fontFamily: cm.display, fontSize: 38, color: vc, lineHeight: 1, marginBottom: 10,
            transition: 'color 300ms' }}>{results.verdictWord}.</div>
          {window.cvDangerLine && window.cvDangerLine(results) && (
            <p style={{ fontSize: 13, lineHeight: 1.5, color: cm.ink70, margin: '0 auto 12px', maxWidth: 300 }}>
              {window.cvDangerLine(results)}</p>
          )}
          <p style={{ fontSize: 14, lineHeight: 1.55, color: cm.ink70, margin: '0 auto', maxWidth: 300,
            textWrap: 'pretty' }}>{dirty ? results.verdictBlurb : 'These are example numbers, not yours yet. Enter your data and this fills in with your real plan.'}</p>
          {!dirty && (
            <button onClick={goQuiz} style={{ marginTop: 16, padding: '13px 22px', background: cm.ink,
              color: cm.paper, border: 'none', cursor: 'pointer', fontFamily: cm.body, fontSize: 11.5,
              letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
              Enter your data →</button>
          )}
        </div>

        <div style={{ marginBottom: 26 }}>
          <window.CoverSaveLoadCallout params={params} setParams={setParams}
            prompt="Save this plan to a file, or load another." primary="save" compact />
        </div>

        <section style={{ marginBottom: 26 }}>
          <div style={{ ...mKick, marginBottom: 10 }}>Your paycheck, explained</div>
          <p style={{ fontFamily: cm.display, fontSize: 19, lineHeight: 1.4, margin: '0 0 14px', color: cm.ink }}>
            At {results.paycheck.atAge}{window.cvPaycheckNote ? window.cvPaycheckNote(params, results.paycheck.atAge) : ''}, {partner ? "you'll both" : "you'll"} need{' '}
            {ME.formatCurrency(results.paycheck.total)}/mo.
          </p>
          <MPaycheck paycheck={results.paycheck} />
        </section>

        <section>
          <div style={{ ...mKick, marginBottom: 12 }}>Three moves that buy better odds</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {moveCards.map(l => (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 14, border: `1px solid ${cm.ink}`, background: cm.paperWarm, padding: '13px 15px' }}>
                <div>
                  <div style={{ fontFamily: cm.display, fontSize: 17, lineHeight: 1.15 }}>{l.title}</div>
                  <div style={{ fontSize: 11.5, color: cm.ink70, marginTop: 2 }}>{l.detail}</div>
                </div>
                <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                  <div style={{ fontFamily: cm.display, fontSize: 26, color: cm.sage, lineHeight: 1 }}>+{l.delta}</div>
                  <div style={{ ...mKick, fontSize: 8 }}>points</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* V19.4: mobile stays a two-tab companion (Results + Input Data) — this note
            discloses that Try Changes (test your own moves) and Charts (year-by-year
            table, balance fan chart) exist on desktop, so mobile users know what
            they're not seeing rather than assuming that's everything. */}
        <section style={{ marginTop: 26, paddingTop: 20, borderTop: `1px solid ${cm.rule}` }}>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: cm.ink70, textWrap: 'pretty' }}>
            This phone view covers your results and your inputs. Two more screens live on a
            bigger screen: <strong style={{ color: cm.ink }}>Try Changes</strong>, where you can
            test your own moves before committing to them, and <strong style={{ color: cm.ink }}>
            Charts</strong>, with the balance projection and year-by-year numbers.
          </p>
        </section>
      </div>
    );
  }

  function QuizView({ params, update, setParams, vc, partner, results, hideReturning, dirty }) {
    const [adv, setAdv] = React.useState(false);
    return (
      <div style={{ padding: '24px 20px 28px' }}>
        <div style={{ ...mKick, textAlign: 'center', marginBottom: 8 }}>Input Data · Detailed</div>
        <h1 style={{ fontFamily: cm.display, fontSize: 38, lineHeight: 1.05, textAlign: 'center',
          margin: '0 0 10px', letterSpacing: '-0.01em' }}>A few questions.</h1>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: cm.ink70, textAlign: 'center',
          margin: '0 auto 24px', maxWidth: 320, textWrap: 'pretty' }}>
          Every input your results use, in plain language. Tap any “i” for the why; sensible defaults cover anything you skip.
        </p>

        {!hideReturning && (
          <div style={{ marginBottom: 26 }}>
            <window.CoverSaveLoadCallout params={params} setParams={setParams}
              prompt="Returning? Load your saved plan instead of re-entering." primary="load" compact />
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <div style={{ ...mKick, marginBottom: 8 }}>This plan is for</div>
          <MSegment value={partner} onChange={v => update('hasPartner', v)} />
        </div>

        <MGroup title="The people">
          <MStep field="currentAge" label="Your age" value={params.currentAge} onChange={v => update('currentAge', v)} min={20} max={85} />
          <MStep field="retireAge" label="You retire at" value={params.retireAge} onChange={v => update('retireAge', v)} min={params.currentAge + 1} max={80} />
          <MStep field="endAge" label="Plan to age" value={params.endAge} onChange={v => update('endAge', v)} min={params.retireAge + 1} max={110} />
          {partner && <MStep field="spouseAge" label="Partner's age" value={params.spouseAge} onChange={v => update('spouseAge', v)} min={20} max={85} />}
          {partner && <MStep field="spouseRetireAge" label="Partner retires at" value={params.spouseRetireAge} onChange={v => update('spouseRetireAge', v)} min={params.spouseAge + 1} max={80} />}
        </MGroup>

        <MGroup title="What you've saved">
          <MStep field="preTax" label={partner ? 'Your pre-tax (401k/IRA)' : 'Pre-tax (401k/IRA)'} value={params.userPreTax} step={10000} min={0} max={5000000} onChange={v => update('userPreTax', v)} format={money} />
          <MStep field="roth" label={partner ? 'Your Roth' : 'Roth'} value={params.userRoth} step={10000} min={0} max={3000000} onChange={v => update('userRoth', v)} format={money} />
          <MStep field="taxable" label="Taxable (joint)" value={params.taxable} step={10000} min={0} max={3000000} onChange={v => update('taxable', v)} format={money} />
          {partner && <MStep field="preTax" label="Partner's pre-tax" value={params.spousePreTax} step={10000} min={0} max={5000000} onChange={v => update('spousePreTax', v)} format={money} />}
          {partner && <MStep field="roth" label="Partner's Roth" value={params.spouseRoth} step={10000} min={0} max={3000000} onChange={v => update('spouseRoth', v)} format={money} />}
          <MToggle field="windfall" label="One-time windfall" value={params.enableWindfall} onChange={v => update('enableWindfall', v)} />
          {params.enableWindfall && <MStep field="windfallAmount" label="Amount" value={params.windfallAmount} step={10000} min={0} max={5000000} onChange={v => update('windfallAmount', v)} format={money} />}
          {params.enableWindfall && <MStep field="windfallAge" label="At age" value={params.windfallAge} min={params.currentAge} max={params.endAge} onChange={v => update('windfallAge', v)} />}
        </MGroup>

        <MGroup title="What comes in">
          <MStep field="salary" label={partner ? 'Your salary' : 'Salary'} value={params.salary} step={5000} min={0} max={1000000} onChange={v => update('salary', v)} format={money} />
          <MStep field="savingsRate" label="Your contribution rate" value={params.savingsRate} min={0} max={60} onChange={v => update('savingsRate', v)} suffix="%" />
          {params.currentAge >= 50 && <MStep field="priorYearWages" label="Your prior-year W-2 wages" value={params.priorYearWages} step={5000} min={0} max={1000000} onChange={v => update('priorYearWages', v)} format={money} />}
          <MStep field="employerContributionRate" label="Your employer adds" value={params.employerContributionRate} min={0} max={60} onChange={v => update('employerContributionRate', v)} suffix="%" />
          <MSelect field="savingsDest" label="Your contributions go to" value={params.savingsDest} onChange={v => update('savingsDest', v)}
            options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />
          {params.employerContributionRate > 0 && <MSelect field="employerContributionDest" label="Your employer contributions go to" value={params.employerContributionDest} onChange={v => update('employerContributionDest', v)}
            options={[{ v: 'pretax', label: 'Pre-tax (traditional)' }, { v: 'roth', label: 'Roth' }]} />}
          {partner && <MStep field="spouseSalary" label="Partner's salary" value={params.spouseSalary} step={5000} min={0} max={1000000} onChange={v => update('spouseSalary', v)} format={money} />}
          {partner && <MStep field="spouseSavingsRate" label="Partner's contribution rate" value={params.spouseSavingsRate} min={0} max={60} onChange={v => update('spouseSavingsRate', v)} suffix="%" />}
          {partner && params.spouseAge >= 50 && <MStep field="spousePriorYearWages" label="Partner's prior-year W-2 wages" value={params.spousePriorYearWages} step={5000} min={0} max={1000000} onChange={v => update('spousePriorYearWages', v)} format={money} />}
          {partner && <MStep field="spouseEmployerContributionRate" label="Partner's employer adds" value={params.spouseEmployerContributionRate} min={0} max={60} onChange={v => update('spouseEmployerContributionRate', v)} suffix="%" />}
          {partner && <MSelect field="spouseSavingsDest" label="Partner's contributions go to" value={params.spouseSavingsDest} onChange={v => update('spouseSavingsDest', v)}
            options={[{ v: 'pretax', label: 'Pre-tax (401k/IRA)' }, { v: 'roth', label: 'Roth' }, { v: 'split', label: 'Split 50/50' }]} />}
          {partner && params.spouseEmployerContributionRate > 0 && <MSelect field="spouseEmployerContributionDest" label="Partner's employer contributions go to" value={params.spouseEmployerContributionDest} onChange={v => update('spouseEmployerContributionDest', v)}
            options={[{ v: 'pretax', label: 'Pre-tax (traditional)' }, { v: 'roth', label: 'Roth' }]} />}
        </MGroup>

        <MGroup title="What goes out">
          <MStep field="spending" label="Other spending / yr" value={params.spending} step={5000} min={40000} max={250000} onChange={v => update('spending', v)} format={money} />
          <MStep field="healthcare" label="Healthcare / yr to 65" value={params.healthcare} step={1000} min={0} max={60000} onChange={v => update('healthcare', v)} format={money} />
          <MStep field="healthcare65" label="Healthcare / yr from 65" value={params.healthcare65} step={1000} min={0} max={60000} onChange={v => update('healthcare65', v)} format={money} />
          <MStep field="healthcareInflation" label="Healthcare inflation" value={params.healthcareInflation} step={0.5} min={0} max={12} onChange={v => update('healthcareInflation', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
          <MStep field="inflation" label="Inflation" value={params.inflation} step={0.1} min={0} max={8} onChange={v => update('inflation', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
          <MStep field="legacyGoal" label="Legacy goal" value={params.legacyGoal} step={25000} min={0} max={3000000} onChange={v => update('legacyGoal', v)} format={money} />
          <MToggle field="spendingReduction" label="Spend less later in life" value={params.enableSpendingReduction} onChange={v => update('enableSpendingReduction', v)} />
          {params.enableSpendingReduction && <MStep field="spendingReductionAge" label="Slow-down age" value={params.spendingReductionAge} min={params.retireAge} max={params.endAge} onChange={v => update('spendingReductionAge', v)} />}
          {params.enableSpendingReduction && <MStep field="spendingReductionPercent" label="Cut spending by" value={params.spendingReductionPercent} min={0} max={60} onChange={v => update('spendingReductionPercent', v)} suffix="%" />}
        </MGroup>

        <MGroup title="Guaranteed income">
          <MStep field="ssBenefit" label={partner ? 'Your SS / yr (at 67)' : 'SS / yr (at 67)'} value={params.ssBenefit} step={1000} min={0} max={80000} onChange={v => update('ssBenefit', v)} format={v => '$' + v.toLocaleString()} />
          <MStep field="ssClaimAge" label="You claim SS at" value={params.ssClaimAge} min={62} max={70} onChange={v => update('ssClaimAge', v)} />
          {partner && <MStep field="spouseSS" label="Partner's SS / yr" value={params.spouseSS} step={1000} min={0} max={80000} onChange={v => update('spouseSS', v)} format={v => '$' + v.toLocaleString()} />}
          {partner && <MStep field="spouseClaimAge" label="Partner claims at" value={params.spouseClaimAge} min={62} max={70} onChange={v => update('spouseClaimAge', v)} />}
          {partner && <MToggle field="enableSpousalBenefit" label="Apply SS spousal benefit" value={params.enableSpousalBenefit} onChange={v => update('enableSpousalBenefit', v)} />}
          <MStep field="pension" label="Your pension / yr" value={params.pension} step={1000} min={0} max={200000} onChange={v => update('pension', v)} format={v => '$' + v.toLocaleString()} />
          {params.pension > 0 && <MStep field="pensionStartAge" label="Your pension starts at" value={params.pensionStartAge} min={50} max={75} onChange={v => update('pensionStartAge', v)} />}
          {params.pension > 0 && <MToggle field="pensionCOLA" label="Your pension has COLA" value={params.enablePensionCOLA} onChange={v => update('enablePensionCOLA', v)} />}
          {partner && <MStep field="spousePension" label="Partner's pension / yr" value={params.spousePension} step={1000} min={0} max={200000} onChange={v => update('spousePension', v)} format={v => '$' + v.toLocaleString()} />}
          {partner && params.spousePension > 0 && <MStep field="pensionStartAge" label="Partner's pension starts at" value={params.spousePensionStartAge} min={50} max={75} onChange={v => update('spousePensionStartAge', v)} />}
          {partner && params.spousePension > 0 && <MToggle field="pensionCOLA" label="Partner's pension has COLA" value={params.enableSpousePensionCOLA} onChange={v => update('enableSpousePensionCOLA', v)} />}
          <MToggle field="partTime" label="Part-time / other income" value={params.enablePartTime} onChange={v => update('enablePartTime', v)} />
          {params.enablePartTime && <MStep field="partTimeIncome" label="Amount / yr" value={params.partTimeIncome} step={1000} min={0} max={200000} onChange={v => update('partTimeIncome', v)} format={v => '$' + v.toLocaleString()} />}
          {params.enablePartTime && <MStep field="partTimeStartAge" label="From age" value={params.partTimeStartAge} min={params.currentAge} max={params.endAge} onChange={v => update('partTimeStartAge', v)} />}
          {params.enablePartTime && <MStep field="partTimeEndAge" label="To age" value={params.partTimeEndAge} min={params.partTimeStartAge} max={params.endAge} onChange={v => update('partTimeEndAge', v)} />}
        </MGroup>

        <MGroup title="Your home">
          <MSelect field="housingType" label="In retirement you" value={params.housingType} onChange={v => update('housingType', v)}
            options={[{ v: 'own', label: 'Own your home' }, { v: 'rent', label: 'Rent' }]} />
          {params.housingType === 'own' && <MStep field="mortgagePayment" label="Mortgage P&I / mo" value={params.mortgagePayment} step={250} min={0} max={20000} onChange={v => update('mortgagePayment', v)} format={v => '$' + v.toLocaleString()} />}
          {params.housingType === 'own' && params.mortgagePayment > 0 && <MStep field="mortgageLastAge" label="Mortgage paid off at" value={params.mortgageLastAge} min={params.currentAge} max={params.endAge} onChange={v => update('mortgageLastAge', v)} />}
          {params.housingType === 'own' && <MStep field="propertyTax" label="Tax + home insurance / yr" value={params.propertyTax} step={500} min={0} max={60000} onChange={v => update('propertyTax', v)} format={v => '$' + v.toLocaleString()} />}
          {params.housingType === 'rent' && <MStep field="monthlyRent" label="Rent / mo" value={params.monthlyRent} step={250} min={0} max={20000} onChange={v => update('monthlyRent', v)} format={v => '$' + v.toLocaleString()} />}
        </MGroup>

        <MGroup title="Investments">
          <MStep field="stockAllocation" label="Stocks now" value={params.stockAllocation} min={0} max={100} onChange={v => update('stockAllocation', v)} suffix="%" />
          <MToggle field="glidePath" label="Glide path" value={params.enableGlidePath} onChange={v => update('enableGlidePath', v)} />
          {params.enableGlidePath && <MStep field="glidePathEndStock" label="Stocks by end" value={params.glidePathEndStock} min={0} max={params.stockAllocation} onChange={v => update('glidePathEndStock', v)} suffix="%" />}
          <MToggle field="rothConversion" label="Roth conversions" value={params.enableRothConversion} onChange={v => update('enableRothConversion', v)} />
          {params.enableRothConversion && <MStep field="rothConversionAmount" label="Amount / yr" value={params.rothConversionAmount} step={5000} min={0} max={500000} onChange={v => update('rothConversionAmount', v)} format={v => '$' + v.toLocaleString()} />}
          {params.enableRothConversion && <MStep field="rothConversionStartAge" label="From age" value={params.rothConversionStartAge} min={params.currentAge} max={params.endAge} onChange={v => update('rothConversionStartAge', v)} />}
          {params.enableRothConversion && <MStep field="rothConversionEndAge" label="To age" value={params.rothConversionEndAge} min={params.rothConversionStartAge} max={params.endAge} onChange={v => update('rothConversionEndAge', v)} />}
        </MGroup>

        {/* Advanced assumptions */}
        <div style={{ borderTop: `1px solid ${cm.ink}`, paddingTop: 22 }}>
          <button onClick={() => setAdv(o => !o)} style={{ width: '100%', display: 'flex',
            alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, background: 'none',
            border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <div>
              <div style={{ fontFamily: cm.display, fontSize: 22, letterSpacing: '-0.01em' }}>Advanced assumptions</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: cm.ink70, marginTop: 4 }}>
                Tax, market, and strategy settings. Most people leave these at our defaults.
              </div>
            </div>
            <span style={{ fontFamily: cm.body, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: cm.ink70, flex: '0 0 auto', paddingTop: 6, whiteSpace: 'nowrap' }}>
              {adv ? '▾ Hide' : '▸ 13'}</span>
          </button>
          {adv && (
            <div style={{ marginTop: 24 }}>
              <MSub title="Tax & residence">
                <MStep field="stateTaxRate" label="State tax rate" value={params.stateTaxRate} step={0.5} min={0} max={14} onChange={v => update('stateTaxRate', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
                <MStep field="taxableGainRatio" label="Taxable account gain %" value={params.taxableGainRatio} step={5} min={0} max={100} onChange={v => update('taxableGainRatio', v)} suffix="%" />
                <MStep field="bracketGrowth" label="Tax bracket growth" value={params.bracketGrowth} step={0.1} min={0} max={5} onChange={v => update('bracketGrowth', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
                <MToggle field="tcjaSunset" label="Assume higher future tax rates" value={params.enableTCJASunset} onChange={v => update('enableTCJASunset', v)} />
              </MSub>
              <MSub title="Market assumptions">
                <MStep field="stockReturn" label="Stock return" value={params.stockReturn} step={0.1} min={3} max={12} onChange={v => update('stockReturn', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
                <MStep field="bondReturn" label="Bond return" value={params.bondReturn} step={0.1} min={1} max={7} onChange={v => update('bondReturn', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
                <MStep field="stockVol" label="Stock volatility" value={params.stockVol} min={8} max={30} onChange={v => update('stockVol', v)} suffix="%" />
                <MStep field="bondVol" label="Bond volatility" value={params.bondVol} step={0.5} min={1} max={15} onChange={v => update('bondVol', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />
                <MStep field="numPaths" label="Simulation paths" value={params.numPaths} step={500} min={500} max={10000} onChange={v => update('numPaths', v)} format={v => v.toLocaleString()} />
              </MSub>
              <MSub title="Strategy">
                <MToggle field="guardrails" label="Spending guardrails" value={params.enableGuardrails} onChange={v => update('enableGuardrails', v)} />
                {params.enableGuardrails && <MStep field="guardrailCeiling" label="Ceiling (cut above)" value={params.guardrailCeiling} step={0.5} min={1} max={12} onChange={v => update('guardrailCeiling', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />}
                {params.enableGuardrails && <MStep field="guardrailFloor" label="Floor (raise below)" value={params.guardrailFloor} step={0.5} min={1} max={12} onChange={v => update('guardrailFloor', Math.round(v * 10) / 10)} format={v => v.toFixed(1)} suffix="%" />}
                {params.enableGuardrails && <MStep field="guardrailAdjustment" label="Adjustment size" value={params.guardrailAdjustment} step={1} min={1} max={30} onChange={v => update('guardrailAdjustment', v)} suffix="%" />}
              </MSub>
              <div style={{ fontSize: 11.5, lineHeight: 1.5, color: cm.ink50, textWrap: 'pretty', marginTop: 4 }}>
                Note: tax filing status follows your “Just me / Me + partner” choice (single vs. married-joint).
                State tax is one flat rate on income and gains — it does not apply state-specific Social Security or pension exemptions.
              </div>
            </div>
          )}
        </div>

        {/* Result card */}
        <div style={{ marginTop: 30, border: `1px solid ${cm.ink}`, background: cm.paperWarm, padding: '20px 22px' }}>
          {!dirty && (
            <div style={{ display: 'inline-block', marginBottom: 8, padding: '3px 8px',
              border: `1px solid ${cm.clay}`, color: cm.clay, background: cm.claySoft,
              fontFamily: cm.body, fontSize: 8.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Sample plan · not your numbers yet</div>
          )}
          <div style={{ ...mKick, marginBottom: 6 }}>{dirty ? 'Your number, so far' : 'Sample number, so far'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span style={{ fontFamily: cm.display, fontSize: 64, lineHeight: 0.9, color: vc, transition: 'color 300ms' }}>{results.successRate}</span>
            <span style={{ fontFamily: cm.display, fontSize: 22, color: cm.ink50 }}>/100</span>
            <span style={{ fontFamily: cm.display, fontSize: 22, color: vc, marginLeft: 'auto', transition: 'color 300ms' }}>{results.verdictWord}.</span>
          </div>
          <div style={{ fontSize: 12, color: cm.ink70, marginTop: 6 }}>
            {partner ? 'Modeled as a couple' : 'Modeled for one'} · {money(results.totalSavings)} saved today
          </div>
        </div>
      </div>
    );
  }

  // ── Shell ─────────────────────────────────────────────────────────────────
  function CoverMobile(props) {
    props = props || {};
    const [tab, setTab] = React.useState(props.initialTab || 'cover');
    // V19.1: suppress the "Returning? Load your saved plan" callout only for the one
    // visit right after Welcome → "Start a new plan" (props.freshStart). The moment the
    // user leaves the Questionnaire tab, treat any later visit as a normal return.
    const [suppressReturning, setSuppressReturning] = React.useState(!!props.freshStart);
    React.useEffect(() => { if (tab !== 'quiz' && suppressReturning) setSuppressReturning(false); }, [tab]);
    const [localParams, setLocalParams] = React.useState(ME.DEFAULTS); const params = props.params || localParams; const setParams = props.setParams || setLocalParams;
    const results = React.useMemo(() => ME.compute(params), [params]);
    const update = (k, v) => setParams(p => ({ ...p, [k]: v }));
    const vc = results.verdict === 'green' ? cm.sage : results.verdict === 'yellow' ? cm.amber : cm.clay;
    const partner = params.hasPartner;
    const dirty = JSON.stringify(params) !== JSON.stringify(ME.DEFAULTS);

    return (
      <div style={{ width: '100%', height: '100%', background: cm.paper, color: cm.ink,
        fontFamily: cm.body, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* masthead — the tab bar keeps this outside the scrolling <main>, so on the
            Questionnaire tab it doubles as a sticky live-score chip (V19.1). */}
        <header style={{ padding: '10px 20px 12px', borderBottom: `1px solid ${cm.ink}`, flex: '0 0 auto',
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ fontFamily: cm.display, fontSize: 24, lineHeight: 1 }}>Compass</div>
          {tab === 'quiz'
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px',
                border: `1px solid ${vc}`, whiteSpace: 'nowrap' }}>
                {!dirty && <span style={{ fontFamily: cm.body, fontSize: 7.5, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: cm.clay }}>Sample</span>}
                <span style={{ fontFamily: cm.display, fontSize: 16, color: vc, lineHeight: 1 }}>{results.successRate}</span>
                <span style={{ fontFamily: cm.display, fontSize: 9, color: cm.ink50 }}>/100</span>
              </div>
            : <div style={{ ...mKick, fontSize: 8.5 }}>The Retirement Issue · No. 5</div>}
        </header>

        <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {tab === 'cover'
            ? <CoverView results={results} vc={vc} partner={partner} dirty={dirty} goQuiz={() => setTab('quiz')} params={params} setParams={setParams} />
            : <QuizView params={params} update={update} setParams={setParams} vc={vc} partner={partner} results={results} hideReturning={suppressReturning} dirty={dirty} />}
        </main>

        {/* bottom tab nav */}
        <nav style={{ borderTop: `1px solid ${cm.ink}`, background: cm.paper, display: 'flex',
          padding: '0 0 20px', flex: '0 0 auto' }}>
          {[{ id: 'cover', label: 'Results' }, { id: 'quiz', label: 'Input Data' }].map(t => {
            const cta = !dirty && t.id === 'quiz' && tab !== 'quiz';
            return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, textAlign: 'center',
              padding: '14px 0 10px', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer', background: cta ? cm.sage : 'none', border: 'none', fontFamily: cm.body,
              color: cta ? cm.paper : (tab === t.id ? cm.ink : cm.ink50), fontWeight: (cta || tab === t.id) ? 600 : 400,
              borderTop: tab === t.id ? `2px solid ${cm.ink}` : '2px solid transparent', marginTop: -1 }}>
              {cta ? 'Start here →' : t.label}</button>
          );})}
        </nav>
      </div>
    );
  }

  window.CoverMobile = CoverMobile;
})();
