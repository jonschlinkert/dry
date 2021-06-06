'use strict';

const EmptyDrop = require('./EmptyDrop');
const { isNil, toValue } = require('../utils');

class BlankDrop extends EmptyDrop {
  equals(value) {
    if (value === false) {
      return true;
    }
    if (isNil(toValue(value))) {
      return true;
    }
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    return super.equals(value);
  }
}

module.exports = BlankDrop;
