'use strict';

const Drop = require('./Drop');
const BlankDrop = require('./BlankDrop');
const { isNil, toValue } = require('../utils');

class NullDrop extends Drop {
  equals(value) {
    return isNil(toValue(value)) || value instanceof BlankDrop;
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
    return null;
  }
}

module.exports = NullDrop;
