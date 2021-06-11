/* eslint-disable eqeqeq */
'use strict';

const path = require('path');
const assert = require('assert').strict;
const Dry = require('..');

const fixture = name => {
  return path.join(path.resolve(__dirname), 'fixtures', name);
};

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
    this.value = Dry.utils.toInteger(value);
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

const render = (input, assigns, options) => {
  return Dry.Template.parse(input).render(assigns, options);
};

const render_strict = (input, assigns, options) => {
  return Dry.Template.parse(input).render_strict(assigns, options);
};

const assert_template_result = (expected, input, locals, message) => {
  const template = new Dry.Template();
  template.parse(input);
  assert.equal(template.render_strict(locals), expected, message);
};

const assert_usage_increment = (name, options, block) => {
  if (typeof options === 'function') {
    block = options;
    options = {};
  }

  const { times = 1 } = options;
  const increment = Dry.Usage.increment;
  let calls = 0;

  try {
    Dry.Usage.increment = null;
    Dry.Usage.increment = received_name => {
      if (received_name == name) calls += 1;
      increment.call(Dry.Usage, received_name);
    };
    block();
  } catch (err) {
    console.error(err);
  } finally {
    Dry.Usage.increment = increment;
  }

  assert.equal(times, calls, `Number of calls to Usage.increment with ${name.inspect}`);
};

// const assert_template_result = (expected, fixture, assigns = {}, message = null) => {
//   const template = Dry.Template.parse(fixture, { line_numbers: true });
//   assert.equal(expected, template.render_strict(assigns), message);
// };

// const assert_template_result_matches = (expected, template, assigns = {}, message = null) => {
//   if (expected instanceof RegExp) {
//     assert_match(expected, parse(template).render_strict(assigns), message);
//     return;
//   }
//   assert_template_result(expected, template, assigns, message);
// };

// const assert_match_syntax_error = (match, template, assigns = {}) => {
//   exception = assert_raises(Dry.SyntaxError) do
//     Template.parse(template, line_numbers: true).render(assigns)
//   }
//   assert_match(match, exception.message)
// }

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
    if (options && options.silent !== true) {
      console.log(err);
    }
  } finally {
    Dry.Template.error_mode = old_mode;
  }
};

const with_global_filter = (...globals) => {
  globals = globals.flat();
  const factory = Dry.StrainerFactory;
  const original_global_filters = factory.global_filters;
  const block = globals.pop();

  factory.global_filters = [];

  try {
    globals.forEach(filters => {
      factory.add_global_filter(filters);
    });

    factory.strainer_class_cache.clear();

    globals.forEach(filters => {
      Dry.Template.register_filter(filters);
    });

    block();
  // eslint-disable-next-line no-useless-catch
  } catch (err) {
    throw err;
  } finally {
    factory.strainer_class_cache.clear();
    factory.global_filters = original_global_filters;
  }
};

module.exports = {
  fixture,

  // Helpers
  assert_raises,
  assert_template_result,
  assert_usage_increment,
  // assert_template_result_matches,

  render,
  render_strict,

  with_error_mode,
  with_global_filter,

  // partial cache
  StubFileSystem,
  StubTemplateFactory,

  // Drops
  ErrorDrop,
  IntegerDrop,
  ThingWithToLiquid
};
