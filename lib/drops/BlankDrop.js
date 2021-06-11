'use strict';

const EmptyDrop = require('./EmptyDrop');
const Dry = require('../Dry');

class BlankDrop extends EmptyDrop {
  equals(value) {
    if (value === false) {
      return true;
    }
    if (Dry.utils.isNil(Dry.utils.toValue(value))) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    return super.equals(value);
  }
}

module.exports = BlankDrop;
