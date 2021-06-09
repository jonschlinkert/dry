'use strict';

const fill = require('fill-range');
const assert = require('assert').strict;
const Dry = require('../..');
const { Template } = Dry;

const to_set = s => new Set(s.split(' ').sort());

class ContextDrop extends Dry.Drop {
  get scopes() {
    return this.context && this.context.scopes.length;
  }

  get scopes_as_array() {
    return fill('1', this.scopes);
  }

  get loop_pos() {
    return this.context && this.context.forloop.index;
  }

  liquid_method_missing(method) {
    return this.context && this.context[method];
  }
}

class TextDrop extends Dry.Drop {
  get array() {
    return ['text1', 'text2'];
  }

  get text() {
    return 'text1';
  }
}

class CatchallDrop extends Dry.Drop {
  liquid_method_missing(method) {
    return `catchall_method: ${method}`;
  }
}

class ProductDrop extends Dry.Drop {
  // protected
  #callmenot() {
    return 'protected';
  }

  get texts() {
    return new TextDrop();
  }

  get catchall() {
    return new CatchallDrop();
  }

  set context(value) {
    this._context = value;
  }
  get context() {
    return this._context || new ContextDrop();
  }

  static get TextDrop() {
    return TextDrop;
  }

  static get CatchallDrop() {
    return CatchallDrop;
  }
}

class EnumerableDrop extends Dry.Drop {
  liquid_method_missing(method) {
    return method;
  }

  get size() {
    return 3;
  }

  get first() {
    return 1;
  }

  get count() {
    return 3;
  }

  get min() {
    return 1;
  }

  get max() {
    return 3;
  }

  each(block) {
    block(1);
    block(2);
    block(3);
  }
}

class RealEnumerableDrop extends Dry.Drop {
  liquid_method_missing(method) {
    return method;
  }

  each(block) {
    block(1);
    block(2);
    block(3);
  }
}

describe('drop_test', () => {
  it('test_product_drop', () => {
    const tpl = Template.parse('  ');
    assert.equal('  ', tpl.render({ product: new ProductDrop() }));
  });

  it.skip('test_drop_does_only_respond_to_whitelisted_methods', () => {
    assert.equal('', Template.parse('{{ product.inspect }}').render({ product: new ProductDrop() }));
    assert.equal('', Template.parse('{{ product.pretty_inspect }}').render({ product: new ProductDrop() }));
    assert.equal('', Template.parse('{{ product.whatever }}').render({ product: new ProductDrop() }));
    assert.equal('', Template.parse('{{ product | map: "inspect" }}').render({ product: new ProductDrop() }));
    assert.equal('', Template.parse('{{ product | map: "pretty_inspect" }}').render({ product: new ProductDrop() }));
    assert.equal('', Template.parse('{{ product | map: "whatever" }}').render({ product: new ProductDrop() }));
  });

  it('test_drops_respond_to_to_liquid', () => {
    assert.equal('text1', Template.parse('{{ product.to_liquid.texts.text }}').render({ product: new ProductDrop() }));
    assert.equal('text1', Template.parse('{{ product | map: "to_liquid" | map: "texts" | map: "text" }}').render({ product: new ProductDrop() })
    );
  });

  it('test_text_drop', () => {
    const output = Template.parse(' {{ product.texts.text }} ').render({ product: new ProductDrop() });
    assert.equal(' text1 ', output);
  });

  it('test_catchall_unknown_method', () => {
    const output = Template.parse(' {{ product.catchall.unknown }} ').render({ product: new ProductDrop() });
    assert.equal(' catchall_method: unknown ', output);
  });

  it('test_catchall_integer_argument_drop', () => {
    const output = Template.parse(' {{ product.catchall[8] }} ').render({ product: new ProductDrop() });
    assert.equal(' catchall_method: 8 ', output);
  });

  it('test_text_array_drop', () => {
    const output = Template.parse('{% for text in product.texts.array %} {{text}} {% endfor %}').render({ product: new ProductDrop() });
    assert.equal(' text1  text2 ', output);
  });

  it('test_context_drop', () => {
    const output = Template.parse(' {{ context.bar }} ').render({ context: new ContextDrop(), bar: 'carrot' });
    assert.equal(' carrot ', output);
  });

  it('test_context_drop_array_with_map', () => {
    const output = Template.parse(' {{ contexts | map: "bar" }} ').render({ contexts: [new ContextDrop(), new ContextDrop()], bar: 'carrot' });
    assert.equal(' carrotcarrot ', output);
  });

  it('test_nested_context_drop', () => {
    const output = Template.parse(' {{ product.context.foo }} ').render({ product: new ProductDrop(), foo: 'monkey' });
    assert.equal(' monkey ', output);
  });

  it('test_protected', () => {
    const output = Template.parse(' {{ product.callmenot }} ').render({ product: new ProductDrop() });
    assert.equal('  ', output);
  });

  it('test_object_methods_not_allowed', () => {
    ['assign', 'freeze', 'constructor', 'eval', '__proto__', 'prototype', 'inspect'].forEach(method => {
      const output = Template.parse(` {{ product.${method} }} `).render({ product: new ProductDrop() });
      assert.equal('  ', output);
    });
  });

  it('test_scope', () => {
    assert.equal('1', Template.parse('{{ context.scopes }}').render({ context: new ContextDrop() }));
    assert.equal('2', Template.parse('{%for i in dummy%}{{ context.scopes }}{%endfor%}').render({ context: new ContextDrop(), dummy: [1] }));
    assert.equal('3', Template.parse('{%for i in dummy%}{%for i in dummy%}{{ context.scopes }}{%endfor%}{%endfor%}').render({ context: new ContextDrop(), dummy: [1] }));
  });

  it.skip('test_scope_though_proc', () => {
    assert.equal('1', Template.parse('{{ s }}').render({ context: new ContextDrop(), s: c => c.context.scopes }));
    assert.equal('2', Template.parse('{%for i in dummy%}{{ s }}{%endfor%}').render({ context: new ContextDrop(), s: c => c.context.scopes, dummy: [1] }));
    assert.equal('3', Template.parse('{%for i in dummy%}{%for i in dummy%}{{ s }}{%endfor%}{%endfor%}').render({ context: new ContextDrop(), s: c => c.context.scopes, dummy: [1] }));
  });

  it('test_scope_with_assigns', () => {
    assert.equal('variable', Template.parse('{% assign a = "variable"%}{{a}}').render({ context: new ContextDrop() }));
    assert.equal('variable', Template.parse('{% assign a = "variable"%}{%for i in dummy%}{{a}}{%endfor%}').render({ context: new ContextDrop(), dummy: [1] }));
    assert.equal('test', Template.parse('{% assign header_gif = "test"%}{{header_gif}}').render({ context: new ContextDrop() }));
    assert.equal('test', Template.parse("{% assign header_gif = 'test'%}{{header_gif}}").render({ context: new ContextDrop() }));
  });

  it('test_scope_from_tags', () => {
    assert.equal('1', Template.parse('{% for i in context.scopes_as_array %}{{i}}{% endfor %}').render({ context: new ContextDrop(), dummy: [1] }));
    assert.equal('12', Template.parse('{%for a in dummy%}{% for i in context.scopes_as_array %}{{i}}{% endfor %}{% endfor %}').render({ context: new ContextDrop(), dummy: [1] }));
    assert.equal('123', Template.parse('{%for a in dummy%}{%for a in dummy%}{% for i in context.scopes_as_array %}{{i}}{% endfor %}{% endfor %}{% endfor %}').render({ context: new ContextDrop(), dummy: [1] }));
  });

  it('test_access_context_from_drop', () => {
    assert.equal('123', Template.parse('{%for a in dummy%}{{ context.loop_pos }}{% endfor %}').render({ context: new ContextDrop(), dummy: [1, 2, 3] }));
  });

  it('test_enumerable_drop', () => {
    assert.equal('123', Template.parse('{% for c in collection %}{{c}}{% endfor %}').render({ collection: new EnumerableDrop() }));
  });

  it('test_enumerable_drop_size', () => {
    assert.equal('3', Template.parse('{{collection.size}}').render({ collection: new EnumerableDrop() }));
  });

  it.skip('test_enumerable_drop_will_invoke_liquid_method_missing_for_clashing_method_names', () => {
    for (const method of ['select', 'cycle', 'each', 'map']) {
      assert.equal(method, Template.parse(`{{collection.${method}}}`).render({ collection: new EnumerableDrop() }));
      assert.equal(method, Template.parse(`{{collection["${method}"]}}`).render({ collection: new EnumerableDrop() }));
      assert.equal(method, Template.parse(`{{collection.${method}}}`).render({ collection: new RealEnumerableDrop() }));
      assert.equal(method, Template.parse(`{{collection["${method}"]}}`).render({ collection: new RealEnumerableDrop() }));
    }
  });

  it('test_some_enumerable_methods_still_get_invoked', () => {
    // [:count, :max].each do |method|
    //   assert.equal("3", Template.parse("{{collection.${method}}}").render({'collection': new RealEnumerableDrop()})
    //   assert.equal("3", Template.parse("{{collection[\"${method}\"]}}").render({'collection': new RealEnumerableDrop()})
    //   assert.equal("3", Template.parse("{{collection.${method}}}").render({'collection': new EnumerableDrop()})
    //   assert.equal("3", Template.parse("{{collection[\"${method}\"]}}").render({'collection': new EnumerableDrop()})
    // }
    // assert.equal("yes", Template.parse("{% if collection contains 3 %}yes{% endif %}").render({'collection': new RealEnumerableDrop()})
    // [:min, :first].each do |method|
    //   assert.equal("1", Template.parse("{{collection.${method}}}").render({'collection': new RealEnumerableDrop()})
    //   assert.equal("1", Template.parse("{{collection[\"${method}\"]}}").render({'collection': new RealEnumerableDrop()})
    //   assert.equal("1", Template.parse("{{collection.${method}}}").render({'collection': new EnumerableDrop()})
    //   assert.equal("1", Template.parse("{{collection[\"${method}\"]}}").render({'collection': new EnumerableDrop()})
    // }

    // ['count', 'max'].forEach(method => {
    //   assert.equal('3', Template.parse(`{{collection.${method}}}`).render({
    //     collection: new RealEnumerableDrop()
    //   }));

    //   assert.equal('3', Template.parse(`{{collection["${method}"]}}`).render({
    //     collection: new RealEnumerableDrop()
    //   }));

    //   assert.equal('3', Template.parse(`{{collection.${method}}}`).render({
    //     collection: new EnumerableDrop()
    //   }));

    //   assert.equal('3', Template.parse(`{{collection["${method}"]}}`).render({
    //     collection: new EnumerableDrop()
    //   }));
    // });

    // assert.equal('yes', Template.parse('{% if collection contains 3 %}yes{% endif %}').render({ collection: new RealEnumerableDrop() }));

    // const methods = ['min', 'first'];

    // methods.forEach(method => {
    //   assert.equal('1', Template.parse(`{{collection.${method}}}`).render({ collection: new RealEnumerableDrop() }));
    //   assert.equal('1', Template.parse(`{{collection["${method}"]}}`).render({ collection: new RealEnumerableDrop() }));
    //   assert.equal('1', Template.parse(`{{collection.${method}}}`).render({ collection: new EnumerableDrop() }));
    //   assert.equal('1', Template.parse(`{{collection["${method}"]}}`).render({ collection: new EnumerableDrop() }));
    // });

  });

  it('test_empty_string_value_access', () => {
    assert.equal('', Template.parse('{{ product[value] }}').render({ product: new ProductDrop(), value: '' }));
  });

  it('test_nil_value_access', () => {
    assert.equal('', Template.parse('{{ product[value] }}').render({ product: new ProductDrop(), value: null }));
  });

  it('test_default_to_s_on_drops', () => {
    assert.equal('ProductDrop', Template.parse('{{ product }}').render({ product: new ProductDrop() }));
    assert.equal('EnumerableDrop', Template.parse('{{ collection }}').render({ collection: new EnumerableDrop() }));
  });

  it.skip('test_invokable_methods', () => {
    assert.deepEqual(to_set('to_liquid catchall context texts'), ProductDrop.invokable_methods);
    assert.deepEqual(to_set('to_liquid scopes_as_array loop_pos scopes'), ContextDrop.invokable_methods);
    assert.deepEqual(to_set('to_liquid size max min first count'), EnumerableDrop.invokable_methods);
    assert.deepEqual(to_set('to_liquid max min sort count first'), RealEnumerableDrop.invokable_methods);
  });
});
