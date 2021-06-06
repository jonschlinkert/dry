'use strict';

const { caseInsensitiveCompare } = require('../utils');

module.exports = {
  abs: (...args) => Math.abs(...args),
  at_least: (...args) => Math.max(...args),
  at_most: (...args) => Math.min(...args),
  ceil: (...args) => Math.ceil(...args),
  divided_by: (value, arg) => value / arg,
  floor: (...args) => Math.floor(...args),
  minus: (value, arg) => value - arg,
  modulo: (value, arg) => value % arg,
  round: (value, exponent = 0) => {
    const amp = Math.pow(10, exponent);
    return Math.round(value * amp) / amp;
  },
  plus: (value, arg) => Number(value) + Number(arg),
  sort_natural: (arr, prop) => {
    if (!arr || !arr.sort) return [];
    if (prop !== undefined) {
      return [...arr].sort((lhs, rhs) => caseInsensitiveCompare(lhs[prop], rhs[prop]));
    }
    return [...arr].sort(caseInsensitiveCompare);
  },
  times: (value, arg) => value * arg
};
