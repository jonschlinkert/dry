'use strict';

const { assert_template_result } = require('../../test_helpers');

describe('cycle_tag_test', () => {
  it('test_cycle', () => {
    assert_template_result('one', '{%cycle "one", "two"%}');
    assert_template_result('one two', '{%cycle "one", "two"%} {%cycle "one", "two"%}');
    assert_template_result(' two', '{%cycle "", "two"%} {%cycle "", "two"%}');

    assert_template_result('one two one', '{%cycle "one", "two"%} {%cycle "one", "two"%} {%cycle "one", "two"%}');

    assert_template_result('text-align: left text-align: right',
      '{%cycle "text-align: left", "text-align: right" %} {%cycle "text-align: left", "text-align: right"%}');
  });

  it('test_multiple_cycles', () => {
    assert_template_result('1 2 1 1 2 3 1',
      '{%cycle 1,2%} {%cycle 1,2%} {%cycle 1,2%} {%cycle 1,2,3%} {%cycle 1,2,3%} {%cycle 1,2,3%} {%cycle 1,2,3%}');
  });

  it('test_multiple_named_cycles', () => {
    assert_template_result('one one two two one one',
      '{%cycle 1: "one", "two" %} {%cycle 2: "one", "two" %} {%cycle 1: "one", "two" %} {%cycle 2: "one", "two" %} {%cycle 1: "one", "two" %} {%cycle 2: "one", "two" %}');
  });

  it('test_multiple_named_cycles_with_names_from_context', () => {
    const assigns = { 'var1': 1, 'var2': 2 };
    assert_template_result('one one two two one one',
      '{%cycle var1: "one", "two" %} {%cycle var2: "one", "two" %} {%cycle var1: "one", "two" %} {%cycle var2: "one", "two" %} {%cycle var1: "one", "two" %} {%cycle var2: "one", "two" %}', assigns);
  });
});
