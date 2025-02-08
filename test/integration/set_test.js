
const assert = require('node:assert/strict');
const Dry = require('../..');
const {
  assert_raises,
  assert_match_syntax_error,
  assert_template_result,
  with_error_mode
} = require('../test_helpers');

let error_mode;

class ObjectWrapperDrop extends Dry.Drop {
  constructor(obj) {
    super(obj);
    this.obj = obj;
  }

  get value() {
    return this.obj;
  }
}

const assign_score_of = async obj => {
  const context = new Dry.Context({ environments: { drop: new ObjectWrapperDrop(obj) } });
  await Dry.Template.parse('{% set obj = drop.value %}').render(context);
  return context.resource_limits.assign_score;
};

describe('set_test', () => {
  before(() => {
    error_mode = Dry.Template.error_mode;
  });

  it('test_set_with_hyphen_in_variable_name', async () => {
    const template_source = `
    {% set this-thing = 'Print this-thing' %}
    {{ this-thing }}
    `;
    const template = Dry.Template.parse(template_source);
    const rendered = await template.render();
    assert.equal('Print this-thing', rendered.trim());
  });

  it('temp', async () => {
    await assert_template_result('false', '{% set truthy = val > 2 %}{{ truthy }}', { val: 1 });
    await assert_template_result('FALSE', '{% set truthy = val > 2 | upcase %}{{ truthy }}', { val: 1 });
    await assert_template_result('true', '{% set truthy = val < 2 %}{{ truthy }}', { val: 1 });
    await assert_template_result('4', '{% set number = a - b %}{{ number }}', { a: 5, b: 1 });
    await assert_template_result('11', '{% set number = a + b %}{{ number }}', { a: 4, b: 7 });
    await assert_template_result('5', '{% set number = a / b %}{{ number }}', { a: 15, b: 3 });
    await assert_template_result('45', '{% set number = a * b %}{{ number }}', { a: 15, b: 3 });
    await assert_template_result('21', '{% set a = 7 %}{% set number = a * b %}{{ number }}', { b: 3 });
  });

  it('test_seted_variable', async () => {
    const sets = { values: ['foo', 'bar', 'baz'] };
    await assert_template_result('.foo.', '{% set foo = values %}.{{ foo[0] }}.', sets);
    await assert_template_result('.bar.', '{% set foo = values %}.{{ foo[1] }}.', sets);
  });

  it('test_set_with_filter', async () => {
    const sets = { values: 'foo,bar,baz' };
    await assert_template_result('.bar.', '{% set foo = values | split: "," %}.{{ foo[1] }}.', sets);
  });

  it('test_set_syntax_error', async () => {
    await assert_match_syntax_error(/assign/, '{% set foo not bar %}.');
  });

  it('test_set_uses_error_mode', async () => {
    with_error_mode('strict', async () => {
      await assert_raises(Dry.SyntaxError, () => {
        Dry.Template.parse("{% set foo = ('X' | downcase) %}");
      });
    });

    with_error_mode('lax', () => {
      assert(Dry.Template.parse("{% set foo = ('X' | downcase) %}"));
    });
  });

  it('test_expression_with_whitespace_in_square_brackets', async () => {
    const source = "{% set r = a[ 'b' ] %}{{ r }}";
    await assert_template_result('result', source, { a: { b: 'result' } });
  });

  it.skip('test_set_score_exceeding_resource_limit', async () => {
    const t = Dry.Template.parse('{% set foo = 42 %}{% set bar = 23 %}');
    t.resource_limits.set_score_limit = 1;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.set_score_limit = 2;
    assert.equal('', await t.render());
    assert(t.resource_limits.assign_score > 0, t.resource_limits.assign_score);
  });

  it.skip('test_set_score_exceeding_limit_from_composite_object', async () => {
    const t = Dry.Template.parse("{% set foo = 'aaaa' | reverse %}");

    t.resource_limits.set_score_limit = 3;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.set_score_limit = 5;
    assert.equal('', await t.render());
  });

  it('test_assign_score_of_int', async () => {
    assert.equal(1, await assign_score_of(123));
  });

  it('test_assign_score_of_string_counts_bytes', async () => {
    assert.equal(3, await assign_score_of('123'));
    assert.equal(5, await assign_score_of('12345'));
    assert.equal(9, await assign_score_of('すごい'));
  });

  it('test_assign_score_of_array', async () => {
    assert.equal(1, await assign_score_of([]));
    assert.equal(2, await assign_score_of([123]));
    assert.equal(6, await assign_score_of([123, 'abcd']));
  });

  it('test_assign_score_of_hash', async () => {
    assert.equal(1, await assign_score_of({}));
    assert.equal(5, await assign_score_of({ int: 123 }));
    assert.equal(12, await assign_score_of({ int: 123, str: 'abcd' }));
  });

  describe('tests from liquidjs - tags/set', () => {
    before(() => {
      Dry.Template.error_mode = 'lax';
    });

    after(() => {
      Dry.Template.error_mode = error_mode;
    });

    it('should throw when variable expression illegal', () => {
      return assert.rejects(() => Dry.Template.parse('{% set / %}').render(), /syntax error/);
    });

    it('should support set to a string', async () => {
      await assert_template_result('bar', '{% set foo="bar" %}{{foo}}');
    });

    it('should support set to a number', async () => {
      await assert_template_result('10086', '{% set foo=10086 %}{{foo}}');
    });

    it('should set as array', async () => {
      await assert_template_result('123', '{% set foo=(1..3) %}{{foo}}');
    });

    it('should set as filter result', async () => {
      await assert_template_result('A', '{% set foo="a b" | capitalize | split: " " | first %}{{foo}}');
    });

    it('should set as filter across multiple lines as result', async () => {
      const template = `{% set foo="a b"
      | capitalize
      | split: " "
      | first %}{{foo}}`;
      await assert_template_result('A', template);
    });

    it('should set var-1', async () => {
      await assert_template_result('5', '{% set var-1 = 5 %}{{ var-1 }}');
    });

    it('should set var-', async () => {
      await assert_template_result('5', '{% set var- = 5 %}{{ var- }}');
    });

    it('should set -var', async () => {
      await assert_template_result('5', '{% set -let = 5 %}{{ -let }}');
    });

    it('should set -5-5', async () => {
      await assert_template_result('5', '{% set -5-5 = 5 %}{{ -5-5 }}');
    });

    it('should set 4-3', async () => {
      await assert_template_result('5', '{% set 4-3 = 5 %}{{ 4-3 }}');
    });

    it('should not set -6', async () => {
      await assert_template_result('-6', '{% set -6 = 5 %}{{ -6 }}');
    });
  });

  describe('scope', () => {
    it('should read from parent scope', async () => {
      await assert_template_result('11', '{%for a in (1..2)%}{{num}}{%endfor%}', { num: 1 });
    });

    it('should write to the root scope', async () => {
      await assert_template_result('12', '{%for a in (1..2)%}{%set num = a%}{{a}}{%endfor%}', { num: 1 });
    });

    it('should not change input scope', async () => {
      const src = '{%for a in (1..2)%}{%set num = a%}{{a}}{%endfor%} {{num}}';
      const ctx = { num: 1 };
      await Dry.Template.parse(src).render(ctx);
      assert.equal(ctx.num, 1);
    });
  });
});
