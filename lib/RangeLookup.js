
const fill = require('fill-range');
const Dry = require('./Dry');
const { isPrimitive } = Dry.utils;

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
    const markup = value?.markup || value;

    if (typeof markup === 'string' && markup.includes('|')) {
      value = new Dry.Variable(markup);
    }

    this[key] = value;
  }

  async evaluate(context) {
    const start = await context.evaluate(this.start);
    const end = await context.evaluate(this.end);

    try {
      if (!isPrimitive(start)) throw new Dry.RangeError(`Invalid range start: "${JSON.stringify(start)}"`);
      if (!isPrimitive(end)) throw new Dry.RangeError(`Invalid range end: "${JSON.stringify(end)}"`);
    } catch (error) {
      return context.handle_error(error);
    }

    return this.toString(toInteger(start), toInteger(end));
  }

  toInteger(input) {
    return toInteger(input);
  }

  toString(start = this.start, end = this.end) {
    return this.constructor.toString(start, end);
  }

  static toString(start = this.start, end = this.end) {
    return `(${start}..${end})`;
  }

  static parse(startValue, endValue) {
    const start = Dry.Expression.parse(startValue);
    const end = Dry.Expression.parse(endValue);

    if (start?.evaluate || end?.evaluate) {
      return new RangeLookup(start, end);
    }

    return fill(start, end);
  }
}

module.exports = RangeLookup;
