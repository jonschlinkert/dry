'use strict';

const Drop = require('./Drop');
const BlankDrop = require('./BlankDrop');
const Dry = require('../Dry');

class NullDrop extends Drop {
  equals(value) {
    return Dry.utils.isNil(Dry.utils.toValue(value)) || value instanceof BlankDrop;
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
