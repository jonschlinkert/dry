'use strict';

const DATE_FORMAT_REGEX = /%([-_0^#:]*)([0-9]*)([EO]?)(.)/;

const abbr = str => str.slice(0, 3);
const daysInMonth = date => {
  const feb = isLeapYear(date) ? 29 : 28;
  return [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
};

const toDate = d => d ? new Date(d) : new Date();

const getDayOfYear = date => {
  const d = toDate(date);
  let num = 0;
  for (let i = 0; i < d.getMonth(); ++i) num += daysInMonth(d)[i];
  return num + d.getDate();
};

const getWeekOfYear = (date, startDay = 0) => {
  // Skip to startDay of this week
  const now = getDayOfYear(date) + (startDay - date.getDay());
  // Find the first startDay of the year
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const then = 7 - jan1.getDay() + startDay;
  return String(Math.floor((now - then) / 7) + 1);
};

// minimum number of days in the week that gets week number one
// default ISO 8601, week 01 is the week with the first Thursday (4)
const getISOWeekOfYear = (input, firstWeekOfYearMinDays = 4) => {
  const date = new Date(input.valueOf());

  // Ensure we're at the start of the day.
  date.setHours(0, 0, 0, 0);

  // Thursday in current week decides the year because January 4th
  // is always in the first week according to ISO8601.
  const yearDay        = date.getDate();
  const weekDay        = date.getDay();
  const dayInFirstWeek = firstWeekOfYearMinDays;
  const dayShift       = dayInFirstWeek - 1; // counting starts at 0
  const daysPerWeek    = 7;
  const prevWeekDay    = day => (day + daysPerWeek - 1) % daysPerWeek;

  // Adjust to Thursday in week 1 and count number of weeks from date to week 1.
  date.setDate(yearDay + dayShift - prevWeekDay(weekDay));

  const jan4th      = new Date(date.getFullYear(), 0, dayInFirstWeek);
  const msPerDay    = 24 * 60 * 60 * 1000;
  const daysBetween = (date.getTime() - jan4th.getTime()) / msPerDay;
  const weekNum     = 1 + Math.round((daysBetween - dayShift + prevWeekDay(jan4th.getDay())) / daysPerWeek);

  return String(weekNum);
};

const getTimeZone = (input, abbr = true) => {
  const date = input ? new Date(input) : new Date();
  const match = /\((.*)\)/.exec(date.toString());
  if (match) {
    const tz = match[1];
    return abbr ? tz.split(' ').map(v => v[0]).join('') : tz;
  }
  return '';
};

const isLeapYear = date => {
  const year = date.getFullYear();
  return Boolean((year & 3) === 0 && (year % 100 || (year && (year % 400 === 0))));
};

const getSuffix = date => {
  const input = date.getDate().toString();
  const index = parseInt(input.slice(-1), 10);
  return suffixes[index] || suffixes.default;
};

const suffixes = { default: 'th', 1: 'st', 2: 'nd', 3: 'rd' };
const day_names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const day_names_short = day_names.map(abbr);

const month_names = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const month_names_short = month_names.map(abbr);

const pad_widths = {
  d: 2,
  e: 2,
  H: 2,
  I: 2,
  j: 3,
  k: 2,
  l: 2,
  L: 3,
  m: 2,
  M: 2,
  S: 2,
  U: 2,
  W: 2
};

const pad_chars = {
  a: ' ',
  A: ' ',
  b: ' ',
  B: ' ',
  c: ' ',
  e: ' ',
  k: ' ',
  l: ' ',
  p: ' ',
  P: ' '
};

const formatters = {
  '%': () => '%',

  A: d => day_names[d.getDay()], // Week day, in full form of the time
  B: d => month_names[d.getMonth()], // Full month name
  C: d => String(d.getFullYear()).slice(0, 2),
  D: d => strftime(d, '%m/%d/%y'),
  E: d => '',
  F: d => strftime(d, '%Y-%m-%d'), // Equivalent to %Y-%m-%d (the ISO 8601 date format)
  G: d => '',
  H: d => d.getHours(),
  I: d => String(d.getHours() % 12 || 12),
  J: d => '',
  K: d => '',
  L: d => d.getMilliseconds(),
  M: d => d.getMinutes(),
  N: (d, opts) => {
    const width = Number(opts.width) || 9;
    const str = String(d.getMilliseconds()).substr(0, width);
    return str.padEnd(width, '0');
  },
  O: d => '',
  P: d => formatters.p(d).toLowerCase(),
  Q: d => '',
  R: d => formatters.T(d),
  S: d => d.getSeconds(),
  T: d => d.toLocaleTimeString(), // 24 hour time
  U: d => getWeekOfYear(d, 0), // Week number of the present year, beginning with the first Sunday as the first day of the first week (01..53)
  V: d => getISOWeekOfYear(d, 4), // Week number of year according to ISO 8601(01..53)
  W: d => getWeekOfYear(d, 1),
  X: d => formatters.T(d),
  Y: d => d.getFullYear(), // Week number of year according to ISO 8601(01..53)
  Z: d => getTimeZone(d), // Gives Time Zone of the time. Ex: "IST"

  a: d => day_names_short[d.getDay()],
  b: d => month_names_short[d.getMonth()],
  c: d => d.toLocaleString(),
  d: d => String(d.getDate()).padStart(2, '0'),
  e: d => d.getDate(),
  h: d => formatters.b(d),
  j: d => getDayOfYear(d),
  k: d => d.getHours(),
  l: d => String(d.getHours() % 12 || 12),
  m: d => String(d.getMonth() + 1).padStart(2, '0'),
  n: () => '\n',
  p: d => (d.getHours() < 12 ? 'AM' : 'PM'),
  q: d => getSuffix(d),
  s: d => Math.round(d.valueOf() / 1000),
  t: d => '\t',
  u: d => d.getDay() || 7,
  w: d => d.getDay(),
  x: d => d.toLocaleDateString(),
  y: d => String(d.getFullYear()).slice(2),
  z: (d, options = {}) => {
    const offset = d.getTimezoneOffset();
    const nOffset = Math.abs(offset);
    const h = String(Math.floor(nOffset / 60));
    const m = String(nOffset % 60);
    return (offset > 0 ? '-' : '+')
      + h.padStart(2, '0')
      + ((options.flags && options.flags[':']) ? ':' : '')
      + m.padStart(2, '0');
  }
};

const changeCase = str => str;

const getPadChar = (key, flags = {}) => {
  if (flags['_']) return ' ';
  if (flags['0']) return '0';
  return pad_chars[key] || '0';
};

const getFlags = (input = '') => {
  const res = {};
  for (const k of [...input]) res[k] = true;
  return res;
};

const format = (date, options = {}) => {
  return (match, flags_string, width, modifier, key) => {
    const formatter = formatters[key];
    if (!formatter) return match;

    const flags = getFlags(flags_string);
    const padChar = getPadChar(key, flags);
    const padding = flags['-'] ? 0 : (width || pad_widths[key] || 0);

    let output = formatters[key](date);
    if (flags['^']) {
      output = output.toUpperCase();
    } else if (flags['#']) {
      output = changeCase(output);
    }

    return padding ? output.padStart(padding, padChar) : output;
  };
};

/**
 * Format the given date with `format_string`
 */

const strftime = (input, format_string) => {
  if (!format_string && input && input.includes('%')) {
    format_string = input;
    input = null;
  }

  const date = input ? new Date(input) : new Date();
  const fmt = format(date);
  let output = format_string;
  let prev;

  while (output !== prev) {
    prev = output;
    output = output.replace(DATE_FORMAT_REGEX, fmt);
  }

  return output;
};

module.exports = strftime;
