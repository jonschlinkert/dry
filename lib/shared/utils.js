'use strict';

const { getPrototypeOf } = Reflect;
const { getOwnPropertyNames, hasOwnProperty } = Object;
const isNumber = require('is-number');
const typeOf = require('kind-of');
const Dry = require('../Dry');

exports.handlers = {
  set(target, key, value, receiver) {
    return key in target ? ((target[key] = value), true) : target.set(key, value);
  },
  get(target, key, receiver) {
    return key in target ? target[key] : (target.get ? target.get(key) : false);
  },
  has(target, key) {
    return key in target ? true : (target.has ? target.has(key) : false);
  },
  ownKeys(target) {
    return target.keys ? target.keys() : Reflect.ownKeys(target);
  },
  deleteProperty(target, key) {
    if (key in target) {
      delete target[key];
      return true;
    }
    return target.delete(key);
  }
};

exports.round = (num, dec = 2) => Number(num.toFixed(dec));

exports.has = (obj, k) => hasOwnProperty.call(obj, k);

exports.isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

exports.isInteger = v => {
  return isNumber(v) ? Number.isInteger(Number(v)) : false;
};

exports.isIterable = value => {
  return value ? typeof value[Symbol.iterator] === 'function' : false;
};

exports.toInteger = exports.to_integer = exports.to_i = num => {
  if (typeof num === 'number') {
    return Math.round(num);
  }

  try {
    return Math.round(Number(String(num)));
  } catch (err) {
    throw new SyntaxError('invalid integer');
  }
};

exports.toNumber = exports.to_number = value => {
  if (typeof value === 'string') value = value.trim();
  if (value === 0 || value === '0') {
    return Math.abs(value); // account for -0
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+n$/.test(value)) {
    return BigInt(value);
  }
  if (value !== null && typeof value === 'object' && typeof value.to_number === 'function') {
    return value.to_number();
  }
  const n = parseFloat(value, 10);
  return isNaN(n) ? 0 : n;
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

exports.isNumber = value => {
  if (typeof value === 'number') {
    return value - value === 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite ? Number.isFinite(Number(value)) : isFinite(Number(value));
  }
  return false;
};

exports.arrayify = val => {
  return val != null ? (Array.isArray(val) ? val : [val]) : [];
};

exports.toArray = value => {
  switch (typeOf(value)) {
    case 'null':
    case 'undefined': return [];
    case 'object':
    case 'function': return [value];
    case 'array': return value.flat();
    case 'string': return value ? [...value] : [];
    default: {
      return [value];
    }
  }
};

exports.isSafeKey = key => {
  return key !== 'constructor' && key !== 'prototype' && key !== '__proto__';
};

exports.toValue = value => {
  try {
    if (value && value.toString && value.constructor?.name.includes('Drop')) {
      return value.toString();
    }
  } catch (err) {
    return value;
  }

  return value;
};

exports.toString = obj => {
  if (typeof obj === 'symbol') return obj.toString().slice(7, -1);

  const value = exports.toValue(obj);

  if (!exports.isNil(value)) {
    return value.toString ? value.toString() : value;
  }

  return '';
};

// exports.toString = obj => {
//   if (typeof obj === 'symbol') return obj.toString().slice(7, -1);

//   const value = exports.toValue(obj);

//   if (!exports.isNil(value)) {
//     return typeof value === 'object' ? JSON.stringify(value) : String(value);
//   }

//   return '';
// };

exports.to_liquid = value => {
  if (exports.isPrimitive(value)) return exports.toString(value);
  if (typeof value.to_liquid === 'function') return value.to_liquid();
  return value.toString();
};

exports.to_liquid_value = obj => {
  // Enable "obj" to represent itself as a primitive value like integer, string, or boolean
  if (typeof obj?.to_liquid_value === 'function') return obj.to_liquid_value();

  // Otherwise return the object itself
  return obj;
};

exports.ancestors = (proto, fn = () => {}) => {
  const results = new Set();

  const isValid = p => p.constructor !== Object && p.constructor !== Function;

  while (proto) {
    if (isValid(proto)) {
      fn(proto);
      results.add(proto.constructor);
      proto = getPrototypeOf(proto);
    } else {
      break;
    }
  }

  return results;
};

exports.getAllPropertyNames = (provider, fn = () => true) => {
  const names = new Set();

  const getKeys = proto => {
    for (const key of Reflect.ownKeys(proto)) {
      if (!exports.isSafeKey(key)) continue;
      if (fn(proto, key) === true) {
        names.add(key);
      }
    }
  };

  getKeys(provider);
  exports.ancestors(provider, proto => getKeys(proto));
  return [...names];
};

exports.getAllMethodNames = proto => {
  return exports.getAllPropertyNames(proto, (obj, key) => typeof obj[key] === 'function');
};

exports.scan = (input, regex, callback) => {
  if (!input) return [];
  if (!regex.flags.includes('g')) {
    regex = new RegExp(regex.source, regex.flags + 'g');
  }

  const matches = [...input.matchAll(regex)];

  if (typeof callback === 'function') {
    for (let index = 0; index < matches.length; index++) {
      callback(...matches[index], index);
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

  if (exports.isIterable(collection)) {
    for (const item of collection) {
      if (exports.isInteger(to) && to <= index) break;
      if (from <= index) {
        segments.push(item);
      }
      index++;
    }
  } else if (collection && typeof collection.each === 'function') {
    collection.each(item => {
      if ((!exports.isInteger(to) || to > index) && from <= index) {
        segments.push(item);
      }
      index++;
    });
  }

  return segments;
};

exports.to_date = value => {
  if (!value) return value;

  try {
    if (value.strftime) return value;

    if (typeof value === 'string') {
      if (value.length === 0) return null;
      value = value.toLowerCase();
    }

    switch (value) {
      case 'now':
      case 'today':
        return new Date();
      default: {
        if (/^\d+$/.test(value) || Number.isInteger(Number(value))) {
          return new Date(parseInt(value, 10));
        }
        if (typeof value === 'string') {
          const date = new Date(value);
          if (date.toString().toLowerCase() === 'invalid date') {
            return;
          }
          return date;
        }
      }
    }
  } catch (err) {
    if (process.env.DEBUG) console.error(err);
    if (err instanceof Dry.ArgumentError) {
      throw err;
    }
    return null;
  }
};

exports.today = () => {
  const date = new Date();
  // const dd = String(date.getUTCDate()).padStart(2, '0');
  // const mm = String(date.getUTCMonth() + 1).padStart(2, '0'); //January is 0!
  return date.getUTCFullYear();
};

exports.format_date = (value, ...args) => {
  const date = new Date(value, ...args);
  const month = String(date.getUTCMonth()).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${year}-${month}-${day}`;
};
