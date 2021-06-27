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
  async each(block) {
    const array = [{ foo: 1, bar: 2 }, { foo: 2, bar: 1 }, { foo: 3, bar: 3 }];

    for (let index = 0; index < array.length; index++) {
      await block(array[index], index);
    }
  }
}

describe('render_tag_test', () => {
  it('test_render_with_no_arguments', async () => {
    Dry.Template.file_system = new StubFileSystem({ source: 'rendered content' });
    await assert_template_result('rendered content', '{% render "source" %}');
  });

  it('test_render_tag_looks_for_file_system_in_registers_first', async () => {
    const file_system = new StubFileSystem({ pick_a_source: 'from register file system' });
    assert.equal('from register file system',
      await Template.parse('{% render "pick_a_source" %}').render_strict({}, { registers: { file_system } }));
  });

  it('test_render_passes_named_arguments_into_inner_scope', async () => {
    Dry.Template.file_system = new StubFileSystem({ product: '{{ inner_product.title }}' });
    await assert_template_result('My Product', '{% render "product", inner_product: outer_product %}',
      { outer_product: { title: 'My Product' } });
  });

  it('test_render_accepts_literals_as_arguments', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ price }}' });
    await assert_template_result('123', '{% render "snippet", price: 123 %}');
  });

  it('test_render_accepts_multiple_named_arguments', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ one }} {{ two }}' });
    await assert_template_result('1 2', '{% render "snippet", one: 1, two: 2 %}');
  });

  it('test_render_does_not_inherit_parent_scope_variables', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ outer_variable }}' });
    await assert_template_result('', '{% assign outer_variable = "should not be visible" %}{% render "snippet" %}');
  });

  it('test_render_does_not_inherit_variable_with_same_name_as_snippet', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{{ snippet }}' });
    await assert_template_result('', "{% assign snippet = 'should not be visible' %}{% render 'snippet' %}");
  });

  it('test_render_does_not_mutate_parent_scope', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: '{% assign inner = 1 %}' });
    await assert_template_result('', "{% render 'snippet' %}{{ inner }}");
  });

  it('test_nested_render_tag', async () => {
    Dry.Template.file_system = new StubFileSystem({
      one: "one {% render 'two' %}",
      two: 'two'
    });
    await assert_template_result('one two', "{% render 'one' %}");
  });

  it('test_recursively_rendered_template_does_not_produce_endless_loop', async () => {
    Dry.Template.file_system = new StubFileSystem({ loop: '{% render "loop" %}' });

    assert_raises(Dry.StackLevelError, () => {
      Template.parse('{% render "loop" %}').render_strict();
    });
  });

  it('test_sub_contexts_count_towards_the_same_recursion_limit', async () => {
    Dry.Template.file_system = new StubFileSystem({
      loop_render: '{% render "loop_render" %}'
    });
    assert_raises(Dry.StackLevelError, () => {
      Template.parse('{% render "loop_render" %}').render_strict();
    });
  });

  it('test_dynamically_choosen_templates_are_not_allowed', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: 'should not be rendered' });

    await assert_raises(Dry.SyntaxError, () => {
      return Dry.Template.parse("{% assign name = 'snippet' %}{% render name %}");
    });
  });

  it('test_include_tag_caches_second_read_of_same_partial', async () => {
    const file_system = new StubFileSystem({ snippet: 'echo' });
    assert.equal('echoecho',
      await Template.parse('{% render "snippet" %}{% render "snippet" %}')
        .render_strict({}, { registers: { file_system } }));
    assert.equal(1, file_system.file_read_count);
  });

  it('test_render_tag_doesnt_cache_partials_across_renders', async () => {
    const file_system = new StubFileSystem({ snippet: 'my message' });

    assert.equal('my message',
      await Template.parse('{% include "snippet" %}').render_strict({}, { registers: { file_system } }));
    assert.equal(1, file_system.file_read_count);

    assert.equal('my message',
      await Template.parse('{% include "snippet" %}').render_strict({}, { registers: { file_system } }));
    assert.equal(2, file_system.file_read_count);
  });

  it('test_render_tag_within_if_statement', async () => {
    Dry.Template.file_system = new StubFileSystem({ snippet: 'my message' });
    await assert_template_result('my message', '{% if true %}{% render "snippet" %}{% endif %}');
  });

  it('test_break_through_render', async () => {
    Dry.Template.file_system = new StubFileSystem({ break: '{% break %}' });
    await assert_template_result('1', '{% for i in (1..3) %}{{ i }}{% break %}{{ i }}{% endfor %}');
    await assert_template_result('112233', '{% for i in (1..3) %}{{ i }}{% render "break" %}{{ i }}{% endfor %}');
  });

  it('test_increment_is_isolated_between_renders', async () => {
    Dry.Template.file_system = new StubFileSystem({ incr: '{% increment %}' });
    await assert_template_result('010', '{% increment %}{% increment %}{% render "incr" %}');
  });

  it('test_decrement_is_isolated_between_renders', async () => {
    Dry.Template.file_system = new StubFileSystem({ decr: '{% decrement %}' });
    await assert_template_result('-1-2-1', '{% decrement %}{% decrement %}{% render "decr" %}');
  });

  it('test_includes_will_not_render_inside_render_tag', async () => {
    Dry.Template.file_system = new StubFileSystem({
      foo: 'bar',
      test_include: '{% include "foo" %}'
    });

    const exc = await assert_raises(Dry.DisabledError, () => {
      return Dry.Template.parse('{% render "test_include" %}').render_strict();
    });

    assert.equal('Dry error: include usage is not allowed in this context', exc.message);
  });

  it.skip('test_includes_will_not_render_inside_nested_sibling_tags', async () => {
    Dry.Template.file_system = new StubFileSystem({
      foo: 'bar',
      nested_render_with_sibling_include: '{% render "test_include" %}{% include "foo" %}',
      test_include: '{% include "foo" %}'
    });

    const output = await Dry.Template.parse('{% render "nested_render_with_sibling_include" %}').render();
    assert.equal('Dry error: include usage is not allowed in this contextDry error: include usage is not allowed in this context', output);
  });

  it('test_render_tag_with', async () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    await assert_template_result('Product: Draft 151cm ',
      "{% render 'product' with products[0] %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_with_alias', async () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    await assert_template_result('Product: Draft 151cm ',
      "{% render 'product_alias' with products[0] as product %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_for_alias', async () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    await assert_template_result('Product: Draft 151cm Product: Element 155cm ',
      "{% render 'product_alias' for products as product %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_for', async () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} ',
      product_alias: 'Product: {{ product.title }} '
    });

    await assert_template_result('Product: Draft 151cm Product: Element 155cm ',
      "{% render 'product' for products %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_forloop', async () => {
    Dry.Template.file_system = new StubFileSystem({
      product: 'Product: {{ product.title }} {% if forloop.first %}first{% endif %} {% if forloop.last %}last{% endif %} index:{{ forloop.index }} '
    });

    await assert_template_result('Product: Draft 151cm first  index:1 Product: Element 155cm  last index:2 ',
      "{% render 'product' for products %}", { products: [{ title: 'Draft 151cm' }, { title: 'Element 155cm' }] });
  });

  it('test_render_tag_for_drop', async () => {
    Dry.Template.file_system = new StubFileSystem({
      loop: '{{ value.foo }}'
    });

    await assert_template_result('123',
      "{% render 'loop' for loop as value %}", { loop: new TestEnumerable() });
  });

  it('test_render_tag_with_drop', async () => {
    Dry.Template.file_system = new StubFileSystem({
      loop: '{{ value }}'
    });

    await assert_template_result('TestEnumerable',
      "{% render 'loop' with loop as value %}", { loop: new TestEnumerable() });
  });
});

