// Sweet Spot is an independent reference band.
// It does not participate in main zone classification
// and does not override the primary zone result.

const defaultZonesConfig = [
  { id: 'z1', label: 'Zone 1', desc: 'Active Recovery', min: 0.00, max: 0.55, target: 0.45, colorVar: 'z1' },
  { id: 'z2', label: 'Zone 2', desc: 'Endurance', min: 0.55, max: 0.75, target: 0.655, colorVar: 'z2' },
  { id: 'z3', label: 'Zone 3', desc: 'Tempo', min: 0.75, max: 0.90, target: 0.83, colorVar: 'z3' },
  { id: 'ss', label: 'Sweet Spot', desc: 'Sweet Spot', min: 0.88, max: 0.94, target: 0.91, colorVar: 'ss' },
  { id: 'z4', label: 'Zone 4', desc: 'Threshold', min: 0.90, max: 1.05, target: 0.98, colorVar: 'z4' },
  { id: 'z5', label: 'Zone 5', desc: 'VO2 Max', min: 1.05, max: 1.20, target: 1.13, colorVar: 'z5' },
  { id: 'z6', label: 'Zone 6', desc: 'Anaerobic', min: 1.20, max: 1.50, target: 1.355, colorVar: 'z6' },
  { id: 'z7', label: 'Zone 7', desc: 'Neuromuscular', min: 1.50, max: null, target: 1.65, colorVar: 'z7' }
];

const defaultHrPercentConfig = {
  max: {
    z1: { min: null, max: 65 },
    z2: { min: 66, max: 75 },
    z3: { min: 76, max: 85 },
    z4: { min: 86, max: 95 },
    z5: { min: 96, max: null }
  },
  lthr: {
    z1: { min: null, max: 68 },
    z2: { min: 69, max: 83 },
    z3: { min: 84, max: 94 },
    z4: { min: 95, max: 105 },
    z5: { min: 106, max: null }
  }
};

const hrZoneDefs = [
  { num: 1, label: 'Zone 1', desc: 'Active Recovery', colorVar: 'hr-z1' },
  { num: 2, label: 'Zone 2', desc: 'Aerobic Capacity', colorVar: 'hr-z2' },
  { num: 3, label: 'Zone 3', desc: 'Tempo', colorVar: 'hr-z3' },
  { num: 4, label: 'Zone 4', desc: 'Threshold', colorVar: 'hr-z4' },
  { num: 5, label: 'Zone 5', desc: 'VO2 Max', colorVar: 'hr-z5' }
];

// Zone ids in order. Power also has a Sweet Spot band ('ss') that sits
// alongside the main zones rather than in the chain.
const POWER_ZONE_ORDER = ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7'];
const POWER_CHECK_ORDER = ['z1', 'z2', 'z3', 'ss', 'z4', 'z5', 'z6', 'z7'];
const POWER_INPUT_CLASS = 'custom-zone-range-input';
const HR_ZONE_ORDER = ['z1', 'z2', 'z3', 'z4', 'z5'];

const STORAGE_KEYS = {
  FTP: 'cycling_ftp',
  WEIGHT: 'cycling_weight',
  UNIT: 'cycling_unit',
  NEW_FTP: 'cycling_new_ftp',
  FIND_KJ_AVG_WATTS: 'cycling_find_kj_avg_watts',
  FIND_WATTS_TOTAL_KJ: 'cycling_find_watts_total_kj',
  FIND_TIME_TOTAL_KJ: 'cycling_find_time_total_kj',
  FIND_TIME_AVG_WATTS: 'cycling_find_time_avg_watts',
  FIND_KJ_HOURS: 'cycling_find_kj_hours',
  FIND_KJ_MINUTES_PART: 'cycling_find_kj_minutes_part',
  FIND_KJ_SECONDS: 'cycling_find_kj_seconds',
  FIND_WATTS_HOURS: 'cycling_find_watts_hours',
  FIND_WATTS_MINUTES_PART: 'cycling_find_watts_minutes_part',
  FIND_WATTS_SECONDS: 'cycling_find_watts_seconds',
  CUSTOM_ZONES: 'cycling_custom_zones',
  CUSTOM_HR: 'cycling_custom_hr',
  HR_MAX: 'cycling_hr_max_val',
  HR_LTHR: 'cycling_hr_lthr_val',
  ACTIVE_SYSTEM: 'cycling_active_system'
};

const TIMING = {
  EXPORT_RENDER_DELAY_MS: 50,
  HTML2CANVAS_PRELOAD_DELAY_MS: 1200,
  SCROLL_SYNC_IDLE_MS: 120,
  BLOB_REVOKE_DELAY_MS: 1000,
  PRINT_FALLBACK_TIMEOUT_MS: 60000
};

const LIMITS = {
  HR_INPUT_MIN: 60,
  TIME_PART_MAX: 59,
  POWER_ZONE_PERCENT_MAX: 300,
  HR_MAX_PERCENT_CAP: 100,
  HR_LTHR_PERCENT_CAP: 150
};

// The two heart rate zone sets: % of Max HR and % of Lactate Threshold HR.
const HR_METRICS = {
  max: { label: 'Max HR', inputClass: 'custom-hr-max-inline', cap: LIMITS.HR_MAX_PERCENT_CAP },
  lthr: { label: 'LTHR', inputClass: 'custom-hr-lthr-inline', cap: LIMITS.HR_LTHR_PERCENT_CAP }
};

// Print / Save Image buttons, one pair per zone table.
const ZONE_EXPORTS = [['power', 'default'], ['power', 'custom'], ['hr', 'default'], ['hr', 'custom']];

const CONVERSION = {
  LB_PER_KG: 2.20462
};

const POWER_TARGETS = {
  OPEN_ENDED_ZONE_OFFSET_PERCENT: 10
};

const EXPORT_SETTINGS = {
  IMAGE_SCALE: 2
};

const els = {};
const powerCellCache = {
  default: {},
  custom: {}
};
let activeZoneSystem = 'default';
let activeHrSubtab = 'default';
let activePrintSession = null;
let isPrintLaunching = false;
let lastChangedCustomPowerInput = null;

function exportButton(action, type, system) {
  return document.getElementById(action === 'print'
    ? `print-${system}-${type}-zones`
    : `save-${system}-${type}-image`);
}

function getAllImageExportButtons() {
  return ZONE_EXPORTS.map(([type, system]) => exportButton('save', type, system)).filter(Boolean);
}

function getAllExportButtons() {
  return [
    ...ZONE_EXPORTS.map(([type, system]) => exportButton('print', type, system)),
    ...getAllImageExportButtons()
  ].filter(Boolean);
}

function deepClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
function clampNonNegative(value) { const n = parseFloat(value); return Number.isFinite(n) && n >= 0 ? n : 0; }

function wholeNumber(value) { return Math.round(value); }

// Apply any custom-zone edit still sitting in an input (typed but not yet
// committed) so prints and images show what's on screen.
function applyVisibleCustomEdits() {
  if (!els.customZonesTable.hidden) {
    validateAndApplyCustomZones(lastChangedCustomPowerInput);
  }

  if (!els.hrCustomPanel.hidden) {
    validateAndApplyCustomHR();
  }
}

async function commitVisibleCustomEdits() {
  await new Promise(resolve => requestAnimationFrame(resolve));
  applyVisibleCustomEdits();
}

function readNonNegativeOrNull(el) {
  const raw = String(el?.value ?? '').trim();
  if (raw === '') return null;

  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseDurationParts(hoursEl, minutesEl, secondsEl) {
  const hoursRaw = String(hoursEl?.value ?? '').trim();
  const minutesRaw = String(minutesEl?.value ?? '').trim();
  const secondsRaw = String(secondsEl?.value ?? '').trim();

  return {
    hours: hoursRaw === '' ? 0 : parseFloat(hoursRaw),
    minutes: minutesRaw === '' ? 0 : parseFloat(minutesRaw),
    seconds: secondsRaw === '' ? 0 : parseFloat(secondsRaw)
  };
}

function getDurationValidationError(hoursEl, minutesEl, secondsEl) {
  const { hours, minutes, seconds } = parseDurationParts(hoursEl, minutesEl, secondsEl);

  if (!Number.isFinite(hours) || hours < 0) return 'Hours must be 0 or greater.';
  if (!Number.isFinite(minutes) || minutes < 0) return 'Minutes must be 0 or greater.';
  if (!Number.isFinite(seconds) || seconds < 0) return 'Seconds must be 0 or greater.';

  if (minutes >= 60) return 'Minutes must be between 0 and 59.';
  if (seconds >= 60) return 'Seconds must be between 0 and 59.';

  if (hours === 0 && minutes === 0 && seconds === 0) {
    return 'Enter a time greater than 0.';
  }

  return '';
}

function readDurationMinutes(hoursEl, minutesEl, secondsEl) {
  const { hours, minutes, seconds } = parseDurationParts(hoursEl, minutesEl, secondsEl);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return null;
  }

  if (hours < 0 || minutes < 0 || seconds < 0) return null;
  if (minutes >= 60 || seconds >= 60) return null;

  const totalMinutes = (hours * 60) + minutes + (seconds / 60);
  return totalMinutes > 0 ? totalMinutes : null;
}

function getValidDurationOrShowError(errorEl, hoursEl, minutesEl, secondsEl) {
  const error = getDurationValidationError(hoursEl, minutesEl, secondsEl);
  if (errorEl) errorEl.textContent = error;
  return error ? null : readDurationMinutes(hoursEl, minutesEl, secondsEl);
}

function calcKJ() {
  const watts = readNonNegativeOrNull(els.wattsIn);
  const min = getValidDurationOrShowError(
    els.kjTimeError,
    els.kjHoursIn,
    els.kjMinutesPartIn,
    els.kjSecondsIn
  );

  if (watts === null || watts <= 0 || min === null) {
    els.kjOut.textContent = '—';
    els.kjKcal.hidden = true;
    recalculateAllBadges();
    return;
  }

  // Rounding rules (intentional): kJ rounds DOWN (work fully completed);
  // watts and time round UP (the minimum needed to reach the target).
  const kj = Math.floor(kjFromWattsMinutes(watts, min));
  els.kjOut.textContent = kj.toLocaleString();
  // ~1 kJ of mechanical work ≈ 1 kcal burned (≈20–25% gross efficiency × 4.184 kJ/kcal)
  els.kjKcal.textContent = `≈ ${kj.toLocaleString()} kcal burned`;
  els.kjKcal.hidden = false;
  recalculateAllBadges();
}

function calcWatts() {
  const kj = readNonNegativeOrNull(els.kjIn);
  const min = getValidDurationOrShowError(
    els.wattsTimeError,
    els.wattsHoursIn,
    els.wattsMinutesPartIn,
    els.wattsSecondsIn
  );

  if (kj === null || kj <= 0 || min === null) {
    els.wattsOut.textContent = '—';
    recalculateAllBadges();
    return;
  }

  els.wattsOut.textContent = String(Math.ceil(wattsFromKjMinutes(kj, min)));
  recalculateAllBadges();
}

function calcTime() {
  const kj = readNonNegativeOrNull(els.timeKjIn);
  const watts = readNonNegativeOrNull(els.timeWattsIn);

  if (kj === null || kj <= 0 || watts === null || watts <= 0) {
    els.timeOut.textContent = '—';
    recalculateAllBadges();
    return;
  }

  const totalSeconds = Math.ceil((kj * 1000) / watts);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  els.timeOut.textContent = `${hh}:${mm}:${ss}`;
  recalculateAllBadges();
}

function kjFromWattsMinutes(watts, minutes) { return minutes > 0 && watts > 0 ? (watts * minutes * 60) / 1000 : 0; }
function wattsFromKjMinutes(kj, minutes) { return minutes > 0 && kj > 0 ? (kj * 1000) / (minutes * 60) : 0; }

function intensityFactor(watts, ftp) {
  return watts > 0 && ftp > 0 ? watts / ftp : 0;
}

function trainingStressScore(watts, ftp, minutes) {
  if (!(watts > 0) || !(ftp > 0) || !(minutes > 0)) return 0;
  const ifValue = intensityFactor(watts, ftp);
  const hours = minutes / 60;
  return hours * ifValue * ifValue * 100;
}

function safeStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeStorageGetJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}
function safeStorageRemove(key) {
  try { localStorage.removeItem(key); } catch {}
}

function saveField(key, value) { safeStorageSet(key, JSON.stringify(value)); }
function savePrimitive(key, value) { safeStorageSet(key, String(value)); }

function defaultPowerAnchors() {
  return {
    z1: 55,
    z2: 75,
    z3: 90,
    ssMin: 88,
    ssMax: 94,
    z4: 105,
    z5: 120,
    z6: 150
  };
}

function normalizePowerAnchors(value) {
  const defaults = defaultPowerAnchors();
  const source = value && typeof value === 'object' ? value : {};
  const out = {};

  for (const key of Object.keys(defaults)) {
    out[key] = source[key] == null
      ? defaults[key]
      : wholeNumber(clampNonNegative(source[key]));
  }

  return out;
}

function displayRangesFromAnchors(anchors) {
  const a = normalizePowerAnchors(anchors);
  return {
    z1: { min: null, max: a.z1 },
    z2: { min: a.z1 + 1, max: a.z2 },
    z3: { min: a.z2 + 1, max: a.z3 },
    ss: { min: a.ssMin, max: a.ssMax },
    z4: { min: a.z3 + 1, max: a.z4 },
    z5: { min: a.z4 + 1, max: a.z5 },
    z6: { min: a.z5 + 1, max: a.z6 },
    z7: { min: a.z6 + 1, max: null }
  };
}

// ---------------------------------------------------------------------------
// Shared zone-range logic (used by both Power and Heart Rate custom zones).
// A "ranges" object maps zone ids to { min, max } percentages. The first zone
// has no min and the last has no max. Zones are continuous: each one starts
// exactly 1 point above the previous zone's end.
// ---------------------------------------------------------------------------

// Re-chain every zone's start to 1 above the previous zone's end.
function syncRanges(ranges, order) {
  const out = deepClone(ranges);

  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const curr = order[i];

    if (out[prev].max != null && out[curr].min != null) {
      out[curr].min = out[prev].max + 1;
    }
  }

  return out;
}

// Apply one edited boundary and move the neighbouring zone's boundary with it.
function applyBoundaryEdit(ranges, order, zoneId, side, rawValue, cap = Infinity) {
  const out = deepClone(ranges);
  const value = wholeNumber(Math.min(clampNonNegative(rawValue), cap));
  const index = order.indexOf(zoneId);

  if (index === -1) return out;

  if (side === 'max' && out[zoneId].max != null) {
    out[zoneId].max = value;

    if (index < order.length - 1) {
      const nextZone = order[index + 1];
      if (out[nextZone].min != null) out[nextZone].min = value + 1;
    }
  }

  if (side === 'min' && out[zoneId].min != null) {
    out[zoneId].min = value;

    if (index > 0) {
      const prevZone = order[index - 1];
      if (out[prevZone].max != null) out[prevZone].max = value - 1;
    }
  }

  return syncRanges(out, order);
}

// Put saved values back into the editable inputs (skips the one being typed in).
function writeRangeInputs(selector, ranges) {
  document.querySelectorAll(selector).forEach(input => {
    const { zone, side } = input.dataset;

    if (!ranges[zone] || !(side in ranges[zone])) return;

    const next = ranges[zone][side] == null ? '' : String(ranges[zone][side]);

    if (document.activeElement !== input && input.value !== next) {
      input.value = next;
    }
  });
}

// Read the editable inputs into `base`, clamping each value to 0..cap.
function readRangeInputs(selector, base, cap = Infinity) {
  document.querySelectorAll(selector).forEach(input => {
    const { zone, side } = input.dataset;

    if (base[zone] && side in base[zone]) {
      base[zone][side] = wholeNumber(Math.min(clampNonNegative(input.value), cap));
    }
  });

  return base;
}

// Check each zone in `checkOrder` and return the first problem found, or ''.
// With a cap (heart rate) messages read "between 1% and N%"; without one
// (power) they read "1% or higher". 'ss' is the Sweet Spot band, which is
// validated in place but is not part of the continuous zone chain.
function validateRangeChain(ranges, checkOrder, label, cap = null) {
  const limit = cap ?? Infinity;
  const inBounds = v => v > 0 && v <= limit;
  const bounds = cap ? `between 1% and ${cap}%` : '';
  const chain = checkOrder.filter(key => key !== 'ss');
  const first = chain[0];
  const last = chain[chain.length - 1];
  const name = key => `Zone ${key.slice(1)}`;

  for (const key of checkOrder) {
    const r = ranges[key];

    if (key === 'ss') {
      if (!(r.min > 0 && r.max > 0)) return `${label}: Sweet Spot must have valid lower and upper values.`;
      if (!(r.min < r.max)) return `${label}: Sweet Spot upper value must be greater than its lower value.`;
    } else if (key === first) {
      if (!inBounds(r.max)) return `${label}: ${name(key)} must end ${bounds || 'at 1% or higher'}.`;
    } else if (key === last) {
      if (!inBounds(r.min)) return `${label}: ${name(key)} must start ${bounds || 'at 1% or higher'}.`;
    } else {
      if (!(inBounds(r.min) && inBounds(r.max))) {
        return `${label}: ${name(key)} must have ${bounds ? `start and end values ${bounds}` : 'valid start and end values'}.`;
      }
      if (!(r.min < r.max)) return `${label}: ${name(key)} must end above its start value.`;
    }
  }

  for (let i = 1; i < chain.length; i++) {
    if (ranges[chain[i]].min !== ranges[chain[i - 1]].max + 1) {
      return `${label}: ${name(chain[i])} must start exactly 1 point above ${name(chain[i - 1])}.`;
    }
  }

  return '';
}

// ---------------------------------------------------------------------------
// Power-specific: custom zones are stored as "anchors" (each zone's upper %).
// ---------------------------------------------------------------------------

function anchorsFromSyncedDisplayRanges(ranges, fallbackAnchors = defaultPowerAnchors()) {
  return normalizePowerAnchors({
    z1: clampNonNegative(ranges.z1.max) || fallbackAnchors.z1,
    z2: clampNonNegative(ranges.z2.max) || fallbackAnchors.z2,
    z3: clampNonNegative(ranges.z3.max) || fallbackAnchors.z3,
    ssMin: clampNonNegative(ranges.ss.min) || fallbackAnchors.ssMin,
    ssMax: clampNonNegative(ranges.ss.max) || fallbackAnchors.ssMax,
    z4: clampNonNegative(ranges.z4.max) || fallbackAnchors.z4,
    z5: clampNonNegative(ranges.z5.max) || fallbackAnchors.z5,
    z6: clampNonNegative(ranges.z6.max) || fallbackAnchors.z6
  });
}

function zonesFromPowerAnchors(anchors) {
  const a = normalizePowerAnchors(anchors);
  return defaultZonesConfig.map(z => {
    if (z.id === 'z1') return { ...z, min: 0, max: a.z1 / 100 };
    if (z.id === 'z2') return { ...z, min: a.z1 / 100, max: a.z2 / 100 };
    if (z.id === 'z3') return { ...z, min: a.z2 / 100, max: a.z3 / 100 };
    if (z.id === 'ss') return { ...z, min: a.ssMin / 100, max: a.ssMax / 100 };
    if (z.id === 'z4') return { ...z, min: a.z3 / 100, max: a.z4 / 100 };
    if (z.id === 'z5') return { ...z, min: a.z4 / 100, max: a.z5 / 100 };
    if (z.id === 'z6') return { ...z, min: a.z5 / 100, max: a.z6 / 100 };
    if (z.id === 'z7') return { ...z, min: a.z6 / 100, max: null };
    return z;
  });
}

function validatePowerAnchors(anchors) {
  return validateRangeChain(displayRangesFromAnchors(anchors), POWER_CHECK_ORDER, 'Custom Power Zones');
}

// ---------------------------------------------------------------------------
// Heart-rate-specific: two zone sets (% of Max HR and % of LTHR), each capped.
// ---------------------------------------------------------------------------

function emptyHrRanges() {
  const out = {};
  HR_ZONE_ORDER.forEach((zone, i) => {
    out[zone] = {
      min: i === 0 ? null : 0,
      max: i === HR_ZONE_ORDER.length - 1 ? null : 0
    };
  });
  return out;
}

function normalizeHrAnchors(value) {
  const source = value && typeof value === 'object' ? value : {};

  const pick = (raw, fallback, cap) => (raw == null || raw === '')
    ? fallback
    : wholeNumber(Math.min(clampNonNegative(raw), cap));

  const normalizeMetric = (metric) => {
    const { cap } = HR_METRICS[metric];
    const sourceMetric = source[metric] && typeof source[metric] === 'object' ? source[metric] : {};
    const defaults = defaultHrPercentConfig[metric];
    const out = emptyHrRanges();

    for (const zone of HR_ZONE_ORDER) {
      if (out[zone].min !== null) out[zone].min = pick(sourceMetric[zone]?.min, defaults[zone].min, cap);
      if (out[zone].max !== null) out[zone].max = pick(sourceMetric[zone]?.max, defaults[zone].max, cap);
    }

    return out;
  };

  return {
    max: normalizeMetric('max'),
    lthr: normalizeMetric('lthr')
  };
}

function validateHrAnchorSet(values, maxHr, lthr) {
  const baseError = validateHrBaseInputs(maxHr, lthr);
  if (baseError) return baseError;

  for (const metric of ['max', 'lthr']) {
    const { label, cap } = HR_METRICS[metric];
    const error = validateRangeChain(values[metric], HR_ZONE_ORDER, `Custom ${label}`, cap);
    if (error) return error;
  }

  // LTHR-based zones must not work out to more BPM than the rider's Max HR.
  if (maxHr > 0 && lthr > 0) {
    const maxAllowedPct = Math.floor((maxHr / lthr) * 100);
    const exceeds = Object.values(values.lthr).some(r => r.min > maxAllowedPct || r.max > maxAllowedPct);

    if (exceeds) {
      return 'Custom LTHR: One or more zone values would calculate above your Max HR. Increase Max HR or lower the LTHR percentages.';
    }
  }

  return '';
}

// ---------------------------------------------------------------------------
// Loading and saving custom zones.
// ---------------------------------------------------------------------------

// Saved data may be { version, anchors } or an older bare object. Anything
// that fails validation falls back to the defaults.
function loadCustomAnchors(key, normalize, validate, defaults) {
  const parsed = safeStorageGetJSON(key);
  if (!parsed) return defaults();

  const candidate = normalize(parsed.anchors || parsed);
  return validate(candidate) ? defaults() : candidate;
}

function saveCustomPowerAnchors() {
  saveField(STORAGE_KEYS.CUSTOM_ZONES, { version: 2, anchors: customPowerAnchors });
}

function saveCustomHrAnchors() {
  saveField(STORAGE_KEYS.CUSTOM_HR, { version: 3, anchors: customHrAnchors });
}

let customPowerAnchors = loadCustomAnchors(
  STORAGE_KEYS.CUSTOM_ZONES, normalizePowerAnchors, validatePowerAnchors, defaultPowerAnchors
);
let customHrAnchors = loadCustomAnchors(
  STORAGE_KEYS.CUSTOM_HR, normalizeHrAnchors, a => validateHrAnchorSet(a, 0, 0), () => deepClone(defaultHrPercentConfig)
);

function getCustomZonesConfig() {
  return zonesFromPowerAnchors(customPowerAnchors);
}

function getZonesConfigForSystem(system) {
  return system === 'custom' ? getCustomZonesConfig() : defaultZonesConfig;
}

function getPowerColor(zone) {
  return `var(--p-${zone.colorVar})`;
}

function zoneCellBg(zone, alpha = 0.5) {
  return `linear-gradient(rgba(255,255,255,${alpha}), rgba(255,255,255,${alpha})), var(--p-${zone.colorVar})`;
}

function hrCellBg(colorVar, alpha = 0.5) {
  return `linear-gradient(rgba(255,255,255,${alpha}), rgba(255,255,255,${alpha})), var(--${colorVar})`;
}

// Main zones (no Sweet Spot) as continuous ranges: zone 1 starts at `firstMin`,
// each later zone starts 1 above the previous end, and zone 7 is open-ended.
function chainedZoneRanges(system, toValue, firstMin) {
  const out = [];
  let previousMax = null;

  for (const z of getZonesConfigForSystem(system).filter(zone => zone.id !== 'ss')) {
    const max = z.max === null ? null : toValue(z.max);
    const min = z.id === 'z1' ? firstMin : previousMax + 1;

    out.push({ zone: z, min, max });
    if (max !== null) previousMax = max;
  }

  return out;
}

function getMainZoneWattRanges(ftp, system = activeZoneSystem) {
  if (!(ftp > 0)) return [];

  return chainedZoneRanges(system, pct => wholeNumber(ftp * pct), 0)
    .map(({ zone, min, max }) => ({ ...zone, minW: min, maxW: max }));
}

function getMainZonePctDisplayRanges(system = activeZoneSystem) {
  return chainedZoneRanges(system, pct => Math.round(pct * 100), null)
    .map(({ zone, min, max }) => ({ id: zone.id, minPctDisplay: min, maxPctDisplay: max }));
}

function getZoneTargetPercent(zone, system = activeZoneSystem) {
  if (zone.id === 'ss') {
    const ranges = system === 'custom'
      ? displayRangesFromAnchors(customPowerAnchors)
      : {
          ss: {
            min: Math.round(zone.min * 100),
            max: Math.round(zone.max * 100)
          }
        };

    const ssRange = ranges.ss;
    return Math.round((ssRange.min + ssRange.max) / 2);
  }

  if (system === 'custom') {
    const ranges = displayRangesFromAnchors(customPowerAnchors);
    const r = ranges[zone.id];

    if (zone.id === 'z1') return Math.max(1, Math.round(r.max / 2));
    if (zone.id === 'z7') return r.min + POWER_TARGETS.OPEN_ENDED_ZONE_OFFSET_PERCENT;
    return Math.round((r.min + r.max) / 2);
  }

  const pctRanges = getMainZonePctDisplayRanges(system);
  const pctRange = pctRanges.find(z => z.id === zone.id);

  if (!pctRange) return Math.round(zone.target * 100);

  if (pctRange.minPctDisplay === null) return Math.max(1, Math.round(pctRange.maxPctDisplay / 2));
  if (pctRange.maxPctDisplay === null) return pctRange.minPctDisplay + POWER_TARGETS.OPEN_ENDED_ZONE_OFFSET_PERCENT;

  return Math.round((pctRange.minPctDisplay + pctRange.maxPctDisplay) / 2);
}

function getZoneForWatts(watts, ftp, system = activeZoneSystem) {
  if (!(watts > 0) || !(ftp > 0)) return null;

  const roundedWatts = wholeNumber(watts);
  const ranges = getMainZoneWattRanges(ftp, system);

  for (const z of ranges) {
    if (z.maxW === null) {
      if (roundedWatts >= z.minW) return z;
    } else if (roundedWatts >= z.minW && roundedWatts <= z.maxW) {
      return z;
    }
  }

  return null;
}

function isSweetSpotWatts(watts, ftp, system = activeZoneSystem) {
  if (!(watts > 0) || !(ftp > 0)) return false;

  const ss = getZonesConfigForSystem(system).find(z => z.id === 'ss');
  if (!ss) return false;

  const roundedWatts = wholeNumber(watts);
  const minW = wholeNumber(ftp * ss.min);
  const maxW = ss.max === null ? null : wholeNumber(ftp * ss.max);

  return maxW === null
    ? roundedWatts >= minW
    : roundedWatts >= minW && roundedWatts <= maxW;
}

function getOutputZoneDetails(watts, ftp) {
  if (ftp <= 0 || watts <= 0) {
    return {
      label: 'None',
      color: '#8e8e93',
      sweetSpot: false
    };
  }

  const zone = getZoneForWatts(watts, ftp);
  const sweetSpot = isSweetSpotWatts(watts, ftp);

  if (!zone) {
    return {
      label: 'None',
      color: '#8e8e93',
      sweetSpot
    };
  }

  return {
    label: zone.label,
    color: getPowerColor(zone),
    sweetSpot
  };
}

function getZoneRangeInfo(zone, ftp, system = activeZoneSystem) {
  let pctText = '';
  let wattsText = '';

  if (zone.id === 'ss') {
    const minPct = Math.round(zone.min * 100);
    const maxPct = zone.max === null ? null : Math.round(zone.max * 100);
    const minW = wholeNumber(ftp * zone.min);
    const maxW = wholeNumber(ftp * zone.max);

    pctText = `${minPct}%–${maxPct}%`;
    wattsText = `${minW}–${maxW}`;
  } else {
    const mainRanges = getMainZoneWattRanges(ftp, system);
    const pctRanges = getMainZonePctDisplayRanges(system);

    const wattRange = mainRanges.find(z => z.id === zone.id);
    const pctRange = pctRanges.find(z => z.id === zone.id);

    if (!wattRange || !pctRange) {
      return {
        pctText: '—',
        wattsText: '—',
        targetPctText: '—',
        targetText: '—'
      };
    }

    if (pctRange.maxPctDisplay === null) {
      pctText = `≥ ${pctRange.minPctDisplay}%`;
      wattsText = `≥ ${wattRange.minW}`;
    } else if (pctRange.minPctDisplay === null) {
      pctText = `≤ ${pctRange.maxPctDisplay}%`;
      wattsText = `≤ ${wattRange.maxW}`;
    } else {
      pctText = `${pctRange.minPctDisplay}%–${pctRange.maxPctDisplay}%`;
      wattsText = `${wattRange.minW}–${wattRange.maxW}`;
    }
  }

  const targetPctValue = getZoneTargetPercent(zone, system);
  const targetWatts = ftp > 0 ? wholeNumber(ftp * (targetPctValue / 100)) : 0;

  return {
    pctText,
    wattsText,
    targetPctText: `${targetPctValue}%`,
    targetText: ftp > 0 ? `${targetWatts}` : '—'
  };
}

function cachePowerCells(system) {
  const prefix = system === 'custom' ? 'c' : 'p';
  powerCellCache[system] = {};

  getZonesConfigForSystem(system).forEach(z => {
    powerCellCache[system][z.id] = {
      pct: document.getElementById(powerCellId(prefix, z.id, 'pct-range')),
      range: document.getElementById(powerCellId(prefix, z.id, 'range')),
      targetPct: document.getElementById(powerCellId(prefix, z.id, 'target-pct')),
      target: document.getElementById(powerCellId(prefix, z.id, 'target'))
    };
  });
}

// Whole number, or up to `decimals` places with trailing zeros trimmed.
function formatInputNumber(value, decimals = 0) {
  return decimals > 0
    ? value.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
    : String(wholeNumber(value));
}

function sanitizeInput(el, decimals = 0) {
  const raw = String(el.value ?? '').trim();
  if (raw === '') return 0;

  const value = clampNonNegative(raw);
  el.value = formatInputNumber(value, decimals);
  return value;
}

function setTabState(buttons, activeBtn) {
  buttons.forEach(btn => {
    const active = btn === activeBtn;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
    btn.setAttribute('tabindex', active ? '0' : '-1');
  });
}

function applyZonesViewState() {
  setActiveZoneSystem(activeZoneSystem, false);
}

function applyHrViewState() {
  renderHrTables();
  bindCustomHrInlineInputs();
  setHrSubtab(activeHrSubtab || 'default');
  resetPairedHorizontalScroll(els.hrDefaultMaxScroll, els.hrDefaultLthrScroll);
  resetPairedHorizontalScroll(els.hrCustomMaxScroll, els.hrCustomLthrScroll);
}

function switchTab(type) {
  const tabs = [
    { key: 'watts', btn: els.btnWatts, view: els.wattsView },
    { key: 'kj', btn: els.btnKj, view: els.kjView },
    { key: 'time', btn: els.btnTime, view: els.timeView },
    { key: 'zones', btn: els.btnZones, view: els.zonesView },
    { key: 'hr', btn: els.btnHr, view: els.hrView }
  ];

  tabs.forEach(({ key, btn, view }) => {
    const active = key === type;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
    btn.setAttribute('tabindex', active ? '0' : '-1');
    view.hidden = !active;
  });

  const titles = {
    kj: 'Calculate kJ',
    time: 'Calculate Time',
    watts: 'Calculate Watts',
    zones: 'Power Zones',
    hr: 'Heart Rate Zones'
  };

  els.appTitle.textContent = titles[type] || 'Cycling Calculator';
  els.tssNote.hidden = !['watts', 'kj', 'time'].includes(type);

  if (type === 'zones') {
    applyZonesViewState();
    return;
  }

  if (type === 'hr') {
    applyHrViewState();
    return;
  }
}

function toggleActiveSystem() {
  setActiveZoneSystem(activeZoneSystem === 'default' ? 'custom' : 'default');
}

function setActiveZoneSystem(val, persist = true) {
  activeZoneSystem = val;

  if (persist) savePrimitive(STORAGE_KEYS.ACTIVE_SYSTEM, val);

  const isDefault = val === 'default';
  const isCustom = val === 'custom';

  const labelMap = {
    default: 'Zones: Default Power Zones',
    custom: 'Zones: Custom Power Zones'
  };

  [els.toggleSystemKj, els.toggleSystemWatts, els.toggleSystemTime].forEach(btn => {
    btn.textContent = labelMap[val];
    btn.setAttribute('aria-pressed', String(isCustom));
  });

  setTabState(
    [els.subBtnDefaultPower, els.subBtnCustomPower],
    isDefault ? els.subBtnDefaultPower : els.subBtnCustomPower
  );

  els.defaultPowerZonesTable.hidden = !isDefault;
  els.customZonesTable.hidden = !isCustom;

  updateZones();
}

function setHrSubtab(val) {
  activeHrSubtab = val;

  const isDefault = val === 'default';
  const isCustom = val === 'custom';

  setTabState(
    [els.hrSubBtnDefault, els.hrSubBtnCustom],
    isDefault ? els.hrSubBtnDefault : els.hrSubBtnCustom
  );

  els.hrDefaultPanel.hidden = !isDefault;
  els.hrCustomPanel.hidden = !isCustom;

  refreshAllHrZoneViews();
}

function refreshAllHrZoneViews() {
  updateHRZones();
  updateCustomHRZones();
}

function syncDropdowns() {
  els.weightUnitLbl.textContent = els.weightUnit.value;
}

function setNewFTP(val, persist = true) {
  const n = wholeNumber(clampNonNegative(val));
  const clean = n > 0 ? String(n) : '';
  [els.newFtpKj, els.newFtpWatts, els.newFtpTime].forEach(el => {
    if (el !== document.activeElement) el.value = clean;
  });
  if (persist) savePrimitive(STORAGE_KEYS.NEW_FTP, clean);
  recalculateAllBadges();
}

function updateBadgeUI(badgeEl, prefix, watts, ftp, minutes = 0) {
  const details = getOutputZoneDetails(watts, ftp);
  const pctText = (ftp > 0 && watts > 0)
    ? ` (${((watts / ftp) * 100).toFixed(1)}% of ${wholeNumber(ftp)}W)`
    : ftp > 0
      ? ` (${wholeNumber(ftp)}W)`
      : '';

  const ifValue = intensityFactor(watts, ftp);
  const tssValue = trainingStressScore(watts, ftp, minutes);

  const metricsSubline = (ftp > 0 && watts > 0 && minutes > 0)
    ? `<span class="badge-subline">IF ${ifValue.toFixed(2)} · TSS ${Math.round(tssValue)}</span>`
    : '';

  const sweetSpotSubline = details.sweetSpot
    ? `<span class="badge-subline">Sweet Spot</span>`
    : '';

  badgeEl.innerHTML = `${prefix}: ${details.label}${pctText}${metricsSubline}${sweetSpotSubline}`;
  badgeEl.style.backgroundColor = details.color;
}

function recalculateAllBadges() {
  const currentFTP = readNonNegativeOrNull(els.ftpIn) ?? 0;
  const newFTP = readNonNegativeOrNull(els.newFtpKj) ?? 0;

  const kjWatts = readNonNegativeOrNull(els.wattsIn) ?? 0;
  const kjMinutes = readDurationMinutes(
    els.kjHoursIn,
    els.kjMinutesPartIn,
    els.kjSecondsIn
  ) ?? 0;

  const wattsKj = readNonNegativeOrNull(els.kjIn);
  const wattsMinutes = readDurationMinutes(
    els.wattsHoursIn,
    els.wattsMinutesPartIn,
    els.wattsSecondsIn
  ) ?? 0;

  const calculatedWatts = (
    wattsKj !== null &&
    wattsMinutes > 0 &&
    wattsKj > 0
  )
    ? Math.ceil(wattsFromKjMinutes(wattsKj, wattsMinutes))
    : 0;

  const timeKj = readNonNegativeOrNull(els.timeKjIn);
  const timeWatts = readNonNegativeOrNull(els.timeWattsIn) ?? 0;

  const timeMinutes = (
    timeKj !== null &&
    timeWatts > 0 &&
    timeKj > 0
  )
    ? ((timeKj * 1000) / timeWatts) / 60
    : 0;

  // The comparison badge only appears when a different FTP has been entered.
  const showNew = newFTP > 0 && wholeNumber(newFTP) !== wholeNumber(currentFTP);

  [
    [els.kjCurrentBadge, els.kjNewBadge, kjWatts, kjMinutes],
    [els.timeCurrentBadge, els.timeNewBadge, timeWatts, timeMinutes],
    [els.wattsCurrentBadge, els.wattsNewBadge, calculatedWatts, wattsMinutes]
  ].forEach(([currentBadge, newBadge, watts, minutes]) => {
    updateBadgeUI(currentBadge, 'Current FTP', watts, currentFTP, minutes);
    newBadge.hidden = !showNew;
    if (showNew) updateBadgeUI(newBadge, 'New FTP', watts, newFTP, minutes);
  });
}

function powerCellId(prefix, zoneId, field) {
  return `${prefix}-${zoneId}-${field}`;
}

function hrRangeId(prefix, zoneNum, metric) {
  return `${prefix}hr${zoneNum}-${metric}-range`;
}

function hrPctRangeId(prefix, zoneNum, metric) {
  return `${prefix}hr${zoneNum}-${metric}-pct-range`;
}

// ---------------------------------------------------------------------------
// Shared table-building helpers (Power and Heart Rate zone tables).
// ---------------------------------------------------------------------------

function matrixCell(background, content) {
  return `<td class="zone-cell-matrix" style="background: ${background};">${content}</td>`;
}

function matrixRows(rows) {
  return rows.map(([label, cells]) => `
    <tr>
      <th class="row-label">${label}</th>
      ${cells}
    </tr>
  `).join('');
}

function zoneHeaderCell(background, title, subtitle, extraClass = '') {
  return matrixCell(background, `<div class="zone-top${extraClass}">${title}</div><span class="zone-sub">${subtitle}</span>`);
}

function rangeInput(inputClass, zone, side, value, max, ariaLabel) {
  return `<input class="input-small numeric-input ${inputClass}" data-zone="${zone}" data-side="${side}" type="number" inputmode="numeric" enterkeyhint="done" min="1" max="${max}" step="1" value="${value}" aria-label="${ariaLabel}">`;
}

// Editable cell for one zone: the first zone only has an upper value (≤),
// the last zone only a lower value (≥), and middle zones have both.
function rangeEditor(zoneId, order, range, makeInput) {
  if (zoneId === order[0]) {
    return `<div class="matrix-input-wrap"><span>≤</span>${makeInput('max', range.max)}<span>%</span></div>`;
  }

  if (zoneId === order[order.length - 1]) {
    return `<div class="matrix-input-wrap"><span>≥</span>${makeInput('min', range.min)}<span>%</span></div>`;
  }

  return `<div class="matrix-input-wrap matrix-input-dual">${makeInput('min', range.min)}<span>to</span>${makeInput('max', range.max)}<span>%</span></div>`;
}

// ---------------------------------------------------------------------------
// Power zone tables.
// ---------------------------------------------------------------------------

function powerHeaderCells(zones) {
  return zones.map(z => zoneHeaderCell(
    zoneCellBg(z),
    z.id === 'ss' ? 'SS' : z.label.replace('Zone ', ''),
    z.desc,
    z.id === 'ss' ? ' ss' : ''
  )).join('');
}

function powerValueCells(zones, prefix, field, className = 'zone-value', text = () => '—') {
  return zones.map(z => matrixCell(
    zoneCellBg(z),
    `<div class="${className}" id="${powerCellId(prefix, z.id, field)}">${text(z)}</div>`
  )).join('');
}

function generateDefaultTables() {
  const zones = defaultZonesConfig;

  els.defaultPowerTableBody.innerHTML = matrixRows([
    ['Zone', powerHeaderCells(zones)],
    ['Range (%)', powerValueCells(zones, 'p', 'pct-range')],
    ['Range (W)', powerValueCells(zones, 'p', 'range')],
    ['Target (%)', powerValueCells(zones, 'p', 'target-pct', 'zone-value', z => `${Math.round(z.target * 100)}%`)],
    ['Target (W)', powerValueCells(zones, 'p', 'target', 'zone-value-large')]
  ]);

  cachePowerCells('default');
}

function generateCustomZonesTable() {
  const ranges = displayRangesFromAnchors(customPowerAnchors);
  const zones = getCustomZonesConfig();

  const editCells = zones.map(z => matrixCell(zoneCellBg(z), rangeEditor(
    z.id,
    POWER_ZONE_ORDER,
    ranges[z.id],
    (side, value) => rangeInput(
      POWER_INPUT_CLASS, z.id, side, value, LIMITS.POWER_ZONE_PERCENT_MAX,
      `${z.label} ${side === 'max' ? 'maximum' : 'minimum'} percentage`
    )
  ))).join('');

  els.customTableBody.innerHTML = matrixRows([
    ['Zone', powerHeaderCells(zones)],
    ['Custom Range (%)', editCells],
    ['Range (W)', powerValueCells(zones, 'c', 'range')],
    ['Target (%)', powerValueCells(zones, 'c', 'target-pct')],
    ['Target (W)', powerValueCells(zones, 'c', 'target', 'zone-value-large')]
  ]);

  cachePowerCells('custom');
  applyInputLimits();
}

function buildCustomPowerCandidateFromInput(changedInput, currentAnchors) {
  const { zone, side } = changedInput.dataset;
  const value = wholeNumber(clampNonNegative(changedInput.value));
  let ranges = displayRangesFromAnchors(currentAnchors);

  if (zone === 'ss') {
    ranges.ss[side] = value;
  } else {
    ranges = applyBoundaryEdit(ranges, POWER_ZONE_ORDER, zone, side, value);
  }

  return anchorsFromSyncedDisplayRanges(ranges, currentAnchors);
}

function buildCustomPowerCandidateFromAllInputs(currentAnchors) {
  const rawRanges = readRangeInputs(`.${POWER_INPUT_CLASS}`, displayRangesFromAnchors(customPowerAnchors));
  return anchorsFromSyncedDisplayRanges(syncRanges(rawRanges, POWER_ZONE_ORDER), currentAnchors);
}

function validateAndApplyCustomZones(changedInput = null) {
  const effectiveInput = changedInput || lastChangedCustomPowerInput;

  const candidateAnchors = effectiveInput
    ? buildCustomPowerCandidateFromInput(effectiveInput, customPowerAnchors)
    : buildCustomPowerCandidateFromAllInputs(customPowerAnchors);

  const error = validatePowerAnchors(candidateAnchors);
  els.customZoneError.textContent = error;

  if (!error) {
    customPowerAnchors = candidateAnchors;
    saveCustomPowerAnchors();
    updateZones();
  }

  writeRangeInputs(`.${POWER_INPUT_CLASS}`, displayRangesFromAnchors(customPowerAnchors));
}

function updatePowerZoneTable(system, ftp) {
  getZonesConfigForSystem(system).forEach(z => {
    const info = getZoneRangeInfo(z, ftp, system);
    const cells = powerCellCache[system][z.id];

    if (!cells) return;
    if (cells.pct) cells.pct.textContent = info.pctText;
    if (cells.range) cells.range.textContent = info.wattsText;
    if (cells.targetPct) cells.targetPct.textContent = info.targetPctText;
    if (cells.target) cells.target.textContent = info.targetText;
  });
}

function updateZones() {
  const { ftp, wkg } = getAppState().power;

  [els.currentFtpDisplayKj, els.currentFtpDisplayWatts, els.currentFtpDisplayTime].forEach(el => {
    el.textContent = `${wholeNumber(ftp)}W`;
  });
  els.wkgOut.textContent = wkg > 0 ? wkg.toFixed(2) : '—';

  updatePowerZoneTable('default', ftp);
  updatePowerZoneTable('custom', ftp);
  recalculateAllBadges();
}

function resetCustomZones() {
  customPowerAnchors = defaultPowerAnchors();
  saveCustomPowerAnchors();
  els.customZoneError.textContent = '';

  generateCustomZonesTable();
  bindCustomZoneInputs();

  // Switching to the custom tab also refreshes every zone table and badge.
  setActiveZoneSystem('custom', false);
}

// ---------------------------------------------------------------------------
// Heart rate zone tables.
// ---------------------------------------------------------------------------

function formatHrPctRanges(metricCfg) {
  return HR_ZONE_ORDER.map(zone => {
    const { min, max } = metricCfg[zone];
    if (min == null) return `≤ ${max}%`;
    if (max == null) return `≥ ${min}%`;
    return `${min}%–${max}%`;
  });
}

function hrHeaderCells() {
  return hrZoneDefs.map(zone => zoneHeaderCell(hrCellBg(zone.colorVar), zone.num, zone.desc)).join('');
}

function hrBpmCells(prefix, metric) {
  return hrZoneDefs.map(zone => matrixCell(
    hrCellBg(zone.colorVar),
    `<div class="zone-value-large" id="${hrRangeId(prefix, zone.num, metric)}">—</div>`
  )).join('');
}

function buildHrDisplayMatrix(metric, prefix, cfg) {
  const pctRanges = formatHrPctRanges(cfg[metric]);

  const pctCells = hrZoneDefs.map((zone, i) => matrixCell(
    hrCellBg(zone.colorVar),
    `<div class="zone-value" id="${hrPctRangeId(prefix, zone.num, metric)}">${pctRanges[i]}</div>`
  )).join('');

  return matrixRows([
    ['Zone', hrHeaderCells()],
    [`${HR_METRICS[metric].label} Range (%)`, pctCells],
    ['BPM Range', hrBpmCells(prefix, metric)]
  ]);
}

function buildHrEditableMatrix(metric, prefix, cfg) {
  const { label, inputClass, cap } = HR_METRICS[metric];

  const editCells = hrZoneDefs.map(zone => {
    const key = `z${zone.num}`;
    return matrixCell(hrCellBg(zone.colorVar), rangeEditor(
      key,
      HR_ZONE_ORDER,
      cfg[metric][key],
      (side, value) => rangeInput(
        inputClass, key, side, value, cap,
        `${label} Zone ${zone.num} ${side === 'max' ? 'upper' : 'lower'} percentage`
      )
    ));
  }).join('');

  return matrixRows([
    ['Zone', hrHeaderCells()],
    [`Custom ${label} (%)`, editCells],
    ['BPM Range', hrBpmCells(prefix, metric)]
  ]);
}

function renderHrTables() {
  for (const metric of ['max', 'lthr']) {
    const defaultBody = document.getElementById(`hr-default-${metric}-body`);
    const customBody = document.getElementById(`hr-custom-${metric}-body`);

    if (defaultBody) defaultBody.innerHTML = buildHrDisplayMatrix(metric, '', defaultHrPercentConfig);
    if (customBody) customBody.innerHTML = buildHrEditableMatrix(metric, 'c-', customHrAnchors);
  }

  applyInputLimits();
}

function readCustomHrAnchorsInline() {
  return {
    max: readRangeInputs(`.${HR_METRICS.max.inputClass}`, emptyHrRanges(), HR_METRICS.max.cap),
    lthr: readRangeInputs(`.${HR_METRICS.lthr.inputClass}`, emptyHrRanges(), HR_METRICS.lthr.cap)
  };
}

function writeCustomHrInputs(metric) {
  writeRangeInputs(`.${HR_METRICS[metric].inputClass}`, customHrAnchors[metric]);
}

function validateAndApplyCustomHR(changedInput = null) {
  const nextAnchors = readCustomHrAnchorsInline();

  const maxHr = readNonNegativeOrNull(els.hrMaxIn) ?? 0;
  const lthr = readNonNegativeOrNull(els.hrLthrIn) ?? 0;

  els.hrInputError.textContent = validateHrBaseInputs(maxHr, lthr);
  if (els.hrInputError.textContent) {
    els.customHrError.textContent = '';
    return;
  }

  // When a single input changed, move its neighbouring boundary along with it.
  const metric = changedInput
    ? (changedInput.classList.contains(HR_METRICS.max.inputClass) ? 'max' : 'lthr')
    : null;

  if (metric) {
    const { zone, side } = changedInput.dataset;
    nextAnchors[metric] = applyBoundaryEdit(
      nextAnchors[metric], HR_ZONE_ORDER, zone, side, changedInput.value, HR_METRICS[metric].cap
    );
  }

  const error = validateHrAnchorSet(nextAnchors, maxHr, lthr);
  els.customHrError.textContent = error;

  if (!error) {
    customHrAnchors = normalizeHrAnchors(nextAnchors);
    saveCustomHrAnchors();
  }

  if (metric) writeCustomHrInputs(metric);
  if (!error) updateCustomHRZones();
}

function bpmRangeTexts(metricCfg, base) {
  if (!(base > 0)) {
    return ['—', '—', '—', '—', '—'];
  }

  const z1Max = wholeNumber(base * (metricCfg.z1.max / 100));
  const z2Max = Math.max(z1Max + 1, wholeNumber(base * (metricCfg.z2.max / 100)));
  const z3Max = Math.max(z2Max + 1, wholeNumber(base * (metricCfg.z3.max / 100)));
  const z4Max = Math.max(z3Max + 1, wholeNumber(base * (metricCfg.z4.max / 100)));

  return [
    `≤ ${z1Max}`,
    `${z1Max + 1}–${z2Max}`,
    `${z2Max + 1}–${z3Max}`,
    `${z3Max + 1}–${z4Max}`,
    `≥ ${z4Max + 1}`
  ];
}

function applyHrRanges(prefix, maxHr, lthr, cfg) {
  const maxBpm = bpmRangeTexts(cfg.max, maxHr);
  const lthrBpm = bpmRangeTexts(cfg.lthr, lthr);

  for (let i = 0; i < 5; i++) {
    const maxRangeEl = document.getElementById(hrRangeId(prefix, i + 1, 'max'));
    const lthrRangeEl = document.getElementById(hrRangeId(prefix, i + 1, 'lthr'));

    if (maxRangeEl) maxRangeEl.textContent = maxBpm[i];
    if (lthrRangeEl) lthrRangeEl.textContent = lthrBpm[i];
  }
}

function validateHrBaseInputs(maxHr, lthr) {
  if (maxHr > 0 && lthr > 0 && lthr > maxHr) {
    return 'Lactate Threshold HR cannot be higher than Max HR.';
  }

  return '';
}

// Fill one heart rate table's BPM row (blank while Max HR/LTHR are invalid).
function updateHrTable(prefix, cfg) {
  const { max, lthr, baseError } = getAppState().hr;

  els.hrInputError.textContent = baseError;
  if (baseError) els.customHrError.textContent = '';

  applyHrRanges(prefix, baseError ? 0 : max, baseError ? 0 : lthr, cfg);
}

function updateHRZones() {
  updateHrTable('', defaultHrPercentConfig);
}

function updateCustomHRZones() {
  updateHrTable('c-', customHrAnchors);
}

function resetCustomHR() {
  customHrAnchors = deepClone(defaultHrPercentConfig);
  saveCustomHrAnchors();
  els.customHrError.textContent = '';

  renderHrTables();
  bindCustomHrInlineInputs();

  // Switching to the custom tab also refreshes both heart rate tables.
  setHrSubtab('custom');
}

function bindGlobalSelectOnFocus(root = document) {
  const docEl = root.documentElement || document.documentElement;

  if (docEl.dataset.globalSelectBound === 'true') return;
  docEl.dataset.globalSelectBound = 'true';

  const selectAll = (input) => {
    if (!input || input.disabled || input.readOnly) return;

    requestAnimationFrame(() => {
      try {
        input.focus({ preventScroll: true });
      } catch {}

      try {
        input.select();
      } catch {}

      try {
        if (typeof input.setSelectionRange === 'function') {
          input.setSelectionRange(0, input.value.length);
        }
      } catch {}
    });
  };

  const handle = (e) => {
    const input = e.target.closest('input');
    if (!input) return;
    selectAll(input);
  };

  root.addEventListener('focusin', handle);
  root.addEventListener('click', handle);
  root.addEventListener('pointerup', handle);
  root.addEventListener('touchend', handle, { passive: true });
}

function persistOnCommit(el, key, decimals = 0, afterSave) {
  const handler = () => {
    const raw = String(el.value ?? '').trim();

    if (raw === '') {
      safeStorageRemove(key);
      if (afterSave) afterSave(null);
      return;
    }

    const clean = sanitizeInput(el, decimals);
    savePrimitive(key, clean);
    if (afterSave) afterSave(clean);
  };

  el.addEventListener('change', handler);
}

function persistOnInput(el, key, decimals = 0) {
  if (!el) return;

  el.addEventListener('input', () => {
    const raw = String(el.value ?? '').trim();

    if (raw === '') {
      safeStorageRemove(key);
      return;
    }

    safeStorageSet(key, formatInputNumber(clampNonNegative(raw), decimals));
  });
}

function addInputListeners(elements, handler) {
  elements.filter(Boolean).forEach(el => {
    el.addEventListener('input', handler);
  });
}

function bindPersistOnCommit(pairs, decimals = 0, afterSave) {
  pairs.forEach(([el, key]) => {
    if (el) persistOnCommit(el, key, decimals, afterSave);
  });
}

function bindPersistOnInput(pairs, decimals = 0) {
  pairs.forEach(([el, key]) => {
    if (el) persistOnInput(el, key, decimals);
  });
}

// Current FTP / weight and heart rate inputs, read fresh from the page.
function getAppState() {
  const ftp = readNonNegativeOrNull(els.ftpIn) ?? 0;
  const weight = readNonNegativeOrNull(els.weightIn) ?? 0;
  const weightUnit = els.weightUnit?.value || 'lbs';
  const weightKg = weight > 0
    ? (weightUnit === 'lbs' ? weight / CONVERSION.LB_PER_KG : weight)
    : 0;

  const hrMax = readNonNegativeOrNull(els.hrMaxIn) ?? 0;
  const hrLthr = readNonNegativeOrNull(els.hrLthrIn) ?? 0;

  return {
    power: {
      ftp,
      weight,
      weightUnit,
      wkg: (ftp > 0 && weightKg > 0) ? ftp / weightKg : 0
    },
    hr: {
      max: hrMax,
      lthr: hrLthr,
      baseError: validateHrBaseInputs(hrMax, hrLthr)
    }
  };
}

function buildPrintHeader(title, items) {
  const meta = items
    .filter(item => item && item.value !== '' && item.value !== '—')
    .map(item => `<span><strong>${item.label}:</strong> ${item.value}</span>`)
    .join(' ');

  return `
    <div class="print-header-title">${title}</div>
    <div class="print-header-meta">${meta}</div>
  `;
}

function setPrintHeaderContent(el, title, items) {
  if (!el) return;
  el.innerHTML = buildPrintHeader(title, items);
  el.hidden = false;
}

function clearPrintHeaders() {
  [
    els.printHeaderDefaultPower,
    els.printHeaderCustomPower,
    els.printHeaderDefaultHr,
    els.printHeaderCustomHr
  ].forEach(el => {
    if (!el) return;
    el.innerHTML = '';
    el.hidden = true;
  });
}

function setPrintButtonsDisabled(disabled) {
  getAllExportButtons().forEach(btn => {
    btn.disabled = disabled;
    btn.setAttribute('aria-disabled', String(disabled));
  });
}

function forcePrintLayoutFlush() {
  const targets = [
    els.zonesView,
    els.hrView,
    els.defaultPowerZonesTable,
    els.customZonesTable,
    els.hrDefaultPanel,
    els.hrCustomPanel,
    els.hrDefaultMaxScroll,
    els.hrDefaultLthrScroll,
    els.hrCustomMaxScroll,
    els.hrCustomLthrScroll
  ].filter(Boolean);

  targets.forEach(el => {
    el.style.transform = 'translateZ(0)';
    el.style.webkitTransform = 'translateZ(0)';
    el.style.backfaceVisibility = 'hidden';
    el.style.webkitBackfaceVisibility = 'hidden';
  });

  void document.body.offsetHeight;
  void document.documentElement.offsetHeight;

  targets.forEach(el => {
    void el.offsetHeight;
    void el.offsetWidth;
  });

  targets.forEach(el => {
    el.style.transform = '';
    el.style.webkitTransform = '';
    el.style.backfaceVisibility = '';
    el.style.webkitBackfaceVisibility = '';
  });
}

function buildExportDateStamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function buildExportFilename(type, system) {
  const date = buildExportDateStamp();
  const state = getAppState();

  if (type === 'power') {
    return `${system}-power-zones-ftp-${wholeNumber(state.power.ftp || 0)}-${date}`;
  }

  return `${system}-hr-zones-max-${wholeNumber(state.hr.max || 0)}-lthr-${wholeNumber(state.hr.lthr || 0)}-${date}`;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), TIMING.BLOB_REVOKE_DELAY_MS);
}

function getExportCard(type, system) {
  if (type === 'power') {
    return system === 'custom' ? els.customZonesTable : els.defaultPowerZonesTable;
  }

  return system === 'custom' ? els.hrCustomPanel : els.hrDefaultPanel;
}

// Title and rider details shown at the top of a printed or saved zone table.
function setZonesHeader(type, system) {
  const state = getAppState();

  if (type === 'power') {
    const headerEl = system === 'custom'
      ? els.printHeaderCustomPower
      : els.printHeaderDefaultPower;

    setPrintHeaderContent(headerEl, system === 'custom' ? 'Custom Power Zones' : 'Default Power Zones', [
      { label: 'FTP', value: state.power.ftp > 0 ? `${wholeNumber(state.power.ftp)} W` : '—' },
      { label: 'Weight', value: state.power.weight > 0 ? `${state.power.weight} ${state.power.weightUnit}` : '—' },
      { label: 'W/kg', value: state.power.wkg > 0 ? state.power.wkg.toFixed(2) : '—' }
    ]);

    return headerEl;
  }

  const headerEl = system === 'custom'
    ? els.printHeaderCustomHr
    : els.printHeaderDefaultHr;

  setPrintHeaderContent(headerEl, system === 'custom' ? 'Custom Heart Rate Zones' : 'Default Heart Rate Zones', [
    { label: 'Max HR', value: state.hr.max > 0 ? `${wholeNumber(state.hr.max)} BPM` : '—' },
    { label: 'LTHR', value: state.hr.lthr > 0 ? `${wholeNumber(state.hr.lthr)} BPM` : '—' }
  ]);

  return headerEl;
}

function buildExportClone(type, system) {
  const source = getExportCard(type, system);
  if (!source) return null;

  const host = document.createElement('div');
  host.className = 'export-clone-host';

  const clone = source.cloneNode(true);
  clone.classList.add('export-capture');

  clone.querySelectorAll('.controls-row, .export-actions, .export-help-text, .no-export').forEach(el => {
    el.remove();
  });

  clone.querySelectorAll('[hidden]').forEach(el => {
    el.hidden = false;
  });

  const printHeader = clone.querySelector('.print-header');
  if (printHeader) {
    printHeader.hidden = false;
    printHeader.style.display = 'block';
    printHeader.style.visibility = 'visible';
    printHeader.style.height = 'auto';
    printHeader.style.overflow = 'visible';
  }

  host.appendChild(clone);
  document.body.appendChild(host);

  return { host, clone };
}

function destroyExportClone(exportClone) {
  if (!exportClone || !exportClone.host) return;
  exportClone.host.remove();
}

let html2canvasLoader = null;

function loadHtml2Canvas() {
  if (window.html2canvas) return Promise.resolve(window.html2canvas);
  if (html2canvasLoader) return html2canvasLoader;

  html2canvasLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
    script.onload = () => resolve(window.html2canvas);
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return html2canvasLoader;
}

function preloadHtml2Canvas() {
  setTimeout(() => {
    loadHtml2Canvas().catch(() => {});
  }, TIMING.HTML2CANVAS_PRELOAD_DELAY_MS);
}

// ---------------------------------------------------------------------------
// Phones: Print and Save Image open the share sheet (Save Image / Print /
// Messages ...). Home-screen web apps on iPhone can't use the browser's
// print dialog or file downloads reliably, but the share sheet works.
// ---------------------------------------------------------------------------

const exportButtonLabels = new Map();
let pendingShare = null; // { button, file } waiting for one more tap

function useShareSheet() {
  if (!navigator.share || !navigator.canShare) return false;
  if (!window.matchMedia('(pointer: coarse)').matches) return false;

  try {
    return navigator.canShare({ files: [new File([''], 'zones.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

function restoreExportButtonLabels() {
  getAllExportButtons().forEach(btn => {
    if (!exportButtonLabels.has(btn)) exportButtonLabels.set(btn, btn.textContent);
    if (pendingShare?.button !== btn) btn.textContent = exportButtonLabels.get(btn);
  });
}

async function shareImageFile(file, button) {
  try {
    await navigator.share({ files: [file], title: file.name.replace(/\.png$/, '') });
  } catch (error) {
    if (error.name === 'AbortError') return; // share sheet closed without choosing

    // iPhone only opens the share sheet straight after a tap. If preparing the
    // image took too long, keep it ready and ask for one more tap.
    if (error.name === 'NotAllowedError' && !pendingShare) {
      pendingShare = { button, file };
      button.textContent = 'Tap to Share';
      return;
    }

    throw error;
  }
}

function onExportClick(action, type, system) {
  const button = exportButton(action, type, system);

  if (pendingShare?.button === button) {
    const { file } = pendingShare;
    pendingShare = null;
    restoreExportButtonLabels();
    shareImageFile(file, button).catch(error => {
      console.error('Share failed:', error);
      alert('Sharing the image failed. Please try again.');
    });
    return;
  }

  pendingShare = null;
  restoreExportButtonLabels();

  if (action === 'save' || useShareSheet()) {
    saveZonesImage(type, system, button);
  } else {
    printZones(type, system);
  }
}

async function renderZonesImage(type, system) {
  const html2canvasFn = await loadHtml2Canvas();
  if (!html2canvasFn) throw new Error('html2canvas unavailable');

  setZonesHeader(type, system);

  if (type === 'power' && system === 'custom') {
    writeRangeInputs(`.${POWER_INPUT_CLASS}`, displayRangesFromAnchors(customPowerAnchors));
  }

  if (type === 'hr' && system === 'custom') {
    writeCustomHrInputs('max');
    writeCustomHrInputs('lthr');
  }

  const exportClone = buildExportClone(type, system);
  if (!exportClone) throw new Error('Unable to build export clone.');

  try {
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, TIMING.EXPORT_RENDER_DELAY_MS));

    const canvas = await html2canvasFn(exportClone.clone, {
      backgroundColor: '#ffffff',
      scale: EXPORT_SETTINGS.IMAGE_SCALE,
      useCORS: true,
      logging: false
    });

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Image export failed.');
    return blob;
  } finally {
    destroyExportClone(exportClone);
  }
}

async function saveZonesImage(type, system, triggerBtn = exportButton('save', type, system)) {
  if (isPrintLaunching) return;

  await commitVisibleCustomEdits();

  if (triggerBtn?.disabled) return;

  try {
    setPrintButtonsDisabled(true);
    if (triggerBtn) triggerBtn.textContent = 'Preparing...';

    const filename = `${buildExportFilename(type, system)}.png`;
    const blob = await renderZonesImage(type, system);

    if (useShareSheet()) {
      await shareImageFile(new File([blob], filename, { type: 'image/png' }), triggerBtn);
    } else {
      downloadBlob(blob, filename);
    }
  } catch (error) {
    console.error('Save image failed:', error);
    alert('Save Image failed. Check the browser console for details.');
  } finally {
    clearPrintHeaders();
    setPrintButtonsDisabled(false);
    restoreExportButtonLabels();
  }
}

function preparePrintDom(mode) {
  const showPowerDefault = mode === 'power-default';
  const showPowerCustom = mode === 'power-custom';
  const showHrDefault = mode === 'hr-default';
  const showHrCustom = mode === 'hr-custom';

  els.kjView.hidden = true;
  els.wattsView.hidden = true;
  els.timeView.hidden = true;

  els.zonesView.hidden = !(showPowerDefault || showPowerCustom);
  els.hrView.hidden = !(showHrDefault || showHrCustom);

  els.defaultPowerZonesTable.hidden = !showPowerDefault;
  els.customZonesTable.hidden = !showPowerCustom;
  els.hrDefaultPanel.hidden = !showHrDefault;
  els.hrCustomPanel.hidden = !showHrCustom;

  forcePrintLayoutFlush();
}

// Show only the chosen zone table, ready for printing. Everything is put back
// when printing finishes (afterprint), or after a timeout as a fallback.
function enterPrintMode(mode) {
  if (activePrintSession?.cleanup) {
    activePrintSession.cleanup();
  }

  isPrintLaunching = true;
  setPrintButtonsDisabled(true);

  const previousPrintMode = document.body.getAttribute('data-print-mode');
  const previousTitle = document.title;
  const previousVisibleView = document.querySelector('.view:not([hidden])') || els.wattsView;

  document.body.setAttribute('data-print-mode', mode);
  preparePrintDom(mode);

  let cleanedUp = false;
  let fallbackTimer = null;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    if (fallbackTimer) {
      clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    if (previousPrintMode === null) {
      document.body.removeAttribute('data-print-mode');
    } else {
      document.body.setAttribute('data-print-mode', previousPrintMode);
    }

    document.title = previousTitle;
    clearPrintHeaders();

    els.kjView.hidden = previousVisibleView !== els.kjView;
    els.wattsView.hidden = previousVisibleView !== els.wattsView;
    els.timeView.hidden = previousVisibleView !== els.timeView;
    els.zonesView.hidden = previousVisibleView !== els.zonesView;
    els.hrView.hidden = previousVisibleView !== els.hrView;

    if (!els.zonesView.hidden) {
      els.defaultPowerZonesTable.hidden = activeZoneSystem !== 'default';
      els.customZonesTable.hidden = activeZoneSystem !== 'custom';
    }

    if (!els.hrView.hidden) {
      els.hrDefaultPanel.hidden = activeHrSubtab !== 'default';
      els.hrCustomPanel.hidden = activeHrSubtab !== 'custom';
      refreshAllHrZoneViews();
    }

    forcePrintLayoutFlush();
    setPrintButtonsDisabled(false);
    window.removeEventListener('afterprint', cleanup);

    if (activePrintSession?.cleanup === cleanup) {
      activePrintSession = null;
    }

    isPrintLaunching = false;
  };

  activePrintSession = { mode, cleanup };

  window.addEventListener('afterprint', cleanup);

  fallbackTimer = setTimeout(() => {
    cleanup();
  }, TIMING.PRINT_FALLBACK_TIMEOUT_MS);

  const [type, system] = mode.split('-');
  document.title = buildExportFilename(type, system);

  forcePrintLayoutFlush();
}

function runScopedPrint(mode) {
  if (isPrintLaunching) return;

  enterPrintMode(mode);

  try {
    window.print();
  } catch {
    activePrintSession?.cleanup();
  }
}

// Printing from the browser's own menu (e.g. Ctrl+P) prints the zone table
// currently shown: heart rate on the HR tab, otherwise the selected power table.
function handleMenuPrint() {
  if (activePrintSession) return; // already started by a Print button

  applyVisibleCustomEdits();

  const type = els.hrView.hidden ? 'power' : 'hr';
  const system = type === 'hr' ? activeHrSubtab : activeZoneSystem;

  setZonesHeader(type, system);
  enterPrintMode(`${type}-${system}`);
}

async function printZones(type, system) {
  await commitVisibleCustomEdits();
  setZonesHeader(type, system);
  runScopedPrint(`${type}-${system}`);
}

function initCache() {
  Object.assign(els, {
    appTitle: document.getElementById('app-title'),
    btnKj: document.getElementById('btn-kj'),
    btnWatts: document.getElementById('btn-watts'),
    btnTime: document.getElementById('btn-time'),
    btnZones: document.getElementById('btn-zones'),
    btnHr: document.getElementById('btn-hr'),

    kjView: document.getElementById('kj-view'),
    wattsView: document.getElementById('watts-view'),
    timeView: document.getElementById('time-view'),
    zonesView: document.getElementById('zones-view'),
    hrView: document.getElementById('hr-view'),

    wattsIn: document.getElementById('watts-in'),
    kjHoursIn: document.getElementById('kj-hours-in'),
    kjMinutesPartIn: document.getElementById('kj-minutes-part-in'),
    kjSecondsIn: document.getElementById('kj-seconds-in'),
    kjTimeError: document.getElementById('kj-time-error'),
    newFtpKj: document.getElementById('proposed-ftp-kj'),
    kjOut: document.getElementById('kj-out'),
    kjKcal: document.getElementById('kj-kcal'),
    tssNote: document.getElementById('tss-note'),
    toggleSystemKj: document.getElementById('toggle-system-kj'),
    kjCurrentBadge: document.getElementById('kj-current-badge'),
    kjNewBadge: document.getElementById('kj-new-badge'),
    currentFtpDisplayKj: document.getElementById('current-ftp-display-kj'),

    timeKjIn: document.getElementById('time-kj-in'),
    timeWattsIn: document.getElementById('time-watts-in'),
    newFtpTime: document.getElementById('proposed-ftp-time'),
    timeOut: document.getElementById('time-out'),
    toggleSystemTime: document.getElementById('toggle-system-time'),
    timeCurrentBadge: document.getElementById('time-current-badge'),
    timeNewBadge: document.getElementById('time-new-badge'),
    currentFtpDisplayTime: document.getElementById('current-ftp-display-time'),

    kjIn: document.getElementById('kj-in'),
    wattsHoursIn: document.getElementById('watts-hours-in'),
    wattsMinutesPartIn: document.getElementById('watts-minutes-part-in'),
    wattsSecondsIn: document.getElementById('watts-seconds-in'),
    wattsTimeError: document.getElementById('watts-time-error'),
    newFtpWatts: document.getElementById('proposed-ftp-watts'),
    wattsOut: document.getElementById('watts-out'),
    toggleSystemWatts: document.getElementById('toggle-system-watts'),
    wattsCurrentBadge: document.getElementById('watts-current-badge'),
    wattsNewBadge: document.getElementById('watts-new-badge'),
    currentFtpDisplayWatts: document.getElementById('current-ftp-display-watts'),

    ftpIn: document.getElementById('ftp-in'),
    weightUnit: document.getElementById('weight-unit'),
    weightUnitLbl: document.getElementById('weight-unit-lbl'),
    weightIn: document.getElementById('weight-in'),
    wkgOut: document.getElementById('wkg-out'),

    subBtnDefaultPower: document.getElementById('sub-btn-default-power'),
    subBtnCustomPower: document.getElementById('sub-btn-custom-power'),
    defaultPowerZonesTable: document.getElementById('default-power-zones-table'),
    customZonesTable: document.getElementById('custom-zones-table'),
    defaultPowerTableBody: document.getElementById('default-power-table-body'),
    customTableBody: document.getElementById('custom-table-body'),
    resetCustomZones: document.getElementById('reset-custom-zones'),
    customZoneError: document.getElementById('custom-zone-error'),
    printHeaderDefaultPower: document.getElementById('print-header-default-power'),
    printHeaderCustomPower: document.getElementById('print-header-custom-power'),

    hrMaxIn: document.getElementById('hr-max-in'),
    hrLthrIn: document.getElementById('hr-lthr-in'),
    hrSubBtnDefault: document.getElementById('hr-sub-btn-default'),
    hrSubBtnCustom: document.getElementById('hr-sub-btn-custom'),
    hrDefaultPanel: document.getElementById('hr-default-panel'),
    hrCustomPanel: document.getElementById('hr-custom-panel'),
    hrDefaultMaxScroll: document.getElementById('hr-default-max-scroll'),
    hrDefaultLthrScroll: document.getElementById('hr-default-lthr-scroll'),
    hrCustomMaxScroll: document.getElementById('hr-custom-max-scroll'),
    hrCustomLthrScroll: document.getElementById('hr-custom-lthr-scroll'),
    resetCustomHr: document.getElementById('reset-custom-hr'),
    customHrError: document.getElementById('custom-hr-error'),
    hrInputError: document.getElementById('hr-input-error'),
    printHeaderDefaultHr: document.getElementById('print-header-default-hr'),
    printHeaderCustomHr: document.getElementById('print-header-custom-hr')
  });
}

function applyInputLimits() {
  [els.hrMaxIn, els.hrLthrIn].forEach(el => {
    if (el) el.min = String(LIMITS.HR_INPUT_MIN);
  });

  [
    els.kjMinutesPartIn,
    els.kjSecondsIn,
    els.wattsMinutesPartIn,
    els.wattsSecondsIn
  ].forEach(el => {
    if (el) el.max = String(LIMITS.TIME_PART_MAX);
  });

  [
    [POWER_INPUT_CLASS, LIMITS.POWER_ZONE_PERCENT_MAX],
    [HR_METRICS.max.inputClass, HR_METRICS.max.cap],
    [HR_METRICS.lthr.inputClass, HR_METRICS.lthr.cap]
  ].forEach(([className, max]) => {
    document.querySelectorAll(`.${className}`).forEach(el => {
      el.min = '1';
      el.max = String(max);
      el.step = '1';
    });
  });
}

// Listen for edits on a table's inputs (once per container).
function bindZoneEditInputs(container, selector, onChange, onInput = null) {
  if (!container || container.dataset.bound === 'true') return;
  container.dataset.bound = 'true';

  container.addEventListener('change', (e) => {
    const input = e.target.closest(selector);
    if (!input) return;

    sanitizeInput(input, 0);
    onChange(input);
  });

  if (onInput) {
    container.addEventListener('input', (e) => {
      const input = e.target.closest(selector);
      if (input) onInput(input);
    });
  }
}

function bindCustomZoneInputs() {
  // Remember the last power input touched so a pending edit can be applied
  // before printing or saving an image.
  const remember = input => { lastChangedCustomPowerInput = input; };

  bindZoneEditInputs(els.customZonesTable, `.${POWER_INPUT_CLASS}`, input => {
    remember(input);
    validateAndApplyCustomZones(input);
  }, remember);
}

function bindCustomHrInlineInputs() {
  bindZoneEditInputs(
    els.hrCustomPanel,
    `.${HR_METRICS.max.inputClass}, .${HR_METRICS.lthr.inputClass}`,
    input => validateAndApplyCustomHR(input)
  );
}

function bindTablistKeyboard(selector, activate) {
  const tabs = [...document.querySelectorAll(selector)];

  tabs.forEach((tab, index) => {
    tab.addEventListener('keydown', (e) => {
      let nextIndex = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIndex = 0;
      else if (e.key === 'End') nextIndex = tabs.length - 1;

      if (nextIndex === null) return;

      e.preventDefault();
      tabs[nextIndex].focus();
      activate(tabs[nextIndex]);
    });
  });
}

function syncHorizontalScroll(elA, elB) {
  if (!elA || !elB) return;

  let activeSource = null;
  let rafId = null;
  let interactionTimer = null;

  const setActiveSource = (source) => {
    activeSource = source;

    if (interactionTimer) clearTimeout(interactionTimer);
    interactionTimer = setTimeout(() => {
      activeSource = null;
    }, TIMING.SCROLL_SYNC_IDLE_MS);
  };

  const applySync = () => {
    if (!activeSource) {
      rafId = null;
      return;
    }

    const target = activeSource === elA ? elB : elA;
    if (Math.abs(target.scrollLeft - activeSource.scrollLeft) > 1) {
      target.scrollLeft = activeSource.scrollLeft;
    }

    rafId = null;
  };

  const queueSync = (source) => {
    if (activeSource && activeSource !== source) return;

    setActiveSource(source);

    if (rafId !== null) return;
    rafId = requestAnimationFrame(applySync);
  };

  const bindSource = (source) => {
    const activate = () => setActiveSource(source);

    source.addEventListener('touchstart', activate, { passive: true });
    source.addEventListener('pointerdown', activate, { passive: true });
    source.addEventListener('scroll', () => queueSync(source), { passive: true });
  };

  bindSource(elA);
  bindSource(elB);
}

function resetPairedHorizontalScroll(elA, elB) {
  if (elA) elA.scrollLeft = 0;
  if (elB) elB.scrollLeft = 0;
}

function enableDirectionalTableScroll(selector = '.power-matrix-scroll') {
  const scrollers = [...document.querySelectorAll(selector)];
  let activeDrag = null;

  const clearActiveDrag = () => {
    if (!activeDrag) return;
    activeDrag.scroller.classList.remove('dragging-scroll');
    activeDrag = null;
  };

  scrollers.forEach(scroller => {
    scroller.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;

      const interactive = e.target.closest('input, button, select, label');
      if (interactive) return;

      activeDrag = {
        scroller,
        startX: e.clientX,
        startScrollLeft: scroller.scrollLeft
      };

      scroller.classList.add('dragging-scroll');
      e.preventDefault();
    });
  });

  window.addEventListener('mousemove', (e) => {
    if (!activeDrag) return;

    const dx = e.clientX - activeDrag.startX;
    activeDrag.scroller.scrollLeft = activeDrag.startScrollLeft - dx;
  });

  window.addEventListener('mouseup', clearActiveDrag);
  window.addEventListener('blur', clearActiveDrag);
}

function bindEvents() {
  bindGlobalSelectOnFocus(document);

  document.querySelectorAll('[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('[data-zone-subtab]').forEach(btn => {
    btn.addEventListener('click', () => setActiveZoneSystem(btn.dataset.zoneSubtab));
  });

  document.querySelectorAll('[data-hr-subtab]').forEach(btn => {
    btn.addEventListener('click', () => setHrSubtab(btn.dataset.hrSubtab));
  });

  bindTablistKeyboard('[data-tab]', tab => switchTab(tab.dataset.tab));
  bindTablistKeyboard('[data-zone-subtab]', tab => setActiveZoneSystem(tab.dataset.zoneSubtab));
  bindTablistKeyboard('[data-hr-subtab]', tab => setHrSubtab(tab.dataset.hrSubtab));

  [els.toggleSystemKj, els.toggleSystemWatts, els.toggleSystemTime].forEach(btn => {
    btn.addEventListener('click', toggleActiveSystem);
  });

  els.resetCustomZones.addEventListener('click', resetCustomZones);
  els.resetCustomHr.addEventListener('click', resetCustomHR);

  ZONE_EXPORTS.forEach(([type, system]) => {
    exportButton('print', type, system).addEventListener('click', () => onExportClick('print', type, system));
    exportButton('save', type, system).addEventListener('click', () => onExportClick('save', type, system));
  });
  window.addEventListener('beforeprint', handleMenuPrint);

  addInputListeners([els.wattsIn, els.kjHoursIn, els.kjMinutesPartIn, els.kjSecondsIn], calcKJ);
  addInputListeners([els.kjIn, els.wattsHoursIn, els.wattsMinutesPartIn, els.wattsSecondsIn], calcWatts);
  addInputListeners([els.timeKjIn, els.timeWattsIn], calcTime);

  els.ftpIn.addEventListener('input', updateZones);
  els.weightIn.addEventListener('input', updateZones);

  els.weightUnit.addEventListener('change', () => {
    syncDropdowns();
    updateZones();
    savePrimitive(STORAGE_KEYS.UNIT, els.weightUnit.value);
  });

  const syncProposed = (e) => setNewFTP(e.target.value, false);
  [els.newFtpKj, els.newFtpWatts, els.newFtpTime].filter(Boolean).forEach(el => {
    el.addEventListener('input', syncProposed);
  });

  addInputListeners([els.hrMaxIn, els.hrLthrIn], () => refreshAllHrZoneViews());

  persistOnCommit(els.ftpIn, STORAGE_KEYS.FTP, 0, updateZones);
  persistOnCommit(els.weightIn, STORAGE_KEYS.WEIGHT, 1, updateZones);
  bindPersistOnCommit([[els.hrMaxIn, STORAGE_KEYS.HR_MAX], [els.hrLthrIn, STORAGE_KEYS.HR_LTHR]], 0, () => {
    updateHRZones();
    validateAndApplyCustomHR();
  });
  bindPersistOnCommit(
    [els.newFtpKj, els.newFtpWatts, els.newFtpTime].map(el => [el, STORAGE_KEYS.NEW_FTP]),
    0,
    clean => setNewFTP(clean, false)
  );

  bindPersistOnCommit([
    [els.kjHoursIn, STORAGE_KEYS.FIND_KJ_HOURS],
    [els.kjMinutesPartIn, STORAGE_KEYS.FIND_KJ_MINUTES_PART],
    [els.kjSecondsIn, STORAGE_KEYS.FIND_KJ_SECONDS]
  ], 0, calcKJ);

  bindPersistOnCommit([
    [els.wattsHoursIn, STORAGE_KEYS.FIND_WATTS_HOURS],
    [els.wattsMinutesPartIn, STORAGE_KEYS.FIND_WATTS_MINUTES_PART],
    [els.wattsSecondsIn, STORAGE_KEYS.FIND_WATTS_SECONDS]
  ], 0, calcWatts);

  bindPersistOnInput(savedWholeNumberInputs().concat([
    [els.newFtpKj, STORAGE_KEYS.NEW_FTP],
    [els.newFtpWatts, STORAGE_KEYS.NEW_FTP],
    [els.newFtpTime, STORAGE_KEYS.NEW_FTP]
  ]));

  bindPersistOnInput([[els.weightIn, STORAGE_KEYS.WEIGHT]], 1);
}

// Inputs whose whole-number values are remembered between visits.
function savedWholeNumberInputs() {
  return [
    [els.ftpIn, STORAGE_KEYS.FTP],
    [els.hrMaxIn, STORAGE_KEYS.HR_MAX],
    [els.hrLthrIn, STORAGE_KEYS.HR_LTHR],
    [els.wattsIn, STORAGE_KEYS.FIND_KJ_AVG_WATTS],
    [els.kjIn, STORAGE_KEYS.FIND_WATTS_TOTAL_KJ],
    [els.timeKjIn, STORAGE_KEYS.FIND_TIME_TOTAL_KJ],
    [els.timeWattsIn, STORAGE_KEYS.FIND_TIME_AVG_WATTS],
    [els.kjHoursIn, STORAGE_KEYS.FIND_KJ_HOURS],
    [els.kjMinutesPartIn, STORAGE_KEYS.FIND_KJ_MINUTES_PART],
    [els.kjSecondsIn, STORAGE_KEYS.FIND_KJ_SECONDS],
    [els.wattsHoursIn, STORAGE_KEYS.FIND_WATTS_HOURS],
    [els.wattsMinutesPartIn, STORAGE_KEYS.FIND_WATTS_MINUTES_PART],
    [els.wattsSecondsIn, STORAGE_KEYS.FIND_WATTS_SECONDS]
  ];
}

function loadSavedValues() {
  savedWholeNumberInputs().forEach(([el, key]) => {
    const value = safeStorageGet(key);
    if (value !== null && el) el.value = String(wholeNumber(clampNonNegative(value)));
  });

  const weight = safeStorageGet(STORAGE_KEYS.WEIGHT);
  if (weight !== null && els.weightIn) els.weightIn.value = String(clampNonNegative(weight));

  const unit = safeStorageGet(STORAGE_KEYS.UNIT);
  if ((unit === 'lbs' || unit === 'kg') && els.weightUnit) {
    els.weightUnit.value = unit;
  }

  setNewFTP(safeStorageGet(STORAGE_KEYS.NEW_FTP) || '', false);
  syncDropdowns();

  const system = safeStorageGet(STORAGE_KEYS.ACTIVE_SYSTEM);
  const initialSystem = ['default', 'custom'].includes(system) ? system : 'default';

  setActiveZoneSystem(initialSystem, false);
  setHrSubtab('default');
}

window.addEventListener('DOMContentLoaded', () => {
  initCache();
  applyInputLimits();
  generateDefaultTables();

  bindEvents();
  loadSavedValues();

  updateZones();
  calcKJ();
  calcWatts();
  calcTime();

  requestAnimationFrame(() => {
    generateCustomZonesTable();
    renderHrTables();
    bindCustomZoneInputs();
    bindCustomHrInlineInputs();

    syncHorizontalScroll(els.hrDefaultMaxScroll, els.hrDefaultLthrScroll);
    syncHorizontalScroll(els.hrCustomMaxScroll, els.hrCustomLthrScroll);
    resetPairedHorizontalScroll(els.hrDefaultMaxScroll, els.hrDefaultLthrScroll);
    resetPairedHorizontalScroll(els.hrCustomMaxScroll, els.hrCustomLthrScroll);

    enableDirectionalTableScroll();

    setHrSubtab('default');
  });

  preloadHtml2Canvas();
});
