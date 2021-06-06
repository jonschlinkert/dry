'use strict';

const smartify = require('./smartify');
const { isObject, toString, unquote } = require('../utils');

const filters = {
  append: (value, suffix) => toString(value) + toString(suffix),
  capitalize: value => {
    const output = toString(value);
    return output.charAt(0).toUpperCase() + output.slice(1);
  },
  count: value => {
    if (Array.isArray(value)) return value.flat(Infinity).length;
    if (isObject(value)) return Object.keys(value).length;
    return [...value].length;
  },
  downcase: value => toString(value).toLocaleLowerCase(),
  enquote: (value, char = '"') => `${char}${unquote(value)}${char}`,
  lstrip: value => toString(value).replace(/^\s+/, ''),
  prepend: (value, prefix) => toString(prefix) + toString(value),
  remove: (value, arg) => toString(value).split(arg).join(''),
  remove_first: (value, chars) => toString(value).replace(chars, ''),
  replace: (value, pattern, replacement) => toString(value).split(pattern).join(replacement),
  replace_first: (value, pattern, replacement) => toString(value).replace(pattern, replacement),
  smartify,
  repeat: (value, times = 0) => toString(value).repeat(times),
  rstrip: value => toString(value).replace(/\s+$/, ''),
  split: (value, char) => toString(value).split(toString(char)),
  strip: value => toString(value).trim(),
  strip_newlines: value => toString(value).replace(/\n/g, ''),
  truncate: (value, limit = 50, ellipsis = '…') => {
    const output = toString(value);
    if (output.length <= limit) return output;
    return output.substr(0, limit - ellipsis.length) + ellipsis;
  },
  truncatewords: (value, limit = 15, ellipsis = '…') => {
    const words = value.split(/\s+/);
    let output = words.slice(0, limit).join(' ');
    if (words.length >= limit) output += ellipsis;
    return output;
  },
  unquote: value => toString(unquote(value)),
  upcase: value => toString(value).toLocaleUpperCase()
};

module.exports = filters;
