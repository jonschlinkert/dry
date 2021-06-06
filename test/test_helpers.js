/* eslint-disable eqeqeq */
'use strict';

const assert = require('assert').strict;
const utils = require('../lib/utils');
const Dry = require('..');

/**
 * File system
 */

class StubFileSystem {
  constructor(values) {
    this.file_read_count = 0;
    this.values = values;
  }

  read_template_file(template_path) {
    this.file_read_count++;
    return this.values[template_path];
  }
}

class StubTemplateFactory {
  constructor() {
    this.count = 0;
  }

  for(_template_name) {
    this.count++;
    return new Dry.Template();
  }
}

/**
 * Drops
 */

class ThingWithToLiquid {
  to_liquid() {
    return 'foobar';
  }
}

class IntegerDrop extends Dry.Drop {
  constructor(value) {
    super();
    this.value = utils.toInteger(value);
  }

  equals(other) {
    return this.value == other;
  }

  toString() {
    return this.value.toString();
  }

  to_s() {
    return this.toString();
  }

  to_liquid_value() {
    return this.value;
  }
}

class BooleanDrop extends Dry.Drop {
  constructor(value) {
    super();
    this.value = value;
  }

  equals(other) {
    return this.value == other;
  }

  to_liquid_value() {
    return this.value;
  }

  toString() {
    return this.value ? 'Yay' : 'Nay';
  }

  to_s() {
    return this.toString();
  }
}

class ErrorDrop extends Dry.Drop {
  standard_error() {
    throw new Dry.StandardError('standard error');
  }

  argument_error() {
    throw new Dry.ArgumentError('argument error');
  }

  syntax_error() {
    throw new Dry.SyntaxError('syntax error');
  }

  runtime_error() {
    throw new Error('runtime error');
  }

  exception() {
    throw new Error('exception');
  }
}

const assert_template_result = (expected, input, locals) => {
  const template = new Dry.Template();
  template.parse(input);
  assert.equal(template.render(locals), expected);
};

const assert_raises = (ErrorClass, fn) => {
  try {
    fn();
  } catch (err) {
    assert(err instanceof ErrorClass);
    return err;
  }

  return {};
};

const with_error_mode = (mode, options, cb) => {
  if (typeof options === 'function') {
    cb = options;
    options = { silent: true };
  }

  const old_mode = Dry.Template.error_mode;

  try {
    Dry.Template.error_mode = mode;
    cb();
  } catch (err) {
    if (options.silent !== true) {
      console.log(err);
    }
  } finally {
    Dry.Template.error_mode = old_mode;
  }
};

module.exports = {
  // Helpers
  assert_raises,
  assert_template_result,
  with_error_mode,

  // Drops
  BooleanDrop,
  ErrorDrop,
  IntegerDrop,
  StubFileSystem,
  StubTemplateFactory,
  ThingWithToLiquid
};
