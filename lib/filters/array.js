'use strict';

const get = require('expand-value');
const { isNil, isTruthy } = require('../utils');

module.exports = {
  compact: values => [].concat(values || []).map(ele => !isNil(ele)),
  concat: (values, args) => [...values, ...args],
  every: (values, args) => values.every(...args),
  join: (values, sep = ' ') => values.join(sep),
  map: (values, prop) => values.map(ele => get(ele, prop)),
  limit: (values, n = 0) => values.length > n ? values.slice(0, Number(n)) : values,
  offset: (values, n = 0) => values.length > n ? values.slice(Number(n)) : values,
  reverse: values => [...values].reverse(),
  reversed: values => [...values].reverse(),
  slice: (values, ...args) => values.slice(...args),
  some: (values, args) => values.some(...args),
  sort: (values, ...args) => values.sort(...args),
  uniq: values => [...new Set(values)],
  unique: values => [...new Set(values)],

  where(values, context, prop, expected) {
    return values.filter(ctx => {
      const value = this.liquid.resolve({ ...context, ...ctx }, prop);

      if (expected === undefined) {
        return isTruthy(value);
      }

      return value === expected;
    });
  }
};

