'use strict';

const { getOwnPropertyNames } = Object;
const Dry = require('./Dry');
const { regex: { VARIABLE_PARSER }, PROTECTED_KEYS } = require('./constants');

const SQUARE_BRACKETED = /^\[(.*)\]$/m;
const COMMAND_METHODS = ['length', 'size', 'first', 'last'];
const METHODS = new Set(getOwnPropertyNames(Dry.Drop.prototype));
METHODS.delete('to_liquid');

class VariableLookup {
  constructor(input) {
    this.markup = input;

    const lookups = Dry.utils.scan(input, VARIABLE_PARSER);
    let name = lookups.shift();
    let match;

    if ((match = SQUARE_BRACKETED.exec(name))) {
      name = Dry.Expression.parse(match[1]);
    } else {
      name = name[0];
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
        if (METHODS.has(k)) return k;

        if (!('context' in object)) object.context = context;
        object = context.lookup_and_evaluate(object, k);

      } else if (object && typeof object === 'object' && k in object) {
        object = context.lookup_and_evaluate(object, k);

      } else if (this.command_flags & (1 << i !== 0) && k in object) {
        object = context.lookup_and_evaluate(object, k);

      } else {
        return invalid(k);
      }
    }

    return object;
  }

  is_equal(other) {
    return this.constructor === other.constructor && this.state === other.state;
  }

  get #state() {
    return [this.name, this.lookups, this.command_flags];
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
