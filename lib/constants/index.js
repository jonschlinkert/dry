
const { getOwnPropertyNames } = Object;
const constants = require('export-files')(__dirname);
const Dry = require('../Dry');

constants.REVERSE_OPERATOR = Object.freeze({
  is: '===',
  isnt: '!==',
  '==': '!=',
  '===': '!==',
  '!=': '==',
  '!==': '==='
});

constants.PROTECTED_KEYS = new Set(Object
  .getOwnPropertyNames(Object)
  .concat(['constructor', '__proto__', 'inspect', 'prototype']));

constants.DROP_KEYS = new Set(getOwnPropertyNames(Dry.Drop.prototype)
  .concat('each')
  .filter(k => k !== 'to_liquid'));

module.exports = constants;
