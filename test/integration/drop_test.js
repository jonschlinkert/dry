
const fill = require('fill-range');
const assert = require('node:assert/strict');
const Dry = require('../..');
const { render_strict } = require('../test_helpers');

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

  texts() {
    return new TextDrop();
  }

  catchall() {
    return new CatchallDrop();
  }

  context() {
    return new ContextDrop();
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

  size() {
    return 3;
  }

  first() {
    return 1;
  }

  count() {
    return 3;
  }

  min() {
    return 1;
  }

  max() {
    return 3;
  }

  each(block = v => v) {
    block(1);
    block(2);
    block(3);
  }
}

class RealEnumerableDrop extends EnumerableDrop {
  liquid_method_missing(method) {
    return method;
  }

  sort() {}

  each(block) {
    block(1);
    block(2);
    block(3);
  }
}

describe('drop_test', () => {
  it('test_product_drop', async () => {
    assert.equal('  ', await render_strict('  ', { product: new ProductDrop() }));
  });

  it('test_drop_does_only_respond_to_whitelisted_methods', async () => {
    assert.equal('', await render_strict('{{ product.inspect }}', { product: new ProductDrop() }));
    assert.equal('', await render_strict('{{ product.pretty_inspect }}', { product: new ProductDrop() }));
    assert.equal('', await render_strict('{{ product.whatever }}', { product: new ProductDrop() }));
    assert.equal('', await render_strict('{{ product | map: "inspect" }}', { product: new ProductDrop() }));
    assert.equal('', await render_strict('{{ product | map: "pretty_inspect" }}', { product: new ProductDrop() }));
    assert.equal('', await render_strict('{{ product | map: "whatever" }}', { product: new ProductDrop() }));
  });

  it('test_drops_respond_to_to_liquid', async () => {
    assert.equal('text1', await render_strict('{{ product.to_liquid.texts.text }}', { product: new ProductDrop() }));
    assert.equal('text1', await render_strict('{{ product | map: "to_liquid" | map: "texts" | map: "text" }}', { product: new ProductDrop() })
    );
  });

  it('test_text_drop', async () => {
    const output = await render_strict(' {{ product.texts.text }} ', { product: new ProductDrop() });
    assert.equal(' text1 ', output);
  });

  it('test_catchall_unknown_method', async () => {
    const output = await render_strict(' {{ product.catchall.unknown }} ', { product: new ProductDrop() });
    assert.equal(' catchall_method: unknown ', output);
  });

  it('test_catchall_integer_argument_drop', async () => {
    const output = await render_strict(' {{ product.catchall[8] }} ', { product: new ProductDrop() });
    assert.equal(' catchall_method: 8 ', output);
  });

  it('test_text_array_drop', async () => {
    const output = await render_strict('{% for text in product.texts.array %} {{text}} {% endfor %}', { product: new ProductDrop() });
    assert.equal(' text1  text2 ', output);
  });

  it('test_context_drop', async () => {
    const output = await render_strict(' {{ context.bar }} ', { context: new ContextDrop(), bar: 'carrot' });
    assert.equal(' carrot ', output);
  });

  it('test_context_drop_array_with_map', async () => {
    const output = await render_strict(' {{ contexts | map: "bar" }} ', { contexts: [new ContextDrop(), new ContextDrop()], bar: 'carrot' });
    assert.equal(' carrotcarrot ', output);
  });

  it('test_nested_context_drop', async () => {
    const output = await render_strict(' {{ product.context.foo }} ', { product: new ProductDrop(), foo: 'monkey' });
    assert.equal(' monkey ', output);
  });

  it('test_protected', async () => {
    const output = await render_strict(' {{ product.callmenot }} ', { product: new ProductDrop() });
    assert.equal('  ', output);
  });

  it('test_object_methods_not_allowed', async () => {
    ['assign', 'freeze', 'constructor', 'eval', '__proto__', 'prototype', 'inspect'].forEach(async method => {
      const output = await render_strict(` {{ product.${method} }} `, { product: new ProductDrop() });
      assert.equal('  ', output);
    });
  });

  it('test_scope', async () => {
    assert.equal('1', await render_strict('{{ context.scopes }}', { context: new ContextDrop() }));
    assert.equal('2', await render_strict('{%for i in dummy%}{{ context.scopes }}{%endfor%}', { context: new ContextDrop(), dummy: [1] }));
    assert.equal('3', await render_strict('{%for i in dummy%}{%for i in dummy%}{{ context.scopes }}{%endfor%}{%endfor%}', { context: new ContextDrop(), dummy: [1] }));
  });

  it('test_scope_though_proc', async () => {
    assert.equal('1', await render_strict('{{ s }}', { context: new ContextDrop(), s: c => c.context.scopes }));
    assert.equal('2', await render_strict('{%for i in dummy%}{{ s }}{%endfor%}', { context: new ContextDrop(), s: c => c.context.scopes, dummy: [1] }));
    assert.equal('3', await render_strict('{%for i in dummy%}{%for i in dummy%}{{ s }}{%endfor%}{%endfor%}', { context: new ContextDrop(), s: c => c.context.scopes, dummy: [1] }));
  });

  it('test_scope_with_assigns', async () => {
    const assigns = { context: new ContextDrop() };
    assert.equal('variable', await render_strict('{% assign a = "variable"%}{{a}}', assigns));
    assert.equal('variable', await render_strict('{% assign a = "variable"%}{%for i in dummy%}{{a}}{%endfor%}', { context: new ContextDrop(), dummy: [1] }));
    assert.equal('test', await render_strict('{% assign header_gif = "test"%}{{header_gif}}', assigns));
    assert.equal('test', await render_strict("{% assign header_gif = 'test'%}{{header_gif}}", assigns));
  });

  it('test_scope_from_tags', async () => {
    const assigns = { context: new ContextDrop(), dummy: [1] };
    assert.equal('1', await render_strict('{% for i in context.scopes_as_array %}{{i}}{% endfor %}', assigns));
    assert.equal('12', await render_strict('{%for a in dummy%}{% for i in context.scopes_as_array %}{{i}}{% endfor %}{% endfor %}', assigns));
    assert.equal('123', await render_strict('{%for a in dummy%}{%for a in dummy%}{% for i in context.scopes_as_array %}{{i}}{% endfor %}{% endfor %}{% endfor %}', assigns));
  });

  it('test_access_context_from_drop', async () => {
    assert.equal('123', await render_strict('{%for a in dummy%}{{ context.loop_pos }}{% endfor %}', { context: new ContextDrop(), dummy: [1, 2, 3] }));
  });

  it('test_enumerable_drop', async () => {
    assert.equal('123', await render_strict('{% for c in collection %}{{c}}{% endfor %}', { collection: new EnumerableDrop() }));
  });

  it('test_enumerable_drop_size', async () => {
    assert.equal('3', await render_strict('{{collection.size}}', { collection: new EnumerableDrop() }));
  });

  it('test_enumerable_drop_will_invoke_liquid_method_missing_for_clashing_method_names', async () => {
    for (const method of ['select', 'each', 'map', 'cycle']) {
      assert.equal(method, await render_strict(`{{collection.${method}}}`, { collection: new EnumerableDrop() }));
      assert.equal(method, await render_strict(`{{collection["${method}"]}}`, { collection: new EnumerableDrop() }));
      assert.equal(method, await render_strict(`{{collection.${method}}}`, { collection: new RealEnumerableDrop() }));
      assert.equal(method, await render_strict(`{{collection["${method}"]}}`, { collection: new RealEnumerableDrop() }));
    }
  });

  it('test_some_enumerable_methods_still_get_invoked', async () => {
    ['count', 'max'].forEach(async method => {
      assert.equal('3', await render_strict(`{{collection.${method}}}`, { 'collection': new RealEnumerableDrop() }));
      assert.equal('3', await render_strict(`{{collection["${method}"]}}`, { 'collection': new RealEnumerableDrop() }));
      assert.equal('3', await render_strict(`{{collection.${method}}}`, { 'collection': new EnumerableDrop() }));
      assert.equal('3', await render_strict(`{{collection["${method}"]}}`, { 'collection': new EnumerableDrop() }));
    });

    assert.equal('yes', await render_strict('{% if collection contains 3 %}yes{% endif %}', { collection: new RealEnumerableDrop() }));

    ['min', 'first'].forEach(async method => {
      assert.equal('1', await render_strict(`{{collection.${method}}}`, { 'collection': new RealEnumerableDrop() }));
      assert.equal('1', await render_strict(`{{collection["${method}"]}}`, { 'collection': new RealEnumerableDrop() }));
      assert.equal('1', await render_strict(`{{collection.${method}}}`, { 'collection': new EnumerableDrop() }));
      assert.equal('1', await render_strict(`{{collection["${method}"]}}`, { 'collection': new EnumerableDrop() }));
    });

    ['count', 'max'].forEach(async method => {
      assert.equal('3', await render_strict(`{{collection.${method}}}`, {
        collection: new RealEnumerableDrop()
      }));

      assert.equal('3', await render_strict(`{{collection["${method}"]}}`, {
        collection: new RealEnumerableDrop()
      }));

      assert.equal('3', await render_strict(`{{collection.${method}}}`, {
        collection: new EnumerableDrop()
      }));

      assert.equal('3', await render_strict(`{{collection["${method}"]}}`, {
        collection: new EnumerableDrop()
      }));
    });

    assert.equal('yes', await render_strict('{% if collection contains 3 %}yes{% endif %}', { collection: new RealEnumerableDrop() }));

    const methods = ['min', 'first'];

    methods.forEach(async method => {
      assert.equal('1', await render_strict(`{{collection.${method}}}`, { collection: new RealEnumerableDrop() }));
      assert.equal('1', await render_strict(`{{collection["${method}"]}}`, { collection: new RealEnumerableDrop() }));
      assert.equal('1', await render_strict(`{{collection.${method}}}`, { collection: new EnumerableDrop() }));
      assert.equal('1', await render_strict(`{{collection["${method}"]}}`, { collection: new EnumerableDrop() }));
    });
  });

  it('test_empty_string_value_access', async () => {
    assert.equal('', await render_strict('{{ product[value] }}', { product: new ProductDrop(), value: '' }));
  });

  it('test_nil_value_access', async () => {
    assert.equal('', await render_strict('{{ product[value] }}', { product: new ProductDrop(), value: null }));
  });

  it('test_default_to_s_on_drops', async () => {
    assert.equal('ProductDrop', await render_strict('{{ product }}', { product: new ProductDrop() }));
    assert.equal('EnumerableDrop', await render_strict('{{ collection }}', { collection: new EnumerableDrop() }));
  });

  it('test_invokable_methods', async () => {
    assert.deepEqual(to_set('to_liquid catchall context texts'), ProductDrop.invokable_methods);
    assert.deepEqual(to_set('to_liquid scopes_as_array loop_pos scopes'), ContextDrop.invokable_methods);
    assert.deepEqual(to_set('to_liquid size max min first count'), EnumerableDrop.invokable_methods);
    assert.deepEqual(to_set('to_liquid sort'), RealEnumerableDrop.invokable_methods);
  });
});
