'use strict';

const Dry = require('./Dry');
const { regex: { QuotedString: q }, utils: { r } } = Dry;

class Expression {
  static LITERALS = {
    'nil': null, 'null': null, '': null,
    'true': true,
    'false': false,
    'blank': '',
    'empty': ''
  }

  // Use an atomic group (?>...) to avoid pathological backtracing from
  // malicious input as described in https://github.com/Shopify/liquid/issues/1357
  static RANGES_REGEX   = /^\s*\(\s*(?:(\S+)\s*\.\.)\s*(\S+)\s*\)\s*$/;
  static INTEGERS_REGEX = /^\s*([-+]?[0-9]+)\s*$/;
  static FLOATS_REGEX   = /^\s*([-+]?[0-9][0-9.]+)\s*$/;
  static SPREAD_REGEX   = /^\.{3}([a-zA-Z_][\w-]*)/;
  static QuotedString  = r('m')`^\\s*(${q.source.slice(1)})\\s*$`;

  static parse(value) {
    if (value == null) return value;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') value = value.trim();

    if (hasOwnProperty.call(this.LITERALS, value)) {
      return this.LITERALS[value];
    }

    const exec = regex => (this.match = regex.exec(value));

    if (exec(this.QuotedString)) return this.match[1].slice(1, -1);
    if (exec(this.INTEGERS_REGEX)) return Number(this.match[1]);
    if (exec(this.RANGES_REGEX)) return Dry.RangeLookup.parse(this.match[1], this.match[2]);
    if (exec(this.FLOATS_REGEX)) return Number(this.match[1]);
    if (exec(this.SPREAD_REGEX)) {
      const result = Dry.VariableLookup.parse(this.match[1]);
      result.spread = true;
      return result;
    }

    return Dry.VariableLookup.parse(value);
  }

  static isRange(value) {
    return this.RANGES_REGEX.test(value);
  }
}

module.exports = Expression;
