'use strict';

const get = require('expand-value');
const nodes = require('.');
const Drop = require('../drops/Drop');
const { regex } = require('../constants');
const { isInteger, isObject, scan } = require('../utils');
const { VARIABLE_PARSER } = regex;

const SQUARE_BRACKETED = /^\[(.*)\]$/m;
const COMMAND_METHODS = ['length', 'size', 'first', 'last'];
class UndefinedVariable extends Error {}

class VariableLookup {
  constructor(input) {
    this.markup = input;

    const lookups = scan(input, VARIABLE_PARSER);
    let name = lookups.shift();
    let match;

    if ((match = SQUARE_BRACKETED.exec(name))) {
      name = nodes.Expression.parse(match[1]);
    }

    this.name = name;
    this.lookups = lookups;
    this.command_flags = 0;

    for (let i = 0; i < this.lookups.length; i++) {
      const lookup = this.lookups[i];
      let m;

      if ((m = SQUARE_BRACKETED.exec(lookup))) {
        this.lookups[i] = nodes.Expression.parse(m[1]);
      } else if (COMMAND_METHODS.includes(lookup)) {
        this.command_flags |= 1 << i;
      }
    }
  }

  evaluate(context) {
    const name = context.evaluate(this.name);
    let object = context.find_variable(name);

    for (let i = 0; i < this.lookups.length; i++) {
      if (!object) break;

      const lookup = this.lookups[i];
      const key = context.evaluate(lookup);

      // only do this when drop cannot have a parent
      if (object instanceof Drop && key in object && !('index' in object)) {
        object = context.lookup_and_evaluate(object, key);

      } else if (isObject(object) && hasOwnProperty.call(object, key)) {
        object = context.lookup_and_evaluate(object, key);

      } else if (Array.isArray(object) && isInteger(key)) {
        object = context.lookup_and_evaluate(object, key);

      } else if (this.command_flags & (1 << i !== 0) && key in object) {
        // Some special cases. If the part wasn't in square brackets and
        // no key with the same name was found we interpret following calls
        // as commands and call them on the current object
        if (typeof object[key] === 'function') {
          object = object[key]();
        } else {
          object = object[key];
        }
      } else {

        // No key was present with the desired value and it wasn't one of the directly supported
        // keywords either. The only thing we got left is to return null or
        // raise an exception if `strict_variables` option is set to true
        if (!context.strict_variables) return null;
        throw new UndefinedVariable(`undefined variable ${key}`);
      }

      if (object && object.to_liquid) {
        object = object.to_liquid();
      }

      // If we are dealing with a drop here we have to
      if (object && object.context) {
        object.context = context;
      }
    }

    return object;
  }

  ['=='](other) {
    return this.constructor === other.class && this.state === other.state;
  }

  static parse(input) {
    return new VariableLookup(input);
  }
}

module.exports = VariableLookup;
