'use strict';

class Dry {
  static get Context() {
    return require('./Context');
  }

  static get Drop() {
    return require('./drops/Drop');
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

  static get StrainerFactory() {
    return require('./StrainerFactory');
  }

  static get Template() {
    return require('./Template');
  }
}

for (const [name, ErrorClass] of Object.entries(require('./errors'))) {
  Reflect.defineProperty(Dry, name, { value: ErrorClass });
}

module.exports = Dry;
