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

function getAllExportButtons() {
  return [
    els.printDefaultPowerZones,
    els.printCustomPowerZones,
    els.printDefaultHrZones,
    els.printCustomHrZones,
    els.saveDefaultPowerImage,
    els.saveCustomPowerImage,
    els.saveDefaultHrImage,
    els.saveCustomHrImage
  ].filter(Boolean);
}

function getAllImageExportButtons() {
  return [
    els.saveDefaultPowerImage,
    els.saveCustomPowerImage,
    els.saveDefaultHrImage,
    els.saveCustomHrImage
  ].filter(Boolean);
}

function deepClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}
function clampNonNegative(value) { const n = parseFloat(value); return Number.isFinite(n) && n >= 0 ? n : 0; }

function wholeNumber(value) { return Math.round(value); }

async function commitVisibleCustomEdits() {
  await new Promise(resolve => requestAnimationFrame(resolve));

  if (!els.customZonesTable.hidden) {
    validateAndApplyCustomZones(lastChangedCustomPowerInput);
  }

  if (!els.hrCustomPanel.hidden) {
    validateAndApplyCustomHR();
  }
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

  function normalizeField(field) {
    return source[field] == null
      ? defaults[field]
      : wholeNumber(clampNonNegative(source[field]));
  }

  return {
    z1: normalizeField('z1'),
    z2: normalizeField('z2'),
    z3: normalizeField('z3'),
    ssMin: normalizeField('ssMin'),
    ssMax: normalizeField('ssMax'),
    z4: normalizeField('z4'),
    z5: normalizeField('z5'),
    z6: normalizeField('z6')
  };
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

function mainZoneOrder() {
  return ['z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7'];
}

function syncMainZoneDisplayRanges(ranges) {
  const out = deepClone(ranges);
  const order = mainZoneOrder();

  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const curr = order[i];

    if (out[prev].max != null && out[curr].min != null) {
      out[curr].min = out[prev].max + 1;
    }
  }

  return out;
}

function applyMainZoneBoundaryEdit(ranges, zoneId, side, rawValue) {
  const out = deepClone(ranges);
  const value = wholeNumber(clampNonNegative(rawValue));
  const order = mainZoneOrder();
  const index = order.indexOf(zoneId);

  if (index === -1) return out;

  if (side === 'max') {
    out[zoneId].max = value;

    if (index < order.length - 1) {
      const nextZone = order[index + 1];
      if (out[nextZone].min != null) out[nextZone].min = value + 1;
    }
  }

  if (side === 'min') {
    out[zoneId].min = value;

    if (index > 0) {
      const prevZone = order[index - 1];
      if (out[prevZone].max != null) out[prevZone].max = value - 1;
    }
  }

  return syncMainZoneDisplayRanges(out);
}

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

function writeCustomZoneRangeInputs(ranges) {
  document.querySelectorAll('.custom-zone-range-input').forEach(input => {
    const zone = input.dataset.zone;
    const side = input.dataset.side;

    if (!ranges[zone] || !(side in ranges[zone])) return;

    const next = ranges[zone][side] == null ? '' : String(ranges[zone][side]);

    if (document.activeElement !== input && input.value !== next) {
      input.value = next;
    }
  });
}

function readCustomPowerRangesFromInputs() {
  const current = displayRangesFromAnchors(customPowerAnchors);

  document.querySelectorAll('.custom-zone-range-input').forEach(input => {
    const zone = input.dataset.zone;
    const side = input.dataset.side;
    const value = wholeNumber(clampNonNegative(input.value));

    if (current[zone] && side in current[zone]) {
      current[zone][side] = value;
    }
  });

  return current;
}

function buildDeterministicPowerRangesFromInputs(changedInput, currentAnchors) {
  let nextRanges = displayRangesFromAnchors(currentAnchors);

  const zone = changedInput.dataset.zone;
  const side = changedInput.dataset.side;
  const value = wholeNumber(clampNonNegative(changedInput.value));

  if (zone === 'ss') {
    nextRanges.ss[side] = value;
    return nextRanges;
  }

  nextRanges = applyMainZoneBoundaryEdit(nextRanges, zone, side, value);
  return nextRanges;
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
  const ranges = displayRangesFromAnchors(anchors);

  if (!(ranges.z1.max > 0)) {
    return 'Custom Power Zones: Zone 1 must end at 1% or higher.';
  }

  if (!(ranges.z2.min > 0 && ranges.z2.max > 0)) {
    return 'Custom Power Zones: Zone 2 must have valid start and end values.';
  }
  if (!(ranges.z2.min < ranges.z2.max)) {
    return 'Custom Power Zones: Zone 2 must end above its start value.';
  }

  if (!(ranges.z3.min > 0 && ranges.z3.max > 0)) {
    return 'Custom Power Zones: Zone 3 must have valid start and end values.';
  }
  if (!(ranges.z3.min < ranges.z3.max)) {
    return 'Custom Power Zones: Zone 3 must end above its start value.';
  }

  if (!(ranges.ss.min > 0 && ranges.ss.max > 0)) {
    return 'Custom Power Zones: Sweet Spot must have valid lower and upper values.';
  }
  if (!(ranges.ss.min < ranges.ss.max)) {
    return 'Custom Power Zones: Sweet Spot upper value must be greater than its lower value.';
  }

  if (!(ranges.z4.min > 0 && ranges.z4.max > 0)) {
    return 'Custom Power Zones: Zone 4 must have valid start and end values.';
  }
  if (!(ranges.z4.min < ranges.z4.max)) {
    return 'Custom Power Zones: Zone 4 must end above its start value.';
  }

  if (!(ranges.z5.min > 0 && ranges.z5.max > 0)) {
    return 'Custom Power Zones: Zone 5 must have valid start and end values.';
  }
  if (!(ranges.z5.min < ranges.z5.max)) {
    return 'Custom Power Zones: Zone 5 must end above its start value.';
  }

  if (!(ranges.z6.min > 0 && ranges.z6.max > 0)) {
    return 'Custom Power Zones: Zone 6 must have valid start and end values.';
  }
  if (!(ranges.z6.min < ranges.z6.max)) {
    return 'Custom Power Zones: Zone 6 must end above its start value.';
  }

  if (!(ranges.z7.min > 0)) {
    return 'Custom Power Zones: Zone 7 must start at 1% or higher.';
  }

  if (ranges.z2.min !== ranges.z1.max + 1) {
    return 'Custom Power Zones: Zone 2 must start exactly 1 point above Zone 1.';
  }
  if (ranges.z3.min !== ranges.z2.max + 1) {
    return 'Custom Power Zones: Zone 3 must start exactly 1 point above Zone 2.';
  }
  if (ranges.z4.min !== ranges.z3.max + 1) {
    return 'Custom Power Zones: Zone 4 must start exactly 1 point above Zone 3.';
  }
  if (ranges.z5.min !== ranges.z4.max + 1) {
    return 'Custom Power Zones: Zone 5 must start exactly 1 point above Zone 4.';
  }
  if (ranges.z6.min !== ranges.z5.max + 1) {
    return 'Custom Power Zones: Zone 6 must start exactly 1 point above Zone 5.';
  }
  if (ranges.z7.min !== ranges.z6.max + 1) {
    return 'Custom Power Zones: Zone 7 must start exactly 1 point above Zone 6.';
  }

  return '';
}

function normalizeHrAnchors(value) {
  const source = value && typeof value === 'object' ? value : {};
  const defaults = defaultHrPercentConfig;

  function pick(raw, fallback, cap) {
    if (raw == null || raw === '') return fallback;
    return wholeNumber(Math.min(clampNonNegative(raw), cap));
  }

  function normalizeMetric(metricName, cap) {
    const sourceMetric = source[metricName] && typeof source[metricName] === 'object' ? source[metricName] : {};
    const defaultMetric = defaults[metricName];

    return {
      z1: {
        min: null,
        max: pick(sourceMetric.z1?.max, defaultMetric.z1.max, cap)
      },
      z2: {
        min: pick(sourceMetric.z2?.min, defaultMetric.z2.min, cap),
        max: pick(sourceMetric.z2?.max, defaultMetric.z2.max, cap)
      },
      z3: {
        min: pick(sourceMetric.z3?.min, defaultMetric.z3.min, cap),
        max: pick(sourceMetric.z3?.max, defaultMetric.z3.max, cap)
      },
      z4: {
        min: pick(sourceMetric.z4?.min, defaultMetric.z4.min, cap),
        max: pick(sourceMetric.z4?.max, defaultMetric.z4.max, cap)
      },
      z5: {
        min: pick(sourceMetric.z5?.min, defaultMetric.z5.min, cap),
        max: null
      }
    };
  }

  return {
    max: normalizeMetric('max', LIMITS.HR_MAX_PERCENT_CAP),
    lthr: normalizeMetric('lthr', LIMITS.HR_LTHR_PERCENT_CAP)
  };
}

function validateHrAnchorSet(values, maxHr, lthr) {
  if (maxHr > 0 && lthr > 0 && lthr > maxHr) {
    return 'Lactate Threshold HR cannot be higher than Max HR.';
  }

  function validateMetric(metric, label, cap) {
    const z1 = metric.z1;
    const z2 = metric.z2;
    const z3 = metric.z3;
    const z4 = metric.z4;
    const z5 = metric.z5;

    if (!(z1.max > 0 && z1.max <= cap)) {
      return `${label}: Zone 1 must end between 1% and ${cap}%.`;
    }

    if (!(z2.min > 0 && z2.max > 0 && z2.min <= cap && z2.max <= cap)) {
      return `${label}: Zone 2 must have start and end values between 1% and ${cap}%.`;
    }
    if (!(z2.min < z2.max)) {
      return `${label}: Zone 2 must end above its start value.`;
    }

    if (!(z3.min > 0 && z3.max > 0 && z3.min <= cap && z3.max <= cap)) {
      return `${label}: Zone 3 must have start and end values between 1% and ${cap}%.`;
    }
    if (!(z3.min < z3.max)) {
      return `${label}: Zone 3 must end above its start value.`;
    }

    if (!(z4.min > 0 && z4.max > 0 && z4.min <= cap && z4.max <= cap)) {
      return `${label}: Zone 4 must have start and end values between 1% and ${cap}%.`;
    }
    if (!(z4.min < z4.max)) {
      return `${label}: Zone 4 must end above its start value.`;
    }

    if (!(z5.min > 0 && z5.min <= cap)) {
      return `${label}: Zone 5 must start between 1% and ${cap}%.`;
    }

    if (z2.min !== z1.max + 1) {
      return `${label}: Zone 2 must start exactly 1 point above Zone 1.`;
    }

    if (z3.min !== z2.max + 1) {
      return `${label}: Zone 3 must start exactly 1 point above Zone 2.`;
    }

    if (z4.min !== z3.max + 1) {
      return `${label}: Zone 4 must start exactly 1 point above Zone 3.`;
    }

    if (z5.min !== z4.max + 1) {
      return `${label}: Zone 5 must start exactly 1 point above Zone 4.`;
    }

    return '';
  }

  const maxError = validateMetric(values.max, 'Custom Max HR', LIMITS.HR_MAX_PERCENT_CAP);
  if (maxError) return maxError;

  const lthrError = validateMetric(values.lthr, 'Custom LTHR', LIMITS.HR_LTHR_PERCENT_CAP);
  if (lthrError) return lthrError;

  if (maxHr > 0 && lthr > 0) {
    const maxAllowedPct = Math.floor((maxHr / lthr) * 100);

    if (
      values.lthr.z1.max > maxAllowedPct ||
      values.lthr.z2.min > maxAllowedPct ||
      values.lthr.z2.max > maxAllowedPct ||
      values.lthr.z3.min > maxAllowedPct ||
      values.lthr.z3.max > maxAllowedPct ||
      values.lthr.z4.min > maxAllowedPct ||
      values.lthr.z4.max > maxAllowedPct ||
      values.lthr.z5.min > maxAllowedPct
    ) {
      return 'Custom LTHR: One or more zone values would calculate above your Max HR. Increase Max HR or lower the LTHR percentages.';
    }
  }

  return '';
}

function loadCustomPowerAnchors() {
  const parsed = safeStorageGetJSON(STORAGE_KEYS.CUSTOM_ZONES);
  if (!parsed) return defaultPowerAnchors();

  const candidate = parsed && parsed.version === 2 && parsed.anchors
    ? normalizePowerAnchors(parsed.anchors)
    : parsed && parsed.anchors
      ? normalizePowerAnchors(parsed.anchors)
      : normalizePowerAnchors(parsed);

  return validatePowerAnchors(candidate) ? defaultPowerAnchors() : candidate;
}

function saveCustomPowerAnchors() {
  saveField(STORAGE_KEYS.CUSTOM_ZONES, { version: 2, anchors: customPowerAnchors });
}

function loadCustomHrAnchors() {
  const parsed = safeStorageGetJSON(STORAGE_KEYS.CUSTOM_HR);
  if (!parsed) return deepClone(defaultHrPercentConfig);

  const candidate = parsed && parsed.version === 3 && parsed.anchors
    ? normalizeHrAnchors(parsed.anchors)
    : parsed && parsed.anchors
      ? normalizeHrAnchors(parsed.anchors)
      : normalizeHrAnchors(parsed);

  return validateHrAnchorSet(candidate, 0, 0) ? deepClone(defaultHrPercentConfig) : candidate;
}

function saveCustomHrAnchors() {
  saveField(STORAGE_KEYS.CUSTOM_HR, { version: 3, anchors: customHrAnchors });
}

let customPowerAnchors = loadCustomPowerAnchors();
let customHrAnchors = loadCustomHrAnchors();

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

function getMainZoneWattRanges(ftp, system = activeZoneSystem) {
  if (!(ftp > 0)) return [];

  const zones = getZonesConfigForSystem(system).filter(z => z.id !== 'ss');
  const out = [];
  let previousMax = null;

  for (const z of zones) {
    const rawMax = z.max === null ? null : wholeNumber(ftp * z.max);

    let minW;
    let maxW;

    if (z.id === 'z1') {
      minW = 0;
      maxW = rawMax;
    } else if (z.max === null) {
      minW = previousMax + 1;
      maxW = null;
    } else {
      minW = previousMax + 1;
      maxW = rawMax;
    }

    out.push({
      ...z,
      minW,
      maxW
    });

    if (maxW !== null) previousMax = maxW;
  }

  return out;
}

function getMainZonePctDisplayRanges(system = activeZoneSystem) {
  const zones = getZonesConfigForSystem(system).filter(z => z.id !== 'ss');
  const out = [];
  let previousMaxPct = null;

  for (const z of zones) {
    const rawMaxPct = z.max === null ? null : Math.round(z.max * 100);

    let minPctDisplay;
    let maxPctDisplay;

    if (z.id === 'z1') {
      minPctDisplay = null;
      maxPctDisplay = rawMaxPct;
    } else if (z.max === null) {
      minPctDisplay = previousMaxPct + 1;
      maxPctDisplay = null;
    } else {
      minPctDisplay = previousMaxPct + 1;
      maxPctDisplay = rawMaxPct;
    }

    out.push({
      id: z.id,
      minPctDisplay,
      maxPctDisplay
    });

    if (maxPctDisplay !== null) previousMaxPct = maxPctDisplay;
  }

  return out;
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

function cacheDefaultPowerCells() {
  powerCellCache.default = {};

  defaultZonesConfig.forEach(z => {
    powerCellCache.default[z.id] = {
      pct: document.getElementById(powerCellId('p', z.id, 'pct-range')),
      range: document.getElementById(powerCellId('p', z.id, 'range')),
      targetPct: document.getElementById(powerCellId('p', z.id, 'target-pct')),
      target: document.getElementById(powerCellId('p', z.id, 'target'))
    };
  });
}

function cacheCustomPowerCells() {
  powerCellCache.custom = {};

  getCustomZonesConfig().forEach(z => {
    powerCellCache.custom[z.id] = {
      range: document.getElementById(powerCellId('c', z.id, 'range')),
      targetPct: document.getElementById(powerCellId('c', z.id, 'target-pct')),
      target: document.getElementById(powerCellId('c', z.id, 'target'))
    };
  });
}

function sanitizeInput(el, decimals = 0) {
  const raw = String(el.value ?? '').trim();
  if (raw === '') return 0;

  const value = clampNonNegative(raw);
  el.value = decimals > 0
    ? value.toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
    : String(wholeNumber(value));
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

  const buttonText = labelMap[val];
  els.toggleSystemKj.textContent = buttonText;
  els.toggleSystemWatts.textContent = buttonText;
  els.toggleSystemTime.textContent = buttonText;

  els.toggleSystemKj.setAttribute('aria-pressed', String(isCustom));
  els.toggleSystemWatts.setAttribute('aria-pressed', String(isCustom));
  els.toggleSystemTime.setAttribute('aria-pressed', String(isCustom));

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

function generateDefaultTables() {
  const zoneHeaderCells = defaultZonesConfig.map(z => {
    const shortLabel = z.id === 'ss' ? 'SS' : z.label.replace('Zone ', '');
    return `
      <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
        <div class="zone-top ${z.id === 'ss' ? 'ss' : ''}">${shortLabel}</div>
        <span class="zone-sub">${z.desc}</span>
      </td>
    `;
  }).join('');

  const rangePctCells = defaultZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value" id="${powerCellId('p', z.id, 'pct-range')}">—</div>
    </td>
  `).join('');

  const rangeWattCells = defaultZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value" id="${powerCellId('p', z.id, 'range')}">—</div>
    </td>
  `).join('');

  const targetPctCells = defaultZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value" id="${powerCellId('p', z.id, 'target-pct')}">${Math.round(z.target * 100)}%</div>
    </td>
  `).join('');

  const targetWattCells = defaultZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value-large" id="${powerCellId('p', z.id, 'target')}">—</div>
    </td>
  `).join('');

  els.defaultPowerTableBody.innerHTML = `
    <tr>
      <th class="row-label">Zone</th>
      ${zoneHeaderCells}
    </tr>
    <tr>
      <th class="row-label">Range (%)</th>
      ${rangePctCells}
    </tr>
    <tr>
      <th class="row-label">Range (W)</th>
      ${rangeWattCells}
    </tr>
    <tr>
      <th class="row-label">Target (%)</th>
      ${targetPctCells}
    </tr>
    <tr>
      <th class="row-label">Target (W)</th>
      ${targetWattCells}
    </tr>
  `;

  cacheDefaultPowerCells();
}

function generateCustomZonesTable() {
  const displayRanges = displayRangesFromAnchors(customPowerAnchors);
  const customZonesConfig = getCustomZonesConfig();

  const zoneHeaderCells = customZonesConfig.map(z => {
    const shortLabel = z.id === 'ss' ? 'SS' : z.label.replace('Zone ', '');
    return `
      <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
        <div class="zone-top ${z.id === 'ss' ? 'ss' : ''}">${shortLabel}</div>
        <span class="zone-sub">${z.desc}</span>
      </td>
    `;
  }).join('');

  const editCells = customZonesConfig.map(z => {
    const r = displayRanges[z.id];
    let inputHtml = '';

    if (z.id === 'z1') {
      inputHtml = `
        <div class="matrix-input-wrap">
          <span>≤</span>
          <input class="input-small numeric-input custom-zone-range-input" data-zone="${z.id}" data-side="max" type="number" inputmode="numeric" enterkeyhint="done" min="1" max="${LIMITS.POWER_ZONE_PERCENT_MAX}" step="1" value="${r.max}" aria-label="${z.label} maximum percentage">
          <span>%</span>
        </div>
      `;
    } else if (z.id === 'z7') {
      inputHtml = `
        <div class="matrix-input-wrap">
          <span>≥</span>
          <input class="input-small numeric-input custom-zone-range-input" data-zone="${z.id}" data-side="min" type="number" inputmode="numeric" enterkeyhint="done" min="1" max="${LIMITS.POWER_ZONE_PERCENT_MAX}" step="1" value="${r.min}" aria-label="${z.label} minimum percentage">
          <span>%</span>
        </div>
      `;
    } else {
      inputHtml = `
        <div class="matrix-input-wrap matrix-input-dual">
          <input class="input-small numeric-input custom-zone-range-input" data-zone="${z.id}" data-side="min" type="number" inputmode="numeric" min="1" enterkeyhint="done" max="${LIMITS.POWER_ZONE_PERCENT_MAX}" step="1" value="${r.min}" aria-label="${z.label} minimum percentage">
          <span>to</span>
          <input class="input-small numeric-input custom-zone-range-input" data-zone="${z.id}" data-side="max" type="number" inputmode="numeric" min="1" enterkeyhint="done" max="${LIMITS.POWER_ZONE_PERCENT_MAX}" step="1" value="${r.max}" aria-label="${z.label} maximum percentage">
          <span>%</span>
        </div>
      `;
    }

    return `<td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">${inputHtml}</td>`;
  }).join('');

  const rangeWattCells = customZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value" id="${powerCellId('c', z.id, 'range')}">—</div>
    </td>
  `).join('');

  const targetPctCells = customZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value" id="${powerCellId('c', z.id, 'target-pct')}">—</div>
     </td>
  `).join('');

  const targetWattCells = customZonesConfig.map(z => `
    <td class="zone-cell-matrix" style="background: ${zoneCellBg(z)};">
      <div class="zone-value-large" id="${powerCellId('c', z.id, 'target')}">—</div>
    </td>
  `).join('');

  els.customTableBody.innerHTML = `
    <tr>
      <th class="row-label">Zone</th>
      ${zoneHeaderCells}
    </tr>
    <tr>
      <th class="row-label">Custom Range (%)</th>
      ${editCells}
    </tr>
    <tr>
      <th class="row-label">Range (W)</th>
      ${rangeWattCells}
    </tr>
    <tr>
      <th class="row-label">Target (%)</th>
      ${targetPctCells}
    </tr>
    <tr>
      <th class="row-label">Target (W)</th>
      ${targetWattCells}
    </tr>
  `;

  cacheCustomPowerCells();
  applyInputLimits();
}

function buildCustomPowerCandidateFromInput(changedInput, currentAnchors) {
  const nextRanges = buildDeterministicPowerRangesFromInputs(changedInput, currentAnchors);
  return anchorsFromSyncedDisplayRanges(nextRanges, currentAnchors);
}

function buildCustomPowerCandidateFromAllInputs(currentAnchors) {
  const rawRanges = readCustomPowerRangesFromInputs();
  return anchorsFromSyncedDisplayRanges(syncMainZoneDisplayRanges(rawRanges), currentAnchors);
}

function commitCustomPowerAnchors(nextAnchors) {
  customPowerAnchors = nextAnchors;
  saveCustomPowerAnchors();
  updateZones();
}

function validateAndApplyCustomZones(changedInput = null) {
  const effectiveInput = changedInput || lastChangedCustomPowerInput;

  const candidateAnchors = effectiveInput
    ? buildCustomPowerCandidateFromInput(effectiveInput, customPowerAnchors)
    : buildCustomPowerCandidateFromAllInputs(customPowerAnchors);

  const error = validatePowerAnchors(candidateAnchors);
  els.customZoneError.textContent = error;

  if (error) {
    writeCustomZoneRangeInputs(displayRangesFromAnchors(customPowerAnchors));
    return;
  }

  commitCustomPowerAnchors(candidateAnchors);
  writeCustomZoneRangeInputs(displayRangesFromAnchors(customPowerAnchors));
}

function updateFtpDisplays(ftp) {
  els.currentFtpDisplayKj.textContent = `${wholeNumber(ftp)}W`;
  els.currentFtpDisplayWatts.textContent = `${wholeNumber(ftp)}W`;
  els.currentFtpDisplayTime.textContent = `${wholeNumber(ftp)}W`;
}

function updateWkg(ftp, weight, unit) {
  const weightKg = unit === 'lbs' ? weight / CONVERSION.LB_PER_KG : weight;
  els.wkgOut.textContent = (weightKg > 0 && ftp > 0) ? (ftp / weightKg).toFixed(2) : '—';
}

function updateDefaultPowerZoneTable(ftp) {
  defaultZonesConfig.forEach(z => {
    const info = getZoneRangeInfo(z, ftp, 'default');
    const cellSet = powerCellCache.default[z.id];

    if (!cellSet) return;
    if (cellSet.pct) cellSet.pct.textContent = info.pctText;
    if (cellSet.range) cellSet.range.textContent = info.wattsText;
    if (cellSet.targetPct) cellSet.targetPct.textContent = info.targetPctText;
    if (cellSet.target) cellSet.target.textContent = info.targetText;
  });
}

function updateCustomPowerZoneTable(ftp) {
  getCustomZonesConfig().forEach(z => {
    const info = getZoneRangeInfo(z, ftp, 'custom');
    const cellSet = powerCellCache.custom[z.id];

    if (!cellSet) return;
    if (cellSet.range) cellSet.range.textContent = info.wattsText;
    if (cellSet.targetPct) cellSet.targetPct.textContent = info.targetPctText;
    if (cellSet.target) cellSet.target.textContent = info.targetText;
  });
}

function updateZones() {
  const state = getAppState();

  updateFtpDisplays(state.power.ftp);
  updateWkg(state.power.ftp, state.power.weight, state.power.weightUnit);
  updateDefaultPowerZoneTable(state.power.ftp);
  updateCustomPowerZoneTable(state.power.ftp);
  recalculateAllBadges();
}

function formatHrPctRanges(metricCfg) {
  return [
    `≤ ${metricCfg.z1.max}%`,
    `${metricCfg.z2.min}%–${metricCfg.z2.max}%`,
    `${metricCfg.z3.min}%–${metricCfg.z3.max}%`,
    `${metricCfg.z4.min}%–${metricCfg.z4.max}%`,
    `≥ ${metricCfg.z5.min}%`
  ];
}

function buildHrDisplayMatrix(metric, prefix = '', cfg = defaultHrPercentConfig) {
  const metricCfg = cfg[metric];
  const anchorLabel = metric === 'max' ? 'Max HR' : 'LTHR';
  const pctRanges = formatHrPctRanges(metricCfg);

  const zoneHeaderCells = hrZoneDefs.map(zone => `
    <td class="zone-cell-matrix" style="background: ${hrCellBg(zone.colorVar)};">
      <div class="zone-top">${zone.num}</div>
      <span class="zone-sub">${zone.desc}</span>
    </td>
  `).join('');

  const pctCells = hrZoneDefs.map((zone, i) => `
    <td class="zone-cell-matrix" style="background: ${hrCellBg(zone.colorVar)};">
      <div class="zone-value" id="${hrPctRangeId(prefix, zone.num, metric)}">${pctRanges[i]}</div>
    </td>
  `).join('');

  const bpmCells = hrZoneDefs.map(zone => `
    <td class="zone-cell-matrix" style="background: ${hrCellBg(zone.colorVar)};">
      <div class="zone-value-large" id="${hrRangeId(prefix, zone.num, metric)}">—</div>
    </td>
  `).join('');

  return `
    <tr>
      <th class="row-label">Zone</th>
      ${zoneHeaderCells}
    </tr>
    <tr>
      <th class="row-label">${anchorLabel} Range (%)</th>
      ${pctCells}
    </tr>
    <tr>
      <th class="row-label">BPM Range</th>
      ${bpmCells}
    </tr>
  `;
}

function buildHrEditableMatrix(metric, prefix = '', cfg = customHrAnchors) {
  const metricCfg = cfg[metric];
  const anchorLabel = metric === 'max' ? 'Max HR' : 'LTHR';
  const inputClass = metric === 'max' ? 'custom-hr-max-inline' : 'custom-hr-lthr-inline';
  const maxAttr = metric === 'max'
    ? String(LIMITS.HR_MAX_PERCENT_CAP)
    : String(LIMITS.HR_LTHR_PERCENT_CAP);

  const rows = [
    { zone: 1, key: 'z1' },
    { zone: 2, key: 'z2' },
    { zone: 3, key: 'z3' },
    { zone: 4, key: 'z4' },
    { zone: 5, key: 'z5' }
  ];

  const zoneHeaderCells = hrZoneDefs.map(zone => `
    <td class="zone-cell-matrix" style="background: ${hrCellBg(zone.colorVar)};">
      <div class="zone-top">${zone.num}</div>
      <span class="zone-sub">${zone.desc}</span>
    </td>
  `).join('');

  const editCells = rows.map(({ zone, key }) => {
    const r = metricCfg[key];

    if (key === 'z1') {
      return `
        <td class="zone-cell-matrix" style="background: ${hrCellBg('hr-z1')};">
          <div class="matrix-input-wrap">
            <span>≤</span>
            <input
              class="input-small numeric-input ${inputClass}"
              data-zone="${key}"
              data-side="max"
              type="number"
              inputmode="numeric"
              enterkeyhint="done"
              min="1"
              max="${maxAttr}"
              step="1"
              value="${r.max}"
              aria-label="${anchorLabel} Zone ${zone} upper percentage">
            <span>%</span>
          </div>
        </td>
      `;
    }

    if (key === 'z5') {
      return `
        <td class="zone-cell-matrix" style="background: ${hrCellBg('hr-z5')};">
          <div class="matrix-input-wrap">
            <span>≥</span>
            <input
              class="input-small numeric-input ${inputClass}"
              data-zone="${key}"
              data-side="min"
              type="number"
              inputmode="numeric"
              enterkeyhint="done"
              min="1"
              max="${maxAttr}"
              step="1"
              value="${r.min}"
              aria-label="${anchorLabel} Zone ${zone} lower percentage">
            <span>%</span>
          </div>
        </td>
      `;
    }

    return `
      <td class="zone-cell-matrix" style="background: ${hrCellBg(`hr-z${zone}`)};">
        <div class="matrix-input-wrap matrix-input-dual">
          <input
            class="input-small numeric-input ${inputClass}"
            data-zone="${key}"
            data-side="min"
            type="number"
            inputmode="numeric"
            enterkeyhint="done"
            min="1"
            max="${maxAttr}"
            step="1"
            value="${r.min}"
            aria-label="${anchorLabel} Zone ${zone} lower percentage">
          <span>to</span>
          <input
            class="input-small numeric-input ${inputClass}"
            data-zone="${key}"
            data-side="max"
            type="number"
            inputmode="numeric"
            enterkeyhint="done"
            min="1"
            max="${maxAttr}"
            step="1"
            value="${r.max}"
            aria-label="${anchorLabel} Zone ${zone} upper percentage">
          <span>%</span>
        </div>
      </td>
    `;
  }).join('');

  const bpmCells = hrZoneDefs.map(zone => `
    <td class="zone-cell-matrix" style="background: ${hrCellBg(zone.colorVar)};">
      <div class="zone-value-large" id="${hrRangeId(prefix, zone.num, metric)}">—</div>
    </td>
  `).join('');

  return `
    <tr>
      <th class="row-label">Zone</th>
      ${zoneHeaderCells}
    </tr>
    <tr>
      <th class="row-label">Custom ${anchorLabel} (%)</th>
      ${editCells}
    </tr>
    <tr>
      <th class="row-label">BPM Range</th>
      ${bpmCells}
    </tr>
  `;
}

function renderHrTables() {
  const defaultMaxBody = document.getElementById('hr-default-max-body');
  const defaultLthrBody = document.getElementById('hr-default-lthr-body');
  const customMaxBody = document.getElementById('hr-custom-max-body');
  const customLthrBody = document.getElementById('hr-custom-lthr-body');

  if (defaultMaxBody) defaultMaxBody.innerHTML = buildHrDisplayMatrix('max', '', defaultHrPercentConfig);
  if (defaultLthrBody) defaultLthrBody.innerHTML = buildHrDisplayMatrix('lthr', '', defaultHrPercentConfig);
  if (customMaxBody) customMaxBody.innerHTML = buildHrEditableMatrix('max', 'c-', customHrAnchors);
  if (customLthrBody) customLthrBody.innerHTML = buildHrEditableMatrix('lthr', 'c-', customHrAnchors);

  applyInputLimits();
}

function hrZoneOrder() {
  return ['z1', 'z2', 'z3', 'z4', 'z5'];
}

function syncHrMetricRanges(metricRanges) {
  const out = deepClone(metricRanges);
  const order = hrZoneOrder();

  for (let i = 1; i < order.length; i++) {
    const prev = order[i - 1];
    const curr = order[i];

    if (out[prev].max != null && out[curr].min != null) {
      out[curr].min = out[prev].max + 1;
    }
  }

  return out;
}

function applyHrBoundaryEdit(metricRanges, zoneId, side, rawValue, cap) {
  const out = deepClone(metricRanges);
  const value = wholeNumber(Math.min(clampNonNegative(rawValue), cap));
  const order = hrZoneOrder();
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

  return syncHrMetricRanges(out);
}

function writeCustomHrInputs(metric, ranges) {
  const selector = metric === 'max' ? '.custom-hr-max-inline' : '.custom-hr-lthr-inline';

  document.querySelectorAll(selector).forEach(input => {
    const zone = input.dataset.zone;
    const side = input.dataset.side;
    const next = String(ranges[zone][side]);

    if (document.activeElement !== input && input.value !== next) {
      input.value = next;
    }
  });
}

function readCustomHrAnchorsInline() {
  function readMetric(selector, cap) {
    const out = {
      z1: { min: null, max: 0 },
      z2: { min: 0, max: 0 },
      z3: { min: 0, max: 0 },
      z4: { min: 0, max: 0 },
      z5: { min: 0, max: null }
    };

    document.querySelectorAll(selector).forEach(el => {
      const zone = el.dataset.zone;
      const side = el.dataset.side;
      const value = wholeNumber(Math.min(clampNonNegative(el.value), cap));

      if (out[zone] && side in out[zone]) {
        out[zone][side] = value;
      }
    });

    return out;
  }

  return {
    max: readMetric('.custom-hr-max-inline', LIMITS.HR_MAX_PERCENT_CAP),
    lthr: readMetric('.custom-hr-lthr-inline', LIMITS.HR_LTHR_PERCENT_CAP)
  };
}

function bindCustomHrInlineInputs() {
  if (!els.hrCustomPanel || els.hrCustomPanel.dataset.bound === 'true') return;
  els.hrCustomPanel.dataset.bound = 'true';

  els.hrCustomPanel.addEventListener('change', (e) => {
    const input = e.target.closest('.custom-hr-max-inline, .custom-hr-lthr-inline');
    if (!input) return;

    sanitizeInput(input, 0);
    validateAndApplyCustomHR(input);
  });

  els.hrCustomPanel.addEventListener('input', (e) => {
    const input = e.target.closest('.custom-hr-max-inline, .custom-hr-lthr-inline');
    if (!input) return;
  });
}

function validateAndApplyCustomHR(changedInput = null) {
  const current = readCustomHrAnchorsInline();
  const nextAnchors = deepClone(current);

  const maxHr = readNonNegativeOrNull(els.hrMaxIn) ?? 0;
  const lthr = readNonNegativeOrNull(els.hrLthrIn) ?? 0;

  els.hrInputError.textContent = validateHrBaseInputs(maxHr, lthr);
  if (els.hrInputError.textContent) {
    els.customHrError.textContent = '';
    return;
  }

  if (changedInput) {
    const metric = changedInput.classList.contains('custom-hr-max-inline') ? 'max' : 'lthr';
    const cap = metric === 'max'
      ? LIMITS.HR_MAX_PERCENT_CAP
      : LIMITS.HR_LTHR_PERCENT_CAP;
    const zone = changedInput.dataset.zone;
    const side = changedInput.dataset.side;
    const value = changedInput.value;

    nextAnchors[metric] = applyHrBoundaryEdit(nextAnchors[metric], zone, side, value, cap);

    const error = validateHrAnchorSet(
      nextAnchors,
      maxHr,
      lthr
    );

    els.customHrError.textContent = error;
    if (error) {
      writeCustomHrInputs(metric, customHrAnchors[metric]);
      return;
    }

    customHrAnchors = normalizeHrAnchors(nextAnchors);
    saveCustomHrAnchors();
    writeCustomHrInputs(metric, customHrAnchors[metric]);
    updateCustomHRZones();
    return;
  }

  const error = validateHrAnchorSet(
    nextAnchors,
    maxHr,
    lthr
  );

  els.customHrError.textContent = error;
  if (error) return;

  customHrAnchors = normalizeHrAnchors(nextAnchors);
  saveCustomHrAnchors();
  updateCustomHRZones();
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

function updateHRZones() {
  const state = getAppState();
  const maxHr = state.hr.max;
  const lthr = state.hr.lthr;
  const baseError = state.hr.baseError;

  els.hrInputError.textContent = baseError;
  if (baseError) {
    els.customHrError.textContent = '';
    applyHrRanges('', 0, 0, defaultHrPercentConfig);
    return;
  }

  applyHrRanges('', maxHr, lthr, defaultHrPercentConfig);
}

function updateCustomHRZones() {
  const state = getAppState();
  const maxHr = state.hr.max;
  const lthr = state.hr.lthr;
  const baseError = state.hr.baseError;

  els.hrInputError.textContent = baseError;
  if (baseError) {
    els.customHrError.textContent = '';
    applyHrRanges('c-', 0, 0, customHrAnchors);
    return;
  }

  applyHrRanges('c-', maxHr, lthr, customHrAnchors);
}

function resetCustomZones() {
  customPowerAnchors = defaultPowerAnchors();
  saveCustomPowerAnchors();
  els.customZoneError.textContent = '';

  generateCustomZonesTable();
  bindCustomZoneInputs();

  const ftp = readNonNegativeOrNull(els.ftpIn) ?? 0;
  updateFtpDisplays(ftp);
  updateWkg(
    ftp,
    readNonNegativeOrNull(els.weightIn) ?? 0,
    els.weightUnit?.value || 'lbs'
  );
  updateDefaultPowerZoneTable(ftp);
  updateCustomPowerZoneTable(ftp);
  recalculateAllBadges();

  setActiveZoneSystem('custom', false);
}

function resetCustomHR() {
  customHrAnchors = deepClone(defaultHrPercentConfig);
  saveCustomHrAnchors();
  els.customHrError.textContent = '';

  renderHrTables();
  bindCustomHrInlineInputs();

  const maxHr = readNonNegativeOrNull(els.hrMaxIn) ?? 0;
  const lthr = readNonNegativeOrNull(els.hrLthrIn) ?? 0;

  els.hrInputError.textContent = validateHrBaseInputs(maxHr, lthr);

  if (els.hrInputError.textContent) {
    applyHrRanges('', 0, 0, defaultHrPercentConfig);
    applyHrRanges('c-', 0, 0, customHrAnchors);
  } else {
    applyHrRanges('', maxHr, lthr, defaultHrPercentConfig);
    applyHrRanges('c-', maxHr, lthr, customHrAnchors);
  }

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

    const n = clampNonNegative(raw);
    const normalized = decimals > 0
      ? Number(n).toFixed(decimals).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
      : String(wholeNumber(n));

    safeStorageSet(key, normalized);
  });
}

function addInputListeners(elements, handler) {
  elements.filter(Boolean).forEach(el => {
    el.addEventListener('input', handler);
  });
}

function bindPersistOnCommit(elements, keyMap, decimals = 0, afterSave) {
  elements.filter(Boolean).forEach(el => {
    const key = keyMap.get(el);
    if (key) persistOnCommit(el, key, decimals, afterSave);
  });
}

function bindPersistOnInput(elements, keyMap, decimals = 0) {
  elements.filter(Boolean).forEach(el => {
    const key = keyMap.get(el);
    if (key) persistOnInput(el, key, decimals);
  });
}

function getCurrentHeaderSnapshot() {
  return getAppState().headers;
}

function getAppState() {
  const ftp = readNonNegativeOrNull(els.ftpIn) ?? 0;
  const weight = readNonNegativeOrNull(els.weightIn) ?? 0;
  const weightUnit = els.weightUnit?.value || 'lbs';
  const newFtp = readNonNegativeOrNull(els.newFtpKj) ?? 0;

  const hrMax = readNonNegativeOrNull(els.hrMaxIn) ?? 0;
  const hrLthr = readNonNegativeOrNull(els.hrLthrIn) ?? 0;

  const kjCalcDurationError = getDurationValidationError(
    els.kjHoursIn,
    els.kjMinutesPartIn,
    els.kjSecondsIn
  );

  const wattsCalcDurationError = getDurationValidationError(
    els.wattsHoursIn,
    els.wattsMinutesPartIn,
    els.wattsSecondsIn
  );

  const kjCalcMinutes = kjCalcDurationError
    ? 0
    : (readDurationMinutes(
        els.kjHoursIn,
        els.kjMinutesPartIn,
        els.kjSecondsIn
      ) ?? 0);

  const wattsCalcMinutes = wattsCalcDurationError
    ? 0
    : (readDurationMinutes(
        els.wattsHoursIn,
        els.wattsMinutesPartIn,
        els.wattsSecondsIn
      ) ?? 0);

  const findKjWatts = readNonNegativeOrNull(els.wattsIn) ?? 0;
  const findWattsKj = readNonNegativeOrNull(els.kjIn) ?? 0;
  const findTimeKj = readNonNegativeOrNull(els.timeKjIn) ?? 0;
  const findTimeWatts = readNonNegativeOrNull(els.timeWattsIn) ?? 0;

  const calculatedKj = (findKjWatts > 0 && kjCalcMinutes > 0)
    ? Math.floor(kjFromWattsMinutes(findKjWatts, kjCalcMinutes))
    : 0;

  const calculatedWatts = (findWattsKj > 0 && wattsCalcMinutes > 0)
    ? Math.ceil(wattsFromKjMinutes(findWattsKj, wattsCalcMinutes))
    : 0;

  const calculatedTimeSeconds = (findTimeKj > 0 && findTimeWatts > 0)
    ? Math.ceil((findTimeKj * 1000) / findTimeWatts)
    : 0;

  const calculatedTimeMinutes = (findTimeKj > 0 && findTimeWatts > 0)
    ? ((findTimeKj * 1000) / findTimeWatts) / 60
    : 0;

  const weightKg = weight > 0
    ? (weightUnit === 'lbs' ? weight / CONVERSION.LB_PER_KG : weight)
    : 0;

  const wkg = (ftp > 0 && weightKg > 0)
    ? ftp / weightKg
    : 0;

  const hrBaseError = validateHrBaseInputs(hrMax, hrLthr);

  return {
    ui: {
      activeZoneSystem,
      activeHrSubtab,
      isPrintLaunching,
      activePrintMode: document.body.getAttribute('data-print-mode') || '',
      visibleView:
        !els.wattsView.hidden ? 'watts' :
        !els.kjView.hidden ? 'kj' :
        !els.timeView.hidden ? 'time' :
        !els.zonesView.hidden ? 'zones' :
        !els.hrView.hidden ? 'hr' : ''
    },

    power: {
      ftp,
      newFtp,
      weight,
      weightUnit,
      weightKg,
      wkg,
      activeSystem: activeZoneSystem,
      defaultZonesConfig,
      customPowerAnchors,
      customZonesConfig: getCustomZonesConfig()
    },

    hr: {
      max: hrMax,
      lthr: hrLthr,
      baseError: hrBaseError,
      activeSubtab: activeHrSubtab,
      defaultConfig: defaultHrPercentConfig,
      customAnchors: customHrAnchors
    },

    calculators: {
      kj: {
        watts: findKjWatts,
        durationMinutes: kjCalcMinutes,
        durationError: kjCalcDurationError,
        outputKj: calculatedKj,
        currentBadgeWatts: findKjWatts,
        currentBadgeMinutes: kjCalcMinutes
      },

      watts: {
        kj: findWattsKj,
        durationMinutes: wattsCalcMinutes,
        durationError: wattsCalcDurationError,
        outputWatts: calculatedWatts,
        currentBadgeWatts: calculatedWatts,
        currentBadgeMinutes: wattsCalcMinutes
      },

      time: {
        kj: findTimeKj,
        watts: findTimeWatts,
        outputSeconds: calculatedTimeSeconds,
        outputMinutes: calculatedTimeMinutes,
        currentBadgeWatts: findTimeWatts,
        currentBadgeMinutes: calculatedTimeMinutes
      }
    },

    headers: {
      ftp,
      weight,
      unit: weightUnit,
      maxHr: hrMax,
      lthr: hrLthr
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

function setImageExportHeader(type, system) {
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

async function saveZonesImage(type, system) {
  if (isPrintLaunching) return;

  await commitVisibleCustomEdits();

  const triggerBtn =
    type === 'power'
      ? (system === 'custom' ? els.saveCustomPowerImage : els.saveDefaultPowerImage)
      : (system === 'custom' ? els.saveCustomHrImage : els.saveDefaultHrImage);

  if (triggerBtn?.disabled) return;

  let html2canvasFn;
  let exportClone = null;

  try {
    setPrintButtonsDisabled(true);
    if (triggerBtn) triggerBtn.textContent = 'Preparing...';

    html2canvasFn = await loadHtml2Canvas();
    if (!html2canvasFn) throw new Error('html2canvas unavailable');

    const filename = `${buildExportFilename(type, system)}.png`;

    setImageExportHeader(type, system);

    if (type === 'power' && system === 'custom') {
      writeCustomZoneRangeInputs(displayRangesFromAnchors(customPowerAnchors));
    }

    if (type === 'hr' && system === 'custom') {
      writeCustomHrInputs('max', customHrAnchors.max);
      writeCustomHrInputs('lthr', customHrAnchors.lthr);
    }

    exportClone = buildExportClone(type, system);
    if (!exportClone) throw new Error('Unable to build export clone.');

    const target = exportClone.clone;
    if (triggerBtn) triggerBtn.textContent = 'Saving...';

    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, TIMING.EXPORT_RENDER_DELAY_MS));

    const canvas = await html2canvasFn(target, {
      backgroundColor: '#ffffff',
      scale: EXPORT_SETTINGS.IMAGE_SCALE,
      useCORS: true,
      logging: false
    });

    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });

    if (!blob) throw new Error('Image export failed.');

    downloadBlob(blob, filename);
  } catch (error) {
    console.error('Save image failed:', error);
    alert('Save Image failed. Check the browser console for details.');
  } finally {
    destroyExportClone(exportClone);
    clearPrintHeaders();
    setPrintButtonsDisabled(false);

    getAllImageExportButtons().forEach(btn => {
      btn.textContent = 'Save Image';
    });
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

function runScopedPrint(mode) {
  if (isPrintLaunching) return;

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

  if (mode === 'power-default') document.title = buildExportFilename('power', 'default');
  else if (mode === 'power-custom') document.title = buildExportFilename('power', 'custom');
  else if (mode === 'hr-default') document.title = buildExportFilename('hr', 'default');
  else if (mode === 'hr-custom') document.title = buildExportFilename('hr', 'custom');

  forcePrintLayoutFlush();

  try {
    window.print();
  } catch {
    cleanup();
  }
}

async function printPowerZones(system) {
  await commitVisibleCustomEdits();

  const { ftp, weight, unit } = getCurrentHeaderSnapshot();

  const wkg = (ftp > 0 && weight > 0)
    ? (ftp / (unit === 'lbs' ? weight / CONVERSION.LB_PER_KG : weight)).toFixed(2)
    : '—';

  const title = system === 'custom' ? 'Custom Power Zones' : 'Default Power Zones';
  const headerEl = system === 'custom'
    ? els.printHeaderCustomPower
    : els.printHeaderDefaultPower;

  setPrintHeaderContent(headerEl, title, [
    { label: 'FTP', value: ftp > 0 ? `${wholeNumber(ftp)} W` : '—' },
    { label: 'Weight', value: weight > 0 ? `${weight} ${unit}` : '—' },
    { label: 'W/kg', value: wkg }
  ]);

  runScopedPrint(system === 'custom' ? 'power-custom' : 'power-default');
}

async function printHrZones(system) {
  await commitVisibleCustomEdits();

  const { maxHr, lthr } = getCurrentHeaderSnapshot();

  const title = system === 'custom' ? 'Custom Heart Rate Zones' : 'Default Heart Rate Zones';
  const headerEl = system === 'custom'
    ? els.printHeaderCustomHr
    : els.printHeaderDefaultHr;

  setPrintHeaderContent(headerEl, title, [
    { label: 'Max HR', value: maxHr > 0 ? `${wholeNumber(maxHr)} BPM` : '—' },
    { label: 'LTHR', value: lthr > 0 ? `${wholeNumber(lthr)} BPM` : '—' }
  ]);

  runScopedPrint(system === 'custom' ? 'hr-custom' : 'hr-default');
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
    printDefaultPowerZones: document.getElementById('print-default-power-zones'),
    printCustomPowerZones: document.getElementById('print-custom-power-zones'),
    saveDefaultPowerImage: document.getElementById('save-default-power-image'),
    saveCustomPowerImage: document.getElementById('save-custom-power-image'),
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
    printDefaultHrZones: document.getElementById('print-default-hr-zones'),
    printCustomHrZones: document.getElementById('print-custom-hr-zones'),
    saveDefaultHrImage: document.getElementById('save-default-hr-image'),
    saveCustomHrImage: document.getElementById('save-custom-hr-image'),
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

  document.querySelectorAll('.custom-zone-range-input').forEach(el => {
    el.min = '1';
    el.max = String(LIMITS.POWER_ZONE_PERCENT_MAX);
    el.step = '1';
  });

  document.querySelectorAll('.custom-hr-max-inline').forEach(el => {
    el.min = '1';
    el.max = String(LIMITS.HR_MAX_PERCENT_CAP);
    el.step = '1';
  });

  document.querySelectorAll('.custom-hr-lthr-inline').forEach(el => {
    el.min = '1';
    el.max = String(LIMITS.HR_LTHR_PERCENT_CAP);
    el.step = '1';
  });
}

function bindCustomZoneInputs() {
  if (!els.customZonesTable || els.customZonesTable.dataset.bound === 'true') return;
  els.customZonesTable.dataset.bound = 'true';

  els.customZonesTable.addEventListener('change', (e) => {
    const el = e.target.closest('.custom-zone-range-input');
    if (!el) return;

    lastChangedCustomPowerInput = el;
    sanitizeInput(el, 0);
    validateAndApplyCustomZones(el);
  });

  els.customZonesTable.addEventListener('input', (e) => {
    const el = e.target.closest('.custom-zone-range-input');
    if (!el) return;
    lastChangedCustomPowerInput = el;
  });
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

  els.toggleSystemKj.addEventListener('click', toggleActiveSystem);
  els.toggleSystemWatts.addEventListener('click', toggleActiveSystem);
  els.toggleSystemTime.addEventListener('click', toggleActiveSystem);

  els.resetCustomZones.addEventListener('click', resetCustomZones);
  els.resetCustomHr.addEventListener('click', resetCustomHR);

  els.printDefaultPowerZones.addEventListener('click', () => printPowerZones('default'));
  els.printCustomPowerZones.addEventListener('click', () => printPowerZones('custom'));
  els.printDefaultHrZones.addEventListener('click', () => printHrZones('default'));
  els.printCustomHrZones.addEventListener('click', () => printHrZones('custom'));

  els.saveDefaultPowerImage.addEventListener('click', () => saveZonesImage('power', 'default'));
  els.saveCustomPowerImage.addEventListener('click', () => saveZonesImage('power', 'custom'));
  els.saveDefaultHrImage.addEventListener('click', () => saveZonesImage('hr', 'default'));
  els.saveCustomHrImage.addEventListener('click', () => saveZonesImage('hr', 'custom'));

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

  const refreshHrViews = () => {
    refreshAllHrZoneViews();
  };

  addInputListeners([els.hrMaxIn, els.hrLthrIn], refreshHrViews);

  persistOnCommit(els.ftpIn, STORAGE_KEYS.FTP, 0, updateZones);
  persistOnCommit(els.weightIn, STORAGE_KEYS.WEIGHT, 1, updateZones);
  persistOnCommit(els.hrMaxIn, STORAGE_KEYS.HR_MAX, 0, () => {
    updateHRZones();
    validateAndApplyCustomHR();
  });
  persistOnCommit(els.hrLthrIn, STORAGE_KEYS.HR_LTHR, 0, () => {
    updateHRZones();
    validateAndApplyCustomHR();
  });
  persistOnCommit(els.newFtpKj, STORAGE_KEYS.NEW_FTP, 0, clean => setNewFTP(clean, false));
  persistOnCommit(els.newFtpWatts, STORAGE_KEYS.NEW_FTP, 0, clean => setNewFTP(clean, false));
  persistOnCommit(els.newFtpTime, STORAGE_KEYS.NEW_FTP, 0, clean => setNewFTP(clean, false));

  bindPersistOnCommit(
    [els.kjHoursIn, els.kjMinutesPartIn, els.kjSecondsIn],
    new Map([
      [els.kjHoursIn, STORAGE_KEYS.FIND_KJ_HOURS],
      [els.kjMinutesPartIn, STORAGE_KEYS.FIND_KJ_MINUTES_PART],
      [els.kjSecondsIn, STORAGE_KEYS.FIND_KJ_SECONDS]
    ]),
    0,
    calcKJ
  );

  bindPersistOnCommit(
    [els.wattsHoursIn, els.wattsMinutesPartIn, els.wattsSecondsIn],
    new Map([
      [els.wattsHoursIn, STORAGE_KEYS.FIND_WATTS_HOURS],
      [els.wattsMinutesPartIn, STORAGE_KEYS.FIND_WATTS_MINUTES_PART],
      [els.wattsSecondsIn, STORAGE_KEYS.FIND_WATTS_SECONDS]
    ]),
    0,
    calcWatts
  );

  bindPersistOnInput(
    [
      els.ftpIn,
      els.hrMaxIn,
      els.hrLthrIn,
      els.newFtpKj,
      els.newFtpWatts,
      els.newFtpTime,
      els.wattsIn,
      els.kjIn,
      els.timeKjIn,
      els.timeWattsIn,
      els.kjHoursIn,
      els.kjMinutesPartIn,
      els.kjSecondsIn,
      els.wattsHoursIn,
      els.wattsMinutesPartIn,
      els.wattsSecondsIn
    ],
    new Map([
      [els.ftpIn, STORAGE_KEYS.FTP],
      [els.hrMaxIn, STORAGE_KEYS.HR_MAX],
      [els.hrLthrIn, STORAGE_KEYS.HR_LTHR],
      [els.newFtpKj, STORAGE_KEYS.NEW_FTP],
      [els.newFtpWatts, STORAGE_KEYS.NEW_FTP],
      [els.newFtpTime, STORAGE_KEYS.NEW_FTP],
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
    ])
  );

  bindPersistOnInput(
    [els.weightIn],
    new Map([
      [els.weightIn, STORAGE_KEYS.WEIGHT]
    ]),
    1
  );
}

function loadSavedValues() {
  const mappings = [
    [STORAGE_KEYS.FTP, els.ftpIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.WEIGHT, els.weightIn, v => String(clampNonNegative(v))],
    [STORAGE_KEYS.HR_MAX, els.hrMaxIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.HR_LTHR, els.hrLthrIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_KJ_AVG_WATTS, els.wattsIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_WATTS_TOTAL_KJ, els.kjIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_TIME_TOTAL_KJ, els.timeKjIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_TIME_AVG_WATTS, els.timeWattsIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_KJ_HOURS, els.kjHoursIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_KJ_MINUTES_PART, els.kjMinutesPartIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_KJ_SECONDS, els.kjSecondsIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_WATTS_HOURS, els.wattsHoursIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_WATTS_MINUTES_PART, els.wattsMinutesPartIn, v => String(wholeNumber(clampNonNegative(v)))],
    [STORAGE_KEYS.FIND_WATTS_SECONDS, els.wattsSecondsIn, v => String(wholeNumber(clampNonNegative(v)))]
  ];

   mappings.forEach(([key, el, transform]) => {
     const value = safeStorageGet(key);
     if (value !== null && el) el.value = transform(value);
   });

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
