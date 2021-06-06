'use strict';

const { isFalsy, toValue } = require('../utils');

exports.default = (value, fallback) => {
  return isFalsy(toValue(value)) || value === '' ? fallback : value;
};

exports.json = value => JSON.stringify(value);
