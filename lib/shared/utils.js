'use strict';

const { hasOwnProperty } = Object;
const { deleteProperty } = Reflect;
const isNumber = require('is-number');
const typeOf = require('kind-of');
const Dry = require('../Dry');

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

exports.isNil = value => value === null || value === undefined;
exports.blank = exports.isBlank = value => exports.size(value) === 0;
exports.present = exports.isPresent = value => exports.size(value) > 0;

exports.isEmpty = exports.empty = value => {
  if (value === null || value === undefined) return true;
  if (value === '') return true;
  if (typeof value === 'number') return value;
  if (typeof value.size === 'number') return value.size === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (exports.isObject(value)) return Object.keys(value).length === 0;
  return false;
};

exports.isNumber = value => {
  if (typeof value === 'number') {
    return value - value === 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite ? Number.isFinite(Number(value)) : isFinite(Number(value));
  }
  return false;
};

exports.isObjectString = (source = '') => {
  const input = source.trim();
  return input.startsWith('{') && input.endsWith('}');
};

exports.ParseSyntax = (node, markup, regex) => {
  Reflect.defineProperty(node, 'last_match', { value: regex.exec(markup), configurable: true });
  return node.last_match;
};

exports.handlers = {
  set(target, key, value, receiver) {
    if (key !== 'undefined') {
      return key in target ? ((target[key] = value), true) : target.set(key, value);
    }
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
      deleteProperty(target, key);
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
  return String(value).length;
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

exports.toInteger = exports.to_i = num => {
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

exports.toString = obj => {
  if (typeof obj === 'symbol') return obj.toString().slice(7, -1);

  const value = exports.toValue(obj);

  if (!exports.isNil(value)) {
    return value.toString ? value.toString() : value;
  }

  return '';
};

exports.toLiquidValue = exports.to_liquid_value = obj => {
  // Enable "obj" to represent itself as a primitive value like integer, string, or boolean
  if (typeof obj?.to_liquid_value === 'function') return obj.to_liquid_value();

  // Otherwise return the object itself
  return obj;
};

exports.isQuoted = input => {
  return typeof input === 'string' && /^([`"'])[\s\S]*\1$/.test(input);
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

exports.unindent = input => {
  const lines = input.replace(/^\s*\n|\n\s*$|^\s+$/g, '').replace(/\t/g, '  ').split('\n');
  const indents = lines.filter(line => line.trim()).map(line => line.match(/^ */)[0].length);
  const min = Math.min(...indents);
  return lines.map(line => line.slice(min)).join('\n');
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

exports.trim_whitespace_left = node => {
  const prev = node.prev;

  if (node?.trim_left && prev?.value) {
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
  if (node?.trim_right) {
    const next = node.next;

    if (next) {
      next.value = next.value.trimStart();
    } else if (parser?.lexer) {
      parser.lexer.accept('space');
    }
  }
};

exports.trim_whitespace = (node, parser) => {
  if (typeof node.trim_whitespace === 'function') {
    return node.trim_whitespace();
  }
  exports.trim_whitespace_left(node);
  exports.trim_whitespace_right(node, parser);
};

exports.maybe_trim_whitespace = (node, parser, { trim_left, trim_right } = {}) => {
  if (node.type === 'raw') return;
  const i = node.type === 'variable' ? 3 : 4;
  node.trim_left = node.trim_left ?? trim_left ?? node.match?.[1] === '-';
  node.trim_right = node.trim_right ?? trim_right ?? node.match?.[i] === '-';
  exports.trim_whitespace(node, parser);
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

exports.to_date = value => {
  if (!value) return value;
  if (value instanceof Date) return value;

  try {
    if (value.strftime) return value;

    if (typeof value === 'string') {
      if (value.length === 0) return null;
      value = value.toLowerCase();
    }

    switch (value) {
      case 'now':
      case 'today': return new Date();
      default: {
        if (/^\d+$/.test(value) || Number.isInteger(Number(value))) {
          return new Date(parseInt(value, 10));
        }

        if (typeof value === 'string') {
          const date = new Date(value);
          if (date.toString().toLowerCase() === 'invalid date') return;
          return date;
        }
      }
    }
  } catch (err) {
    if (process.env.DEBUG) console.error(err);
    if (err instanceof Dry.ArgumentError) {
      throw err;
    }
  }

  return null;
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
