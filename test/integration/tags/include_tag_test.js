'use strict';

const assert = require('assert').strict;
const { assert_raises, assert_template_result, with_error_mode } = require('../../test_helpers');
const Dry = require('../../..');
const { Template, utils: { r } } = Dry;

class TestFileSystem {
  read_template_file(template_path) {
    switch (template_path) {
      case 'product':
        return 'Product: {{ product.title }} ';

      case 'product_alias':
        return 'Product: {{ product.title }} ';

      case 'locale_variables':
        return 'Locale: {{echo1}} {{echo2}}';

      case 'variant':
        return 'Variant: {{ variant.title }}';

      case 'nested_template':
        return "{% include 'header' %} {% include 'body' %} {% include 'footer' %}";

      case 'body':
        return "body {% include 'body_detail' %}";

      case 'nested_product_template':
        return "Product: {{ nested_product_template.title }} {%include 'details'%} ";

      case 'recursively_nested_template':
        return "-{% include 'recursively_nested_template' %}";

      case 'pick_a_source':
        return 'from TestFileSystem';

      case 'assignments':
        return "{% assign foo = 'bar' %}";

      case 'break':
        return '{% break %}';

      default: {
        return template_path;
      }
    }
  }
}

class OtherFileSystem {
  read_template_file(_template_path) {
    return 'from OtherFileSystem';
  }
}

class CountingFileSystem {
  read_template_file(_template_path) {
    this.count ||= 0;
    this.count += 1;
    return 'from CountingFileSystem';
  }
}

class CustomInclude extends Dry.Tag {
  Syntax = r`(${Dry.QuotedFragment}+)(\\s+(?:with|for)\\s+(${Dry.QuotedFragment}+))?`;

  constructor(tag_name, markup, tokens) {
    super(tag_name, markup, tokens);
    const match = this.Syntax.exec(markup);
    this.template_name = match[1];
  }

  parse(tokens) {}

  render_to_output_buffer(_context, output = '') {
    output += this.template_name.slice(1, -2);
    return output;
  }
}

describe('include_tag_test', () => {
  beforeEach(() => {
    Dry.Template.file_system = new TestFileSystem();
  });

  it('test_include_tag_looks_for_file_system_in_registers_first', () => {
    assert.equal('from OtherFileSystem',
      Template.parse("{% include 'pick_a_source' %}").render_strict({}, { registers: { file_system: new OtherFileSystem() } }));
  });

  it('test_include_tag_with', () => {
    assert_template_result('Product: Draft 151cm ',
      "{% include 'product' with products[0] %}", { 'products': [{ 'title': 'Draft 151cm' }, { 'title': 'Element 155cm' }] });
  });

  it('test_include_tag_with_alias', () => {
    assert_template_result('Product: Draft 151cm ',
      "{% include 'product_alias' with products[0] as product %}", { 'products': [{ 'title': 'Draft 151cm' }, { 'title': 'Element 155cm' }] });
  });

  it('test_include_tag_for_alias', () => {
    assert_template_result('Product: Draft 151cm Product: Element 155cm ',
      "{% include 'product_alias' for products as product %}", { 'products': [{ 'title': 'Draft 151cm' }, { 'title': 'Element 155cm' }] });
  });

  it('test_include_tag_with_default_name', () => {
    assert_template_result('Product: Draft 151cm ',
      "{% include 'product' %}", { 'product': { 'title': 'Draft 151cm' } });
  });

  it('test_include_tag_for', () => {
    assert_template_result('Product: Draft 151cm Product: Element 155cm ',
      "{% include 'product' for products %}", { 'products': [{ 'title': 'Draft 151cm' }, { 'title': 'Element 155cm' }] });
  });

  it('test_include_tag_with_local_variables', () => {
    assert_template_result('Locale: test123 ', "{% include 'locale_variables' echo1: 'test123' %}");
  });

  it('test_include_tag_with_multiple_local_variables', () => {
    assert_template_result('Locale: test123 test321',
      "{% include 'locale_variables' echo1: 'test123', echo2: 'test321' %}");
  });

  it('test_include_tag_with_multiple_local_variables_from_context', () => {
    assert_template_result('Locale: test123 test321',
      "{% include 'locale_variables' echo1: echo1, echo2: more_echos.echo2 %}",
      { 'echo1': 'test123', 'more_echos': { 'echo2': 'test321' } });
  });

  it('test_included_templates_assigns_variables', () => {
    assert_template_result('bar', "{% include 'assignments' %}{{ foo }}");
  });

  it('test_nested_include_tag', () => {
    assert_template_result('body body_detail', "{% include 'body' %}");

    assert_template_result('header body body_detail footer', "{% include 'nested_template' %}");
  });

  it('test_nested_include_with_variable', () => {
    assert_template_result('Product: Draft 151cm details ',
      "{% include 'nested_product_template' with product %}", { 'product': { 'title': 'Draft 151cm' } });

    assert_template_result('Product: Draft 151cm details Product: Element 155cm details ',
      "{% include 'nested_product_template' for products %}", { 'products': [{ 'title': 'Draft 151cm' }, { 'title': 'Element 155cm' } ] });
  });

  it.skip('test_recursively_included_template_does_not_produce_endless_loop', () => {
    class InfiniteFileSystem {
      read_template_file(_template_path) {
        return "-{% include 'loop' %}";
      }
    }

    Dry.Template.file_system = new InfiniteFileSystem();

    assert_raises(Dry.StackLevelError, () => {
      Template.parse("{% include 'loop' %}").render_strict();
    });
  });

  it('test_dynamically_choosen_template', () => {
    assert_template_result('Test123', '{% include template %}', { 'template': 'Test123' });
    assert_template_result('Test321', '{% include template %}', { 'template': 'Test321' });

    assert_template_result('Product: Draft 151cm ', '{% include template for product %}',
      { 'template': 'product', 'product': { 'title': 'Draft 151cm' } });
  });

  it('test_include_tag_caches_second_read_of_same_partial', () => {
    const file_system = new CountingFileSystem();
    assert.equal('from CountingFileSystemfrom CountingFileSystem',
      Template.parse("{% include 'pick_a_source' %}{% include 'pick_a_source' %}").render_strict({}, { registers: { file_system: file_system } }));
    assert.equal(1, file_system.count);
  });

  it('test_include_tag_doesnt_cache_partials_across_renders', () => {
    const file_system = new CountingFileSystem();
    assert.equal('from CountingFileSystem',
      Template.parse("{% include 'pick_a_source' %}").render_strict({}, { registers: { file_system: file_system } }));
    assert.equal(1, file_system.count);

    assert.equal('from CountingFileSystem',
      Template.parse("{% include 'pick_a_source' %}").render_strict({}, { registers: { file_system: file_system } }));
    assert.equal(2, file_system.count);
  });

  it('test_include_tag_within_if_statement', () => {
    assert_template_result('foo_if_true', "{% if true %}{% include 'foo_if_true' %}{% endif %}");
  });

  it('test_custom_include_tag', cb => {
    const original_tag = Dry.Template.tags.get('include');
    Dry.Template.tags.set('include', CustomInclude);
    try {
      assert.equal('custom_foo', Template.parse("{% include 'custom_foo' %}").render_strict());
      cb();
    } catch (err) {
      cb(err);
    } finally {
      Dry.Template.tags.set('include', original_tag);
    }
  });

  it('test_custom_include_tag_within_if_statement', cb => {
    const original_tag = Dry.Template.tags.get('include');
    Dry.Template.tags.set('include', CustomInclude);
    try {
      assert.equal('custom_foo_if_true', Template.parse("{% if true %}{% include 'custom_foo_if_true' %}{% endif %}").render_strict());
      cb();
    } catch (err) {
      cb(err);
    } finally {
      Dry.Template.tags.set('include', original_tag);
    }
  });

  it('test_does_not_add_error_in_strict_mode_for_missing_variable', () => {
    Dry.Template.file_system = new TestFileSystem();

    const a = Dry.Template.parse(' {% include "nested_template" %}');
    a.render_strict();

    assert.equal(a.errors.length, 0);
  });

  it('test_passing_options_to_included_templates', () => {
    assert_raises(Dry.SyntaxError, () => {
      Template.parse('{% include template %}', { error_mode: 'strict' }).render_strict({ 'template': '{{ "X" || downcase }}' });
    });
    with_error_mode('lax', () => {
      assert.equal('x', Template.parse('{% include template %}', { error_mode: 'strict', include_options_blacklist: true }).render_strict({ 'template': '{{ "X" || downcase }}' }));
    });
    assert_raises(Dry.SyntaxError, () => {
      Template.parse('{% include template %}', { error_mode: 'strict', include_options_blacklist: ['locale'] }).render_strict({ 'template': '{{ "X" || downcase }}' });
    });
    with_error_mode('lax', () => {
      assert.equal('x', Template.parse('{% include template %}', { error_mode: 'strict', include_options_blacklist: ['error_mode'] }).render_strict({ 'template': '{{ "X" || downcase }}' }));
    });
  });

  it('test_render_raise_argument_error_when_template_is_undefined', () => {
    assert_raises(Dry.ArgumentError, () => {
      const template = Dry.Template.parse('{% include undefined_variable %}');
      template.render_strict();
    });
    assert_raises(Dry.ArgumentError, () => {
      const template = Dry.Template.parse('{% include null %}');
      template.render_strict();
    });
  });

  it('test_including_via_variable_value', () => {
    assert_template_result('from TestFileSystem', "{% assign page = 'pick_a_source' %}{% include page %}");

    assert_template_result('Product: Draft 151cm ', "{% assign page = 'product' %}{% include page %}", { 'product': { 'title': 'Draft 151cm' } });

    assert_template_result('Product: Draft 151cm ', "{% assign page = 'product' %}{% include page for foo %}", { 'foo': { 'title': 'Draft 151cm' } });
  });

  it('test_including_with_strict_variables', () => {
    const template = Dry.Template.parse("{% include 'simple' %}", { error_mode: 'warn' });
    template.render(null, { strict_variables: true });
    assert.deepEqual([], template.errors);
  });

  it('test_break_through_include', () => {
    assert_template_result('1', '{% for i in (1..3) %}{{ i }}{% break %}{{ i }}{% endfor %}');
    assert_template_result('1', "{% for i in (1..3) %}{{ i }}{% include 'break' %}{{ i }}{% endfor %}");
  });
});

