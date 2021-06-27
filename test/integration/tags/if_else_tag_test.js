'use strict';

const { assert_raises, assert_template_result } = require('../../test_helpers');
const Dry = require('../../..');

describe('if_else_tag_test', () => {
  it('test_if', () => {
    assert_template_result('  ', ' {% if false %} this text should not go into the output {% endif %} ');
    assert_template_result('  this text should go into the output  ', ' {% if true %} this text should go into the output {% endif %} ');
    assert_template_result('  you rock ?', '{% if false %} you suck {% endif %} {% if true %} you rock {% endif %}?');
  });

  it('test_literal_comparisons', () => {
    assert_template_result(' NO ', '{% assign v = false %}{% if v %} YES {% else %} NO {% endif %}');
    assert_template_result(' YES ', '{% assign v = null %}{% if v == null %} YES {% else %} NO {% endif %}');
    assert_template_result(' YES ', '{% if v == true %} YES {% endif %}', { v: true });
    assert_template_result(' YES ', '{% if v is true %} YES {% endif %}', { v: true });
    assert_template_result('', '{% if v isnt true %} YES {% endif %}', { v: true });
  });

  it('test_defined_keyword', () => {
    assert_template_result(' YES ', '{% if v is defined %} YES {% endif %}', { v: true });
    assert_template_result('', '{% if v is defined %} YES {% endif %}');
    assert_template_result(' YES ', '{% if v isnt defined %} YES {% endif %}');
    assert_template_result('', '{% if v isnt defined %} YES {% endif %}', { v: true });

    assert_template_result('', '{% if v == defined %} YES {% endif %}', { v: true });
    assert_template_result('', '{% if v === defined %} YES {% endif %}', { v: true });

    assert_template_result(' YES ', '{% if v == defined %} YES {% endif %}', { v: true, defined: true });
    assert_template_result('', '{% if v == defined %} YES {% endif %}', { v: true, defined: false });
  });

  it('test_if_else', () => {
    assert_template_result(' YES ', '{% if false %} NO {% else %} YES {% endif %}');
    assert_template_result(' YES ', '{% if true %} YES {% else %} NO {% endif %}');
    assert_template_result(' YES ', '{% if "foo" %} YES {% else %} NO {% endif %}');
  });

  it('test_if_boolean', () => {
    assert_template_result(' YES ', '{% if truthy %} YES {% endif %}', { truthy: true });
    assert_template_result('', '{% if truthy %} YES {% endif %}', { truthy: false });
  });

  it('test_if_or', () => {
    assert_template_result(' YES ', '{% if a or b %} YES {% endif %}', { a: true, b: true });
    assert_template_result(' YES ', '{% if a or b %} YES {% endif %}', { a: true, b: false });
    assert_template_result(' YES ', '{% if a or b %} YES {% endif %}', { a: false, b: true });
    assert_template_result('', '{% if a or b %} YES {% endif %}', { a: false, b: false });

    assert_template_result(' YES ', '{% if a or b or c %} YES {% endif %}', { a: false, b: false, c: true });
    assert_template_result('', '{% if a or b or c %} YES {% endif %}', { a: false, b: false, c: false });
  });

  it('test_if_or_with_operators', () => {
    assert_template_result(' YES ', '{% if a == true or b == true %} YES {% endif %}', { a: true, b: true });
    assert_template_result(' YES ', '{% if a == true or b == false %} YES {% endif %}', { a: true, b: true });
    assert_template_result('', '{% if a == false or b == false %} YES {% endif %}', { a: true, b: true });
  });

  it('test_comparison_of_strings_containing_and_or_or', () => {
    const awful_markup = "a == 'and' and b == 'or' and c == 'foo and bar' and d == 'bar or baz' and e == 'foo' and foo and bar";
    const assigns = { a: 'and', b: 'or', c: 'foo and bar', d: 'bar or baz', e: 'foo', foo: true, bar: true };
    assert_template_result(' YES ', `{% if ${awful_markup} %} YES {% endif %}`, assigns);
  });

  it('test_comparison_of_expressions_starting_with_and*_or_or*_or_is*', () => {
    const assigns = { order: { items_count: 0 }, android: { name: 'Roy' }, island: 'Maui' };
    assert_template_result('YES', "{% if island == 'Maui' %}YES{% endif %}", assigns);
    assert_template_result('YES', "{% if android.name == 'Roy' %}YES{% endif %}", assigns);
    assert_template_result('YES', '{% if order.items_count == 0 %}YES{% endif %}', assigns);
  });

  it('test_if_and', () => {
    assert_template_result(' YES ', '{% if true and true %} YES {% endif %}');
    assert_template_result('', '{% if false and true %} YES {% endif %}');
    assert_template_result('', '{% if false and true %} YES {% endif %}');
  });

  it('test_hash_miss_generates_false', () => {
    assert_template_result('', '{% if foo.bar %} NO {% endif %}', { foo: {} });
  });

  it('test_if_from_variable', () => {
    assert_template_result('', '{% if var %} NO {% endif %}', { var: false });
    assert_template_result('', '{% if var %} NO {% endif %}', { var: null });
    assert_template_result('', '{% if foo.bar %} NO {% endif %}', { foo: { bar: false } });
    assert_template_result('', '{% if foo.bar %} NO {% endif %}', { foo: {} });
    assert_template_result('', '{% if foo.bar %} NO {% endif %}', { foo: null });
    assert_template_result('', '{% if foo.bar %} NO {% endif %}', { foo: true });

    assert_template_result(' YES ', '{% if var %} YES {% endif %}', { var: 'text' });
    assert_template_result(' YES ', '{% if var %} YES {% endif %}', { var: true });
    assert_template_result(' YES ', '{% if var %} YES {% endif %}', { var: 1 });
    assert_template_result(' YES ', '{% if var %} YES {% endif %}', { var: {} });
    assert_template_result(' YES ', '{% if var %} YES {% endif %}', { var: [] });
    assert_template_result(' YES ', '{% if "foo" %} YES {% endif %}');
    assert_template_result(' YES ', '{% if foo.bar %} YES {% endif %}', { foo: { bar: true } });
    assert_template_result(' YES ', '{% if foo.bar %} YES {% endif %}', { foo: { bar: 'text' } });
    assert_template_result(' YES ', '{% if foo.bar %} YES {% endif %}', { foo: { bar: 1 } });
    assert_template_result(' YES ', '{% if foo.bar %} YES {% endif %}', { foo: { bar: {} } });
    assert_template_result(' YES ', '{% if foo.bar %} YES {% endif %}', { foo: { bar: [] } });

    assert_template_result(' YES ', '{% if var %} NO {% else %} YES {% endif %}', { var: false });
    assert_template_result(' YES ', '{% if var %} NO {% else %} YES {% endif %}', { var: null });
    assert_template_result(' YES ', '{% if var %} YES {% else %} NO {% endif %}', { var: true });
    assert_template_result(' YES ', '{% if "foo" %} YES {% else %} NO {% endif %}', { var: 'text' });

    assert_template_result(' YES ', '{% if foo.bar %} NO {% else %} YES {% endif %}', { foo: { bar: false } });
    assert_template_result(' YES ', '{% if foo.bar %} YES {% else %} NO {% endif %}', { foo: { bar: true } });
    assert_template_result(' YES ', '{% if foo.bar %} YES {% else %} NO {% endif %}', { foo: { bar: 'text' } });
    assert_template_result(' YES ', '{% if foo.bar %} NO {% else %} YES {% endif %}', { foo: { notbar: true } });
    assert_template_result(' YES ', '{% if foo.bar %} NO {% else %} YES {% endif %}', { foo: {} });
    assert_template_result(' YES ', '{% if foo.bar %} NO {% else %} YES {% endif %}', { notfoo: { bar: true } });
  });

  it('test_nested_if', () => {
    assert_template_result('', '{% if false %}{% if false %} NO {% endif %}{% endif %}');
    assert_template_result('', '{% if false %}{% if true %} NO {% endif %}{% endif %}');
    assert_template_result('', '{% if true %}{% if false %} NO {% endif %}{% endif %}');
    assert_template_result(' YES ', '{% if true %}{% if true %} YES {% endif %}{% endif %}');

    assert_template_result(' YES ', '{% if true %}{% if true %} YES {% else %} NO {% endif %}{% else %} NO {% endif %}');
    assert_template_result(' YES ', '{% if true %}{% if false %} NO {% else %} YES {% endif %}{% else %} NO {% endif %}');
    assert_template_result(' YES ', '{% if false %}{% if true %} NO {% else %} NONO {% endif %}{% else %} YES {% endif %}');
  });

  it('test_comparisons_on_null', () => {
    assert_template_result('', '{% if null < 10 %} NO {% endif %}');
    assert_template_result('', '{% if null <= 10 %} NO {% endif %}');
    assert_template_result('', '{% if null >= 10 %} NO {% endif %}');
    assert_template_result('', '{% if null > 10 %} NO {% endif %}');

    assert_template_result('', '{% if 10 < null %} NO {% endif %}');
    assert_template_result('', '{% if 10 <= null %} NO {% endif %}');
    assert_template_result('', '{% if 10 >= null %} NO {% endif %}');
    assert_template_result('', '{% if 10 > null %} NO {% endif %}');
  });

  it('test_else_if', () => {
    assert_template_result('0', '{% if 0 == 0 %}0{% elsif 1 == 1%}1{% else %}2{% endif %}');
    assert_template_result('1', '{% if 0 != 0 %}0{% elsif 1 == 1%}1{% else %}2{% endif %}');
    assert_template_result('2', '{% if 0 != 0 %}0{% elsif 1 != 1%}1{% else %}2{% endif %}');

    assert_template_result('elsif', '{% if false %}if{% elsif true %}elsif{% endif %}');
  });

  it('test_syntax_error_no_variable', () => {
    assert_raises(Dry.SyntaxError, () => {
      assert_template_result('', '{% if jerry == 1 %}');
    });
  });

  it('test_syntax_error_no_expression', () => {
    assert_raises(Dry.SyntaxError, () => {
      assert_template_result('', '{% if %}');
    });
  });

  it('test_if_with_custom_condition', () => {
    const original_op = Dry.Condition.operators['contains'];
    Dry.Condition.operators['contains'] = {};

    try {
      assert_template_result('yes', '{% if "bob" contains "o" %}yes{% endif %}');
      assert_template_result('no', '{% if "bob" contains "f" %}yes{% else %}no{% endif %}');
    } catch (err) {
      Dry.Condition.operators['contains'] = original_op;
    }
  });

  it('test_operators_are_ignored_unless_isolated', () => {
    const original_op = Dry.Condition.operators['contains'];
    Dry.Condition.operators['contains'] = {};

    try {
      assert_template_result('yes', '{% if "gnomeslab-and-or-liquid" contains "gnomeslab-and-or-liquid" %}yes{% endif %}');
    } catch (err) {
      Dry.Condition.operators['contains'] = original_op;
    }
  });

  it('test_operators_are_whitelisted', () => {
    assert_raises(Dry.SyntaxError, () => {
      assert_template_result('', '{% if 1 or throw or or 1 %}yes{% endif %}');
    });
  });

  it('test_multiple_conditions', () => {
    const tpl = '{% if a or b and c %}true{% else %}false{% endif %}';

    const tests = new Map([
      [[true, true, true], true],
      [[true, true, false], true],
      [[true, false, true], true],
      [[true, false, false], true],
      [[false, true, true], true],
      [[false, true, false], false],
      [[false, false, true], false],
      [[false, false, false], false]
    ]);

    for (const [vals, expected] of tests) {
      const [a, b, c] = vals;
      const assigns = { a: a, b: b, c: c };
      assert_template_result(expected.toString(), tpl, assigns);
    }
  });
});
