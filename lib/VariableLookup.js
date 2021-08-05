'use strict';

const Dry = require('./Dry');
const { constants, helpers, regex, utils } = Dry;
const kScopes = Symbol(':context_scopes');

class VariableLookup {
  static COMMAND_METHODS = ['length', 'size', 'first', 'last'];
  static BracketedSyntax = /^\[(.*)\]$/m;
  static Syntax = regex.VariableParser;

  constructor(input) {
    this.name = null;
    this.negate = false;
    this.markup = input.trim();
    this.command_flags = 0;
    this.bracketed = [];
    this.lookups = [];

    utils.scan(this.markup, regex.VariableParser, (match, index) => {
      const negated = /^(!+) *(.*)$/.exec(match);

      if (negated) {
        const [, excl, rest] = negated;
        this.negate = excl.length % 2 !== 0;
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
    const match = VariableLookup.BracketedSyntax.exec(value);

    if (match) {
      return Dry.Expression.parse(match[1]);
    }

    if (value.startsWith('../')) {
      return this.parse_paths(value);
    }

    return value;
  }

  parse_paths(value) {
    while (value.startsWith('../')) {
      this.lookups.push('..');
      value = value.slice(3);
    }
    this.lookups.push(this.parse_lookup(value));
    return this.lookups.shift();
  }

  parse_lookup(value, i = 0) {
    const match = VariableLookup.BracketedSyntax.exec(value);

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

  evaluate_parent_scope(context) {
    if (!context.allow_this_variable && !context.inside_with_scope) return;
    const parent = context[constants.symbols.kParentContext];
    if (parent) {
      this.name = this.lookups.shift();
      return this.evaluate(parent);
    }

    if (context.scopes.length === 1) return;

    for (const scope of context.scopes) {
      const parent_scopes = scope[constants.symbols.kWithParent];

      if (parent_scopes) {
        if (!this[kScopes]) this[kScopes] = context.scopes;
        context.scopes = parent_scopes;
        this.name = this.lookups.shift();
        return this.evaluate(context);
      }
    }
  }

  restore_context_scopes(context) {
    if (this[kScopes]) {
      context.scopes = this[kScopes];
      this[kScopes] = null;
    }
  }

  async evaluate(context) {
    let name = await context.evaluate(this.name);
    let object = await context.find_variable(name);

    if (!object && this.macro === true && this.lookups.length) {
      name = this.lookups.shift();
      object = context.state.registry.macros[name];
    }

    if (object === undefined && name === '..') {
      return this.evaluate_parent_scope(context);
    }

    const invalid = (k, i) => {
      if (context.strict_variables) {
        throw new Dry.UndefinedVariable(`undefined variable ${k}`);
      }

      this.restore_context_scopes(context);

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
        if (constants.PROTECTED_KEYS.has(k)) {
          this.restore_context_scopes(context);
          return null;
        }

        if (constants.DROP_KEYS.has(k)) {
          this.restore_context_scopes(context);
          return k;
        }

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

    this.restore_context_scopes(context);
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
