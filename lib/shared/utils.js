'use strict';

const { getPrototypeOf } = Reflect;
const { hasOwnProperty } = Object;
const isNumber = require('is-number');
const typeOf = require('kind-of');
const Dry = require('../Dry');

Reflect.defineProperty(exports, 'set', {
  get() {
    return require('set-value');
  }
});

Reflect.defineProperty(exports, 'expand', {
  get() {
    return require('expand-value');
  }
});

exports.resolve = (value, context) => {
  return typeof value === 'function' ? exports.resolve(value(context), context) : value;
};

exports.count = (str = '', substr) => str.split(substr).length - 1;

exports.has = (obj, k) => hasOwnProperty.call(obj, k);

exports.isSafeKey = key => {
  return key !== 'constructor' && key !== 'prototype' && key !== '__proto__';
};

exports.isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
exports.isPlainObject = v => exports.isObject(v) && v.constructor === Object;

exports.isInteger = v => isNumber(v) ? Number.isInteger(Number(v)) : false;
exports.isIterable = value => value ? typeof value[Symbol.iterator] === 'function' : false;
exports.isPrimitive = value => {
  return typeof value === 'object' ? value === null : typeof value !== 'function';
};

exports.is_nil = exports.nil = exports.isNil = value => value === null || value === undefined;
exports.empty = exports.isEmpty = value => exports.size(value) === 0;
exports.blank = exports.isBlank = value => exports.size(value) === 0;
exports.present = exports.isPresent = value => exports.size(value) > 0;
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

exports.ParseSyntax = (node, markup, regex) => {
  return (node.last_match = regex.exec(markup));
};

exports.handlers = {
  set(target, key, value, receiver) {
    return key in target ? ((target[key] = value), true) : target.set(key, value);
  },
  get(target, key, receiver) {
    return key in target ? target[key] : target.get && target.get(key);
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

exports.size = value => {
  if (exports.isNil(value)) return 0;
  if (isNumber(value)) return Number(value);
  if (exports.isObject(value)) return Object.keys(value).length;
  if (typeof value.length === 'number') return value.length;
  if (typeof value.size === 'number') return value.size;
  return null;
};

exports.last = arr => arr[arr.length - 1];

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
    case 'map': return [...value.values()];
    case 'set': return [...value];
    default: {
      return [value];
    }
  }
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

exports.isQuoted = input => {
  return typeof input === 'string' && /^([`"'])[\s\S]*?\1$/.test(input);
};

exports.unquote = input => {
  if (Array.isArray(input)) {
    return input.map(v => exports.unquote(v));
  }

  if (exports.isQuoted(input)) {
    return input.slice(1, -1);
  }

  return input;
};

exports.toString = obj => {
  if (typeof obj === 'symbol') return obj.toString().slice(7, -1);

  const value = exports.toValue(obj);

  if (!exports.isNil(value)) {
    return value.toString ? value.toString() : value;
  }

  return '';
};

exports.toLiquid = exports.to_liquid = value => {
  if (exports.isPrimitive(value)) return exports.toString(value);
  if (typeof value.to_liquid === 'function') return value.to_liquid();
  return value.toString();
};

exports.toLiquidValue = exports.to_liquid_value = obj => {
  // Enable "obj" to represent itself as a primitive value like integer, string, or boolean
  if (typeof obj?.to_liquid_value === 'function') return obj.to_liquid_value();

  // Otherwise return the object itself
  return obj;
};

exports.keys = value => {
  if (exports.isObject(value)) {
    return 'keys' in value ? value.keys : Object.keys(value);
  }
  return [];
};

exports.ancestors = (proto, fn = () => {}) => {
  const isValid = p => p.constructor !== Object && p.constructor !== Function;
  const results = new Set();

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

  const source = v => v ? (v instanceof RegExp ? v.source : v) : '';
  const compile = (parts, ...vars) => {
    return new RegExp(parts.reduce((s, part, i) => s + part + source(vars[i]), ''), flags);
  };

  if (flags.length > 1 && Array.isArray(flags[0]) || !/^[dgimsuy]+$/.test(flags[0])) {
    flags = '';
    return compile(...args);
  }

  return compile;
};

exports.title = s => s[0].toUpperCase() + s.slice(1).toLowerCase();
exports.pascal = s => s.split('_').filter(v => v !== 'REGEX').map(v => exports.title(v)).join('');

exports.trim_whitespace_left = (node, parser) => {
  const prev = node.prev;

  if (node && node.trim_left && prev && prev.value) {
    const first_byte = prev.value[0];
    prev.value = prev.value.trimEnd();

    if (node.state && prev.value === '') {
      if (node.state.template_options.bug_compatible_whitespace_trimming) {
        prev.value += first_byte;
      }
    }
  }
};

exports.trim_whitespace_right = (node, parser) => {
  const next = node.next;

  if (node && node.trim_right) {
    if (next) {
      next.value = next.value.trimStart();
    } else {
      parser.lexer.accept('space');
    }
  }
};

exports.trim_whitespace = (node, parser) => {
  exports.trim_whitespace_right(node, parser);
  exports.trim_whitespace_left(node, parser);
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

  if (exports.isPlainObject(collection)) {
    collection = Object.entries(collection).map(([key, value]) => {
      if (exports.isObject(value)) {
        value = { ...value };

        if (Object.prototype.toString === value.toString) {
          value.toString = () => JSON.stringify(value);
        }
      }
      return [key, value];
    });
  }

  if (typeof Symbol !== 'undefined' && exports.isIterable(collection)) {
    const iterator = collection[Symbol.iterator]();

    for (let ele = iterator.next(); !ele.done; ele = iterator.next()) {
      if (exports.isInteger(to) && to <= index) break;
      if (from <= index) {
        segments.push(ele.value);
      }
      index++;
    }

    return segments;
  }

  if (collection && typeof collection.each === 'function') {
    collection.each(item => {
      if ((!exports.isInteger(to) || to > index) && from <= index) {
        segments.push(item);
      }
      index++;
    });
    return segments;
  }
};

exports.each = (context, options = {}) => {
  const fn = options.fn || (value => value);
  const inverse = options.inverse;
  const data = {};

  let i = 0;
  let output = '';

  const predicate = (field, index, last) => {
    if (data) {
      data.key = field;
      data.index = index;
      data.first = index === 0;
      data.last = Boolean(last);
    }

    output += fn(context[field], { data });
  };

  if (context && typeof context === 'object') {
    if (Array.isArray(context)) {
      for (let j = context.length; i < j; i++) {
        if (i in context) {
          predicate(i, i, i === context.length - 1);
        }
      }
    } else if (global.Symbol && context[global.Symbol.iterator]) {
      const newContext = [];
      const iterator = context[global.Symbol.iterator]();

      for (let ele = iterator.next(); !ele.done; ele = iterator.next()) {
        newContext.push(ele.value);
      }

      context = newContext;

      for (let j = context.length; i < j; i++) {
        predicate(i, i, i === context.length - 1);
      }
    } else {
      let priorKey;

      for (const key of Object.keys(context)) {
        // We're running the iterations one step out of sync so we can detect
        // the last iteration without have to scan the object twice and create
        // an itermediate keys array.
        if (priorKey !== undefined) {
          predicate(priorKey, i - 1);
        }

        priorKey = key;
        i++;
      }

      if (priorKey !== undefined) {
        predicate(priorKey, i - 1, true);
      }
    }
  }

  if (i === 0 && typeof inverse === 'function') {
    output = inverse(context, options);
  }

  return output;
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
