'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const {
  assert_raises,
  assert_match_syntax_error,
  assert_template_result,
  with_error_mode
} = require('../test_helpers');

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
  await Dry.Template.parse('{% assign obj = drop.value %}').render(context);
  return context.resource_limits.assign_score;
};

const trim = s => s.replace(/\s+/g, '');
const render = (expected, input, context) => {
  return Dry.Template.render(input, context);
};

describe('assign_test', () => {
  describe('conditionally_assigned_variables', () => {
    it.skip('test_if', async () => {
      const input = '{% assign linkpost = true if post["external-url"] %}{{ linkpost }}';
      await assert_template_result('true', input, { post: { 'external-url': '...' } });
      await assert_template_result('', input, { post: { 'external-url': false } });
    });

    it.skip('test_unless', async () => {
      const input = '{% assign comments = true unless post.comments == false %}{{ comments }}';
      await assert_template_result('', input, { post: { comments: false } });
      await assert_template_result('true', input, { post: { comments: true } });
    });

    it.skip('test_ternary', async () => {
      const input = '{% assign url = (post ? post.url : page.url) %}text:{{ url }}';
      await assert_template_result('text:true', input, { post: { url: 'true' } });
      await assert_template_result('text:page', input, { page: { url: 'page' } });
    });
  });

  describe('assigned_conditionals', () => {
    it('test_assigned_conditionals', async () => {
      await assert_template_result('false', '{% assign truthy = val > 2 %}{{ truthy }}', { val: 1 });
      await assert_template_result('FALSE', '{% assign truthy = val > 2 | upcase %}{{ truthy }}', { val: 1 });
      await assert_template_result('true', '{% assign truthy = val < 2 %}{{ truthy }}', { val: 1 });
      await assert_template_result('4', '{% assign number = a - b %}{{ number }}', { a: 5, b: 1 });
      await assert_template_result('11', '{% assign number = a + b %}{{ number }}', { a: 4, b: 7 });
      await assert_template_result('5', '{% assign number = a / b %}{{ number }}', { a: 15, b: 3 });
      await assert_template_result('45', '{% assign number = a * b %}{{ number }}', { a: 15, b: 3 });
      await assert_template_result('21', '{% assign a = 7 %}{% assign number = a * b %}{{ number }}', { b: 3 });
    });
  });

  describe('ranges', () => {
    it('test_assign_numerical_range', async () => {
      const input = '{% assign arr = (1..3) %}{{ arr | join: "-" }}';
      await assert_template_result('1-2-3', input);
    });

    it('test_assign_alphabetical_range', async () => {
      const input = '{% assign arr = ("a".."c") %}{{ arr | join: "-" }}';
      await assert_template_result('a-b-c', input);
    });

    it('test_filters_on_alphabetical_range', async () => {
      await assert_template_result('A-,-B-,-C', '{% assign arr = ("a".."c") | upcase %}{{ arr | join: "-" }}');
      await assert_template_result('A-B-C', '{% assign arr = ("a".."c") %}{{ arr | join: "-" | upcase }}');
    });
  });

  describe('operators', () => {
    it.skip('test_or', async () => {
      const input = '{% assign author = post.author || page.author || site.author %}{{ author }}';
      await assert_template_result('doowb', input, { site: { author: 'doowb' } });
    });

    it.skip('test_logical_or', async () => {
      const assigns = { site: { name: 'brandscale' }, bar: 'baz' };
      console.log([await render('brandscale', '{% assign foo ||= site.name %}{{ foo }}', assigns)]);
      console.log([await render('baz', '{% assign bar ||= site.name %}{{ bar }}', assigns)]);
    });

    it.skip('test_addition_assignment', async () => {
      console.log([await render(' →', '{% assign text += " →" if post %}{{ text }}', { post: true })]);
    });

    it('test_advanced_assign_features', async () => {
      const input = `
        {% assign var1 = 'awesome' %}     {# awesome #}
        {% assign var2 = var1 | upcase %} {# AWESOME #}
        {{ var1 }}
        {{ var2 }}
      `;

      await assert_template_result('awesomeAWESOME', input, {}, trim);

      // Conditionally assign variables.
      // {% assign linkpost = true if post.external-url %}
      // {% assign comments = true unless post.comments == false %}
      // {% assign url (post ? post.url : page.url) %}

      // Use fancy operators in assignment.
      // {% assign author = post.author || page.author || site.author %}
      // {% assign name ||= site.name %}
      // {% assign title_text += ' →' if linkpost %}

    });
  });

  describe('assign_tag', () => {
    it('test_assign_with_hyphen_in_variable_name', async () => {
      const template_source = `
      {% assign this-thing = 'Print this-thing' %}
      {{ this-thing }}
      `;
      const template = Dry.Template.parse(template_source);
      const rendered = await template.render();
      assert.equal('Print this-thing', rendered.trim());
    });

    it('test_assigned_variable', async () => {
      const assigns = { values: ['foo', 'bar', 'baz'] };
      await assert_template_result('.foo.', '{% assign foo = values %}.{{ foo[0] }}.', assigns);
      await assert_template_result('.bar.', '{% assign foo = values %}.{{ foo[1] }}.', assigns);
    });

    it('test_assign_with_filter', async () => {
      const assigns = { values: 'foo,bar,baz' };
      await assert_template_result('.bar.', '{% assign foo = values | split: "," %}.{{ foo[1] }}.', assigns);
    });

    it('test_assign_syntax_error', async () => {
      await assert_match_syntax_error(/assign/, '{% assign foo not bar %}.');
    });

    it('test_assign_uses_error_mode', async () => {
      with_error_mode('strict', async () => {
        await assert_raises(Dry.SyntaxError, () => {
          Dry.Template.parse("{% assign foo = ('X' | downcase) %}");
        });
      });

      with_error_mode('lax', () => {
        assert(Dry.Template.parse("{% assign foo = ('X' | downcase) %}"));
      });
    });

    it('test_expression_with_whitespace_in_square_brackets', async () => {
      const source = "{% assign r = a[ 'b' ] %}{{ r }}";
      await assert_template_result('result', source, { a: { b: 'result' } });
    });

    it('test_assign_score_exceeding_resource_limit', async () => {
      const t = Dry.Template.parse('{% assign foo = 42 %}{% assign bar = 23 %}');
      t.resource_limits.assign_score_limit = 1;

      await assert.rejects(() => t.render(), /Dry error: Memory limits exceeded/);
      assert(t.resource_limits.reached);

      t.resource_limits.assign_score_limit = 2;
      assert.equal('', await t.render());
      assert(t.resource_limits.assign_score > 0, t.resource_limits.assign_score);
    });

    it('test_assign_score_exceeding_limit_from_composite_object', async () => {
      const t = Dry.Template.parse("{% assign foo = 'aaaa' | reverse %}");

      t.resource_limits.assign_score_limit = 3;
      await assert.rejects(() => t.render(), /Dry error: Memory limits exceeded/);
      assert(t.resource_limits.reached);

      t.resource_limits.assign_score_limit = 5;
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
  });

  describe('scope', () => {
    it('should read from parent scope', async () => {
      await assert_template_result('11', '{%for a in (1..2)%}{{num}}{%endfor%}', { num: 1 });
    });

    it('should write to the root scope', async () => {
      await assert_template_result('12', '{%for a in (1..2)%}{%assign num = a%}{{a}}{%endfor%}', { num: 1 });
    });

    it('should not change input scope', async () => {
      const src = '{%for a in (1..2)%}{%assign num = a%}{{a}}{%endfor%} {{num}}';
      const ctx = { num: 1 };
      await Dry.Template.parse(src).render(ctx);
      assert.equal(ctx.num, 1);
    });
  });

  describe('tests from liquidjs - tags/assign', () => {
    it('should throw when variable expression illegal', () => {
      return assert.rejects(() => Dry.Template.parse('{% assign / %}').render(), /syntax error/);
    });

    it('should support assign to a string', async () => {
      await assert_template_result('bar', '{% assign foo="bar" %}{{foo}}');
    });

    it('should support assign to a number', async () => {
      await assert_template_result('10086', '{% assign foo=10086 %}{{foo}}');
    });

    it('should assign as array', async () => {
      await assert_template_result('123', '{% assign foo=(1..3) %}{{foo}}');
    });

    it('should assign as filter result', async () => {
      await assert_template_result('A', '{% assign foo="a b" | capitalize | split: " " | first %}{{foo}}');
    });

    it('should assign as filter across multiple lines as result', async () => {
      const template = `{% assign foo="a b"
      | capitalize
      | split: " "
      | first %}{{foo}}`;
      await assert_template_result('A', template);
    });

    it('should assign var-1', async () => {
      await assert_template_result('5', '{% assign var-1 = 5 %}{{ var-1 }}');
    });

    it('should assign var-', async () => {
      await assert_template_result('5', '{% assign var- = 5 %}{{ var- }}');
    });

    it('should assign -var', async () => {
      await with_error_mode('strict', async () => {
        await assert_raises(Dry.SyntaxError, async () => {
          await assert_template_result('5', '{% assign -let = 5 %}{{ -let }}');
        });
      });

      await with_error_mode('lax', async () => {
        await assert_template_result('5', '{% assign -let = 5 %}{{ -let }}');
      });
    });

    it('should assign -5-5', async () => {
      await with_error_mode('strict', async () => {
        await assert_raises(Dry.SyntaxError, async () => {
          await assert_template_result('5', '{% assign -5-5 = 5 %}{{ -5-5 }}');
        });
      });

      await with_error_mode('lax', async () => {
        await assert_template_result('5', '{% assign -5-5 = 5 %}{{ -5-5 }}');
      });
    });

    it('should assign 4-3', async () => {
      await with_error_mode('strict', async () => {
        await assert_raises(Dry.SyntaxError, async () => {
          await assert_template_result('5', '{% assign 4-3 = 5 %}{{ 4-3 }}');
        });
      });

      await with_error_mode('lax', async () => {
        await assert_template_result('5', '{% assign 4-3 = 5 %}{{ 4-3 }}');
      });
    });

    it('should not assign -6', async () => {
      await assert_template_result('-6', '{% assign -6 = 5 %}{{ -6 }}');
    });
  });
});
