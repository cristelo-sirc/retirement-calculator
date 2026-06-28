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

// ── Balance over time, with confidence band ──────────────────────────────
function BalanceFanChart({ results, theme: th, width = 860, height = 320 }) {
  const path = results.path;
  if (!path || !path.length) return null;
  const W = width, H = height, pad = { l: 62, r: 20, t: 18, b: 36 };
  const ages = path.map(p => p.age);
  // Tallest balance across all paths, found by scanning (NOT Math.max(...spread) — spreading
  // hundreds of thousands of values at high path counts overflows the call stack and blanks the app).
  let maxBal = 1;
  results.paths.forEach(p => p.path.forEach(pt => { if (pt.balance > maxBal) maxBal = pt.balance; }));
  const minAge = ages[0], maxAge = ages[ages.length - 1];
  const xs = a => pad.l + ((a - minAge) / (maxAge - minAge)) * (W - pad.l - pad.r);
  const ys = b => pad.t + (1 - b / maxBal) * (H - pad.t - pad.b);
  const minByAge = {}, maxByAge = {};
  results.paths.forEach(p => p.path.forEach(pt => {
    if (minByAge[pt.age] == null || pt.balance < minByAge[pt.age]) minByAge[pt.age] = pt.balance;
    if (maxByAge[pt.age] == null || pt.balance > maxByAge[pt.age]) maxByAge[pt.age] = pt.balance;
  }));
  let upper = '', lower = '';
  ages.forEach((a, i) => { upper += (i === 0 ? 'M' : 'L') + xs(a) + ',' + ys(maxByAge[a]) + ' '; });
  for (let i = ages.length - 1; i >= 0; i--) lower += 'L' + xs(ages[i]) + ',' + ys(minByAge[ages[i]]) + ' ';
  let med = '';
  path.forEach((p, i) => { med += (i === 0 ? 'M' : 'L') + xs(p.age) + ',' + ys(p.balance) + ' '; });
  const retireX = xs(results.params.retireAge);
  return (
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
        {layer(d => d.ss + d.pension + d.other, d => d.need, 'url(#rc-port-hatch)', 'port')}
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
function ScenarioCompareChart({ params, theme: th, labelWidth = 168 }) {
  const q = window.MockEngine.quickSuccess;
  const base = React.useMemo(() => q(params), [params]);
  const rows = React.useMemo(() => {
    const lower = Math.round(params.spending * 0.9 / 1000) * 1000;
    return [
      { id: 'base', label: 'Your plan today', rate: base, note: 'as entered' },
      { id: 'delay', label: 'Retire 2 years later', rate: q({ ...params, retireAge: params.retireAge + 2 }), note: `at ${params.retireAge + 2}` },
      { id: 'spend', label: 'Spend 10% less', rate: q({ ...params, spending: lower }), note: `$${Math.round(lower / 1000)}k/yr` },
      { id: 'ss', label: 'Claim SS at 70', rate: q({ ...params, ssClaimAge: 70, spouseClaimAge: 70 }), note: 'delayed' },
      { id: 'all', label: 'All three together', rate: q({ ...params, retireAge: params.retireAge + 2, spending: lower, ssClaimAge: 70, spouseClaimAge: 70 }), note: 'combined' },
    ];
  }, [params, base]);
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

Object.assign(window, { BalanceFanChart, IncomeSourceChart, GlidePathChart, ScenarioCompareChart, rcVerdictColor });
