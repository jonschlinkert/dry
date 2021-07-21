'use strict';

const Dry = require('./Dry');
const { constants, helpers, regex, utils } = Dry;

class VariableLookup {
  static SQUARE_BRACKETED = /^\[(.*)\]$/m;
  static COMMAND_METHODS = ['length', 'size', 'first', 'last'];

  constructor(input) {
    this.name = null;
    this.negate = false;
    this.markup = input;
    this.command_flags = 0;
    this.bracketed = [];
    this.lookups = [];

    utils.scan(input, regex.VariableParser, (match, index) => {
      const negated = /^(!+) *(.*)$/.exec(match);

      if (negated) {
        const [, not, rest] = negated;
        this.negate = not.length % 2 !== 0;
        match = rest;
      }

      if (!this.name) {
        this.name = this.parse_name(match);
      } else {
        this.lookups.push(this.parse_lookup(match, index));
      }
    });
  }

  parse_name(value) {
    const match = VariableLookup.SQUARE_BRACKETED.exec(value);

    if (match) {
      return Dry.Expression.parse(match[1]);
    }

    return value;
  }

  parse_lookup(value, i = 0) {
    const match = VariableLookup.SQUARE_BRACKETED.exec(value);

    if (match) {
      const expression = Dry.Expression.parse(match[1]);
      this.bracketed.push({ expression, index: i });
      return expression;
    }

    if (VariableLookup.COMMAND_METHODS.includes(value)) {
      this.command_flags |= 1 << i;
    }

    return value;
  }

  async evaluate(context) {
    const name = await context.evaluate(this.name);
    const macro = this.macro && context.state.registry.macros[name];
    if (macro) return macro;

    let object = await context.find_variable(name);

    const invalid = (k, i) => {
      if (context.strict_variables) {
        throw new Dry.UndefinedVariable(`undefined variable ${k}`);
      }

      const bracketed = this.bracketed.find(b => {
        return b.expression.name === k || b.exression === k;
      });

      if (helpers.methods[k] && (!bracketed || bracketed.index !== i)) {
        return helpers.methods[k](object);
      }
    };

    for (let i = 0; i < this.lookups.length && object != null; i++) {
      if (!object || typeof object !== 'object') return invalid(name, i + 1);

      const k = String(await context.evaluate(this.lookups[i]));

      if (object instanceof Dry.Drop && !('index' in object)) {
        if (constants.PROTECTED_KEYS.has(k)) return null;
        if (constants.DROP_KEYS.has(k)) return k;

        if (!('context' in object)) object.context = context;
        object = await context.lookup_and_evaluate(object, k);

      } else if (object && typeof object === 'object' && k in object) {
        object = await utils.resolve(object[k], object);

      } else if (this.command_flags & (1 << i !== 0) && k in object) {
        object = context.lookup_and_evaluate(object, k);

      } else if (object instanceof Promise) {
        object = await object.then(value => context.lookup_and_evaluate(value, k));

      } else {
        return invalid(k, i + 1);
      }
    }

    return object;
  }

  static parse(input) {
    return new VariableLookup(input);
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = VariableLookup;
  get children() {
    return this.node.lookups.filter(Boolean);
  }
}

module.exports = VariableLookup;
