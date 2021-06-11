'use strict';

const Dry = require('./Dry');
const { DROP_KEYS, PROTECTED_KEYS } = Dry.constants;
const { VARIABLE_PARSER } = Dry.regex;
const { scan } = Dry.utils;

const SQUARE_BRACKETED = /^\[(.*)\]$/m;
const COMMAND_METHODS = ['length', 'size', 'first', 'last'];

class VariableLookup {
  constructor(input) {
    this.name = null;
    this.markup = input;
    this.command_flags = 0;
    this.lookups = [];

    scan(input, VARIABLE_PARSER, (match, index) => {
      if (!this.name) {
        this.name = this.parse_name(match);
      } else {
        this.lookups.push(this.parse_lookup(match, index));
      }
    });
  }

  parse_name(value) {
    const match = SQUARE_BRACKETED.exec(value);

    if (match) {
      return Dry.Expression.parse(match[1]);
    }

    return value;
  }

  parse_lookup(value, i = 0) {
    const match = SQUARE_BRACKETED.exec(value);

    if (match) return Dry.Expression.parse(match[1]);

    if (COMMAND_METHODS.includes(value)) {
      this.command_flags |= 1 << i;
    }

    return value;
  }

  evaluate(context) {
    const value = context.find_variable(this.markup, false);
    if (!Dry.utils.isNil(value)) return value;

    const name = context.evaluate(this.name);
    let object = context.find_variable(name);

    const invalid = k => {
      if (context.strict_variables) {
        throw new Dry.UndefinedVariable(`undefined variable "${k}"`);
      }
    };

    for (let i = 0; i < this.lookups.length && object != null; i++) {
      if (!object || typeof object !== 'object') return invalid(name);

      const k = String(context.evaluate(this.lookups[i]));

      if (object instanceof Dry.Drop && !('index' in object)) {
        if (PROTECTED_KEYS.has(k)) return null;
        if (DROP_KEYS.has(k)) return k;

        if (!('context' in object)) object.context = context;
        object = context.lookup_and_evaluate(object, k);

      } else if (object && typeof object === 'object' && k in object) {
        object = object[k];

      } else if (this.command_flags & (1 << i !== 0) && k in object) {
        object = context.lookup_and_evaluate(object, k);

      } else {
        return invalid(k);
      }
    }

    return object;
  }

  static parse(input) {
    return new VariableLookup(input);
  }

  static get ParseTreeVisitor() {
    return class extends Dry.ParseTreeVisitor {
      Parent = VariableLookup;
      get children() {
        return this.node.lookups.filter(Boolean);
      }
    };
  }
}

module.exports = VariableLookup;
