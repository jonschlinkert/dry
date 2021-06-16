'use strict';

const { assert_template_result } = require('../../test_helpers');

describe('statements_test', () => {
  it('test_true_eql_true', () => {
    const text = ' {% if true == true %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text);
  });

  it('test_true_not_eql_true', () => {
    const text = ' {% if true != true %} true {% else %} false {% endif %} ';
    assert_template_result('  false  ', text);
  });

  it('test_true_lq_true', () => {
    const text = ' {% if 0 > 0 %} true {% else %} false {% endif %} ';
    assert_template_result('  false  ', text);
  });

  it('test_one_lq_zero', () => {
    const text = ' {% if 1 > 0 %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text);
  });

  it('test_zero_lq_one', () => {
    const text = ' {% if 0 < 1 %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text);
  });

  it('test_zero_lq_or_equal_one', () => {
    const text = ' {% if 0 <= 0 %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text);
  });

  it('test_zero_lq_or_equal_one_involving_nil', () => {
    let text = ' {% if null <= 0 %} true {% else %} false {% endif %} ';
    assert_template_result('  false  ', text);

    text = ' {% if 0 <= null %} true {% else %} false {% endif %} ';
    assert_template_result('  false  ', text);
  });

  it('test_zero_lqq_or_equal_one', () => {
    const text = ' {% if 0 >= 0 %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text);
  });

  it('test_strings', () => {
    const text = " {% if 'test' == 'test' %} true {% else %} false {% endif %} ";
    assert_template_result('  true  ', text);
  });

  it('test_strings_not_equal', () => {
    const text = " {% if 'test' != 'test' %} true {% else %} false {% endif %} ";
    assert_template_result('  false  ', text);
  });

  it('test_var_strings_equal', () => {
    const text = ' {% if var == "hello there!" %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { var: 'hello there!' });
  });

  it('test_var_strings_are_not_equal', () => {
    const text = ' {% if "hello there!" == var %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { var: 'hello there!' });
  });

  it('test_var_and_long_string_are_equal', () => {
    const text = " {% if var == 'hello there!' %} true {% else %} false {% endif %} ";
    assert_template_result('  true  ', text, { var: 'hello there!' });
  });

  it('test_var_and_long_string_are_equal_backwards', () => {
    const text = " {% if 'hello there!' == var %} true {% else %} false {% endif %} ";
    assert_template_result('  true  ', text, { var: 'hello there!' });
  });

  // def test_is_nil
  //  text = %| {% if var != null %} true {% else %} false {% }); %} |
  //  this.template.assigns = { 'var': 'hello there!'}
  //  expected = %|  true  |
  //  assert_equal expected, this.template.parse(text)
  // });

  it('test_is_collection_empty', () => {
    const text = ' {% if array == empty %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { array: [] });
  });

  it('test_is_not_collection_empty', () => {
    const text = ' {% if array == empty %} true {% else %} false {% endif %} ';
    assert_template_result('  false  ', text, { array: [1, 2, 3] });
  });

  it('test_nil', () => {
    let text = ' {% if var == null %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { var: null });

    text = ' {% if var == null %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { var: null });
  });

  it('test_not_nil', () => {
    let text = ' {% if var != null %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { var: 1 });

    text = ' {% if var != null %} true {% else %} false {% endif %} ';
    assert_template_result('  true  ', text, { var: 1 });
  });
});
