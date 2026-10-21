/**
 * A small parser for the subset of the OpenStreetMap `opening_hours` syntax
 * used in this project's data (e.g. "Mo-Fr 08:00-22:00; Sa-Su 08:00-23:00",
 * "24/7", "Mo-Th,Su 10:00-01:00, Fr-Sa 10:00-02:00", "Su off").
 *
 * It turns a string into a weekly schedule: an array of 7 lists (index 0 is
 * Sunday, matching JavaScript's Date#getDay), each holding [start, end]
 * pairs in minutes after midnight. An `end` larger than 1440 means the
 * place stays open past midnight into the next day.
 *
 * Holiday and specific-date rules are skipped. Any other rule it can't
 * understand makes the whole string unparseable, and parseOpeningHours()
 * returns null so the app can say "hours unknown" instead of guessing.
 *
 * This file is shared by the data build script (Node) and the web app.
 */

const DAY_CODES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAY_PATTERN = '(?:Su|Mo|Tu|We|Th|Fr|Sa)';
const DAY_SELECTOR = new RegExp(`^(${DAY_PATTERN}(?:-${DAY_PATTERN})?(?:,${DAY_PATTERN}(?:-${DAY_PATTERN})?)*)(?:\\s+|$)`);
const TIME_SPAN = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/;
const HOLIDAY_OR_DATE = /^(PH|SH|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;

function parseDays(selector) {
  const days = new Set();
  for (const part of selector.split(',')) {
    const [from, to] = part.split('-');
    const start = DAY_CODES.indexOf(from);
    const end = to ? DAY_CODES.indexOf(to) : start;
    let day = start;
    days.add(day);
    while (day !== end) {
      day = (day + 1) % 7;
      days.add(day);
    }
  }
  return [...days];
}

function parseTimeSpans(text) {
  const spans = [];
  for (const part of text.split(',')) {
    const match = part.trim().match(TIME_SPAN);
    if (!match) {
      return null;
    }
    const start = Number(match[1]) * 60 + Number(match[2]);
    let end = Number(match[3]) * 60 + Number(match[4]);
    if (end <= start) {
      // "18:00-02:00" or "10:00-00:00" runs past midnight.
      end += 1440;
    }
    spans.push([start, end]);
  }
  return spans;
}

/**
 * @param {string|null|undefined} text An OSM-style opening_hours string.
 * @returns {Array<Array<[number, number]>>|null} The weekly schedule, or null.
 */
function parseOpeningHours(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }
  const clean = text.trim();
  if (clean === '24/7') {
    return DAY_CODES.map(() => [[0, 1440]]);
  }

  const schedule = DAY_CODES.map(() => []);
  // Rules are separated by ";" or by ", " when a new day selector follows.
  const rules = clean
    .split(';')
    .flatMap((rule) => rule.split(new RegExp(`,\\s+(?=${DAY_PATTERN}\\b)`)))
    .map((rule) => rule.trim())
    .filter((rule) => rule.length > 0);

  for (const rule of rules) {
    // Holiday and specific-date exceptions ("PH closed", "Jul 04 08:30-16:00")
    // only apply on a few days a year, so the regular weekly rules are kept.
    if (HOLIDAY_OR_DATE.test(rule)) {
      continue;
    }
    let days = [0, 1, 2, 3, 4, 5, 6];
    let rest = rule;
    const daysMatch = rule.match(DAY_SELECTOR);
    if (daysMatch) {
      days = parseDays(daysMatch[1]);
      rest = rule.slice(daysMatch[0].length).trim();
    }

    if (rest === 'off' || rest === 'closed') {
      for (const day of days) {
        schedule[day] = [];
      }
      continue;
    }

    const spans = parseTimeSpans(rest);
    if (!spans) {
      return null;
    }
    // A later rule replaces earlier rules for the same days.
    for (const day of days) {
      schedule[day] = spans.map((span) => [...span]);
    }
  }
  return schedule;
}

/**
 * Work out whether a place is open at a given moment.
 *
 * @param {Array<Array<[number, number]>>|null} schedule From parseOpeningHours().
 * @param {Date} when The moment to check.
 * @returns {{status: 'open'|'closed'|'unknown', closesAt?: number, opensAt?: {day: number, minute: number}}}
 *   closesAt is minutes after today's midnight (may exceed 1440).
 */
function openStatus(schedule, when) {
  if (!schedule) {
    return { status: 'unknown' };
  }
  const day = when.getDay();
  const minute = when.getHours() * 60 + when.getMinutes();

  // Spans that started today.
  for (const [start, end] of schedule[day]) {
    if (minute >= start && minute < end) {
      return { status: 'open', closesAt: end };
    }
  }
  // Spans that started yesterday and run past midnight.
  const yesterday = (day + 6) % 7;
  for (const [start, end] of schedule[yesterday]) {
    if (end > 1440 && minute < end - 1440) {
      return { status: 'open', closesAt: end - 1440 };
    }
  }

  // Closed: find the next opening within the coming week.
  for (let offset = 0; offset < 8; offset += 1) {
    const checkDay = (day + offset) % 7;
    const starts = schedule[checkDay]
      .map(([start]) => start)
      .filter((start) => offset > 0 || start > minute)
      .sort((a, b) => a - b);
    if (starts.length > 0) {
      return { status: 'closed', opensAt: { day: checkDay, minute: starts[0], inDays: offset } };
    }
  }
  return { status: 'closed' };
}

export { DAY_CODES, parseOpeningHours, openStatus };
