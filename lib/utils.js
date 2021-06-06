'use strict';

const { hasOwnProperty } = Object;
const isNumber = require('is-number');
const Drop = require('./drops/Drop');

exports.has = (obj, k) => hasOwnProperty.call(obj, k);

exports.to_i = v => Math.round(Number(v));

exports.isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

exports.isInteger = v => {
  return isNumber(v) ? Number.isInteger(Number(v)) : false;
};

exports.isIterable = value => {
  return value ? typeof value[Symbol.iterator] === 'function' : false;
};

exports.toInteger = num => {
  if (typeof num === 'number') {
    return num;
  }

  try {
    return Number(String(num));
  } catch (err) {
    throw new SyntaxError('invalid integer');
  }
};

exports.size = value => {
  if (exports.isNil(value)) return 0;
  if (isNumber(value)) return Number(value);
  if (exports.isObject(value)) return Object.keys(value).length;
  if (typeof value.length === 'number') return value.length;
  if (typeof value.size === 'number') return value.size;
  return null;
};

exports.isPrimitive = value => {
  return typeof value === 'object' ? value === null : typeof value !== 'function';
};

exports.is_nil = exports.isNil = value => value === null || value === undefined;
exports.empty = exports.isEmpty = value => exports.size(value) === 0;
exports.nil = value => exports.isNil(value);
exports.blank = value => exports.size(value) === 0;
exports.present = value => exports.size(value) > 0;

exports.isFalsy = value => exports.isNil(value) === true || value === false;
exports.isTruthy = value => exports.isFalsy(value) === false;
exports.toValue = value => {
  return !exports.isPrimitive(value) && value instanceof Drop ? value.valueOf() : value;
};

exports.toString = value => {
  const val = exports.toValue(value);
  if (!exports.isNil(val)) {
    return typeof val === 'object' ? JSON.stringify(val) : String(val);
  }
  return '';
};

exports.scan = (input, regex, callback) => {
  if (!input) return [];
  if (!regex.flags.includes('g')) {
    regex = new RegExp(regex.source, regex.flags + 'g');
  }

  const matches = [...input.matchAll(regex)];

  if (typeof callback === 'function') {
    for (const match of matches) {
      callback(...match);
    }
  }

  return matches;
};

exports.r = (...flags) => {
  const args = flags;

  const string = v => v ? (v instanceof RegExp ? v.source : v) : '';
  const compile = (parts, ...vars) => {
    return new RegExp(parts.reduce((s, part, i) => s + part + string(vars[i]), ''), flags);
  };

  if (flags.length > 1 && Array.isArray(flags[0])) {
    flags = '';
    return compile(...args);
  }

  return compile;
};

exports.slice_collection = (collection, from, to) => {
  if (!collection) return [];

  if ((from !== 0 || !exports.isNil(to)) && typeof collection.load_slice === 'function') {
    return collection.load_slice(from, to);
  }

  return exports.slice_collection_using_each(collection, from, to);
};

exports.slice_collection_using_each = (collection, from, to) => {
  if (typeof collection === 'string') {
    return exports.isEmpty(collection) ? [] : [collection];
  }

  const segments = [];
  let index = 0;

  const collect = (item, i) => {
    if ((!exports.isInteger(to) || to > i) && from <= i) {
      segments.push(item);
    }
  };

  if (collection && typeof collection.each === 'function') {
    collection.each(collect);
    return segments;
  }

  if (exports.isIterable(collection)) {
    for (const item of collection) {
      collect(item, index);
      index++;
    }
  }

  return segments;
};
