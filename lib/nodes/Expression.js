'use strict';

const get = require('expand-value');
const fill = require('fill-range');
const nodes = require('.');

// const SINGLE_QUOTED_STRING = /^'([\s\S]*?)'$/;
// const DOUBLE_QUOTED_STRING = /^"([\s\S]*?)"$/;
// const INTEGERS_REGEX       = /^([-+]?[0-9]+)$/;
// const FLOATS_REGEX         = /^([-+]?[0-9][0-9.]+)$/;
// const RANGES_REGEX         = /^\((\S+)\.\.(\S+)\)$/;

// Use an atomic group (?>...) to avoid pathological backtracing from
// malicious input as described in https://github.com/Shopify/liquid/issues/1357
const RANGES_REGEX         = /^\s*\(\s*(?:(\S+)\s*\.\.)\s*(\S+)\s*\)\s*$/;
const SINGLE_QUOTED_STRING = /^\s*'([\s\S]*?)'\s*$/m;
const DOUBLE_QUOTED_STRING = /^\s*"([\s\S]*?)"\s*$/m;
const INTEGERS_REGEX       = /^\s*([-+]?[0-9]+)\s*$/;
const FLOATS_REGEX         = /^\s*([-+]?[0-9][0-9.]+)\s*$/;

const kMethod = Symbol(':method');
const kValue = Symbol(':value');

class MethodLiteral {
  constructor(name, value) {
    this[kMethod] = name;
    this[kValue] = value;
  }

  to_liquid() {
    return this[kValue];
  }

  toString() {
    return this.to_liquid();
  }

  get method_name() {
    return this[kMethod];
  }
}

const LITERALS = Object.freeze({
  '': null,
  'nil': null,
  'null': null,
  'true': true,
  'false': false,
  'blank': new MethodLiteral('blank', ''),
  'empty': new MethodLiteral('empty', '')
});

const toInteger = val => {
  if (typeof val === 'number') {
    return val;
  }

  try {
    const num = Number(String(val));
    return isNaN(num) ? 0 : num;
  } catch (err) {
    throw new SyntaxError('invalid integer');
  }
};

class RangeLookup {
  constructor(start, end) {
    this.start = start;
    this.end   = end;
  }

  static parse(startValue, endValue) {
    const start = Expression.parse(startValue);
    const end = Expression.parse(endValue);

    if (start.evaluate || end.evaluate) {
      return new RangeLookup(start, end);
    }

    return fill(Number(start), Number(end));
  }

  evaluate(context) {
    const start = this.toInteger(context.evaluate(this.start));
    const end   = this.toInteger(context.evaluate(this.end));
    return fill(Number(start), Number(end))
  }

  toInteger(input) {
    return toInteger(input);
  }
}

class Expression {
  static parse(value) {
    value = value.trim();

    if (hasOwnProperty.call(LITERALS, value)) {
      return LITERALS[value];
    }

    const exec = regex => (this.match = regex.exec(value));

    if (exec(SINGLE_QUOTED_STRING)) return this.match[1];
    if (exec(DOUBLE_QUOTED_STRING)) return this.match[1];
    if (exec(INTEGERS_REGEX)) return Number(this.match[1]);
    if (exec(FLOATS_REGEX)) return Number(this.match[1]);
    if (exec(RANGES_REGEX)) {
      return RangeLookup.parse(this.match[1], this.match[2]);
    }

    return nodes.VariableLookup.parse(value);
  }

  static get MethodLiteral() {
    return MethodLiteral;
  }

  static get RangeLookup() {
    return RangeLookup;
  }
}

module.exports = Expression;
