'use strict';

const Drop = require('./Drop');
const { isObject } = require('../utils');

class EmptyDrop extends Drop {
  equals(value) {
    if (typeof value === 'string' || Array.isArray(value)) {
      return value.length === 0;
    }
    if (isObject(value)) {
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
  valueOf() {
    return '';
  }
}

module.exports = EmptyDrop;
