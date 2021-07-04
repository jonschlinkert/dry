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

const pause = (ms = 1000, v) => new Promise(res => setTimeout(() => res(v), ms));

class CustomClass {
  async bar() {
    return 'baz';
  }
}

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

describe.only('variable_test', () => {
  it('test_simple_async_variable', async () => {
    const template = Template.parse('a {{test}} b');
    assert.equal('a worked b', await template.render({ test: async () => 'worked' }));
    assert.equal('a worked b', await template.render({ test: async () => pause(10, 'worked') }));
    assert.equal('a worked wonderfully b', await template.render({ test: async () => 'worked wonderfully' }));
  });

  it('test_variable_render_async_drop_calls', async () => {
    await assert_template_result('baz', '{{ foo.bar }}', { foo: new CustomClass() });
  });

  it('test_expression_with_whitespace_in_square_brackets', async () => {
    await assert_template_result('result', "{{ a[ 'b' ] }}", { a: { b: async () => 'result' } });
    await assert_template_result('result', "{{ a[ [ 'b' ] ] }}", { b: 'c', a: { c: async () => 'result' } });
  });

  it('test_ignore_unknown', async () => {
    const template = Template.parse('{{ test }}');
    assert.equal('', await template.render());
  });

  it('test_hash_scoping', async () => {
    const template = Template.parse('a {{ a.b.c }} b');
    assert.equal('a worked b', await template.render({ a: { b: { c: async () => 'worked' } } }));
    assert.equal('a worked b', await template.render({ a: { b: { c: async () => pause(10, 'worked') } } }));
  });

  it('test_preset_assigns', async () => {
    const template = Template.parse('{{ test }}');
    template.assigns['test'] = async () => 'worked';
    assert.equal('worked', await template.render());
  });

  it('test_reuse_parsed_template', async () => {
    const template = Template.parse('{{ greeting }} {{ name }}');
    const goodbye = async () => 'Goodbye';
    template.assigns['greeting'] = goodbye;
    assert.equal('Hello ', await template.render({ greeting: async () => 'Hello' }));
    assert.equal('Hello Brian', await template.render({ greeting: async () => 'Hello', name: async () => 'Brian' }));
    assert.equal('Goodbye Brian', await template.render({ name: async () => 'Brian' }));
    assert.deepEqual({ greeting: Promise.resolve('goodbye') }, template.assigns);
  });

  it('test_assigns_not_polluted_from_template', async () => {
    const template = Template.parse('{{ test }}{% assign test = "bar" %}{{ test }}');
    template.assigns['test'] = async () => 'baz';
    assert.equal('bazbar', await template.render());
    assert.equal('bazbar', await template.render());
    assert.equal('foobar', await template.render({ test: async () => 'foo' }));
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

    assigns['test'] = async () => 'Tobi';
    assert.equal('Hello Tobi', await template.render_strict(assigns));
    delete assigns['test'];

    const e = await assert_raises(Error, () => {
      return template.render(assigns);
    });

    assert.equal("Dry error: Unknown variable 'test'", e.message);
  });

  it('test_multiline_variable', async () => {
    assert.equal('worked', await Template.parse('{{\ntest\n}}').render({ test: async () => 'worked' }));
  });

  it('test_render_symbol', async () => {
    await assert_template_result('foo', '{{ foo }}', { foo: async () => Symbol('foo') });
    await assert_template_result('bar', '{{ foo.bar }}', { foo: { bar: async () => Symbol('bar') } });
  });

  it('test_bracket_accessor', async () => {
    await assert_template_result('baz', '{{ foo["bar"] }}', { foo: { bar: async () => 'baz' } });
    await assert_template_result('baz', '{{ foo["bar"].baz }}', { foo: { bar: { baz: async () => 'baz' } } });
  });

  it.only('test_dynamic_find_var', async () => {
    await assert_template_result('bar', '{{ [key] }}', { key: async () => 'foo', foo: async () => 'bar' });
  });

  it('test_raw_value_variable', async () => {
    await assert_template_result('bar', '{{ [key] }}', { key: async () => 'foo', foo: async () => 'bar' });
  });
});
