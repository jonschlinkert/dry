'use strict';

const { empty, size, toArray } = require('../utils');

exports.empty = context => empty(context);
exports.size = context => size(context);
exports.length = context => size(context);

exports.first = context => {
  if (context !== null && typeof context === 'object') {
    return typeof context.first === 'function' ? context.first() : context.first;
  }
  return toArray(context)[0];
};

exports.last = context => {
  if (context !== null && typeof context === 'object') {
    return typeof context.last === 'function' ? context.last() : context.last;
  }
  const array = toArray(context);
  return array[array.length - 1];
};
