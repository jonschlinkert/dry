/* eslint-disable eqeqeq, no-useless-catch */
'use strict';

const assert = require('assert').strict;
const path = require('path');
const Dry = require('..');
const { Template } = Dry;

Template.error_mode = process.env['LIQUID_PARSER_MODE'] || 'strict';

const times = (n = 0, fn) => {
  for (let i = 0; i < n; i++) fn();
};

const fixture = name => {
  return path.resolve(__dirname, 'fixtures', name);
};

const render = (input, assigns, options) => {
  return Template.parse(input).render(assigns, options);
};

const render_strict = (input, assigns, options) => {
  return Template.parse(input).render_strict(assigns, options);
};

const assert_raises = (ErrorClass, callback) => {
  try {
    callback();
  } catch (err) {
    assert(err instanceof ErrorClass);
    return err;
  }
};

const assert_match = (regex, string, message) => {
  if (!(regex instanceof RegExp)) {
    throw new TypeError('assert_match expected a regular expression');
  }
  assert(regex.test(string), message);
};

const assert_template_result = (expected, template, assigns = {}, message = null) => {
  assert.equal(expected, Template.parse(template, { line_numbers: true }).render_strict(assigns), message);
};

const assert_template_result_matches = (expected, template, assigns = {}, message = null) => {
  if (!(expected instanceof RegExp)) return assert_template_result(expected, template, assigns, message);
  assert_match(expected, Template.parse(template, { line_numbers: true }).render_strict(assigns), message);
};

const assert_match_syntax_error = (regex, template, assigns = {}, message) => {
  const exception = assert_raises(Dry.SyntaxError, () => {
    Template.parse(template, { line_numbers: true }).render(assigns);
  });

  assert_match(regex, exception && exception.message, message);
};

const assert_usage_increment = (name, ...rest) => {
  const callback = rest.pop();
  const options = rest.pop() || {};
  const old_method = Dry.Usage.increment;
  const { times = 1 } = options;
  let calls = 0;

  try {
    Dry.Usage.increment = function(got_name) {
      if (got_name === name) calls += 1;
      return old_method.call(this, got_name);
    };
    callback();
  } catch (err) {
    if (process.env.DEBUG) console.error(err);
  } finally {
    Dry.Usage.increment = old_method;
  }

  assert.equal(times, calls, `Number of calls to Usage.increment with ${name.inspect}`);
};

const with_global_filter = (...globals) => {
  globals = globals.flat();
  const callback = globals.pop();
  const original_global_filters = Dry.StrainerFactory.global_filters;

  try {
    Dry.StrainerFactory.global_filters = [];
    globals.forEach(filters => {
      Dry.StrainerFactory.add_global_filter(filters);
    });

    Dry.StrainerFactory.strainer_class_cache.clear();

    globals.forEach(filters => {
      Template.register_filter(filters);
    });
    callback();
  } catch (err) {
    throw err;
  } finally {
    Dry.StrainerFactory.strainer_class_cache.clear();
    Dry.StrainerFactory.global_filters = original_global_filters;
  }
};

const with_error_mode = (mode, callback) => {
  const old_mode = Template.error_mode;

  try {
    Template.error_mode = mode;
    callback();
  } catch (err) {
    if (process.env.DEBUG) console.error(err);
  } finally {
    Template.error_mode = old_mode;
  }
};

const with_custom_tag = (tag_name, tag_class, callback) => {
  const old_tag = Template.tags.get(tag_name);
  try {
    Template.register_tag(tag_name, tag_class);
    callback();
  } catch (err) {
    throw err;
  } finally {
    if (old_tag) {
      Template.tags.set(tag_name, old_tag);
    } else {
      Template.tags.delete(tag_name);
    }
  }
};

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

  to_s() {
    return this.value.toString();
  }

  toString() {
    return this.to_s();
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
    return this.value === other;
  }

  to_liquid_value() {
    return this.value;
  }

  to_s() {
    return this.value ? 'Yay' : 'Nay';
  }

  toString() {
    return this.to_s();
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
    throw new Dry.DryError('runtime error');
  }

  exception() {
    throw new Error('exception');
  }
}

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

  for() {
    this.count++;
    return new Template();
  }
}

module.exports = {
  fixture,
  times,
  render,
  render_strict,

  assert_raises,
  assert_match,
  assert_template_result,
  assert_template_result_matches,
  assert_match_syntax_error,
  assert_usage_increment,

  ThingWithToLiquid,
  IntegerDrop,
  BooleanDrop,
  ErrorDrop,

  StubFileSystem,
  StubTemplateFactory,

  with_global_filter,
  with_error_mode,
  with_custom_tag
};
