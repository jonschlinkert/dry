'use strict';

const Dry = require('./Dry');
const fill = require('fill-range');

const toInteger = value => {
  if (typeof value === 'number') {
    return value;
  }

  try {
    const number = Number(value);
    return isNaN(number) ? 0 : number;
  } catch (err) {
    throw new Dry.SyntaxError('invalid integer');
  }
};

class RangeLookup {
  constructor(start, end) {
    this.type = 'range';
    this.set('start', start);
    this.set('end', end);
  }

  set(key, value) {
    if (typeof value === 'string' && value.includes('|')) {
      value = new Dry.Variable(value);
    }

    if (value instanceof Dry.VariableLookup && value.markup.includes('|')) {
      value = new Dry.Variable(value.markup);
    }

    this[key] = value;
  }

  static parse(startValue, endValue) {
    const start = Dry.Expression.parse(startValue);
    const end = Dry.Expression.parse(endValue);

    if (start.evaluate || end.evaluate) {
      return new RangeLookup(start, end);
    }

    return fill(start, end);
  }

  static toString(start = this.start, end = this.end) {
    return `(${start}..${end})`;
  }

  toString(start = this.start, end = this.end) {
    return this.constructor.toString(start, end);
  }

  async evaluate(context) {
    const start = await context.evaluate(this.start);
    const end = await context.evaluate(this.end);

    if (this.start instanceof Dry.Variable || this.end instanceof Dry.Variable) {
      return fill(start, end);
    }

    return this.toString(toInteger(start), toInteger(end));
  }

  toInteger(input) {
    return toInteger(input);
  }
}

module.exports = RangeLookup;
