'use strict';

const assert = require('assert').strict;
const Dry = require('../../..');
const { Template } = Dry;
const {
  assert_raises,
  assert_template_result,
  StubFileSystem
} = require('../../test_helpers');

class TestEnumerable extends Dry.Drop {
  each(block) {
    return [{ foo: 1, bar: 2 }, { foo: 2, bar: 1 }, { foo: 3, bar: 3 }].map(block);
  }
}

describe('render_tag_test', () => {
  it('test_render_with_no_arguments', () => {
    Dry.Template.file_system = new StubFileSystem({ source: 'rendered content' });
    assert_template_result('rendered content', '{% render "source" %}');
  });

  it('test_render_tag_looks_for_file_system_in_registers_first', () => {
    const file_system = new StubFileSystem({ pick_a_source: 'from register file system' });
    assert.equal('from register file system',
      Template.parse('{% render "pick_a_source" %}').render_strict({}, { registers: { file_system: file_system } }));
  });

  it('test_render_passes_named_arguments_into_inner_scope', () => {
    Dry.Template.file_system = new StubFileSystem({ product: '{{ inner_product.title }}' });
    assert_template_result('My Product', '{% render "product", inner_product: outer_product %}',
      { outer_product: { title: 'My Product' } });
  });

  it('test_render_accepts_literals_as_arguments', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ price }}' });
    assert_template_result('123', '{% render "snippet", price: 123 %}');
  });

  it('test_render_accepts_multiple_named_arguments', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ one }} {{ two }}' });
    assert_template_result('1 2', '{% render "snippet", one: 1, two: 2 %}');
  });

  it('test_render_does_not_inherit_parent_scope_variables', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ outer_variable }}' });
    assert_template_result('', '{% assign outer_variable = "should not be visible" %}{% render "snippet" %}');
  });

  it('test_render_does_not_inherit_variable_with_same_name_as_snippet', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ snippet }}' });
    assert_template_result('', "{% assign snippet = 'should not be visible' %}{% render 'snippet' %}");
  });

  it('test_render_does_not_mutate_parent_scope', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{% assign inner = 1 %}' });
    assert_template_result('', "{% render 'snippet' %}{{ inner }}");
  });

  it('test_nested_render_tag', () => {
    Dry.Template.file_system = new StubFileSystem({
      one: "one {% render 'two' %}",
      two: 'two'
    });
    assert_template_result('one two', "{% render 'one' %}");
  });

  it('test_recursively_rendered_template_does_not_produce_endless_loop', () => {
    Dry.Template.file_system = new StubFileSystem({ loop: '{% render "loop" %}' });

    assert_raises(Dry.StackLevelError, () => {
      Template.parse('{% render "loop" %}').render_strict();
    });
  });

  it('test_sub_contexts_count_towards_the_same_recursion_limit', () => {
    Dry.Template.file_system = new StubFileSystem({
      loop_render: '{% render "loop_render" %}'
    });
    assert_raises(Dry.StackLevelError, () => {
      Template.parse('{% render "loop_render" %}').render_strict();
    });
  });

  it('test_dynamically_choosen_templates_are_not_allowed', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: 'should not be rendered' });

    assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse("{% assign name = 'snippet' %}{% render name %}");
    });
  });

  it('test_include_tag_caches_second_read_of_same_partial', () => {
    const file_system = new StubFileSystem({ snippet: 'echo' });
    assert.equal('echoecho',
      Template.parse('{% render "snippet" %}{% render "snippet" %}')
        .render_strict({}, { registers: { file_system: file_system } }));
    assert.equal(1, file_system.file_read_count);
  });

  it('test_render_tag_doesnt_cache_partials_across_renders', () => {
    const file_system = new StubFileSystem({ snippet: 'my message' });

    assert.equal('my message',
      Template.parse('{% include "snippet" %}').render_strict({}, { registers: { file_system: file_system } }));
    assert.equal(1, file_system.file_read_count);

    assert.equal('my message',
      Template.parse('{% include "snippet" %}').render_strict({}, { registers: { file_system: file_system } }));
    assert.equal(2, file_system.file_read_count);
  });

  it('test_render_tag_within_if_statement', () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: 'my message' });
    assert_template_result('my message', '{% if true %}{% render "snippet" %}{% endif %}');
  });

  it('test_break_through_render', () => {
    Dry.Template.file_system = new StubFileSystem({ break: '{% break %}' });
    assert_template_result('1', '{% for i in (1..3) %}{{ i }}{% break %}{{ i }}{% endfor %}');
    assert_template_result('112233', '{% for i in (1..3) %}{{ i }}{% render "break" %}{{ i }}{% endfor %}');
  });

  it('test_increment_is_isolated_between_renders', () => {
    Dry.Template.file_system = new StubFileSystem({ incr: '{% increment %}' });
    assert_template_result('010', '{% increment %}{% increment %}{% render "incr" %}');
  });

  it('test_decrement_is_isolated_between_renders', () => {
    Dry.Template.file_system = new StubFileSystem({ decr: '{% decrement %}' });
    assert_template_result('-1-2-1', '{% decrement %}{% decrement %}{% render "decr" %}');
  });

  it('test_includes_will_not_render_inside_render_tag', () => {
    Dry.Template.file_system = new StubFileSystem({
      foo: 'bar',
      test_include: '{% include "foo" %}'
    });

    const exc = assert_raises(Dry.DisabledError, () => {
      Dry.Template.parse('{% render "test_include" %}').render_strict();
    });

    assert.equal('Dry error: include usage is not allowed in this context', exc.message);
  });

  it.skip('test_includes_will_not_render_inside_nested_sibling_tags', () => {
    Dry.Template.file_system = new StubFileSystem({
      foo: 'bar',
      nested_render_with_sibling_include: '{% render "test_include" %}{% include "foo" %}',
      test_include: '{% include "foo" %}'
    });

    const output = Dry.Template.parse('{% render "nested_render_with_sibling_include" %}').render();
    assert.equal('Dry error: include usage is not allowed in this contextDry error: include usage is not allowed in this context', output);
  });

  it('test_render_tag_with', () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    assert_template_result('Product: Draft 151cm ',
      "{% render 'product' with products[0] %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_with_alias', () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    assert_template_result('Product: Draft 151cm ',
      "{% render 'product_alias' with products[0] as product %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_for_alias', () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    assert_template_result('Product: Draft 151cm Product: Element 155cm ',
      "{% render 'product_alias' for products as product %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_for', () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    assert_template_result('Product: Draft 151cm Product: Element 155cm ',
      "{% render 'product' for products %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_forloop', () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} {% if forloop.first %}first{% endif %} {% if forloop.last %}last{% endif %} index:{{ forloop.index }} '
    });

    assert_template_result('Product: Draft 151cm first  index:1 Product: Element 155cm  last index:2 ',
      "{% render 'product' for products %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_for_drop', () => {
    Dry.Template.file_system = new StubFileSystem({
      loop: '{{ value.foo }}'
    });

    assert_template_result('123',
      "{% render 'loop' for loop as value %}", { loop: new TestEnumerable() });
  });

  it('test_render_tag_with_drop', () => {
    Dry.Template.file_system = new StubFileSystem({
      loop: '{{ value }}'
    });

    assert_template_result('TestEnumerable',
      "{% render 'loop' with loop as value %}", { loop: new TestEnumerable() });
  });
});

