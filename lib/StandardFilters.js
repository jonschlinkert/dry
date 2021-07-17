'use strict';

const typeOf = require('kind-of');
const Dry = require('./Dry');
const { constants, utils, shared: { strftime } } = Dry;
const { kInput } = constants.symbols;

const toString = input => input != null ? input.toString() : '';
const resolve = (value, context) => typeof value === 'function' ? value.call(context) : value;

const HTML_ESCAPE = {
  '&': '&amp;',
  '>': '&gt;',
  '<': '&lt;',
  '"': '&quot;',
  "'": '&#39;'
};

const HTML_ESCAPE_SOURCE = '["><\']|&(?!(?:[a-zA-Z]+|(?:#\\[0-9]+));)';
const HTML_ESCAPE_ALL_REGEXP = new RegExp(HTML_ESCAPE_SOURCE, 'g');
const STRIP_HTML_BLOCKS = /(?:<script.*?<\/script>|<!--.*?-->|<style.*?<\/style>)/gm;
const STRIP_HTML_TAGS = /<[^>]*?>/gsm;

exports.typeof = v => typeOf(v);

// Return the size of an array or of an string
exports.size = input => utils.size(input);

exports.tr = (input, a, b) => {
  for (let i = 0; i < a.length; i++) input = input.split(a[i]).join(b[i] || b[b.length - 1]);
  return input;
};

exports.ljust = (input, n = 0, pad) => input.padEnd(n, pad);

// convert an input string to DOWNCASE
exports.downcase = input => toString(input).toLowerCase();

// convert an input string to UPCASE
exports.upcase = input => toString(input).toUpperCase();

// capitalize words in the input sentence
exports.capitalize = input => {
  const string = toString(input);
  const words = string.split(' ');
  const title = s => s[0].toUpperCase() + s.slice(1);
  return words.map(w => title(w)).join(' ');
};

exports.json = input => {
  if (utils.isPrimitive(input)) {
    return input;
  }

  if (input instanceof Map) {
    const obj = {};
    for (const [k, v] of input) obj[k] = v;
    input = obj;
  }

  if (input instanceof Set) {
    input = [...input];
  }

  return JSON.stringify(input);
};

exports.escape = exports.h = exports.e = input => {
  return input ? toString(input).replace(HTML_ESCAPE_ALL_REGEXP, m => HTML_ESCAPE[m]) : input;
};

exports.escape_once = input => {
  return toString(input).replace(HTML_ESCAPE_ALL_REGEXP, m => HTML_ESCAPE[m]);
};

const strict_encode_uri = input => {
  return encodeURIComponent(input).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16));
};

exports.url_encode = input => {
  if (!input) return input;
  return strict_encode_uri(toString(input)).replace(/%20/g, '+');
};

exports.url_decode = input => {
  if (!input) return input;
  try {
    return decodeURIComponent(toString(input).replace(/\+/g, ' '));
  } catch (err) {
    throw new Dry.ArgumentError('invalid byte sequence in input');
  }
};

// exports.base64Decode = str => {
//   if (str.length % 4 > 0) {
//     throw new Error('invalid input provided to base64Decode');
//   }

//   if (typeof atob !== 'undefined') {
//     return atob(str);
//   }

//   return Buffer.from(str, 'base64').toString('binary');
// };

// exports.base64Encode = str => {
//   if (Buffer.byteLength(str) !== str.length) {
//     throw new Error('invalid input provided to base64Encode');
//   }

//   if (typeof btoa !== 'undefined') {
//     return btoa(str);
//   }

//   return Buffer.from(String(str), 'binary').toString('base64');
// };

exports.base64_encode = input => {
  const buffer = typeOf(input) === 'buffer' ? input : Buffer.from(toString(input), 'binary');
  return buffer.toString('base64');
};

exports.urlsafe_encode64 = (bin, padding = true) => {
  let input = exports.base64_encode(bin).replace(/\+/g, '-').replace(/\//g, '_');
  if (!padding) input = input.replace(/=/g, '');
  return input;
};

exports.base64_url_safe_encode = (input, padding) => {
  return input ? exports.urlsafe_encode64(toString(input), padding) : '';
};

exports.base64_decode = input => {
  if (input.length % 4 > 0) {
    throw new Dry.ArgumentError('Dry error: invalid base64 provided to base64_decode');
  }

  try {
    return Buffer.from(input, 'base64').toString('binary');
  } catch (err) {
    throw new Dry.ArgumentError('Dry error: invalid base64 provided to base64_decode');
  }
};

// NOTE: RFC 4648 does say nothing about unpadded input, but says that
// "the excess pad characters MAY also be ignored", so it is inferred that
// unpadded input is also acceptable.
exports.base64_url_safe_decode = input => {
  if (typeof input !== 'string' || input.length % 4 > 0) {
    throw new Dry.ArgumentError('Dry error: invalid base64 provided to base64_url_safe_decode');
  }

  input = input.replace(/-/g, '+').replace(/_/g, '/');
  if (!input.endsWith('=') && input.length % 4 !== 0) {
    input = exports.ljust(input, (input.length + 3) & ~3, '=');
  }
  return exports.base64_decode(input);
};

exports.slice = (input, offset, length) => {
  if (!input) return '';

  if (offset !== undefined && !utils.isNumber(offset)) {
    throw new Dry.ArgumentError('expected offset to be a number');
  }

  if (length !== undefined && !utils.isNumber(length)) {
    throw new Dry.ArgumentError('expected length to be a number');
  }

  offset = utils.to_integer(offset);
  length = length != null ? utils.to_integer(length) : 1;

  if (offset < 0) {
    offset = input.length + offset;
  }

  if (Array.isArray(input)) {
    return (input.slice(offset, length + offset) || []);
  } else {
    return toString(input).slice(offset, length + offset) || '';
  }
};

// Truncate a string down to x characters
exports.truncate = (input, length = 50, truncate_string = '...') => {
  if (input == null) return;
  const input_str = toString(input);
  length = utils.to_integer(length);

  const truncate_string_str = toString(truncate_string);

  const l = Math.max(0, length - truncate_string_str.length);
  return input_str.length > length ? input_str.slice(0, l) + truncate_string_str : input_str;
};

exports.truncatewords = (input, count = 15, ellipsis = '...') => {
  if (!input) return input;

  const wordlist = toString(input).split(/\s+/);
  const max = utils.to_integer(count);
  const l = Math.max(1,  Math.abs(max));

  if (l + 1 >= Number.MAX_SAFE_INTEGER) {
    // e.g. integer ${words} too big to convert to `int'
    throw new Dry.ArgumentError(`integer ${l} too big for truncatewords`);
  }

  return wordlist.length > l ? wordlist.slice(0, l).join(' ') + String(ellipsis) : input;
};

// exports.truncatewords = (input, count = 15, truncate_string = '...') => {
//   if (!input) return;
//   input = toString(input);
//   const words = Math.max(1, Math.abs(utils.to_integer(count)));

//   if (words + 1 > Number.MAX_SAFE_INTEGER) {
//     // e.g. integer ${words} too big to convert to `int'
//     throw new Dry.ArgumentError(`integer ${words} too big for truncatewords`);
//   }

//   const wordlist = input.split(/\s+/);
//   if (wordlist.length <= words) return input;

//   wordlist.pop();
//   return wordlist.join(' ').concat(toString(truncate_string));
// };

// Split input string into an array of substrings separated by given pattern.
//
// Example:
//   <div class="summary">{{ post | split '//' | first }}</div>
//
exports.split = (input, pattern) => {
  return input ? toString(input).split(toString(pattern)) : [];
};

exports.trim = input => {
  return toString(input).trim();
};

exports.strip = input => {
  return toString(input).trim();
};

exports.lstrip = input => {
  return toString(input).trimStart();
};

exports.rstrip = input => {
  return toString(input).trimEnd();
};

exports.strip_html = input => {
  if (!input) return '';
  const result = toString(input).replace(STRIP_HTML_BLOCKS, '');
  return result.replace(STRIP_HTML_TAGS, '');
};

// Remove all newlines from the string
exports.strip_newlines = input => {
  return toString(input).replace(/\r?\n/g, '');
};

// Join elements of the array with certain character between them
exports.join = function(input, glue = ' ') {
  return new InputIterator(input, this.context).join(glue);
};

// Sort elements of the array
// provide optional property with which to sort an array of hashes or drops
exports.sort = function(input, prop = null) {
  if (input && input?.each) {
    const arr = [];
    input.each(ele => arr.push(ele));
    input = arr;
  }

  if (prop && Array.isArray(input) && input.length > 0) {
    if (!utils.isNumber(prop) && !input.some(v => utils.isObject(v))) {
      throw new Dry.ArgumentError('invalid property: ' + String(prop));
    }
  }

  const array = new InputIterator(input, this.context);
  if (array.empty) return [];

  if (prop == null) {
    return array.sort((a, b) => nil_safe_compare(a, b));
  }

  if (array.every(el => utils.isObject(el))) {
    try {
      return array.sort((a, b) => nil_safe_compare(a[prop], b[prop]));
    } catch (err) {
      raise_property_error(err, prop);
    }
  }
};

// Sort elements of an array ignoring case if (strings) {
// provide optional property with which to sort an array of hashes or drops
exports.sort_natural = function(input, property = null) {
  if (property && Array.isArray(input) && input.length > 0) {
    if (!utils.isNumber(property) && !input.some(v => utils.isObject(v))) {
      throw new Dry.ArgumentError('invalid property: ' + String(property));
    }
  }

  const array = new InputIterator(input, this.context);

  if (array.empty) {
    return [];
  }

  if (property == null) {
    return array.sort((a, b) => nil_safe_casecmp(a, b));
  }

  if (array.every(el => utils.isObject(el))) {
    try {
      return array.sort((a, b) => nil_safe_casecmp(a[property], b[property]));
    } catch (err) {
      raise_property_error(err, property);
    }
  }
};

// Filter the elements of an array to those with a certain property value.
// By default the target is any truthy value.
exports.where = function(input, property, target_value = null) {
  if (typeof input === 'number' || typeof input === 'symbol') {
    throw new Dry.ArgumentError('input is not iterable: ' + String(input));
  }

  const array = new InputIterator(input, this.context);

  if (array.empty) {
    return [];
  }

  if (utils.isObject(array[0]) && property && target_value == null) {
    try {
      return array.filter(item => item[property]);
    } catch (err) {
      raise_property_error(err, property);
    }
  }

  if (utils.isObject(array[0]) && property && target_value != null) {
    try {
      return array.filter(item => item[property] === target_value);
    } catch (err) {
      raise_property_error(err, property);
    }
  }

  return null;
};

// Remove duplicate elements from an array
// provide optional property with which to determine uniqueness
exports.uniq = function(input, property = null) {
  if (property && Array.isArray(input) && input.length > 0) {
    if (!utils.isNumber(property) && !input.some(v => utils.isObject(v))) {
      throw new Dry.ArgumentError('invalid property: ' + String(property));
    }
  }

  if (utils.isPrimitive(input) && property == null) {
    return [input];
  }

  const array = new InputIterator(input, this.context);

  if (array.empty) {
    return [];
  }

  if (property == null) {
    return array.uniq();
  }

  if (utils.isObject(array[0])) {
    try {
      const seen = new Set();
      return array.uniq((a, i, arr) => {
        const v = JSON.stringify({ [property]: a[property] });
        if (seen.has(v)) return false;
        seen.add(v);
        return true;
      });
    } catch (err) {
      raise_property_error(err, property);
    }
  }
};

// Reverse the elements of an array
exports.reverse = function(input) {
  return new InputIterator(input, this.context).reverse();
};

exports.map = async function(input, prop) {
  if (prop == null) throw new Dry.ArgumentError();
  const value = this && await this.context?.get(prop);

  if (prop === 'to_liquid' && input instanceof Dry.Drop) {
    return input.to_liquid();
  }

  if (input && input[prop] != null) {
    return input[prop];
  }

  const resolve = (ele, parent) => {
    if (typeof ele === 'function') ele = ele();

    if (typeof ele?.to_liquid === 'function') ele.to_liquid();
    if (Array.isArray(ele)) return ele.map(e => resolve(e, ele));

    if (!utils.isNil(ele)) {
      const r = ele[prop];
      if (r !== undefined) {
        return typeof r === 'function' ? r() : r;
      }

      if (value === undefined && Array.isArray(parent)) {
        throw new Dry.ArgumentError();
      }

      return value;
    }
    return ele;
  };

  try {
    if (input != null && typeof input.map === 'function' && !(input instanceof Dry.Drop)) {
      return Promise.all(input.map(ele => resolve(ele)));
    }

    return new InputIterator(input, this.context).map(ele => resolve(ele));
  } catch (err) {
    return raise_property_error(err, prop);
  }
};

// Remove nils within an array
// provide optional property with which to check for null
exports.compact = function(input, property = null) {
  const array = new InputIterator(input, this.context);

  if (array.empty) {
    return [];
  }

  if (property && Array.isArray(input) && input.length > 0) {
    if (!utils.isNumber(property) && !input.some(v => utils.isObject(v))) {
      throw new Dry.ArgumentError('invalid property: ' + String(property));
    }
  }

  if (property == null) {
    return array.compact();
  } else if (array.empty) { // The next two cases assume a non-empty array.
    return [];
  } else if (utils.isObject(array[0])) {
    try {
      return array.filter(a => a[property] != null);
    } catch (err) {
      raise_property_error(err, property);
    }
  }
};

// Replace occurrences of a string with another
exports.replace = (input = '', string = '', replacement = '') => {
  return toString(input).split(toString(string)).join(toString(replacement));
};

// Replace the first occurrences of a string with another
exports.replace_first = (input = '', string = '', replacement = '') => {
  return toString(input).replace(toString(string), toString(replacement));
};

// remove a substring
exports.remove = (input = '', string = '') => {
  return toString(input).split(toString(string)).join('');
};

// remove the first occurrence of a substring
exports.remove_first = (input = '', string = '') => {
  return toString(input).replace(toString(string), '');
};

// add one string to another
exports.append = (input = '', string = '') => {
  return toString(input) + toString(string);
};

exports.concat = function(input, array) {
  if (!Array.isArray(array)) {
    throw new Dry.ArgumentError('concat filter requires an array argument');
  }
  return new InputIterator(input, this.context).concat(array);
};

// prepend a string to another
exports.prepend = (input = '', string = '') => {
  return toString(string) + toString(input);
};

// Add <br /> tags in front of all newlines in input string
exports.newline_to_br = (input = '') => {
  return toString(input).replace(/\r\n*|\n/g, '<br />\n');
};

// Reformat a date using Ruby's core Time//strftime( string ) -> string
//
//   %a - The abbreviated weekday name (``Sun'')
//   %A - The  full  weekday  name (``Sunday'')
//   %b - The abbreviated month name (``Jan'')
//   %B - The  full  month  name (``January'')
//   %c - The preferred local date and time representation
//   %d - Day of the month (01..31)
//   %H - Hour of the day, 24-hour clock (00..23)
//   %I - Hour of the day, 12-hour clock (01..12)
//   %j - Day of the year (001..366)
//   %m - Month of the year (01..12)
//   %M - Minute of the hour (00..59)
//   %p - Meridian indicator (``AM''  or  ``PM'')
//   %s - Number of seconds since 1970-01-01 00:00:00 UTC.
//   %S - Second of the minute (00..60)
//   %U - Week  number  of the current year,
//           starting with the first Sunday as the first
//           day of the first week (00..53)
//   %W - Week  number  of the current year,
//           starting with the first Monday as the first
//           day of the first week (00..53)
//   %w - Day of the week (Sunday is 0, 0..6)
//   %x - Preferred representation for the date alone, no time
//   %X - Preferred representation for the time alone, no date
//   %y - Year without a century (00..99)
//   %Y - Year with century
//   %Z - Time zone name
//   %% - Literal ``%'' character
//
//   See also: http://www.ruby-doc.org/core/Time.html//method-i-strftime
exports.date = (input, format) => {
  if (!input) return input;
  if (!format) return toString(input);

  let str = toString(input);
  const lower = str.toLowerCase();

  if (/^[0-9]+$/.test(str) && str.length === 10) {
    str += '000';
  } else if (lower === 'today' || lower === 'now') {
    input = new Date();
  }

  const date = typeof str === 'string' ? utils.to_date(str) : str;
  if (!date) return str;

  return strftime(date, toString(format));
};

exports.year = input => {
  const date = input ? new Date(input) : new Date();
  return toString(date.getFullYear());
};

// Get the first element of the passed in array
//
// Example:
//    {{ product.images | first | to_img }}
//
exports.first = array => {
  return Array.isArray(array) ? array[0] : '';
};

// Get the last element of the passed in array
//
// Example:
//    {{ product.images | last | to_img }}
//
exports.last = array => {
  return Array.isArray(array) ? array[array.length - 1] : '';
};

// absolute value
exports.abs = input => Math.abs(utils.to_number(input));
exports.ceil = input => Math.ceil(utils.to_number(input));
exports.floor = input => Math.floor(utils.to_number(input));
exports.round = (input, precision = 0) => {
  return utils.to_number(input).toFixed(utils.to_number(precision));
};

// addition
exports.add = (input, operand) => utils.to_number(input) + utils.to_number(operand);
exports.plus = (input, operand) => {
  const left = utils.to_number(input);
  const right = utils.to_number(operand);
  let decimals = 0;

  const lt_segs = String(input).split('.');
  const rt_segs = String(operand).split('.');

  if (lt_segs.length > 1) {
    decimals = Math.max(decimals, lt_segs[1].length);
  }

  if (rt_segs.length > 1) {
    decimals = Math.max(decimals, rt_segs[1].length);
  }

  if (decimals) {
    return (left + right).toFixed(decimals);
  }

  return left + right;
};

// subtraction
exports.minus = (input, operand) => utils.to_number(input) - utils.to_number(operand);
exports.subtract = (input, operand) => utils.to_number(input) - utils.to_number(operand);

// multiplication
exports.times = (input, operand) => apply_operation(input, '*', operand);
exports.multiply = (input, operand) => apply_operation(input, '*', operand);

// division
exports.divided_by = (input, operand, precision) => {
  return apply_operation(input, '/', operand, precision);
};

// modulo
exports.modulo = (input, operand) => apply_operation(input, '%', operand);

exports.at_least = (input, n) => {
  const min_value = utils.to_number(n);
  const result = utils.to_number(input);
  return min_value > result ? min_value : result;
};

exports.at_most = (input, n) => {
  const max_value = utils.to_number(n);
  const result = utils.to_number(input);
  return max_value < result ? max_value : result;
};

// Set a default value when the input is null, false or empty
//
// Example:
//    {{ product.title | default: "No Title" }}
//
// Use `allow_false` when an input should only be tested against null or empty and not false.
//
// Example:
//    {{ product.title | default: "No Title", allow_false: true }}
//
exports.default = (input, default_value = '', options = {}) => {
  if (!utils.isObject(options)) options = {};
  const false_check = options.allow_false ? input == null : !input;
  return false_check || utils.empty(input) ? default_value : input;
};

/**
 * Private helpers
 */

const operate = (input, comparator, operand) => {
  const a = utils.to_number(input);
  const b = utils.to_number(operand);

  if (b === 0) {
    if (typeof operand === 'string' && operand.includes('.')) {
      return new Dry.FloatDomainError('cannot divide by zero');
    }

    return new Dry.ZeroDivisionError('cannot divide by zero');
  }

  switch (comparator) {
    case '+': return a + b;
    case '-': return a - b;
    case '*': return a * b;
    case '/': return a / b;
    case '%': return a % b;
  }
};

const apply_operation = (input, comparator, operand, precision) => {
  const result = operate(input, comparator, operand);
  if (result instanceof Error) return result;

  const output = (typeof result === 'bigint' ? Number(result) : result);
  if (!output) return output;

  if (precision === undefined) {
    const segs = String(input).split('.');
    const dec = segs.pop();

    if (!segs.length && String(output).split('.')[0] !== '0') {
      return Math.floor(output);
    }

    precision = Math.min(2, dec.length);
  }

  return output.toFixed(precision);
};

const raise_property_error = (err, property) => {
  if (process.env.DEBUG) console.error(err);
  throw new Dry.ArgumentError(`cannot select the property '${property}'`);
};

// Combined comparison operator. Returns
// - 0 if first operand equals second,
// - 1 if first operand is greater than the second
// - -1 if first operand is less than the second
const nil_safe_compare = (a, b) => {
  if (a != null && b != null) {
    return a === b ? 0 : a > b ? 1 : -1;
  } else {
    return a == null ? 1 : -1;
  }
};

const nil_safe_casecmp = (a, b) => {
  if (a != null && b != null) {
    return nil_safe_compare(String(a).toLowerCase(), String(b).toLowerCase());
  } else {
    return a == null ? 1 : -1;
  }
};

class InputIterator {
  constructor(input, context) {
    this.context = context;
    this[kInput] = input;
    this.input = utils.toArray(input);

    return new Proxy(this, {
      get(target, key) {
        return key in target ? target[key] : target.input[key];
      }
    });
  }

  join(glue) {
    return this.input.join(toString(glue));
  }

  concat(...args) {
    return this.input.concat(args.flat());
  }

  reverse() {
    return this.input.reverse();
  }

  uniq(block = (ele, i, arr) => arr.indexOf(ele) === i) {
    if (this.input instanceof Set) {
      return [...this.input];
    }
    return this.input.filter(block);
  }

  sort(compare) {
    return this.input.sort(compare);
  }

  compact() {
    return this.input.filter(v => v != null);
  }

  each(fn) {
    return [...this.input].map(e => {
      if (e.context) e.context = this.context;
      return fn(utils.to_liquid(e));
    });
  }

  every(fn) {
    return this.input.every(fn);
  }

  filter(fn) {
    return this.input.filter(fn);
  }

  map(fn) {
    const drop = this[kInput];

    if (drop instanceof Dry.Drop && drop.each) {
      const output = [];
      drop.each(e => {
        if (e && !utils.isPrimitive(e)) e.context = this.context;
        output.push(fn(e));
      });
      return output.join('');
    }

    // return this.drop === true ? this.input[0].each(fn) : this.input.map(fn);
    return this.input.map(fn);
  }

  get empty() {
    if (this[kInput] instanceof Dry.Drop) {
      return 'empty' in this[kInput] ? resolve.call(this[kInput], this[kInput].empty) : false;
    }
    return utils.empty(this.input);
  }
}
