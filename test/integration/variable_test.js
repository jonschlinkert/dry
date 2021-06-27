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
  it('test_simple_variable', () => {
    const template = Template.parse('a {{test}} b');
    assert.equal('a worked b', template.render({ test: 'worked' }));
    assert.equal('a worked wonderfully b', template.render({ test: 'worked wonderfully' }));
  });

  it('test_variable_render_calls_to_liquid', () => {
    assert_template_result('foobar', '{{ foo }}', { foo: new ThingWithToLiquid() });
  });

  it('test_variable_lookup_calls_to_liquid_value', () => {
    assert_template_result('1', '{{ foo }}', { foo: new IntegerDrop('1') });
    assert_template_result('2', '{{ list[foo] }}', { foo: new IntegerDrop('1'), list: [1, 2, 3] });
    assert_template_result('one', '{{ list[foo] }}', { foo: new IntegerDrop('1'), list: { 1: 'one' } });
    assert_template_result('Yay', '{{ foo }}', { foo: new BooleanDrop(true) });
    assert_template_result('YAY', '{{ foo | upcase }}', { foo: new BooleanDrop(true) });
  });

  it('test_if_tag_calls_to_liquid_value', () => {
    assert_template_result('one', '{% if foo == 1 %}one{% endif %}', { foo: new IntegerDrop('1') });
    assert_template_result('true', '{% if foo == true %}true{% endif %}', { foo: new BooleanDrop(true) });
    assert_template_result('true', '{% if foo %}true{% endif %}', { foo: new BooleanDrop(true) });

    assert_template_result('', '{% if foo %}true{% endif %}', { foo: new BooleanDrop(false) });
    assert_template_result('', '{% if foo == true %}True{% endif %}', { foo: new BooleanDrop(false) });
  });

  it('test_unless_tag_calls_to_liquid_value', () => {
    assert_template_result('', '{% unless foo %}true{% endunless %}', { foo: new BooleanDrop(true) });
  });

  it('test_case_tag_calls_to_liquid_value', () => {
    assert_template_result('One', '{% case foo %}{% when 1 %}One{% endcase %}', { foo: new IntegerDrop('1') });
  });

  it('test_simple_with_whitespaces', () => {
    const template = Template.parse('  {{ test }}  ');
    assert.equal('  worked  ', template.render({ test: 'worked' }));
    assert.equal('  worked wonderfully  ', template.render({ test: 'worked wonderfully' }));
  });

  it('test_expression_with_whitespace_in_square_brackets', () => {
    assert_template_result('result', "{{ a[ 'b' ] }}", { a: { b: 'result' } });
    assert_template_result('result', "{{ a[ [ 'b' ] ] }}", { b: 'c', a: { c: 'result' } });
  });

  it('test_ignore_unknown', () => {
    const template = Template.parse('{{ test }}');
    assert.equal('', template.render());
  });

  it('test_using_blank_as_variable_name', () => {
    const template = Template.parse('{% assign foo = blank %}{{ foo }}');
    assert.equal('', template.render());
  });

  it('test_using_empty_as_variable_name', () => {
    const template = Template.parse('{% assign foo = empty %}{{ foo }}');
    assert.equal('', template.render());
  });

  it('test_hash_scoping', () => {
    assert_template_result('worked', '{{ test.test }}', { test: { test: 'worked' } });
    assert_template_result('worked', '{{ test . test }}', { test: { test: 'worked' } });
  });

  it('test_false_renders_as_false', () => {
    assert.equal('false', Template.parse('{{ foo }}').render({ foo: false }));
    assert.equal('false', Template.parse('{{ false }}').render());
  });

  it('test_nil_renders_as_empty_string', () => {
    assert.equal('', Template.parse('{{ null }}').render());
    assert.equal('cat', Template.parse("{{ null | append: 'cat' }}").render());
  });

  it('test_preset_assigns', () => {
    const template = Template.parse('{{ test }}');
    template.assigns['test'] = 'worked';
    assert.equal('worked', template.render());
  });

  it('test_reuse_parsed_template', () => {
    const template = Template.parse('{{ greeting }} {{ name }}');
    template.assigns['greeting'] = 'Goodbye';
    assert.equal('Hello Tobi', template.render({ greeting: 'Hello', name: 'Tobi' }));
    assert.equal('Hello ', template.render({ greeting: 'Hello', unknown: 'Tobi' }));
    assert.equal('Hello Brian', template.render({ greeting: 'Hello', name: 'Brian' }));
    assert.equal('Goodbye Brian', template.render({ name: 'Brian' }));
    assert.deepEqual({ greeting: 'Goodbye' }, template.assigns);
  });

  it('test_assigns_not_polluted_from_template', () => {
    const template = Template.parse('{{ test }}{% assign test = "bar" %}{{ test }}');
    template.assigns['test'] = 'baz';
    assert.equal('bazbar', template.render());
    assert.equal('bazbar', template.render());
    assert.equal('foobar', template.render({ test: 'foo' }));
    assert.equal('bazbar', template.render());
  });

  it('test_hash_with_default_proc', () => {
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
    assert.equal('Hello Tobi', template.render_strict(assigns));
    delete assigns['test'];

    const e = assert_raises(Error, () => {
      template.render(assigns);
    });

    assert.equal("Dry error: Unknown variable 'test'", e.message);
  });

  it('test_multiline_variable', () => {
    assert.equal('worked', Template.parse('{{\ntest\n}}').render({ test: 'worked' }));
  });

  it('test_render_symbol', () => {
    assert_template_result('bar', '{{ foo }}', { foo: Symbol('bar') });
  });

  it('test_dynamic_find_var', () => {
    assert_template_result('bar', '{{ [key] }}', { key: 'foo', foo: 'bar' });
  });

  it('test_raw_value_variable', () => {
    assert_template_result('bar', '{{ [key] }}', { key: 'foo', foo: 'bar' });
  });
});
