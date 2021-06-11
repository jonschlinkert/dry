'use strict';

const constants = require('export-files')(__dirname);

constants.PROTECTED_KEYS = new Set(Object
  .getOwnPropertyNames(Object)
  .concat(['constructor', '__proto__', 'inspect', 'prototype']));

module.exports = constants;
