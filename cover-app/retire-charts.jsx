// retire-charts.jsx — Shared, themeable charts for Compass + Cover.
// Every chart takes a `theme` object so it adopts each concept's palette + type:
//   { paper, paperWarm, ink, ink70, ink50, rule, sage, sageSoft, amber,
//     amberSoft, clay, claySoft, display, body, accent }
//
// Charts:
//   • BalanceFanChart      — median balance + good/bad market band over time
//   • IncomeSourceChart    — stacked: where each retirement dollar comes from
//   • GlidePathChart       — stock vs bond mix over time
//   • ScenarioCompareChart — success odds across what-if moves, horizontal bars

function rcVerdictColor(rate, th) {
  return rate >= 90 ? th.sage : rate >= 70 ? th.amber : th.clay;
}

// Linear-interpolated percentile of an ASCENDING-sorted array.
function rcPercentile(sortedAsc, p) {
  const n = sortedAsc.length;
  if (!n) return 0;
  const idx = (n - 1) * p, lo = Math.floor(idx), hi = Math.ceil(idx);
  return lo === hi ? sortedAsc[lo] : sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

// ── Balance over time, with a P10–P90 band and the P50 (median) line ──────
function BalanceFanChart({ results, theme: th, width = 860, height = 320 }) {
  const path = results.path;
  if (!path || !path.length) return null;
  const W = width, H = height, pad = { l: 62, r: 20, t: 18, b: 36 };
  const ages = path.map(p => p.age);
  // True per-year percentiles across ALL paths: collect each age's balances, sort, then
  // read P10/P50/P90. Built by scanning + per-age sort (NOT Math.max(...spread), which
  // overflows the call stack at high path counts and blanks the app).
  const byAge = {};
  results.paths.forEach(p => p.path.forEach(pt => { (byAge[pt.age] || (byAge[pt.age] = [])).push(pt.balance); }));
  ages.forEach(a => { if (byAge[a]) byAge[a].sort((x, y) => x - y); });
  const p10 = {}, p50 = {}, p90 = {};
  ages.forEach(a => { const arr = byAge[a] || [0]; p10[a] = rcPercentile(arr, 0.10); p50[a] = rcPercentile(arr, 0.50); p90[a] = rcPercentile(arr, 0.90); });
  // Scale to the 90th percentile (not the absolute max) so rare extreme paths don't flatten the chart.
  let maxBal = 1;
  ages.forEach(a => { if (p90[a] > maxBal) maxBal = p90[a]; });
  const minAge = ages[0], maxAge = ages[ages.length - 1];
  const xs = a => pad.l + ((a - minAge) / (maxAge - minAge)) * (W - pad.l - pad.r);
  const ys = b => pad.t + (1 - Math.min(b, maxBal) / maxBal) * (H - pad.t - pad.b);
  let upper = '', lower = '';
  ages.forEach((a, i) => { upper += (i === 0 ? 'M' : 'L') + xs(a) + ',' + ys(p90[a]) + ' '; });
  for (let i = ages.length - 1; i >= 0; i--) lower += 'L' + xs(ages[i]) + ',' + ys(p10[ages[i]]) + ' ';
  let med = '';
  ages.forEach((a, i) => { med += (i === 0 ? 'M' : 'L') + xs(a) + ',' + ys(p50[a]) + ' '; });
  const retireX = xs(results.params.retireAge);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: th.paper,
        border: `1px solid ${th.ink}` }}>
        <path d={upper + lower + 'Z'} fill={th.sageSoft} opacity="0.6" />
        <path d={med} fill="none" stroke={th.ink} strokeWidth="2.5" />
        <line x1={retireX} x2={retireX} y1={pad.t} y2={H - pad.b} stroke={th.clay}
          strokeDasharray="5 4" strokeWidth="1.5" />
        <text x={retireX + 7} y={pad.t + 13} fontSize="11" fill={th.clay} fontFamily={th.display}>Retirement</text>
        {[0, 0.5, 1].map(f => {
          const v = maxBal * f;
          return (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} stroke={th.rule} />
              <text x={pad.l - 8} y={ys(v) + 4} textAnchor="end" fontSize="10.5" fill={th.ink50}
                fontFamily={th.body}>${Math.round(v / 1000)}k</text>
            </g>
          );
        })}
        {[minAge, results.params.retireAge, results.params.endAge].map(a => (
          <text key={a} x={xs(a)} y={H - 13} textAnchor="middle" fontSize="10.5" fill={th.ink70}
            fontFamily={th.body}>Age {a}</text>
        ))}
      </svg>
      <div style={{ fontSize: 11, color: th.ink50, marginTop: 8, fontFamily: th.body, lineHeight: 1.5 }}>
        Bold line = median (P50) balance at each age. Shaded band = 10th–90th percentile across {(results.paths.length || 0).toLocaleString()} paths;
        four in five futures land inside it. The axis tops out at the 90th percentile, so rarer high outcomes run off the top.
      </div>
    </div>
  );
}

// ── Where each retirement dollar comes from (stacked area) ────────────────
function IncomeSourceChart({ results, theme: th, width = 860, height = 300 }) {
  const data = results.incomeByYear;
  if (!data || !data.length) return null;
  const W = width, H = height, pad = { l: 62, r: 16, t: 18, b: 34 };
  const maxNeed = Math.max(...data.map(d => d.need), 1);
  const minAge = data[0].age, maxAge = data[data.length - 1].age;
  const xs = a => pad.l + ((a - minAge) / (maxAge - minAge || 1)) * (W - pad.l - pad.r);
  const ys = v => pad.t + (1 - v / maxNeed) * (H - pad.t - pad.b);
  // cumulative layers, bottom → top: SS, pension+other, portfolio
  const layer = (loFn, hiFn, fill, key) => {
    let up = '', lo = '';
    data.forEach((d, i) => { up += (i === 0 ? 'M' : 'L') + xs(d.age) + ',' + ys(hiFn(d)) + ' '; });
    for (let i = data.length - 1; i >= 0; i--) lo += 'L' + xs(data[i].age) + ',' + ys(loFn(data[i])) + ' ';
    return <path key={key} d={up + lo + 'Z'} fill={fill} />;
  };
  const hasGuar = data.some(d => d.pension + d.other > 0);
  const hasWages = data.some(d => (d.wages || 0) > 0);
  const Legend = ({ c, label, hatch }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: th.ink70 }}>
      <span style={{ width: 12, height: 12, background: hatch ? th.paper : c,
        backgroundImage: hatch ? `repeating-linear-gradient(45deg, ${th.clay}, ${th.clay} 1.5px, transparent 1.5px, transparent 4px)` : 'none',
        border: `1px solid ${hatch ? th.clay : c}` }} />
      {label}
    </span>
  );
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: th.paper,
        border: `1px solid ${th.ink}` }}>
        <defs>
          <pattern id="rc-port-hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={th.paperWarm} />
            <line x1="0" y1="0" x2="0" y2="6" stroke={th.clay} strokeWidth="1.4" opacity="0.55" />
          </pattern>
        </defs>
        {layer(() => 0, d => d.ss, th.sage, 'ss')}
        {layer(d => d.ss, d => d.ss + d.pension + d.other, th.amber, 'pen')}
        {layer(d => d.ss + d.pension + d.other, d => Math.min(d.need, d.ss + d.pension + d.other + (d.wages || 0)), th.clay, 'wage')}
        {layer(d => Math.min(d.need, d.ss + d.pension + d.other + (d.wages || 0)), d => d.need, 'url(#rc-port-hatch)', 'port')}
        {[0, 0.5, 1].map(f => {
          const v = maxNeed * f;
          return (
            <g key={f}>
              <line x1={pad.l} x2={W - pad.r} y1={ys(v)} y2={ys(v)} stroke={th.rule} opacity="0.5" />
              <text x={pad.l - 8} y={ys(v) + 4} textAnchor="end" fontSize="10.5" fill={th.ink50}
                fontFamily={th.body}>${Math.round(v / 1000)}k</text>
            </g>
          );
        })}
        {[minAge, Math.round((minAge + maxAge) / 2), maxAge].map(a => (
          <text key={a} x={xs(a)} y={H - 12} textAnchor="middle" fontSize="10.5" fill={th.ink70}
            fontFamily={th.body}>Age {a}</text>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 22, marginTop: 12, fontFamily: th.body, flexWrap: 'wrap' }}>
        <Legend c={th.sage} label="Social Security" />
        {hasGuar && <Legend c={th.amber} label="Pension & other income" />}
        {hasWages && <Legend c={th.clay} label="Wages (still working)" />}
        <Legend hatch label="Drawn from your portfolio" />
      </div>
    </div>
  );
}

// ── Stock vs bond mix over time ───────────────────────────────────────────
function GlidePathChart({ results, theme: th, width = 860, height = 240 }) {
  const data = results.allocByYear;
  if (!data || !data.length) return null;
  const W = width, H = height, pad = { l: 48, r: 16, t: 18, b: 34 };
  const minAge = data[0].age, maxAge = data[data.length - 1].age;
  const xs = a => pad.l + ((a - minAge) / (maxAge - minAge || 1)) * (W - pad.l - pad.r);
  const ys = v => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  let stockUp = '', stockLo = '';
  data.forEach((d, i) => { stockUp += (i === 0 ? 'M' : 'L') + xs(d.age) + ',' + ys(d.stock) + ' '; });
  stockLo = `L${xs(maxAge)},${ys(0)} L${xs(minAge)},${ys(0)} Z`;
  let line = '';
  data.forEach((d, i) => { line += (i === 0 ? 'M' : 'L') + xs(d.age) + ',' + ys(d.stock) + ' '; });
  const retireX = xs(results.params.retireAge);
  const first = data[0], last = data[data.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', background: th.amberSoft,
        border: `1px solid ${th.ink}` }}>
        {/* bonds fill the whole field (background tint); stocks overlay from the floor */}
        <path d={stockUp + stockLo} fill={th.sage} opacity="0.85" />
        <path d={line} fill="none" stroke={th.ink} strokeWidth="2" />
        <line x1={retireX} x2={retireX} y1={pad.t} y2={H - pad.b} stroke={th.ink}
          strokeDasharray="5 4" strokeWidth="1.2" opacity="0.6" />
        <text x={retireX + 6} y={pad.t + 12} fontSize="10.5" fill={th.ink70} fontFamily={th.body}>Retirement</text>
        {[0, 50, 100].map(v => (
          <g key={v}>
            <text x={pad.l - 8} y={ys(v) + 4} textAnchor="end" fontSize="10.5" fill={th.ink50}
              fontFamily={th.body}>{v}%</text>
          </g>
        ))}
        <text x={xs(first.age) + 4} y={ys(first.stock / 2) + 4} fontSize="12" fill={th.paper}
          fontFamily={th.display}>{first.stock}% stocks</text>
        <text x={xs(maxAge)} y={ys(95)} textAnchor="end" fontSize="11" fill={th.ink70}
          fontFamily={th.body}>{100 - last.stock}% bonds at {maxAge}</text>
        {[minAge, results.params.retireAge, maxAge].map(a => (
          <text key={a} x={xs(a)} y={H - 12} textAnchor="middle" fontSize="10.5" fill={th.ink70}
            fontFamily={th.body}>Age {a}</text>
        ))}
      </svg>
    </div>
  );
}

// ── Success odds across what-if moves (horizontal bars) ───────────────────
// V19.3: no longer computes its own odds. Takes precomputed `data` from
// window.MockEngine.computeMoves() — the SAME full-path-count runs that feed the
// Results move cards — so a move can never show two different values on two screens.
function ScenarioCompareChart({ data, theme: th, labelWidth = 168, baseLabel }) {
  if (!data) return null;
  const base = data.base;
  const rows = [
    { id: 'base', label: baseLabel || 'Your plan today', rate: base, note: 'as entered' },
    ...data.moves.map(m => ({ id: m.id, label: m.title, rate: m.rate, note: m.note })),
    ...(data.combined ? [{ id: 'all', label: 'All together', rate: data.combined.rate, note: 'combined' }] : []),
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontFamily: th.body }}>
      {rows.map(r => {
        const c = rcVerdictColor(r.rate, th);
        const delta = r.rate - base;
        return (
          <div key={r.id} style={{ display: 'grid', gridTemplateColumns: `${labelWidth}px 1fr 96px`,
            alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: th.ink, fontWeight: r.id === 'base' ? 600 : 400 }}>{r.label}</div>
              <div style={{ fontSize: 10.5, color: th.ink50, letterSpacing: '0.04em' }}>{r.note}</div>
            </div>
            <div style={{ position: 'relative', height: 26, background: th.paperWarm,
              border: `1px solid ${th.rule}` }}>
              <div style={{ position: 'absolute', inset: 0, width: `${r.rate}%`, background: c,
                transition: 'width 400ms cubic-bezier(.2,.7,.3,1), background 300ms' }} />
              {r.id !== 'base' && (
                <div style={{ position: 'absolute', top: -3, bottom: -3, left: `${base}%`,
                  borderLeft: `1.5px dashed ${th.ink}`, opacity: 0.5 }} />
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontFamily: th.display, fontSize: 22, color: th.ink,
                fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{r.rate}</span>
              {r.id !== 'base' && delta !== 0 && (
                <span style={{ fontSize: 11.5, fontWeight: 600, color: delta > 0 ? th.sage : th.clay }}>
                  {delta > 0 ? `+${delta}` : delta}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 11, color: th.ink50, marginTop: 4, paddingLeft: labelWidth + 14 }}>
        Dashed line marks your plan’s current odds ({base}/100).
      </div>
    </div>
  );
}

// ── V19.2: Year-by-year table — three coherent "storyline" views ───────────
// Collapsed by default (an expander at the bottom of the Projection screen).
// Views come from results.yearTables (adapter): Average = one steady vol=0 run;
// Rough/Strong = the actual simulated paths at the 10th/90th percentile rank of
// final outcome. Every row reconciles — this doubles as an engine spot-check.
function YearByYearTable({ results, theme: th }) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState('average');
  const [todays, setTodays] = React.useState(false);
  const yt = results.yearTables;
  if (!yt) return null;
  const params = results.params;
  const fmt$ = n => (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString();
  const VIEWS = [
    { id: 'average', label: 'Average markets', blurb: 'Markets earn their long-run average every year — the baseline.' },
    { id: 'rough', label: 'Rough markets', blurb: 'A bad run of luck. Only 1 in 10 futures turns out worse than this.' },
    { id: 'strong', label: 'Strong markets', blurb: 'A good run of luck. Only 1 in 10 futures turns out better.' }
  ];
  const v = yt[view] || yt.average;
  const rows = v.rows || [];
  const inflRate = (params.inflation || 0) / 100;
  // Today's-$ deflators: cash flows and the start balance use the row's own cumulative
  // inflation; the END balance sits on the NEXT birthday, so it uses the next row's
  // factor — that keeps "End balance" equal to the next row's "Start balance" in BOTH
  // dollar modes (the spot-check property must survive the toggle).
  const endFactor = i => (rows[i + 1] ? rows[i + 1].inflation : rows[i].inflation * (1 + inflRate));
  const d = (val, f) => (todays ? val / f : val);
  const segBtn = (active) => ({
    padding: '9px 14px', cursor: 'pointer', fontFamily: th.body, fontSize: 12,
    letterSpacing: '0.04em', border: `1px solid ${th.ink}`, marginLeft: -1,
    background: active ? th.ink : th.paper, color: active ? th.paper : th.ink
  });
  const thStyle = {
    position: 'sticky', top: 0, zIndex: 1, background: th.paper, textAlign: 'right',
    padding: '8px 10px', fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase',
    color: th.ink70, borderBottom: `1.5px solid ${th.ink}`, fontFamily: th.body, whiteSpace: 'nowrap'
  };
  const tdStyle = {
    textAlign: 'right', padding: '6px 10px', fontSize: 12.5, color: th.ink,
    fontVariantNumeric: 'tabular-nums', fontFamily: th.body, whiteSpace: 'nowrap'
  };
  const COLS = [
    { key: 'age', label: 'Age', left: true },
    { key: 'startBalance', label: 'Start balance' },
    { key: 'wages', label: 'Wages' },
    { key: 'ss', label: 'Social Security' },
    { key: 'pensionOther', label: 'Pension & other' },
    { key: 'withdrawals', label: 'Portfolio withdrawals' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'taxes', label: 'Taxes' },
    { key: 'endBalance', label: 'End balance' }
  ];
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        display: 'block', padding: '14px 22px', cursor: 'pointer', background: 'transparent',
        border: `1px solid ${th.ink}`, color: th.ink, fontFamily: th.body, fontSize: 12.5,
        letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        See the year-by-year numbers &darr;
      </button>
    );
  }
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex' }}>
          {VIEWS.map(o => (
            <button key={o.id} onClick={() => setView(o.id)} style={segBtn(view === o.id)}>{o.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex' }}>
          {[{ id: false, label: 'Future dollars' }, { id: true, label: "Today's dollars" }].map(o => (
            <button key={String(o.id)} onClick={() => setTodays(o.id)} style={segBtn(todays === o.id)}>{o.label}</button>
          ))}
        </div>
        <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', background: 'transparent',
          border: 'none', cursor: 'pointer', color: th.ink50, fontFamily: th.body, fontSize: 12 }}>
          Hide table &uarr;
        </button>
      </div>
      <div style={{ fontSize: 13, color: th.ink70, fontFamily: th.body, margin: '0 0 14px', lineHeight: 1.5 }}>
        {VIEWS.find(o => o.id === view).blurb}
      </div>
      {v.depletionAge != null && (
        <div style={{ padding: '10px 14px', marginBottom: 14, border: `1px solid ${th.clay}`,
          background: th.claySoft, color: th.clay, fontFamily: th.body, fontSize: 13.5 }}>
          In this storyline, the money runs out at age {v.depletionAge}.
        </div>
      )}
      <div style={{ maxHeight: 430, overflowY: 'auto', border: `1px solid ${th.ink}`, background: th.paper }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} style={{ ...thStyle, textAlign: c.left ? 'left' : 'right' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const broke = !r.solvent;
              const retireYear = r.age === params.retireAge;
              const rowBg = broke ? th.claySoft : (i % 2 ? th.paperWarm : th.paper);
              return (
                <tr key={r.age} style={{ background: rowBg,
                  borderTop: retireYear ? `2px solid ${th.ink}` : `1px solid ${th.rule}` }}>
                  <td style={{ ...tdStyle, textAlign: 'left', fontWeight: retireYear ? 700 : 400 }}>
                    {r.age}{retireYear ? ' · retire' : ''}
                  </td>
                  <td style={tdStyle}>{fmt$(d(r.startBalance, r.inflation))}</td>
                  <td style={tdStyle}>{r.wages ? fmt$(d(r.wages, r.inflation)) : '—'}</td>
                  <td style={tdStyle}>{r.ss ? fmt$(d(r.ss, r.inflation)) : '—'}</td>
                  <td style={tdStyle}>{r.pensionOther ? fmt$(d(r.pensionOther, r.inflation)) : '—'}</td>
                  <td style={tdStyle}>{r.withdrawals ? fmt$(d(r.withdrawals, r.inflation)) : '—'}</td>
                  <td style={tdStyle}>{r.expenses ? fmt$(d(r.expenses, r.inflation)) : '—'}</td>
                  <td style={tdStyle}>{r.taxes ? fmt$(d(r.taxes, r.inflation)) : '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt$(d(r.endBalance, endFactor(i)))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: th.ink50, marginTop: 10, fontFamily: th.body, lineHeight: 1.6 }}>
        Each row covers the year that begins at that age; End balance is measured on the following
        birthday and matches the next row's Start balance. Wages are take-home pay after retirement
        contributions. Expenses combine everyday spending, housing, and healthcare. Portfolio
        withdrawals include required minimum distributions.
        {view === 'average' && (' The Average view usually finishes above the projection chart’s median line: '
          + 'a steady ride beats a bumpy one with the same average return when you’re withdrawing.')}
        {todays && ' Today’s dollars remove assumed inflation so amounts are comparable to your budget now.'}
        {params.enableWindfall && ` A windfall of ${fmt$(params.windfallAmount)} arrives at age ${params.windfallAge} (it appears in the balance, not as income).`}
      </div>
    </div>
  );
}

Object.assign(window, { BalanceFanChart, IncomeSourceChart, GlidePathChart, ScenarioCompareChart, YearByYearTable, rcVerdictColor });
