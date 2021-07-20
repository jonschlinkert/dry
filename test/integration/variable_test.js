'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { Template } = Dry;
const {
  assert_raises,
  assert_template_result,
  IntegerDrop,
  ThingWithToLiquid
} = require('../test_helpers');

class BooleanDrop extends Dry.Drop {
  constructor(value) {
    super();
    this.value = value;
  }

  equals(value) {
    return this.value === value;
  }

  to_liquid_value() {
    return this.value;
  }

  to_s() {
    return this.value ? 'Yay' : 'Nay';
  }

  toString() {
    return this.to_s();
  }
}

describe('variable_test', () => {
  it('test_simple_variable', async () => {
    const template = Template.parse('a {{test}} b');
    assert.equal('a worked b', await template.render({ test: 'worked' }));
    assert.equal('a worked wonderfully b', await template.render({ test: 'worked wonderfully' }));
  });

  it('test_variable_with_extra_curly_braces', async () => {
    assert.equal('a worked}} b', await Template.render('a {{test}}}} b', { test: 'worked' }));
    assert.equal('a worked}}} b', await Template.render('a {{test}}}}} b', { test: 'worked' }));
    assert.equal('a worked}}}}} b', await Template.render('a {{test}}}}}}} b', { test: 'worked' }));
    assert.equal('a {{{{worked}}} b', await Template.render('a {{{{{{test}}}}} b', { test: 'worked' }));
    assert.equal('a worked wonderfully}} b', await Template.render('a {{test}}}} b', { test: 'worked wonderfully' }));
  });

  it('test_variable_render_calls_to_liquid', async () => {
    await assert_template_result('foobar', '{{ foo }}', { foo: new ThingWithToLiquid() });
  });

  it('test_variable_lookup_calls_to_liquid_value', async () => {
    await assert_template_result('1', '{{ foo }}', { foo: new IntegerDrop('1') });
    await assert_template_result('2', '{{ list[foo] }}', { foo: new IntegerDrop('1'), list: [1, 2, 3] });
    await assert_template_result('one', '{{ list[foo] }}', { foo: new IntegerDrop('1'), list: { 1: 'one' } });
    await assert_template_result('Yay', '{{ foo }}', { foo: new BooleanDrop(true) });
    await assert_template_result('YAY', '{{ foo | upcase }}', { foo: new BooleanDrop(true) });
  });

  it('test_if_tag_calls_to_liquid_value', async () => {
    await assert_template_result('one', '{% if foo == 1 %}one{% endif %}', { foo: new IntegerDrop('1') });
    await assert_template_result('true', '{% if foo == true %}true{% endif %}', { foo: new BooleanDrop(true) });
    await assert_template_result('true', '{% if foo %}true{% endif %}', { foo: new BooleanDrop(true) });

    await assert_template_result('', '{% if foo %}true{% endif %}', { foo: new BooleanDrop(false) });
    await assert_template_result('', '{% if foo == true %}True{% endif %}', { foo: new BooleanDrop(false) });
  });

  it('test_unless_tag_calls_to_liquid_value', async () => {
    await assert_template_result('', '{% unless foo %}true{% endunless %}', { foo: new BooleanDrop(true) });
  });

  it('test_case_tag_calls_to_liquid_value', async () => {
    await assert_template_result('One', '{% case foo %}{% when 1 %}One{% endcase %}', { foo: new IntegerDrop('1') });
  });

  it('test_simple_with_whitespaces', async () => {
    const template = Template.parse('  {{ test }}  ');
    assert.equal('  worked  ', await template.render({ test: 'worked' }));
    assert.equal('  worked wonderfully  ', await template.render({ test: 'worked wonderfully' }));
  });

  it('test_expression_with_whitespace_in_square_brackets', async () => {
    await assert_template_result('result', "{{ a[ 'b' ] }}", { a: { b: 'result' } });
    await assert_template_result('result', "{{ a[ [ 'b' ] ] }}", { b: 'c', a: { c: 'result' } });
  });

  it('test_ignore_unknown', async () => {
    const template = Template.parse('{{ test }}');
    assert.equal('', await template.render());
  });

  it('test_using_blank_as_variable_name', async () => {
    const template = Template.parse('{% assign foo = blank %}{{ foo }}');
    assert.equal('', await template.render());
  });

  it('test_using_empty_as_variable_name', async () => {
    const template = Template.parse('{% assign foo = empty %}{{ foo }}');
    assert.equal('', await template.render());
  });

  it('test_hash_scoping', async () => {
    await assert_template_result('worked', '{{ test.test }}', { test: { test: 'worked' } });
    await assert_template_result('worked', '{{ test . test }}', { test: { test: 'worked' } });
  });

  it('test_false_renders_as_false', async () => {
    assert.equal('false', await Template.parse('{{ foo }}').render({ foo: false }));
    assert.equal('false', await Template.parse('{{ false }}').render());
  });

  it('test_nil_renders_as_empty_string', async () => {
    assert.equal('', await Template.parse('{{ null }}').render());
    assert.equal('cat', await Template.parse("{{ null | append: 'cat' }}").render());
  });

  it('test_preset_assigns', async () => {
    const template = Template.parse('{{ test }}');
    template.assigns['test'] = 'worked';
    assert.equal('worked', await template.render());
  });

  it('test_reuse_parsed_template', async () => {
    const template = Template.parse('{{ greeting }} {{ name }}');
    template.assigns['greeting'] = 'Goodbye';
    assert.equal('Hello Tobi', await template.render({ greeting: 'Hello', name: 'Tobi' }));
    assert.equal('Hello ', await template.render({ greeting: 'Hello', unknown: 'Tobi' }));
    assert.equal('Hello Brian', await template.render({ greeting: 'Hello', name: 'Brian' }));
    assert.equal('Goodbye Brian', await template.render({ name: 'Brian' }));
    assert.deepEqual({ greeting: 'Goodbye' }, template.assigns);
  });

  it('test_assigns_not_polluted_from_template', async () => {
    const template = Template.parse('{{ test }}{% assign test = "bar" %}{{ test }}');
    template.assigns['test'] = 'baz';
    assert.equal('bazbar', await template.render());
    assert.equal('bazbar', await template.render());
    assert.equal('foobar', await template.render({ test: 'foo' }));
    assert.equal('bazbar', await template.render());
  });

  it('test_hash_with_default_proc', async () => {
    const template = Template.parse('Hello {{ test }}');
    const parent = new Map();
    const assigns = new Proxy(parent, {
      deleteProperty(target, k) {
        if (k in target) {
          delete target[k];
          return true;
        }
        return parent.delete(k);
      },
      set(target, k, v) {
        target.set(k, v);
        return v;
      },
      get(target, k, value) {
        if (!target.has(k) && !(k in target)) {
          throw new Error(`Unknown variable '${k}'`);
        } else {
          return target[k] || target.get(k);
        }
      }
    });

    assigns['test'] = 'Tobi';
    assert.equal('Hello Tobi', await template.render_strict(assigns));
    delete assigns['test'];

    const e = await assert_raises(Dry.Error, () => {
      return template.render(assigns);
    });

    assert.equal("Dry error: Unknown variable 'test'", e.message);
  });

  it('test_multiline_variable', async () => {
    assert.equal('worked', await Template.parse('{{\ntest\n}}').render({ test: 'worked' }));
  });

  it('test_render_symbol', async () => {
    await assert_template_result('foo', '{{ foo }}', { foo: Symbol('foo') });
    await assert_template_result('bar', '{{ foo.bar }}', { foo: { bar: Symbol('bar') } });
    await assert_template_result('baz', '{{ foo.bar.baz }}', { foo: { bar: { baz: Symbol('baz') } } });
  });

  it('test_bracket_accessor', async () => {
    await assert_template_result('baz', '{{ foo["bar"] }}', { foo: { bar: 'baz' } });
    await assert_template_result('baz', '{{ foo["bar"].baz }}', { foo: { bar: { baz: 'baz' } } });
  });

  it('test_dynamic_find_var', async () => {
    await assert_template_result('bar', '{{ [key] }}', { key: 'foo', foo: 'bar' });
  });

  it('test_raw_value_variable', async () => {
    await assert_template_result('bar', '{{ [key] }}', { key: 'foo', foo: 'bar' });
  });
});
