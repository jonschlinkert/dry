const fill = require('fill-range');
const Dry = require('./Dry');
const { isPrimitive } = Dry.utils;

const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;
const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER;

const toInteger = value => {
  if (typeof value === 'number') {
    if (value > MAX_SAFE_INTEGER || value < MIN_SAFE_INTEGER) {
      throw new Dry.RangeError('Integer value out of bounds');
    }
    return value;
  }

  if (typeof value === 'bigint') {
    if (value > BigInt(MAX_SAFE_INTEGER) || value < BigInt(MIN_SAFE_INTEGER)) {
      throw new Dry.RangeError('Integer value out of bounds');
    }
    return Number(value);
  }

  try {
    const number = Number(value);
    if (isNaN(number)) return 0;
    if (number > MAX_SAFE_INTEGER || number < MIN_SAFE_INTEGER) {
      throw new Dry.RangeError('Integer value out of bounds');
    }
    return number;
  } catch  {
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

    return this.toString(this.toInteger(start), this.toInteger(end));
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
