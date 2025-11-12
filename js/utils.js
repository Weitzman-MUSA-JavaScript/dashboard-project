const EARTH_RADIUS_KM = 6371;
const SIGNIFICANCE_MIN = 550;
const SIGNIFICANCE_MAX = 1200;
export const SIGNIFICANCE_RANGE = {
  min: SIGNIFICANCE_MIN,
  mid: Math.round((SIGNIFICANCE_MIN + SIGNIFICANCE_MAX) / 2),
  max: SIGNIFICANCE_MAX,
};

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function magnitudeToRadius(mag) {
  if (typeof mag !== "number") {
    return 4;
  }
  const baseline = 2.5;
  return baseline + Math.max(0, (mag - 6) * 2);
}

export function significanceToColor(sig) {
  if (!Number.isFinite(sig)) {
    return "#94a3b8";
  }
  const ratio = clamp((sig - SIGNIFICANCE_MIN) / (SIGNIFICANCE_MAX - SIGNIFICANCE_MIN), 0, 1);
  const hueStart = 180; // blue-green (lower significance)
  const hueEnd = 320;   // magenta (higher significance)
  const lightness = 68 - 18 * ratio;
  const saturation = 80 + 10 * ratio;
  const hue = hueStart + (hueEnd - hueStart) * ratio;
  return `hsl(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%)`;
}

export function formatMagnitude(mag) {
  if (mag === null || mag === undefined || Number.isNaN(mag)) {
    return "N/A";
  }
  return Number(mag).toFixed(1);
}

export function formatDepth(depth) {
  if (depth === null || depth === undefined || Number.isNaN(depth)) {
    return "N/A";
  }
  return `${Math.round(Number(depth))} km`;
}

export function formatDistance(km) {
  if (km === null || km === undefined || !Number.isFinite(km)) {
    return "N/A";
  }
  if (km >= 100) {
    return `${Math.round(km)} km`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatDateTimeUTC(dateString) {
  if (!dateString) return "Unknown";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min} UTC`;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineDistance(coordA, coordB) {
  const [lat1, lon1] = coordA;
  const [lat2, lon2] = coordB;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function parseCSV(text) {
  const rows = text.trim().split(/\r?\n/);
  if (!rows.length) return [];
  const headers = splitCSVLine(rows.shift());
  return rows.filter((line) => line.trim().length > 0).map((line) => {
    const values = splitCSVLine(line);
    const record = {};
    headers.forEach((header, index) => {
      const key = header.trim();
      record[key] = values[index] !== undefined ? values[index] : "";
    });
    return record;
  });
}

function splitCSVLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(cleanCSVValue(current));
      current = "";
    } else {
      current += char;
    }
  }
  values.push(cleanCSVValue(current));
  return values;
}

function cleanCSVValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function magnitudeBand(mag) {
  if (mag >= 8) return "8+";
  if (mag >= 7) return "7-7.9";
  return "6-6.9";
}
