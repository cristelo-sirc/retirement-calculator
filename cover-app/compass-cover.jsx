// compass-cover.jsx — 07 · Cover
// Compass sibling pushed toward a magazine COVER: the hero art IS the success
// number, set enormous. Low density, lots of air. DM Serif Display.
//
// This file holds the Results (cover), Try Changes, and Charts screens plus shared
// display primitives. The Input Data questionnaire lives in cover-inputs.jsx (loaded
// after this one) and reuses window.cvStyles / window.CoverChrome / window.cvTheme.
// V19.3: Income & Odds retired — its glide path lives on Charts, its comparison
// bars on Try Changes; tabs renamed (internal screen ids unchanged).

const cvStyles = {
  paper: '#f6f2ea',
  paperWarm: '#efe9dc',
  ink: '#1a1815',
  // V19.9 (A5): ink70 was 0x99 (60% opacity) = ~4.48:1 on cream / ~4.33:1 on warm cream — under
  // the 4.5:1 AA floor on the warm background (the V19.8 change improved it but still fell short).
  // 0xa6 (65%) measures 5.28:1 / 5.11:1 — clears AA with margin on both. Shared by all four files.
  ink70: '#1a1815a6',
  ink50: '#1a181580',
  ink20: '#1a181530',
  rule: '#d8cfbe',
  sage: '#5a7a5e',
  sageSoft: '#cdd9ce',
  amber: '#b8843a',
  amberSoft: '#ead9bd',
  rust: '#a85c33',
  rustSoft: '#e6d0bd',
  clay: '#9c4b3e',
  claySoft: '#e6c7c0',
  display: '"DM Serif Display", Georgia, serif',
  body: 'Inter, -apple-system, system-ui, sans-serif',
};
window.cvStyles = cvStyles;

// V19.8: 10.5px/ink50 (~3.3:1 contrast) was too small/light for section labels;
// bumped to 12px and darkened to ink70 (~4.5:1).
const cvKicker = { fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.18em',
  textTransform: 'uppercase', color: cvStyles.ink70 };

// V18.10/V18.11: the headline metric counts a path as success only if it stays solvent AND
// finishes at/above the legacy goal. When a goal is set, "never running out" alone would
// mislead (the score can drop while the money never runs out), so the label discloses the
// goal. At goal 0 the wording is unchanged, preserving the original copy.
function cvChanceLabel(params) {
  var g = (params && params.legacyGoal) || 0;
  if (g > 0) return 'Chance of leaving ' + window.MockEngine.formatCurrency(g, { compact: true }) + ' or more';
  return 'Chance of never running out';
}
window.cvChanceLabel = cvChanceLabel;

// V19.6 (2c): the clarifier that rides in the headline metric's info tooltip. After the
// V19.6 scoring fix the headline literally counts only paths that never hit $0, so we
// explain that a mid-retirement dollar-zero event is a failure even if the plan recovers.
var CV_CHANCE_TOOLTIP = 'A future counts as a failure if your balance ever hits $0, even if it later recovers.';
window.CV_CHANCE_TOOLTIP = CV_CHANCE_TOOLTIP;

// V19.6 (2d): plain-English "danger age" line from results.depletionSummary. Returns null
// when too few futures deplete to be worth surfacing, so it self-hides on healthy plans.
function cvDangerLine(results) {
  var d = results && results.depletionSummary;
  if (!d || !d.firstDepletionMedianAge || d.everDepletedShare < 10) return null;
  return 'In the harder futures, the money first runs low around age ' + d.firstDepletionMedianAge + '.';
}
window.cvDangerLine = cvDangerLine;

// V19.1 (fixed post-audit): results.paycheck.atAge is the age the WHOLE household has
// stopped working — real-engine.js picks whichever partner's retirement lands LATER ON THE
// CALENDAR, using each partner's own current age as the clock. Two partners can both have
// "retire at 65" and still produce an atAge later than 65: if the partner is younger, her
// 65th birthday simply falls in a later calendar year than the user's own. Comparing the
// two retireAge NUMBERS (as the first cut of this fix did) misses that case entirely —
// live-tested on the shipped DEFAULTS scenario (65/65, atAge 67) and confirmed the note was
// silently blank. Comparing atAge itself against the user's own retireAge is what actually
// tracks the discrepancy, regardless of why it happened.
function cvPaycheckNote(params, atAge) {
  if (!params || !params.hasPartner || atAge == null) return '';
  if (atAge === params.retireAge) return '';
  // V19.9 (A6): a standalone sentence, not a mid-sentence em-dash interruption. Callers render
  // it as its own trailing sentence so the main line reads cleanly on a narrow phone column.
  return 'That’s when your partner also stops working — not your own retirement age.';
}
window.cvPaycheckNote = cvPaycheckNote;

// V19.9 (B3): friendly wording for the "we adjusted these to stay consistent" note the shell
// raises when normalizing an edit changed a dependent field (age ordering / out-of-range).
function cvAdjustMessage(notes) {
  if (!notes || !notes.length) return '';
  var labels = {
    currentAge: 'your age', retireAge: 'your retirement age', endAge: 'the plan-to age',
    spouseAge: "your partner's age", spouseRetireAge: "your partner's retirement age",
    ssClaimAge: 'your Social Security claim age', spouseClaimAge: "your partner's claim age",
    numPaths: 'the number of simulation paths', stockAllocation: 'your stock allocation',
    glidePathEndStock: 'your ending stock allocation',
  };
  var seen = [], out = [];
  notes.forEach(function (k) { if (seen.indexOf(k) === -1) { seen.push(k); out.push(labels[k] || k); } });
  return 'We adjusted ' + out.join(', ') + ' to keep your entries in order and within range.';
}
window.cvAdjustMessage = cvAdjustMessage;

// V19.7: shared data builders for the "Your Plan at a Glance" and "How It Could Play
// Out" blocks. Desktop (compass-cover.jsx) and mobile (cover-mobile.jsx) render these
// with their own styling but read the SAME derived strings here, so the two layouts
// can never disagree on a number or label (same discipline as cvChanceLabel/cvDangerLine).
// Everything comes straight from params + the compute() result — no recomputation.
function cvGlanceFacts(params, results) {
  var p = params || {}, r = results || {};
  var fmt = window.MockEngine.formatCurrency;
  var couple = !!p.hasPartner;
  var pc = r.paycheck || {};
  var startAge = p.currentAge;
  var facts = [
    { label: 'Retirement age',
      value: couple ? ('You ' + p.retireAge + ' · Spouse ' + p.spouseRetireAge) : ('Age ' + p.retireAge) },
    { label: 'Social Security',
      value: couple ? ('You at ' + p.ssClaimAge + ' · Spouse ' + p.spouseClaimAge) : ('Claim at ' + p.ssClaimAge),
      sub: 'claim age' },
    { label: 'Everyday spending', value: fmt(p.spending, { compact: true }) + '/yr',
      sub: 'excl. housing & healthcare' },
    { label: 'Safe to spend',
      value: (r.sustainableSpending != null ? '~' + fmt(r.sustainableSpending, { compact: true }) + '/yr' : 'None'),
      sub: (r.sustainableSpending != null ? 'estimate for ~90% success' : 'no level reaches ~90% here') },
    { label: 'Legacy goal',
      value: (p.legacyGoal || 0) > 0 ? fmt(p.legacyGoal, { compact: true }) : 'None set',
      sub: (p.legacyGoal || 0) > 0 ? 'target left at the end (future $)' : 'no target set' },
    { label: 'Plan horizon', value: 'Ages ' + startAge + '–' + p.endAge,
      sub: (p.endAge - startAge) + ' years' + (couple ? ' (your timeline)' : '') },
    { label: 'Monthly paycheck', value: fmt(pc.total || 0) + '/mo',
      sub: 'once fully retired' }
  ];
  return facts;
}
window.cvGlanceFacts = cvGlanceFacts;

// V19.7: the "How It Could Play Out" outcomes strip — the RANGE the Monte Carlo produces.
// rough/middle/strong are the P10/P50/P90 end balances (same percentiles the year-by-year
// table uses); longevity is the middle path's runway and the share of futures that ever ran
// low. Note (disclosed): at legacy-goal 0, everShare == 100 - successRate by definition; it's
// still worth stating plainly and diverges once a legacy goal is set.
function cvOutcomes(results) {
  var r = results || {};
  var fmt = window.MockEngine.formatCurrency;
  var d = r.depletionSummary || {};
  var endAge = r.params ? r.params.endAge : null;
  var everShare = Math.round(d.everDepletedShare || 0);
  // V19.9 (A2): base the longevity claim on the median path's LATCHING depletion facts, not on
  // runwayYears derived from the end-state depletionAge (which V19.5 clears on recovery). Reserve
  // "lasts the full plan" for a median path that never hit $0; if it depleted then recovered, say
  // BOTH facts instead of falsely claiming it lasted.
  var md = r.medianDepletion || {};
  var longevityLine;
  if (!md.everDepleted) {
    longevityLine = 'In the middle outcome, the money lasts the full plan' +
      (endAge != null ? ' (through age ' + endAge + ')' : '') + '.';
  } else if (md.recovered && md.firstDepletionAge != null) {
    longevityLine = 'In the middle outcome, the money runs out around age ' + md.firstDepletionAge +
      ', then later recovers on new income (a windfall or leftover guaranteed income).';
  } else if (md.firstDepletionAge != null) {
    longevityLine = 'In the middle outcome, the money runs out around age ' + md.firstDepletionAge + '.';
  } else {
    longevityLine = 'In the middle outcome, the money lasts the full plan' +
      (endAge != null ? ' (through age ' + endAge + ')' : '') + '.';
  }
  var riskLine;
  if (everShare <= 0) riskLine = 'No simulated future ever ran the balance down to $0.';
  else riskLine = everShare + '% of futures ran the balance to $0 at some point' +
    (d.firstDepletionMedianAge && everShare >= 10 ? ' — first around age ' + d.firstDepletionMedianAge : '') + '.';
  return {
    cards: [
      { key: 'rough', label: 'Rough markets', tag: 'Bottom 10%',
        value: fmt(r.roughLegacy || 0, { compact: true }),
        body: 'A poor run of returns leaves about this at the end.' },
      { key: 'middle', label: 'Middle', tag: 'Median',
        value: fmt(r.medianLegacy || 0, { compact: true }),
        body: 'The most typical outcome — for heirs or late-life care.' },
      { key: 'strong', label: 'Strong markets', tag: 'Top 10%',
        value: fmt(r.strongLegacy || 0, { compact: true }),
        body: 'A favorable run of returns leaves about this.' }
    ],
    longevityLine: longevityLine,
    riskLine: riskLine,
    // V19.9 (A4): these end balances are NOMINAL future dollars — not inflation-adjusted, so
    // they look larger than their real spending power. Disclose it and point to the Charts
    // table's today's-dollars toggle rather than silently letting them read as today's money.
    basisNote: 'These ending balances are in future dollars (the actual amount that year, not adjusted for inflation) — so they buy less than the same number today. The year-by-year table on Charts has a today’s-dollars toggle.'
  };
}
window.cvOutcomes = cvOutcomes;

// V19.7: desktop "Your Plan at a Glance" — replaces the old paycheck teaser beside the
// score. Compact 2-column fact grid; the monthly paycheck survives as one of the facts.
function CoverGlance({ params, results }) {
  const facts = window.cvGlanceFacts(params, results);
  return (
    <div style={{ borderLeft: `3px solid ${cvStyles.ink}`, paddingLeft: 16 }}>
      <div style={{ ...cvKicker, marginBottom: 12 }}>Your Plan at a Glance</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '13px 24px' }}>
        {facts.map(f => (
          <div key={f.label}>
            <div style={{ ...cvKicker, fontSize: 10.5, marginBottom: 3 }}>{f.label}</div>
            <div style={{ fontFamily: cvStyles.display, fontSize: 18, lineHeight: 1.12,
              letterSpacing: '-0.01em' }}>{f.value}</div>
            {f.sub && <div style={{ fontSize: 11.5, color: cvStyles.ink70, marginTop: 1 }}>{f.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
window.CoverGlance = CoverGlance;

// V19.7: desktop "How It Could Play Out" — replaces the redundant "Why the Verdict Reads
// That Way" band. Three range cards (P10/P50/P90 end balances) + a longevity/risk footer.
function CoverOutcomes({ results }) {
  const o = window.cvOutcomes(results);
  return (
    <div>
      <div style={{ ...cvKicker, marginBottom: 18 }}>How It Could Play Out</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36, marginBottom: 26 }}>
        {o.cards.map(c => (
          <div key={c.key}>
            <div style={{ ...cvKicker, fontSize: 11, marginBottom: 6 }}>{c.label}
              <span style={{ color: cvStyles.ink70, marginLeft: 6 }}>· {c.tag}</span></div>
            <div style={{ fontFamily: cvStyles.display, fontSize: 46, lineHeight: 1,
              letterSpacing: '-0.02em' }}>{c.value}</div>
            <div style={{ ...cvKicker, fontSize: 10.5, marginTop: 6 }}>at plan's end</div>
            <div style={{ fontSize: 13, color: cvStyles.ink70, lineHeight: 1.5, marginTop: 10 }}>{c.body}</div>
          </div>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${cvStyles.rule}`, paddingTop: 16, fontSize: 14,
        color: cvStyles.ink70, lineHeight: 1.6 }}>
        {o.longevityLine} {o.riskLine}
      </div>
      <div style={{ fontSize: 12, color: cvStyles.ink70, lineHeight: 1.55, marginTop: 10, fontStyle: 'italic' }}>
        {o.basisNote}
      </div>
    </div>
  );
}
window.CoverOutcomes = CoverOutcomes;

// V19.13 (UX-FIX-PLAN Release 2, item 2a): the >=1-point rule. A move only "counts" as
// improving your odds if its measured delta clears a full point — a card reading "+0" can be
// hiding a real but sub-point delta (e.g. +0.4), and "must buy a whole point" is the honest
// bar. This is the SINGLE source every surface that lists moves reads from (Results cards, the
// Cover teaser, Try Changes suggested-move buttons, the Try Changes comparison bars, and the
// mobile Results cards) so none of them can ever disagree about which moves qualify.
function cvQualifyingMoves(moves) {
  return (moves || []).filter(function (m) { return m.delta >= 1; })
    .sort(function (a, b) { return b.delta - a.delta; });
}
window.cvQualifyingMoves = cvQualifyingMoves;

var CV_MOVE_WORDS = { 1: 'One move', 2: 'Two moves', 3: 'Three moves' };
var CV_MOVE_VERB = { 1: 'buys', 2: 'buy', 3: 'buy' };
// "Three moves that buy better odds" / "One move that buys better odds" — the same sentence
// used as the desktop Cover teaser title and the mobile Results section heading, so the two
// layouts never disagree on wording (same discipline as cvChanceLabel/cvDangerLine).
function cvMovesTeaserTitle(count) {
  var words = CV_MOVE_WORDS[count] || (count + ' moves');
  var verb = CV_MOVE_VERB[count] || 'buy';
  return words + ' that ' + verb + ' better odds';
}
window.cvMovesTeaserTitle = cvMovesTeaserTitle;

// Small-caps kicker above the desktop "ranked" card list — same count, label-style casing.
function cvMovesRankedKicker(count) {
  if (count === 0) return 'Already at the Top';
  var n = { 1: 'One Move', 2: 'Two Moves', 3: 'Three Moves' }[count] || (count + ' Moves');
  return n + ', Ranked';
}
window.cvMovesRankedKicker = cvMovesRankedKicker;

// V19.13 (2a): honest empty-state copy when NO move clears the >=1-point bar. Decided with
// Cris 2026-07-10: keep it plain, no pointer to Safe-to-spend. Shared by the Results cards
// list, the mobile Results cards, and the Try Changes bars chart, so the ceiling story reads
// identically everywhere it appears.
var CV_NO_MOVES_MESSAGE = 'No move we test improves your odds — you’re already at the top of the range.';
window.CV_NO_MOVES_MESSAGE = CV_NO_MOVES_MESSAGE;

// V19.13 (2a): shown wherever per-move deltas appear alongside a combined "all together"
// figure, so a 98–99 reading (say +1/+2/+1 that can't sum past 100) doesn't look like
// broken math.
var CV_OVERLAP_FOOTNOTE = 'Moves overlap — together they can’t push past 100.';
window.CV_OVERLAP_FOOTNOTE = CV_OVERLAP_FOOTNOTE;

function cvVerdictColor(v) {
  return v === 'green' ? cvStyles.sage : v === 'yellow' ? cvStyles.amber
    : v === 'orange' ? cvStyles.rust : cvStyles.clay;
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
      schema: this.SCHEMA, version: '19.10', savedAt: new Date().toISOString(),
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
    var ME = window.MockEngine || {};
    var DEF = ME.DEFAULTS || {};
    var obj;
    try { obj = JSON.parse(text); }
    catch (e) { return { ok: false, error: 'That file isn’t valid JSON.' }; }
    var raw = (obj && obj.params && typeof obj.params === 'object') ? obj.params : obj;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, error: 'That doesn’t look like a Compass plan file.' };
    }
    var keys = Object.keys(DEF), hit = 0;
    for (var i = 0; i < keys.length; i++) if (raw[keys[i]] !== undefined) hit++;
    if (hit === 0) return { ok: false, error: 'No recognizable plan settings in that file.' };
    // Validate + clamp through the engine's normalizer (V18.10+) so an out-of-range or
    // wrong-typed file can never reach the simulation; missing fields fall back to DEFAULTS.
    var norm = ME.normalizeParams ? ME.normalizeParams(raw)
      : { params: Object.assign({}, DEF, raw), changed: false };
    var res = { ok: true, params: norm.params };
    if (norm.changed) res.note = 'Plan loaded. Some values were out of range and were adjusted to safe limits.';
    return res;
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
    if (r && r.ok) { setParams(r.params); setMsg(r.note || 'Plan loaded.'); } else { setMsg((r && r.error) || 'Could not load that file.'); }
  }); };
  return (
    <div style={{ textAlign: align || 'center' }}>
      <div style={{ display: 'flex', gap: 22, justifyContent: align === 'left' ? 'flex-start' : 'center', flexWrap: 'wrap' }}>
        <button onClick={save} style={link}>Save plan to a file ↓</button>
        <button onClick={load} style={link}>Load a saved plan ↑</button>
      </div>
      <div style={{ fontSize: 12, color: cvStyles.ink70, marginTop: 8 }}>
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
    if (r && r.ok) { setParams(r.params); setMsg({ text: r.note || 'Plan loaded.', ok: true }); }
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
  // V19.3: exact move deltas at the FULL path count, from the single computeMoves
  // source the Try Changes bars also read — the cards and the bars can never disagree.
  // The headline successRate is passed in so the base run isn't repeated.
  const moves = React.useMemo(() => window.MockEngine.computeMoves(params, results.successRate), [params, results]);
  // V19.13 (Release 2a): >=1-point rule, replacing the old >=0 filter — see cvQualifyingMoves.
  const moveCards = window.cvQualifyingMoves(moves.moves).slice(0, 3);
  const fmt = window.MockEngine.formatCurrency;
  const vc = cvVerdictColor(results.verdict);
  const dirty = JSON.stringify(params) !== JSON.stringify(window.MockEngine.DEFAULTS);
  // V19.1: Cover is read-only — tapping a move card opens Try Changes with that exact
  // move staged as an unpublished draft (props.onOpenRework, wired in the app shell).
  // Falls back to a plain nav if the shell didn't wire staging.
  const openMove = (leverId) => { if (props.onOpenRework) props.onOpenRework(leverId); else if (window._coverNav) window._coverNav('rework'); };

  return (
    <div style={{
      width: '100%', height: '100%', background: cvStyles.paper, color: cvStyles.ink,
      fontFamily: cvStyles.body, overflowY: 'auto', overflowX: 'hidden',
    }}>
      {/* V19.9 (A5): the masthead+nav is now a DIRECT child of the scroll container. It used to
          be nested inside the 900px hero <section>, so position:sticky only held WITHIN that
          section — once the reader scrolled into the Results article below, the nav scrolled off
          (contradicting the V19.1 "stays in view" note). Lifted out, its containing block is the
          full page, so it stays pinned the whole way down Results. */}
      {/* V19.15: the single ink rule now sits BELOW the tabs (matching CoverChrome and the
          handoff design) — the active tab's 2px underline lands on it. The old layout had
          the rule between the wordmark and the tab row. */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: cvStyles.paper,
        padding: '34px 64px 0', borderBottom: `1px solid ${cvStyles.ink}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: cvStyles.display, fontSize: 34, lineHeight: 1 }}>Compass</div>
          <div style={{ ...cvKicker }}>The Retirement Issue · May 2026 · No. 5</div>
        </div>
        <CoverNav active="cover" />
      </div>
      {/* ===== COVER ===== */}
      <section style={{ minHeight: 780, padding: '0 64px 40px', boxSizing: 'border-box',
        display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ marginTop: 16 }}>
          <CoverSaveLoadCallout params={params} setParams={setParams}
            prompt="Have a saved plan? Load it — or save this one to a file." primary="save" compact />
        </div>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '0.85fr 1.15fr',
          alignItems: 'center', gap: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
            <CoverLine kicker={dirty ? 'The Verdict' : 'Sample Verdict'}
              title={`${dirty ? 'Your plan' : 'This sample plan'} is ${results.verdictWord.toLowerCase()}.`}
              body={dirty ? results.verdictBlurb : 'These are example numbers, not yours yet. Enter your data and these results fill in with your real plan.'}
              accent={vc} big />
            <CoverGlance params={params} results={results} />
            {/* V19.13 (Release 2a): the teaser hides entirely when no move clears the
                >=1-point bar — a ceiling plan has nothing to tease here. */}
            {moveCards.length > 0 && (
              <CoverLine kicker="Inside"
                title={window.cvMovesTeaserTitle(moveCards.length)}
                body="Small, specific changes — and exactly how many points each is worth." />
            )}
            {!dirty && (
              <button onClick={() => window._coverNav && window._coverNav('quiz')}
                style={{ alignSelf: 'flex-start', padding: '14px 26px', background: cvStyles.ink, color: cvStyles.paper,
                  border: 'none', cursor: 'pointer', fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.14em',
                  textTransform: 'uppercase', fontWeight: 600 }}>
                Enter your data →</button>
            )}
          </div>

          <div style={{ textAlign: 'center', position: 'relative' }}>
            {!dirty && (
              <div style={{ display: 'inline-block', marginBottom: 14, padding: '5px 12px',
                border: `1px solid ${cvStyles.clay}`, color: cvStyles.clay, background: cvStyles.claySoft,
                fontFamily: cvStyles.body, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                Sample plan · not your numbers yet</div>
            )}
            <div style={{ ...cvKicker, marginBottom: -6, display: 'inline-flex', alignItems: 'center',
              gap: 6, justifyContent: 'center' }}>
              {cvChanceLabel(params)}
              {window.InfoTip && <window.InfoTip text={CV_CHANCE_TOOLTIP} label="how the score counts" theme={cvStyles} />}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
              {/* V19.9 (A6): clamp the giant score so it scales down toward the 769px breakpoint
                  (where a fixed 360px dominated the two-column layout) but still reads 360px on a
                  wide desktop. */}
              <div style={{ fontFamily: cvStyles.display, fontSize: 'clamp(200px, 26vw, 360px)', lineHeight: 0.82,
                color: cvStyles.ink, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums',
                transition: 'color 300ms' }}>{results.successRate}</div>
              <div style={{ fontFamily: cvStyles.display, fontSize: 'clamp(40px, 5vw, 64px)', color: cvStyles.ink50,
                marginTop: 36 }}>/100</div>
            </div>
            <div style={{ width: 220, height: 5, background: vc, margin: '4px auto 14px',
              transition: 'background 300ms' }} />
            <div style={{ fontFamily: cvStyles.display, fontSize: 56, color: vc, lineHeight: 1,
              transition: 'color 300ms' }}>{results.verdictWord}.</div>
            {cvDangerLine(results) && (
              <div style={{ fontFamily: cvStyles.body, fontSize: 14, color: cvStyles.ink70,
                marginTop: 16, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                {cvDangerLine(results)}
              </div>
            )}
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
              {results.paycheck.fullyRetired === false && (
                <p style={{ fontSize: 13, lineHeight: 1.55, color: cvStyles.clay, marginTop: 12,
                  border: `1px solid ${cvStyles.clay}`, background: cvStyles.claySoft, padding: '8px 12px' }}>
                  Heads up: one of you is still working at the end of this plan, so there isn’t a
                  fully-retired year to show here — this snapshot still includes wages. Extend the plan
                  horizon past both retirement ages to see a fully-retired paycheck.
                </p>
              )}
              <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, marginTop: 18 }}>
                Social Security arrives first, inflation-protected and certain. The rest is sold from
                your portfolio each year — the part a bad market sequence can squeeze.
              </p>
            </div>
          </div>

          <div style={{ paddingBottom: 56, borderBottom: `1px solid ${cvStyles.rule}`, marginBottom: 56 }}>
            <CoverOutcomes results={results} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 56,
            alignItems: 'start' }}>
            <div>
              <div style={{ ...cvKicker, marginBottom: 18 }}>{window.cvMovesRankedKicker(moveCards.length)}</div>
              {/* V19.13 (Release 2a): honest empty state when no move clears +1 — replaces the
                  ranked cards + footer instead of showing three "+0" cards. */}
              {moveCards.length === 0 ? (
                <div style={{ border: `1px solid ${cvStyles.rule}`, background: cvStyles.paper,
                  padding: '18px 20px', fontSize: 14, lineHeight: 1.6, color: cvStyles.ink70 }}>
                  {window.CV_NO_MOVES_MESSAGE}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {moveCards.map(l => (
                      <div key={l.id} role="button" tabIndex={0} onClick={() => openMove(l.id)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMove(l.id); } }}
                        style={{
                        display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center',
                        background: cvStyles.paper, width: '100%', cursor: 'pointer',
                        border: `1px solid ${cvStyles.ink}`, padding: '16px 20px' }}>
                        <div>
                          <div style={{ fontFamily: cvStyles.display, fontSize: 21, lineHeight: 1.15 }}>{l.title}</div>
                          <div style={{ fontSize: 12.5, color: cvStyles.ink70, marginTop: 3 }}>{l.detail}</div>
                          <div style={{ fontSize: 10.5, color: cvStyles.sage, marginTop: 7, fontWeight: 600,
                            letterSpacing: '0.08em', textTransform: 'uppercase' }}>Draft this on Try Changes →</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: cvStyles.display, fontSize: 30, color: cvStyles.sage,
                            lineHeight: 1 }}>+{l.delta}</div>
                          <div style={{ ...cvKicker, fontSize: 10.5 }}>points</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12.5, color: cvStyles.ink70, marginTop: 14 }}>
                    Tap a move to draft it on <strong style={{ color: cvStyles.ink70 }}>Try Changes</strong> —
                    nothing changes here until you choose to publish it.
                  </div>
                </>
              )}
            </div>
            <div style={{ border: `1px solid ${cvStyles.ink}`, padding: '22px 24px',
              background: cvStyles.paper, display: 'flex', flexDirection: 'column',
              justifyContent: 'center', gap: 14 }}>
              <div style={{ ...cvKicker }}>Want to try something else?</div>
              {/* V19.14 (Release 3, item 1): "Every dial lives on Try Changes" overclaimed —
                  Try Changes has a curated handful of levers (four for a couple, three solo),
                  not every possible dial. Reworded to say what it actually is, and made the
                  count conditional so it's never wrong for either household type. */}
              <div style={{ fontFamily: cvStyles.display, fontSize: 22, lineHeight: 1.3 }}>
                {params.hasPartner ? 'Four' : 'Three'} of your biggest levers live on Try Changes.
              </div>
              <div style={{ fontSize: 13, color: cvStyles.ink70, lineHeight: 1.6 }}>
                Retirement age, spending{params.hasPartner ? ', and both Social Security claim ages' : ', and your Social Security claim age'} —
                draft any of them there and watch the odds move. Nothing here changes until you publish it.
              </div>
              <button onClick={() => window._coverNav && window._coverNav('rework')}
                style={{ alignSelf: 'flex-start', padding: '12px 22px', background: cvStyles.ink,
                  color: cvStyles.paper, border: 'none', cursor: 'pointer', fontFamily: cvStyles.body,
                  fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600 }}>
                Open Try Changes →</button>
            </div>
          </div>

          <div style={{ ...cvKicker, textAlign: 'center', marginTop: 48 }}>V19.15</div>
        </div>
      </section>
    </div>
  );
}

function CoverLine({ kicker, title, body, accent, big }) {
  return (
    <div style={{ borderLeft: `3px solid ${accent || cvStyles.ink}`, paddingLeft: 16 }}>
      <div style={{ fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: cvStyles.ink70, marginBottom: 6 }}>{kicker}</div>
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
    { key: 'wages', label: 'Wages', val: paycheck.wages, bg: cvStyles.clay, fg: cvStyles.paper },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11.5,
        letterSpacing: '0.06em', textTransform: 'uppercase', color: cvStyles.ink70, flexWrap: 'wrap', gap: 8 }}>
        {segs.map(s => <span key={s.key}>{s.label} {Math.round((s.val / total) * 100)}%</span>)}
      </div>
      {paycheck.taxes > 0.5 && (
        <div style={{ fontSize: 12, color: cvStyles.ink70, marginTop: 8 }}>
          Total includes {fmt(paycheck.taxes)}/mo for taxes; {fmt(paycheck.spending)}/mo is what you actually spend
          {paycheck.saved > 0.5 ? `; ${fmt(paycheck.saved)}/mo of leftover guaranteed income is saved back to your portfolio` : ''}.
        </div>
      )}
    </div>
  );
}

// (CoverReason removed in V19.7 — the "Why the Verdict Reads That Way" band it fed was
//  replaced by CoverOutcomes / "How It Could Play Out".)

// V19.13 (UX-FIX-PLAN Release 2, item 2b): tick-mark intervals per field type — SS claim ages
// get a tick every year (the whole 62-70 range is meaningful one year at a time), the spending
// dial ticks every $25k, and the retire-at dial scales its interval to how wide its range is
// (2 years on a short runway, 5+ on a long one) so the ticks stay legible instead of a wall of
// hairlines. "kind" is caller-supplied since the same min/max span means different things for
// different fields (SS's 8-year span wants yearly ticks; retire-at's rarely does).
function cvSliderTicks(min, max, kind) {
  var span = max - min;
  var step = kind === 'money' ? 25000
    : kind === 'ss' ? 1
    : (span <= 10 ? 2 : span <= 30 ? 5 : 10);
  var ticks = [];
  for (var v = min; v <= max; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] !== max) ticks.push(max);
  return ticks;
}

function cvSliderEndLabel(val, kind) {
  return kind === 'money' ? window.MockEngine.formatCurrency(val, { compact: true }) : String(val);
}

// V19.13 (Release 2b): the bare track had no min/max labels, no tick marks, and a static
// readout while the questionnaire's identical-looking big numbers are click-to-type — an
// inconsistency Cris flagged. Fix: end labels under the track, tick marks via the native
// <input list=datalist> mechanism, and the readout is now a real text input reusing
// numeric-entry.js's parse/validate/clamp rules (same commit-on-Enter-or-blur behavior as the
// questionnaire's NumericStepper, minus the +/- buttons a drag control doesn't need).
function CoverSlider({ label, value, onChange, min, max, step = 1, display, accent, last, kind }) {
  // V19.11: aria-labelledby ties the range input to the visible label text; aria-valuetext
  // substitutes the already-formatted display string (e.g. "$120,000") for the raw numeric
  // value a screen reader would otherwise read out. Both kept intact below.
  const labelId = React.useId();
  const listId = React.useId();
  const precision = window.NumericEntry ? window.NumericEntry.stepPrecision(step) : 0;
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(String(value));
  const ignoreBlurRef = React.useRef(false);
  const ticks = React.useMemo(() => cvSliderTicks(min, max, kind), [min, max, kind]);

  const commit = () => {
    const parsed = window.NumericEntry.validateDraft(draft, { min, max, precision });
    setEditing(false);
    if (!parsed.ok) { setDraft(String(value)); return; }
    setDraft(String(parsed.value));
    if (parsed.value !== value) onChange(parsed.value);
  };

  const beginEditing = (input) => {
    if (editing) return;
    ignoreBlurRef.current = false;
    setEditing(true);
    setDraft(String(value));
    window.requestAnimationFrame(() => input.select());
  };

  return (
    <div style={{ marginBottom: last ? 0 : 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 8 }}>
        <span id={labelId} style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
          color: cvStyles.ink70 }}>{label}</span>
        <input type="text" inputMode={precision > 0 ? 'decimal' : 'numeric'}
          aria-label={`${label}, type an exact value`} title="Click or tap to type an exact value"
          value={editing ? draft : String(display)}
          onFocus={e => beginEditing(e.currentTarget)}
          onClick={e => beginEditing(e.currentTarget)}
          onChange={e => { setEditing(true); setDraft(e.target.value); }}
          onBlur={() => {
            if (ignoreBlurRef.current) { ignoreBlurRef.current = false; return; }
            commit();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); ignoreBlurRef.current = true; commit(); e.currentTarget.blur(); }
            if (e.key === 'Escape') {
              ignoreBlurRef.current = true; setEditing(false); setDraft(String(value)); e.currentTarget.blur();
            }
          }}
          style={{ fontFamily: cvStyles.display, fontSize: 24, color: cvStyles.ink,
            fontVariantNumeric: 'tabular-nums', textAlign: 'right', border: 'none',
            borderBottom: editing ? `1px solid ${cvStyles.ink}` : '1px solid transparent',
            background: editing ? 'rgba(26,24,21,0.045)' : 'transparent', outline: 'none',
            width: '9ch', padding: '0 2px', cursor: 'text' }} />
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-labelledby={labelId} aria-valuetext={String(display)} list={listId}
        style={{ width: '100%', accentColor: accent, color: accent }} />
      <datalist id={listId}>{ticks.map(t => <option key={t} value={t} />)}</datalist>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10.5,
        color: cvStyles.ink50 }}>
        <span>{cvSliderEndLabel(min, kind)}</span>
        <span>{cvSliderEndLabel(max, kind)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// SHARED CHROME + NAV
// ============================================================================
// V19.15: two labeled zones (design_handoff_input_chapters) — "Step 1 · Enter" holds
// Input Data, "Step 2 · Your plan" holds the three plan tabs, separated by a hairline.
// Results is prominent by full-ink color only; bold + underline is reserved strictly for
// the ACTIVE tab. Internal ids are unchanged so window._coverNav routing keeps working.
// The V19.3 "Start here" CTA pill (emphasizeQuiz) is retired — the Step 1 kicker plus the
// hero's own "Enter your data" button carry that job now. Tabs stay real <button>s with
// aria-current (V19.9 A5).
function CoverNav({ active }) {
  const navKicker = { fontFamily: cvStyles.body, fontSize: 10, letterSpacing: '0.16em',
    textTransform: 'uppercase', color: cvStyles.ink70 };
  const tabBtn = (id, label, prominent) => (
    <button key={id} type="button" onClick={() => window._coverNav && window._coverNav(id)}
      aria-current={active === id ? 'page' : undefined}
      style={{ cursor: 'pointer', background: 'transparent', border: 'none', fontFamily: cvStyles.body,
        fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', padding: '0 2px 8px',
        color: (active === id || prominent) ? cvStyles.ink : cvStyles.ink70,
        fontWeight: active === id ? 600 : 400,
        borderBottom: active === id ? `2px solid ${cvStyles.ink}` : '2px solid transparent' }}>
      {label}</button>
  );
  return (
    <nav style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 44, paddingTop: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={navKicker}>Step 1 · Enter</span>
        {tabBtn('quiz', 'Input Data')}
      </div>
      <span aria-hidden="true" style={{ width: 1, height: 30, background: cvStyles.rule, marginBottom: 6 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <span style={navKicker}>Step 2 · Your plan</span>
        <div style={{ display: 'flex', gap: 24 }}>
          {tabBtn('cover', 'Results', true)}
          {tabBtn('rework', 'Try Changes')}
          {tabBtn('chart', 'Charts')}
        </div>
      </div>
    </nav>
  );
}

// V19.15: `fill` mode for the chapter wizard — a fixed-viewport flex column (masthead on
// top, children own the remaining height with their internal scroll + pinned footer). The
// other three screens keep the default page-scroll behavior, byte-for-byte. In fill mode
// the bottom version-tag strip is omitted (the wizard shows its version in the chapter
// rail instead, keeping an on-screen stamp for cache verification during live tests).
function CoverChrome({ active, children, bg, tag, rightExtra, fill }) {
  return (
    <div style={fill
      ? { width: '100%', height: '100%', background: bg || cvStyles.paper, color: cvStyles.ink,
          fontFamily: cvStyles.body, display: 'flex', flexDirection: 'column', overflow: 'hidden' }
      : { width: '100%', height: '100%', background: bg || cvStyles.paper, color: cvStyles.ink,
          fontFamily: cvStyles.body, overflowY: 'auto', overflowX: 'hidden' }}>
      <div style={{ padding: '30px 64px 0', background: cvStyles.paper,
        borderBottom: `1px solid ${cvStyles.ink}`,
        ...(fill ? { flex: '0 0 auto' } : { position: 'sticky', top: 0, zIndex: 5 }) }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ fontFamily: cvStyles.display, fontSize: 30, lineHeight: 1 }}>Compass</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ ...cvKicker }}>The Retirement Issue · May 2026 · No. 5</div>
            {rightExtra}
          </div>
        </div>
        <CoverNav active={active} />
      </div>
      {fill
        ? <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{children}</div>
        : children}
      {!fill && <div style={{ ...cvKicker, textAlign: 'center', padding: '36px 0 48px' }}>{tag}</div>}
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
  const [sc, setSc] = React.useState({ retireAge: params.retireAge, spending: params.spending, ssClaimAge: params.ssClaimAge, spouseClaimAge: params.spouseClaimAge });
  const proposed = React.useMemo(() => window.MockEngine.compute({ ...params, ...sc }), [params, sc]);
  const fmt = window.MockEngine.formatCurrency;
  const delta = proposed.successRate - base.successRate;
  const vc = cvVerdictColor(proposed.verdict);
  const theme = cvTheme(vc);
  const setField = (k, v) => setSc(s => ({ ...s, [k]: v }));
  const resetField = (k) => setSc(s => ({ ...s, [k]: params[k] }));
  const resetAll = () => setSc({ retireAge: params.retireAge, spending: params.spending, ssClaimAge: params.ssClaimAge, spouseClaimAge: params.spouseClaimAge });
  const commit = () => setParams(p => ({ ...p, ...sc }));
  const anyChange = sc.retireAge !== params.retireAge || sc.spending !== params.spending || sc.ssClaimAge !== params.ssClaimAge || sc.spouseClaimAge !== params.spouseClaimAge;
  // V19.3: the comparison bars (formerly Income & Odds) live here now, fed by the same
  // full-path-count computeMoves source as the Results cards. They compare the FILED
  // plan's moves (params), not the draft above — the draft has its own score at left.
  const movesData = React.useMemo(() => window.MockEngine.computeMoves(params, base.successRate, { includeCombined: true }), [params, base]);
  // V19.1: honest sample-state labeling, matching Cover/Questionnaire.
  const dirty = JSON.stringify(params) !== JSON.stringify(window.MockEngine.DEFAULTS);
  const filedNoun = dirty ? 'filed plan' : 'sample plan';
  const filedShort = dirty ? 'as filed' : 'as sample';

  // Idempotent lever targets — pressing again just re-sets the same value.
  // V19.9 (A3): match the Results/Try-Changes cards exactly — hide the delay lever when the
  // 80-cap leaves no room to move, and move ONLY the partner(s) actually claiming before 70
  // (a spouse already at 70 is never silently touched). Same applicability as computeMoves().
  const _delayedRet = Math.min(80, params.retireAge + 2);
  const _userEarly = params.ssClaimAge < 70;
  const _spouseEarly = params.hasPartner && params.spouseClaimAge < 70;
  const _ssTitle = (_userEarly && _spouseEarly) ? 'Claim SS at 70 (both of you)'
    : _userEarly ? 'You claim SS at 70' : 'Spouse claims SS at 70';
  const _possibleLevers = [
    ...(_delayedRet > params.retireAge ? [{ id: 'delay',
      title: 'Retire ' + (_delayedRet - params.retireAge) + (_delayedRet - params.retireAge === 1 ? ' year later' : ' years later'),
      apply: () => setField('retireAge', _delayedRet), active: sc.retireAge === _delayedRet }] : []),
    { id: 'spend', title: 'Spend 10% less', apply: () => setField('spending', Math.round(params.spending * 0.9 / 1000) * 1000), active: sc.spending === Math.round(params.spending * 0.9 / 1000) * 1000 },
    ...((_userEarly || _spouseEarly) ? [{ id: 'ss', title: _ssTitle,
      apply: () => setSc(s => ({ ...s, ...(_userEarly ? { ssClaimAge: 70 } : {}), ...(_spouseEarly ? { spouseClaimAge: 70 } : {}) })),
      active: (!_userEarly || sc.ssClaimAge === 70) && (!_spouseEarly || sc.spouseClaimAge === 70) }] : []),
  ];
  // V19.13 (Release 2a): "possible" isn't the same bar as "worth showing" — a lever that's
  // applicable but buys under a point (e.g. a plan already near 100) shouldn't be offered as
  // if it helps. Filter to the same >=1-point set the cards and bars use, keyed off the
  // FILED plan's own move deltas (movesData, computed above) so id-for-id this always matches.
  const _qualifyingIds = window.cvQualifyingMoves(movesData.moves).map(function (m) { return m.id; });
  const levers = _possibleLevers.filter(function (l) { return _qualifyingIds.indexOf(l.id) !== -1; });

  // V19.1: a move card tapped on Cover arrives here with props.stageLever set to that
  // card's id. Reuse the exact same "apply" a Rework suggested-move button would run, so
  // staging is always identical to tapping the button by hand. The parent clears the
  // one-shot flag afterward so a later visit to Rework doesn't re-stage it.
  React.useEffect(() => {
    if (!props.stageLever) return;
    const match = levers.find(l => l.id === props.stageLever);
    if (match) match.apply();
    if (props.onLeverStaged) props.onLeverStaged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.stageLever]);

  const Chip = ({ k, fromTxt, toTxt }) => (sc[k] !== params[k]
    ? <div style={{ marginTop: 8 }}><DiffChip from={fromTxt} to={toTxt} onReset={() => resetField(k)} theme={theme} /></div>
    : null);

  return (
    <CoverChrome active="rework" tag="V19.15">
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cvKicker, textAlign: 'center', marginBottom: 10 }}>Try Changes · live</div>
        <h1 style={{ fontFamily: cvStyles.display, fontSize: 44, textAlign: 'center', margin: '0 0 8px',
          letterSpacing: '-0.01em' }}>Move a dial. Watch the number.</h1>
        {!dirty && (
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <span style={{ display: 'inline-block', padding: '5px 12px',
              border: `1px solid ${cvStyles.clay}`, color: cvStyles.clay, background: cvStyles.claySoft,
              fontFamily: cvStyles.body, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              Sample plan · not your numbers yet</span>
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 14, color: cvStyles.ink70, margin: '0 auto 36px', maxWidth: 520, lineHeight: 1.6 }}>
          Every change is just a draft — this {filedNoun} ({base.successRate}/100) stays put until you publish.
          A tag shows exactly what you've changed, and resets it in one click.
          {!dirty && ' These are example numbers — enter your data for your real plan.'}
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
              {delta > 0 ? `↑ ${delta} better than ${filedShort} (${base.successRate})`
                : delta < 0 ? `↓ ${Math.abs(delta)} worse than ${filedShort} (${base.successRate})`
                : `Same ${filedShort} (${base.successRate})`}
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
                min={params.currentAge + 1} max={80} display={sc.retireAge} accent={vc} kind="retire" />
              <Chip k="retireAge" fromTxt={params.retireAge} toTxt={sc.retireAge} />
              <div style={{ height: 16 }} />
              <CoverSlider label="Other spending / yr" value={sc.spending} onChange={v => setField('spending', v)}
                min={40000} max={250000} step={5000} display={fmt(sc.spending)} accent={vc} kind="money" />
              <Chip k="spending" fromTxt={fmt(params.spending)} toTxt={fmt(sc.spending)} />
              <div style={{ height: 16 }} />
              <CoverSlider label={params.hasPartner ? 'You claim SS at' : 'Claim SS at'} value={sc.ssClaimAge} onChange={v => setField('ssClaimAge', v)}
                min={62} max={70} display={sc.ssClaimAge} accent={vc} last={!params.hasPartner} kind="ss" />
              <Chip k="ssClaimAge" fromTxt={params.ssClaimAge} toTxt={sc.ssClaimAge} />
              {params.hasPartner && <>
                <div style={{ height: 16 }} />
                <CoverSlider label="Spouse claims SS at" value={sc.spouseClaimAge} onChange={v => setField('spouseClaimAge', v)}
                  min={62} max={70} display={sc.spouseClaimAge} accent={vc} last kind="ss" />
                <Chip k="spouseClaimAge" fromTxt={params.spouseClaimAge} toTxt={sc.spouseClaimAge} />
              </>}
              <button onClick={commit} disabled={!anyChange} style={{ width: '100%', marginTop: 22, padding: '14px',
                background: anyChange ? cvStyles.ink : cvStyles.ink20, color: cvStyles.paper, border: 'none',
                fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase',
                cursor: anyChange ? 'pointer' : 'default', fontWeight: 600 }}>Publish as your new plan</button>
            </div>
            {/* V19.13 (Release 2a): a lever that's applicable but buys under a point is filtered
                out above (levers); when NONE qualify, hide the whole block instead of offering
                buttons that don't move the number — same "hide when empty" treatment as the
                Cover teaser. */}
            {levers.length > 0 && (
              <>
                <div style={{ ...cvKicker, marginBottom: 12 }}>Suggested moves · tap to set</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {levers.map(l => (
                    <button key={l.id} onClick={l.apply} style={{ display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 14, textAlign: 'left',
                      background: l.active ? cvStyles.sageSoft : cvStyles.paperWarm,
                      border: `1px solid ${l.active ? cvStyles.sage : cvStyles.rule}`, cursor: 'pointer',
                      padding: '12px 16px', transition: 'background 150ms' }}>
                      <span style={{ fontFamily: cvStyles.display, fontSize: 18 }}>{l.title}</span>
                      <span style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase',
                        color: l.active ? cvStyles.sage : cvStyles.ink70, fontWeight: 600 }}>
                        {l.active ? '✓ Applied' : 'Set'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* V19.3: the moves, side by side — moved here from the retired Income & Odds
            screen, so the place you compare moves is the place you try them. */}
        <div style={{ marginTop: 56, paddingTop: 40, borderTop: `1px solid ${cvStyles.rule}` }}>
          <div style={{ ...cvKicker, marginBottom: 10 }}>The moves, side by side</div>
          <h2 style={{ fontFamily: cvStyles.display, fontSize: 36, margin: '0 0 8px', letterSpacing: '-0.01em', lineHeight: 1.05 }}>
            What each change is worth.
          </h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 620, margin: '0 0 28px' }}>
            Every bar is measured against this {filedNoun} at the full path count — the exact same
            numbers as the move cards on Results. Tap a suggested move above to draft one.
          </p>
          <ScenarioCompareChart data={movesData} theme={theme} labelWidth={176}
            baseLabel={dirty ? 'Your plan today' : 'This sample plan'} />
        </div>
      </div>
    </CoverChrome>
  );
}

// ============================================================================
// ④ CHARTS — balance fan + income by source + glide path + year-by-year table
// ============================================================================
function CoverCharts(props) {
  props = props || {}; const [localParams] = React.useState(window.MockEngine.DEFAULTS); const params = props.params || localParams;
  const results = React.useMemo(() => window.MockEngine.compute(params), [params]);
  const fmt = window.MockEngine.formatCurrency;
  const theme = cvTheme(cvVerdictColor(results.verdict));
  // V19.1: honest sample-state labeling, matching Cover/Questionnaire/Rework.
  const dirty = JSON.stringify(params) !== JSON.stringify(window.MockEngine.DEFAULTS);
  return (
    <CoverChrome active="chart" bg={cvStyles.paperWarm} tag="V19.15">
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ ...cvKicker, marginBottom: 10 }}>The Charts · {(results.numPaths || 0).toLocaleString()} paths</div>
        {!dirty && (
          <div style={{ display: 'inline-block', marginBottom: 14, padding: '5px 12px',
            border: `1px solid ${cvStyles.clay}`, color: cvStyles.clay, background: cvStyles.claySoft,
            fontFamily: cvStyles.body, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
            Sample plan · not your numbers yet</div>
        )}
        <h1 style={{ fontFamily: cvStyles.display, fontSize: 52, margin: '0 0 8px',
          letterSpacing: '-0.01em', lineHeight: 1.05 }}>Where the money goes,<br />year by year.</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 600, margin: '0 0 32px' }}>
          The bold line is the median outcome — half of futures finish above it, half below. The band
          around it spans the 10th to 90th percentile: a lucky run of markets versus an unlucky one.
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

        {/* V19.3: glide path — moved here from the retired Income & Odds screen
            (per Cris: after the paycheck chart, before the summary stats). */}
        <div style={{ marginTop: 56 }}>
          <div style={{ ...cvKicker, marginBottom: 8 }}>How your mix shifts</div>
          <h2 style={{ fontFamily: cvStyles.display, fontSize: 34, margin: '0 0 8px', letterSpacing: '-0.01em' }}>
            Stocks now, steadier later.
          </h2>
          {/* V19.14 (Release 3, item 2): this used to always claim "your glide path eases out
              of stocks," even with the glide-path toggle off — when the chart actually draws a
              flat line. Copy now describes whichever is true. */}
          <p style={{ fontSize: 14.5, lineHeight: 1.6, color: cvStyles.ink70, maxWidth: 620, margin: '0 0 24px' }}>
            {params.enableGlidePath
              ? 'Your glide path eases out of stocks as you age, so a crash late in retirement does less damage when you can least afford it.'
              : `Your mix stays flat at ${params.stockAllocation}% stocks for the whole plan. Turn on the glide path in Input Data if you'd rather ease out of stocks as you age.`}
          </p>
          <GlidePathChart results={results} theme={theme} width={960} height={240} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, marginTop: 48,
          paddingTop: 32, borderTop: `1px solid ${cvStyles.rule}` }}>
          <CoverBigStat big={`${results.successRate}`} unit="/100" label="Plans that succeed" />
          <CoverBigStat big={fmt(results.medianLegacy, { compact: true })} label={`Median legacy at ${params.endAge}`} />
          <CoverBigStat big={results.sustainableSpending != null ? '~' + fmt(results.sustainableSpending, { compact: true }) : 'None'} label="Safe to spend / yr (est.)" />
          <CoverBigStat big={`${results.runwayYears}`} unit="yrs" label="Runway in retirement" />
        </div>

        {/* V19.2: year-by-year table — collapsed expander at the bottom (per Cris).
            Three storyline views (Average / Rough / Strong markets) + dollars toggle. */}
        <div style={{ marginTop: 48, paddingTop: 36, borderTop: `1px solid ${cvStyles.rule}` }}>
          <div style={{ ...cvKicker, marginBottom: 14 }}>The year-by-year numbers</div>
        </div>
      </div>
      {/* V19.14 (Release 3, item 4): the table clipped its own END BALANCE column — its most
          important one — even at 1901px, because it inherited this screen's 1040px reading-
          column cap while there was real headroom outside it. Cris's decision: no column drops.
          Break just the table out to its own wider 1280px cap (same centering, own wrapper) so
          all 9 columns fit; verified comfortable at 1280px too. The table's own horizontal
          scroll (inside YearByYearTable) remains the fallback below that width. Charts is
          desktop-only (V19.4), so this breakout has no mobile-width concern. */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 32px 64px' }}>
        <YearByYearTable results={results} theme={theme} />
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
      <div style={{ fontFamily: cvStyles.body, fontSize: 12, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: cvStyles.ink70, marginTop: 8 }}>{label}</div>
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
          gap: 16, borderBottom: `1px solid ${cvStyles.ink}`, paddingBottom: 14, marginBottom: 'clamp(28px,6vw,52px)' }}>
          {/* V19.9 (A6): keep the wordmark from butting into the issue label at ~390px, and stop
              "No. 5" wrapping — the gap plus a shrink-to-fit, nowrap issue label fixes both. */}
          <div style={{ fontFamily: cvStyles.display, fontSize: 'clamp(28px,7vw,34px)', lineHeight: 1, flex: '0 0 auto' }}>Compass</div>
          <div style={{ ...cvKicker, fontSize: 'clamp(9px,2.4vw,12px)', letterSpacing: '0.12em',
            textAlign: 'right', whiteSpace: 'nowrap', flex: '0 1 auto' }}>The Retirement Issue · No. 5</div>
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
              : 'Answer a few questions and your results fill in with your real numbers — about 3–5 minutes. Your answers stay in this browser unless you save them to a file.'}
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
        <div style={{ ...cvKicker, marginTop: 'clamp(28px,6vw,48px)' }}>V19.15</div>
      </div>
    </div>
  );
}

Object.assign(window, { CoverDesktop, CoverAdjust, CoverCharts, CoverWelcome });
