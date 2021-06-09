'use strict';

class Dry {
  static get RAISE_EXCEPTION_LAMBDA() {
    return e => { throw e; };
  }

  static get Context() {
    return require('./Context');
  }

  static get Drop() {
    return require('./drops/Drop');
  }

  static get Expression() {
    return this.nodes.Expression;
  }

  static get I18n() {
    return require('./I18n');
  }

  static get ResourceLimits() {
    return require('./ResourceLimits');
  }

  static get State() {
    return require('./State');
  }

  static get StaticRegisters() {
    return require('./StaticRegisters');
  }

  static get StandardFilters() {
    return require('./StandardFilters');
  }

  static get StrainerFactory() {
    return require('./StrainerFactory');
  }

  static get Template() {
    return require('./Template');
  }

  static get errors() {
    return require('./errors');
  }

  static get nodes() {
    return require('./nodes');
  }

  static get utils() {
    return require('./utils');
  }
}

for (const [name, ErrorClass] of Object.entries(require('./errors'))) {
  Reflect.defineProperty(Dry, name, { value: ErrorClass });
}

module.exports = Dry;
