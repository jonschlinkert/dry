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

const render = async (input, assigns, options) => {
  return Template.parse(input).render(assigns, options);
};

const render_strict = async (input, assigns, options) => {
  return Template.parse(input).render_strict(assigns, options);
};

const assert_raises = async (ErrorClass, callback) => {
  try {
    await callback();
    // throw new Error(`Expected a "${ErrorClass}" to be thrown`);
  } catch (err) {
    if (ErrorClass instanceof RegExp) {
      assert(ErrorClass.test(err.message));
    } else {
      assert(err instanceof ErrorClass);
    }
    return err;
  }
};

const assert_match = (regex, string, message) => {
  if (!(regex instanceof RegExp)) {
    throw new TypeError('assert_match expected a regular expression');
  }
  assert(regex.test(string), message);
};

const assert_template_result = async (expected, input, assigns = {}, message = null) => {
  const template = Template.parse(input, { line_numbers: true });
  assert.equal(expected, await template.render_strict(assigns), message);
};

const assert_template_result_matches = async (expected, input, assigns = {}, message = null) => {
  if (!(expected instanceof RegExp)) return assert_template_result(expected, input, assigns, message);
  const template = Template.parse(template, { line_numbers: true });
  assert.match(await template.render_strict(assigns), expected, message);
};

const assert_match_syntax_error = async (regex, template, assigns = {}, message) => {
  const exception = await assert_raises(Dry.SyntaxError, async () => {
    await Template.parse(template, { line_numbers: true }).render(assigns);
  });

  assert.match(exception.message, regex, message);
};

const assert_usage_increment = async (name, ...rest) => {
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
    await callback();
  } catch (err) {
    if (process.env.DEBUG) console.error(err);
  } finally {
    Dry.Usage.increment = old_method;
  }

  assert.equal(times, calls, `Number of calls to Usage.increment with ${name.inspect}`);
};

const with_global_filter = async (...globals) => {
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
    await callback();
  } catch (err) {
    throw err;
  } finally {
    Dry.StrainerFactory.strainer_class_cache.clear();
    Dry.StrainerFactory.global_filters = original_global_filters;
  }
};

const with_error_mode = async (mode, callback) => {
  const old_mode = Template.error_mode;

  try {
    Template.error_mode = mode;
    await callback();
  } catch (err) {
    if (process.env.DEBUG) console.error(err);
  } finally {
    Template.error_mode = old_mode;
  }
};

const with_custom_tag = async (tag_name, tag_class, callback) => {
  const old_tag = Template.tags.get(tag_name);
  try {
    Template.register_tag(tag_name, tag_class);
    await callback();
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

  equals(value) {
    return this.value == value;
  }

  to_s() {
    return this.toString();
  }

  toString() {
    return this.value.toString();
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
    return new Dry.StandardError('standard error');
  }

  argument_error() {
    return new Dry.ArgumentError('argument error');
  }

  syntax_error() {
    return new Dry.SyntaxError('syntax error');
  }

  runtime_error() {
    return new Dry.DryError('runtime error');
  }

  exception() {
    return new Error('exception');
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
