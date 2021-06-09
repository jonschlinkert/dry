'use strict';

const get = require('expand-value');
const Drop = require('../drops/Drop');
const Dry = require('../Dry');
const { isInteger, isObject, scan, to_liquid_value } = require('../utils');
const { regex: { VARIABLE_PARSER }, PROTECTED_KEYS } = require('../constants');

const COMMAND_METHODS = ['length', 'size', 'first', 'last'];
const SQUARE_BRACKETED = /^\[(.*)\]$/m;

class VariableLookup {
  constructor(input) {
    this.markup = input;

    const lookups = scan(input, VARIABLE_PARSER);
    let name = lookups.shift();
    let match;

    if ((match = SQUARE_BRACKETED.exec(name))) {
      name = Dry.Expression.parse(match[1]);
    }

    this.name = name;
    this.lookups = lookups;
    this.command_flags = 0;

    for (let i = 0; i < this.lookups.length; i++) {
      const lookup = this.lookups[i];
      let m;

      if ((m = SQUARE_BRACKETED.exec(lookup))) {
        this.lookups[i] = Dry.Expression.parse(m[1]);
      } else if (COMMAND_METHODS.includes(lookup)) {
        this.command_flags |= 1 << i;
      }
    }
  }

  evaluate(context) {
    const name = context.evaluate(this.name);
    let object = context.find_variable(name);

    for (let i = 0; i < this.lookups.length && object != null; i++) {
      const key = to_liquid_value(context.evaluate(this.lookups[i]));
      const k = Array.isArray(key) ? key[0] : key;

      // only do this when drop cannot have a parent
      if (object instanceof Drop && !('index' in object)) {
        if (!('context' in object)) object.context = context;

        if (PROTECTED_KEYS.has(k)) {
          return null;
        }

        object = context.lookup_and_evaluate(object, k);
        // try {
        // } catch (err) {
        //   if (k in object.constructor.prototype && object.liquid_method_missing) {
        //     object = object.liquid_method_missing(k);
        //   }
        // }

      } else if (object && typeof object === 'object' &&
          (isObject(object) && hasOwnProperty.call(object, k)) ||
            (Array.isArray(object) && isInteger(k))) {

        object = context.lookup_and_evaluate(object, k);

        // Some special cases. If the part wasn't in square brackets and
        // no key with the same name was found we interpret following calls
        // as commands and call them on the current object
      } else if (this.command_flags & (1 << i !== 0) && k in object) {
        const val = get(object, k);
        if (typeof val === 'function') {
          object = val();
        } else {
          object = val;
        }

        if (object?.to_liquid) {
          object = object.to_liquid();
        }

        // No key was present with the desired value and it wasn't one of the directly
        // supported keywords either. The only thing we got left is to return null or
        // raise an exception if `strict_variables` option is set to true
      } else {
        if (!context.strict_variables) return null;
        throw new Dry.UndefinedVariable(`undefined variable ${k}`);
      }

      if (typeof object?.to_liquid === 'function') {
        object = object.to_liquid();
      }

      // If we are dealing with a drop here we have to
      if (object?.context) {
        object.context = context;
      }
    }

    if (object && typeof object?.to_liquid_value === 'function') {
      object = object.to_liquid_value();
    } else if (object && typeof object?.to_liquid === 'function') {
      object = object.to_liquid();
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
