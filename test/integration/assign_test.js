'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { assert_raises, assert_template_result, with_error_mode } = require('../test_helpers');

class ObjectWrapperDrop extends Dry.Drop {
  constructor(obj) {
    super(obj);
    this.obj = obj;
  }

  get value() {
    return this.obj;
  }
}

const assign_score_of = obj => {
  const context = new Dry.Context({ environments: { drop: new ObjectWrapperDrop(obj) } });
  Dry.Template.parse('{% assign obj = drop.value %}').render(context);
  return context.resource_limits.assign_score;
};

describe('assign_test', () => {
  it('test_assign_with_hyphen_in_variable_name', () => {
    const template_source = `
    {% assign this-thing = 'Print this-thing' %}
    {{ this-thing }}
    `;
    const template = Dry.Template.parse(template_source);
    const rendered = template.render();
    assert.equal('Print this-thing', rendered.trim());
  });

  it('temp', () => {
    assert_template_result('false', '{% assign truthy = val > 2 %}{{ truthy }}', { val: 1 });
    assert_template_result('FALSE', '{% assign truthy = val > 2 | upcase %}{{ truthy }}', { val: 1 });
    assert_template_result('true', '{% assign truthy = val < 2 %}{{ truthy }}', { val: 1 });
    assert_template_result('4', '{% assign number = a - b %}{{ number }}', { a: 5, b: 1 });
    assert_template_result('11', '{% assign number = a + b %}{{ number }}', { a: 4, b: 7 });
    assert_template_result('5', '{% assign number = a / b %}{{ number }}', { a: 15, b: 3 });
    assert_template_result('45', '{% assign number = a * b %}{{ number }}', { a: 15, b: 3 });
    assert_template_result('21', '{% assign a = 7 %}{% assign number = a * b %}{{ number }}', { b: 3 });
  });

  it('test_assigned_variable', () => {
    const assigns = { values: ['foo', 'bar', 'baz'] };
    assert_template_result('.foo.', '{% assign foo = values %}.{{ foo[0] }}.', assigns);
    assert_template_result('.bar.', '{% assign foo = values %}.{{ foo[1] }}.', assigns);
  });

  it('test_assign_with_filter', () => {
    const assigns = { values: 'foo,bar,baz' };
    assert_template_result('.bar.', '{% assign foo = values | split: "," %}.{{ foo[1] }}.', assigns);
  });

  it('test_assign_syntax_error', cb => {
    try {
      Dry.Template.parse('{% assign foo not values %}.').render({ values: 'foo,bar,baz' });
    } catch (err) {
      assert(/assign/i.test(err.message));
      cb();
    }
  });

  it('test_assign_uses_error_mode', () => {
    with_error_mode('strict', () => {
      assert_raises(Dry.SyntaxError, () => {
        Dry.Template.parse("{% assign foo = ('X' | downcase) %}");
      });
    });

    with_error_mode('lax', () => {
      assert(Dry.Template.parse("{% assign foo = ('X' | downcase) %}"));
    });
  });

  it('test_expression_with_whitespace_in_square_brackets', () => {
    const source = "{% assign r = a[ 'b' ] %}{{ r }}";
    assert_template_result('result', source, { a: { b: 'result' } });
  });

  it('test_assign_score_exceeding_resource_limit', () => {
    const t = Dry.Template.parse('{% assign foo = 42 %}{% assign bar = 23 %}');
    t.resource_limits.assign_score_limit = 1;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.assign_score_limit = 2;
    assert.equal('', t.render());
    assert(t.resource_limits.assign_score > 0, t.resource_limits.assign_score);
  });

  it('test_assign_score_exceeding_limit_from_composite_object', () => {
    const t = Dry.Template.parse("{% assign foo = 'aaaa' | reverse %}");

    t.resource_limits.assign_score_limit = 3;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.assign_score_limit = 5;
    assert.equal('', t.render());
  });

  it('test_assign_score_of_int', () => {
    assert.equal(1, assign_score_of(123));
  });

  it('test_assign_score_of_string_counts_bytes', () => {
    assert.equal(3, assign_score_of('123'));
    assert.equal(5, assign_score_of('12345'));
    assert.equal(9, assign_score_of('すごい'));
  });

  it('test_assign_score_of_array', () => {
    assert.equal(1, assign_score_of([]));
    assert.equal(2, assign_score_of([123]));
    assert.equal(6, assign_score_of([123, 'abcd']));
  });

  it('test_assign_score_of_hash', () => {
    assert.equal(1, assign_score_of({}));
    assert.equal(5, assign_score_of({ int: 123 }));
    assert.equal(12, assign_score_of({ int: 123, str: 'abcd' }));
  });
});
