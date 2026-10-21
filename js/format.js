/**
 * Small helpers that turn data into the words shown in the interface.
 */

import { openStatus } from './opening-hours.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const METERS_PER_MILE = 1609.344;

const ACCESS_LABELS = {
  free: 'Free',
  customers: 'Customers only',
  limited: 'Limited access',
  unknown: 'Access unknown',
};

const KIND_LABELS = {
  'city': 'City public restroom',
  'public': 'Public place',
  'library': 'Public library',
  'osm-toilet': 'Public restroom',
  'store': 'Store or mall',
  'business': 'Cafe or restaurant',
  'community': 'Community report',
};

/** 1110 -> "6:30 PM", 1440 -> "midnight". Minutes past 1440 wrap to the next day. */
function formatClock(minutes) {
  const inDay = minutes % 1440;
  if (inDay === 0) {
    return 'midnight';
  }
  if (inDay === 720) {
    return 'noon';
  }
  const hours = Math.floor(inDay / 60);
  const mins = inDay % 60;
  const suffix = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return mins === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(mins).padStart(2, '0')} ${suffix}`;
}

function formatDistance(meters) {
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) {
    return `${Math.round(meters / 0.3048 / 10) * 10} ft`;
  }
  return `${miles.toFixed(1)} mi`;
}

/** About 20 minutes per mile at a normal walking pace. */
function formatWalk(meters) {
  const minutes = Math.max(1, Math.round((meters / METERS_PER_MILE) * 20));
  return `${minutes} min walk`;
}

/**
 * Describe whether a place is open.
 * @returns {{status: string, text: string}}
 */
function describeStatus(place, now) {
  const result = openStatus(place.schedule, now);
  if (result.status === 'unknown') {
    return { status: 'unknown', text: 'Hours unknown' };
  }
  if (result.status === 'open') {
    if (place.hours === '24/7') {
      return { status: 'open', text: 'Open 24 hours' };
    }
    const minutesLeft = result.closesAt - (now.getHours() * 60 + now.getMinutes());
    const soon = minutesLeft <= 30 ? ` (in ${minutesLeft} min)` : '';
    return { status: 'open', text: `Open until ${formatClock(result.closesAt)}${soon}` };
  }
  if (!result.opensAt) {
    return { status: 'closed', text: 'Closed' };
  }
  const { day, minute, inDays } = result.opensAt;
  let when = `${DAY_NAMES[day]} ${formatClock(minute)}`;
  if (inDays === 0) {
    when = formatClock(minute);
  } else if (inDays === 1) {
    when = `tomorrow ${formatClock(minute)}`;
  }
  return { status: 'closed', text: `Closed, opens ${when}` };
}

/** "Mo-Tu 11:00-19:00; We-Sa 10:00-17:00" -> [["Sun","Closed"],["Mon","11 AM – 7 PM"], ...] */
function weeklyHours(schedule) {
  if (!schedule) {
    return null;
  }
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((day) => {
    const spans = schedule[day];
    if (spans.length === 0) {
      return [DAY_NAMES[day], 'Closed'];
    }
    if (spans.length === 1 && spans[0][0] === 0 && spans[0][1] === 1440) {
      return [DAY_NAMES[day], 'Open 24 hours'];
    }
    return [DAY_NAMES[day], spans.map(([s, e]) => `${formatClock(s)} – ${formatClock(e)}`).join(', ')];
  });
}

export {
  ACCESS_LABELS, KIND_LABELS, METERS_PER_MILE,
  formatClock, formatDistance, formatWalk, describeStatus, weeklyHours,
};
