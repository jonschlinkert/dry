'use strict';

const { blank, empty, nil, present, size } = require('../utils');

module.exports = {
  blank,
  empty,
  nil,
  present,
  size,

  first(value) {
    if (value && typeof value.length === 'number') {
      return value[0];
    }
    return '';
  },

  last(value) {
    if (value && typeof value.length === 'number') {
      return value[value.length - 1];
    }
    return '';
  }
};
