'use strict';

const errors = require('./shared/errors');

class Dry {
  static MAX_DEPTH = 100;
  static cache_classes = true;

  static profiler() {
    return require('./profiler/hooks')(Dry);
  }

  static get RAISE_EXCEPTION_LAMBDA() {
    return e => { throw e; };
  }

  static get BlockBody() {
    return require('./nodes/BlockBody');
  }

  static get BlockNode() {
    return require('./nodes/BlockNode');
  }

  static get BlockTag() {
    return require('./nodes/BlockTag');
  }

  static get Condition() {
    return require('./Condition');
  }

  static get Context() {
    return require('./Context');
  }

  static get Drop() {
    return require('./drops/Drop');
  }

  static get Expression() {
    return require('./Expression');
  }

  static get FileSystem() {
    return require('./FileSystem');
  }

  static get I18n() {
    return require('./I18n');
  }

  static get LayoutCache() {
    return require('./LayoutCache');
  }

  static get Lexer() {
    return require('./Lexer');
  }

  static get Node() {
    return require('./nodes/Node');
  }

  static get Parser() {
    return require('./Parser');
  }

  static get ParseTreeVisitor() {
    return require('./ParseTreeVisitor');
  }

  static get PartialCache() {
    return require('./PartialCache');
  }

  static get RangeLookup() {
    return require('./RangeLookup');
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

  static get StrainerTemplate() {
    return require('./StrainerTemplate');
  }

  static get Tag() {
    return require('./nodes/Tag');
  }

  static get Template() {
    return require('./Template');
  }

  static get TemplateFactory() {
    return require('./TemplateFactory');
  }

  static get Usage() {
    return require('./Usage');
  }

  static get Variable() {
    return require('./nodes/Variable');
  }

  static get VariableLookup() {
    return require('./VariableLookup');
  }

  static get constants() {
    return require('./constants');
  }

  static get drops() {
    return require('./drops');
  }

  static get errors() {
    return errors;
  }

  static get expressions() {
    return require('./expressions');
  }

  static get helpers() {
    return require('./shared/helpers');
  }

  static get nodes() {
    return require('./nodes');
  }

  static get regex() {
    return this.constants.regex;
  }

  static get shared() {
    return require('./shared');
  }

  static get tags() {
    return require('./tags');
  }

  static get utils() {
    return require('./shared/utils');
  }
}

for (const [name, ErrorClass] of Object.entries(errors)) {
  Reflect.defineProperty(Dry, name, { value: ErrorClass });
}

module.exports = Dry;
