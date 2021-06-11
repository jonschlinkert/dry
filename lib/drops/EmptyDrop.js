'use strict';

const Drop = require('./Drop');
const Dry = require('../Dry');

class EmptyDrop extends Drop {
  equals(value) {
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length === 0;
    }
    if (Dry.utils.isObject(value)) {
      return Object.keys(value).length === 0;
    }
    return false;
  }
  gt() {
    return false;
  }
  geq() {
    return false;
  }
  lt() {
    return false;
  }
  leq() {
    return false;
  }
  to_liquid() {
    return '';
  }
}

module.exports = EmptyDrop;
