// Number formatting shared by the rail and the map.
// Source: Claude Opus 5.5 High

const intFmt = new Intl.NumberFormat('en-US');

function int(n) {
  return n == null ? 'n/a' : intFmt.format(Math.round(n));
}

function compact(n) {
  if (n == null) { return 'n/a'; }
  if (n >= 1e6) { return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`; }
  if (n >= 1e3) { return `${Math.round(n / 1e3)}k`; }
  return int(n);
}
function dollars(n) {
  if (n == null) { return 'n/a'; }
  if (n >= 1e6) { return `$${(n / 1e6).toFixed(1)}M`; }
  return `$${intFmt.format(Math.round(n))}`;
}

function pct(part, whole) {
  if (!whole) { return 'n/a'; }
  return `${Math.round((part / whole) * 100)}%`;
}

function miles(n) {
  return n == null ? 'n/a' : `${n.toFixed(1)} mi`;
}

function money(n) {
  if (n >= 1e6) { return `$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`; }
  if (n >= 1e3) { return `$${Math.round(n / 1e3)}k`; }
  return `$${Math.round(n)}`;
}

export { int, compact, dollars, pct, miles, money };
