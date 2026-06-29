// numeric-entry.js — V18.14 shared parsing and stepping rules for questionnaire inputs.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NumericEntry = api;
})(typeof window !== 'undefined' ? window : null, function () {
  function stepPrecision(step) {
    var text = String(step == null ? 1 : step).toLowerCase();
    if (text.indexOf('e-') !== -1) return Number(text.split('e-')[1]) || 0;
    var point = text.indexOf('.');
    return point === -1 ? 0 : text.length - point - 1;
  }

  function decimalPlaces(text) {
    var point = text.indexOf('.');
    return point === -1 ? 0 : text.length - point - 1;
  }

  function parseDraft(raw, precision) {
    var cleaned = String(raw == null ? '' : raw)
      .trim()
      .replace(/\u2212/g, '-')
      .replace(/[$,%\s]/g, '');

    if (!cleaned || !/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(cleaned)) {
      return { ok: false, reason: 'number' };
    }
    if (precision != null && decimalPlaces(cleaned) > precision) {
      return { ok: false, reason: 'precision' };
    }

    var value = Number(cleaned);
    return isFinite(value) ? { ok: true, value: value } : { ok: false, reason: 'number' };
  }

  function validateDraft(raw, options) {
    options = options || {};
    var parsed = parseDraft(raw, options.precision);
    if (!parsed.ok) return parsed;
    if (parsed.value < options.min || parsed.value > options.max) {
      return { ok: false, reason: 'range', value: parsed.value };
    }
    return parsed;
  }

  function adjustedValue(value, change, options) {
    options = options || {};
    var precision = options.precision == null ? 0 : options.precision;
    var next = Number((Number(value) + Number(change)).toFixed(precision));
    return Math.min(options.max, Math.max(options.min, next));
  }

  return {
    adjustedValue: adjustedValue,
    parseDraft: parseDraft,
    stepPrecision: stepPrecision,
    validateDraft: validateDraft
  };
});
