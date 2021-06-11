'use strict';

require('mocha');
const assert = require('assert').strict;
const { with_error_mode } = require('../test_helpers');
const Dry = require('../..');
const { VariableLookup, Variable, State } = Dry;

const create_variable = (markup, options = {}) => {
  return new Variable(markup, new State(options));
};

const deep_filter = arr => {
  return arr.reduce((a, v) => {
    if (Array.isArray(v)) {
      a.push(deep_filter(v));
      return a;
    }

    if (v instanceof Map) {
      return a;
    }

    a.push(v);
    return a;
  }, []);
};

const assert_equal_filters = (expected, actual, message) => {
  assert.deepEqual(deep_filter(actual), expected);
};

describe.only('variable_unit_test', () => {
  it('test_test_variable', () => {
    const v = create_variable('hello');
    assert.deepEqual(new VariableLookup('hello'), v.name);
  });

  it('test_test_filters', () => {
    let v = create_variable('hello | textileze');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['textileze', []]], v.filters);

    v = create_variable('hello | textileze | paragraph');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['textileze', []], ['paragraph', []] ], v.filters);

    v = create_variable('hello | strftime: "%Y"');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['strftime', ['%Y']]], v.filters);

    v = create_variable('"typo" | link_to: "Typo", true');
    assert.deepEqual('typo', v.name);
    assert_equal_filters([['link_to', ['Typo', true]]], v.filters);

    v = create_variable('"typo" | link_to: "Typo", false');
    assert.deepEqual('typo', v.name);
    assert_equal_filters([['link_to', ['Typo', false]]], v.filters);

    v = create_variable('"foo" | repeat: 3');
    assert.deepEqual('foo', v.name);
    assert_equal_filters([['repeat', [3]]], v.filters);

    v = create_variable('"foo" | repeat: 3, 3');
    assert.deepEqual('foo', v.name);
    assert_equal_filters([['repeat', [3, 3]]], v.filters);

    v = create_variable('"foo" | repeat: 3, 3, 3 ');
    assert.deepEqual('foo', v.name);
    assert_equal_filters([['repeat', [3, 3, 3]]], v.filters);

    v = create_variable('hello | strftime: "%Y, okay?"');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['strftime', ['%Y, okay?']]], v.filters);

    v = create_variable('hello | things: "%Y, okay?", "the other one"');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['things', ['%Y, okay?', 'the other one']]], v.filters);
  });

  it('test_filter_with_date_parameter', () => {
    const v = create_variable('"2006-06-06" | date: "%m/%d/%Y" ');
    assert.deepEqual('2006-06-06', v.name);
    assert_equal_filters([['date', ['%m/%d/%Y']]], v.filters);
  });

  it('test_filters_without_whitespace', () => {
    let v = create_variable('hello | textileze | paragraph');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['textileze', []], ['paragraph', []] ], v.filters);

    v = create_variable('hello|textileze|paragraph');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['textileze', []], ['paragraph', []] ], v.filters);

    v = create_variable("hello|replace:'foo','bar'|textileze");
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['replace', ['foo', 'bar']], ['textileze', []] ], v.filters);
  });

  it('test_symbol', () => {
    const v = create_variable("http://disney.com/logo.gif | image: 'med' ", { error_mode: 'lax' });
    assert.deepEqual(new VariableLookup('http://disney.com/logo.gif'), v.name);
    assert_equal_filters([['image', ['med']]], v.filters);
  });

  it('test_string_to_filter', () => {
    const v = create_variable("'http://disney.com/logo.gif' | image: 'med' ");
    assert.deepEqual('http://disney.com/logo.gif', v.name);
    assert_equal_filters([['image', ['med']]], v.filters);
  });

  it('test_string_single_quoted', () => {
    const v = create_variable('"hello"');
    assert.deepEqual('hello', v.name);
  });

  it('test_string_double_quoted', () => {
    const v = create_variable('"hello"');
    assert.deepEqual('hello', v.name);
  });

  it('test_integer', () => {
    const v = create_variable('1000');
    assert.deepEqual(1000, v.name);
  });

  it('test_float', () => {
    const v = create_variable('1000.01');
    assert.deepEqual(1000.01, v.name);
  });

  it('test_dashes', () => {
    assert.deepEqual(new VariableLookup('foo-bar'), create_variable('foo-bar').name);
    assert.deepEqual(new VariableLookup('foo-bar-2'), create_variable('foo-bar-2').name);

    with_error_mode(() => {
      assert.throws(() => create_variable('foo - bar'), Dry.SyntaxError);
      assert.throws(() => create_variable('-foo'), Dry.SyntaxError);
      assert.throws(() => create_variable('2foo'), Dry.SyntaxError);
    });
  });

  it('test_string_with_special_chars', () => {
    const v = create_variable('"hello! $!this..;"ddasd" "');
    assert.deepEqual('hello! $!this..;"ddasd" ', v.name);
  });

  it('test_string_dot', () => {
    const v = create_variable('test.test');
    assert.deepEqual(new VariableLookup('test.test'), v.name);
  });

  it('test_filter_with_keyword_arguments', () => {
    const v = create_variable('hello | things: greeting: "world", farewell: "goodbye"');
    assert.deepEqual(new VariableLookup('hello'), v.name);
    assert_equal_filters([['things', [], { greeting: 'world', farewell: 'goodbye' }]], v.filters);
  });

  it('test_lax_filter_argument_parsing', () => {
    const v = create_variable('number_of_comments | pluralize: "comment": "comments"', {
      error_mode: 'lax'
    });

    assert.deepEqual(new VariableLookup('number_of_comments'), v.name);
    assert_equal_filters([['pluralize', ['comment', 'comments']]], v.filters);
  });

  it('test_strict_filter_argument_parsing', () => {
    with_error_mode('strict', () => {
      assert.throws(() => {
        create_variable('number_of_comments | pluralize: "comment": "comments"');
      }, Dry.SyntaxError);
    });
  });

  it('test_output_raw_source_of_variable', () => {
    const v = create_variable(' name_of_variable | upcase ');
    assert.deepEqual(' name_of_variable | upcase ', v.raw);
  });

  it.only('test_variable_lookup_interface', () => {
    const lookup = new VariableLookup('a.b.c');
    console.log(lookup.lookups)
    assert.deepEqual('a', lookup.name);
    assert.deepEqual(['b', 'c'], lookup.lookups);
  });
});
