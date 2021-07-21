'use strict';

const assert = require('assert').strict;
const { with_error_mode, with_global_filter } = require('../test_helpers');
const Dry = require('../..');
const { Context, Drop, ResourceLimits, StaticRegisters, Template } = Dry;
const { today } = Dry.utils;

class HundredCentes {
  to_liquid() {
    return 100;
  }
}

class CentsDrop extends Drop {
  get amount() {
    return new HundredCentes();
  }

  get non_zero_() {
    return true;
  }
}

class ContextSensitiveDrop extends Drop {
  get test() {
    return this.context.get('test');
  }
}

class Category extends Drop {
  constructor(name) {
    super(name);
    this.name = name;
  }

  to_liquid() {
    return new CategoryDrop(this);
  }
}

class CategoryDrop extends Drop {
  constructor(category) {
    super();
    this.category = category;
  }
}

const kCount = Symbol(':count');

class CounterDrop extends Drop {
  constructor(...args) {
    super(...args);
    this[kCount] = 0;
  }

  get count() {
    this[kCount]++;
    return this[kCount];
  }
}

describe('context_test', () => {
  let context;

  beforeEach(() => {
    context = new Context();
  });

  it('test_variables', async () => {
    context['string'] = 'string';
    assert.equal('string', await context['string']);

    context['num'] = 5;
    assert.equal(5, await context['num']);

    context['time'] = Date.parse('2006-06-06 12:00:00');
    assert.equal(Date.parse('2006-06-06 12:00:00'), await context['time']);

    context['date'] = today();
    assert.equal(today(), await context['date']);

    const now = Date.now();
    context['datetime'] = now;
    assert.equal(now, await context['datetime']);

    context['bool'] = true;
    assert.equal(true, await context['bool']);

    context['bool'] = false;
    assert.equal(false, await context['bool']);

    context['null'] = null;
    assert.equal(null, await context['null']);
    assert.equal(null, await context['null']);
  });

  it('test_variables_not_existing', async () => {
    assert.equal(undefined, await context['does_not_exist']);
  });

  it('test_scoping', async () => {
    context.push();
    context.pop();

    assert.throws(() => context.pop(), Dry.ContextError);
    assert.throws(() => {
      context.push();
      context.pop();
      context.pop();
    }, Dry.ContextError);
  });

  it('test_length_query', async () => {
    context['numbers'] = [1, 2, 3, 4];

    assert.equal(4, await context['numbers.size']);

    context['numbers'] = { 1: 1, 2: 2, 3: 3, 4: 4 };

    assert.equal(4, await context['numbers.length']);

    context['numbers'] = { 1: 1, 2: 2, 3: 3, 4: 4, size: 1000 };

    assert.equal(1000, await context['numbers.size']);
  });

  it('test_hyphenated_variable', async () => {
    context['oh-my'] = 'godz';
    assert.equal('godz', await context['oh-my']);
  });

  it('test_add_filter', async () => {
    const filters = {
      hi(output) {
        return output + ' hi!';
      }
    };

    context = new Context();
    context.add_filters(filters);
    assert.equal('hi? hi!', context.invoke('hi', 'hi?'));

    context = new Context();
    assert.equal('hi?', context.invoke('hi', 'hi?'));

    context.add_filters(filters);
    assert.equal('hi? hi!', context.invoke('hi', 'hi?'));
  });

  it('test_only_intended_filters_make_it_there', async () => {
    const filters = {
      hi(output) {
        return output + ' hi!';
      }
    };

    context = new Context();
    assert.equal('Wookie', context.invoke('hi', 'Wookie'));

    context.add_filters(filters);
    assert.equal('Wookie hi!', context.invoke('hi', 'Wookie'));
  });

  it('test_add_item_in_outer_scope', async () => {
    context['test'] = 'test';
    context.push();
    assert.equal('test', await context['test']);
    context.pop();
    assert.equal('test', await context['test']);
  });

  it('test_add_item_in_inner_scope', async () => {
    context.push();
    context.test = 'test';
    assert.equal('test', await context.test);
    context.pop();
    assert.equal(undefined, await context['test']);
  });

  it('test_hierachical_data', async () => {
    context['hash'] = { name: 'tobi' };
    assert.equal('tobi', await context['hash.name']);
    assert.equal('tobi', await context['hash["name"]']);
  });

  it('test_keywords', async () => {
    assert.equal(true, await context['true']);
    assert.equal(false, await context['false']);
  });

  it('test_digits', async () => {
    assert.equal(100, await context['100']);
    assert.equal(100.0, await context['100.00']);
  });

  it('test_strings', async () => {
    assert.equal('hello!', await context['"hello!"']);
    assert.equal('hello!', await context["'hello!'"]);
  });

  it('test_merge', async () => {
    context.merge({ test: 'test' });
    assert.equal('test', await context['test']);
    context.merge({ test: 'newvalue', foo: 'bar' });
    assert.equal('newvalue', await context['test']);
    assert.equal('bar', await context['foo']);
  });

  it('test_array_notation', async () => {
    context['test'] = [1, 2, 3, 4, 5];

    assert.equal(1, await context['test[0]']);
    assert.equal(2, await context['test[1]']);
    assert.equal(3, await context['test[2]']);
    assert.equal(4, await context['test[3]']);
    assert.equal(5, await context['test[4]']);
  });

  it('test_recursive_array_notation', async () => {
    context['test'] = { test: [1, 2, 3, 4, 5] };

    assert.equal(1, await context['test.test[0]']);

    context['test'] = [{ test: 'worked' }];

    assert.equal('worked', await context['test[0].test']);
  });

  it('test_hash_to_array_transition', async () => {
    context['colors'] = {
      Blue: ['003366', '336699', '6699CC', '99CCFF'],
      Green: ['003300', '336633', '669966', '99CC99'],
      Yellow: ['CC9900', 'FFCC00', 'FFFF99', 'FFFFCC'],
      Red: ['660000', '993333', 'CC6666', 'FF9999']
    };

    assert.equal('003366', await context['colors.Blue[0]']);
    assert.equal('FF9999', await context['colors.Red[3]']);
  });

  it('test_try_first', async () => {
    context['test'] = [1, 2, 3, 4, 5];

    assert.equal(1, await context['test.first']);
    assert.equal(5, await context['test.last']);

    context['test'] = { test: [1, 2, 3, 4, 5] };

    assert.equal(1, await context['test.test.first']);
    assert.equal(5, await context['test.test.last']);

    context['test'] = [1];
    assert.equal(1, await context['test.first']);
    assert.equal(1, await context['test.last']);
  });

  it('test_access_hashes_with_hash_notation', async () => {
    context['products'] = { count: 5, tags: ['deepsnow', 'freestyle'] };
    context['product'] = { variants: [{ title: 'draft151cm' }, { title: 'element151cm' }] };

    assert.equal(5, await context['products["count"]']);
    assert.equal('deepsnow', await context['products["tags"][0]']);
    assert.equal('deepsnow', await context['products["tags"].first']);
    assert.equal('draft151cm', await context['product["variants"][0]["title"]']);
    assert.equal('element151cm', await context['product["variants"][1]["title"]']);
    assert.equal('draft151cm', await context['product["variants"][0]["title"]']);
    assert.equal('element151cm', await context['product["variants"].last["title"]']);
  });

  it('test_access_variable_with_hash_notation', async () => {
    context['foo'] = 'baz';
    context['bar'] = 'foo';

    assert.equal('baz', await context['["foo"]']);
    assert.equal('foo', await context['["bar"]']);
    assert.equal('baz', await context['[bar]']);
    assert.equal('baz', await context['[bar]']);
  });

  it('test_access_hashes_with_hash_access_variables', async () => {
    context['var'] = 'tags';
    context['nested'] = { var: 'tags' };
    context['products'] = { count: 5, tags: ['deepsnow', 'freestyle'] };

    assert.equal('deepsnow', await context['products[var].first']);
    assert.equal('freestyle', await context['products[nested.var].last']);
  });

  it('test_hash_notation_only_for_hash_access', async () => {
    context['array'] = [1, 2, 3, 4, 5];
    context['hash'] = { first: 'Hello' };

    assert.equal(1, await context['array.first']);
    assert(await (context['array["first"]']) === undefined);
    assert.equal(1, await context['array.first']);
    assert.equal('Hello', await context['hash["first"]']);
    assert.equal(undefined, await context['array["first"]']);
  });

  it('test_first_can_appear_in_middle_of_callchain', async () => {
    context['product'] = { variants: [{ title: 'draft151cm' }, { title: 'element151cm' }] };

    assert.equal('draft151cm', await context['product.variants[0].title']);
    assert.equal('element151cm', await context['product.variants[1].title']);
    assert.equal('draft151cm', await context['product.variants.first.title']);
    assert.equal('element151cm', await context['product.variants.last.title']);
  });

  it('test_cents', async () => {
    context.merge({ cents: new HundredCentes() });
    assert.equal(100, await context['cents']);
  });

  it('test_nested_cents', async () => {
    context.merge({ cents: { amount: new HundredCentes() } });
    assert.equal(100, await context['cents.amount']);

    context.merge({ cents: { cents: { amount: new HundredCentes() } } });
    assert.equal(100, await context['cents.cents.amount']);
  });

  it('test_cents_through_drop', async () => {
    context.merge({ cents: new CentsDrop() });
    assert.equal(100, await context['cents.amount']);
  });

  it('test_nested_cents_through_drop', async () => {
    context.merge({ vars: { cents: new CentsDrop() } });
    assert.equal(100, await context['vars.cents.amount']);
  });

  it('test_drop_methods_with_question_marks', async () => {
    context.merge({ cents: new CentsDrop() });
    assert(context['cents.non_zero_']);
  });

  it('test_context_from_within_drop', async () => {
    context.merge({ test: '123', vars: new ContextSensitiveDrop() });
    assert.equal('123', await context['vars.test']);
  });

  it('test_nested_context_from_within_drop', async () => {
    context.merge({ test: '123', vars: { local: new ContextSensitiveDrop() } });
    assert.equal('123', await context['vars.local.test']);
  });

  it('test_ranges', async () => {
    context.merge({ test: '5' });
    assert.equal('(1..5)', await context['(1..5)']);
    assert.equal('(1..5)', await context['(1..test)']);
    assert.equal('(5..5)', await context['(test..test)']);
  });

  it('test_cents_through_drop_nestedly', async () => {
    context.merge({ cents: { cents: new CentsDrop() } });
    assert.equal(100, await context['cents.cents.amount']);

    context.merge({ cents: { cents: { cents: new CentsDrop() } } });
    assert.equal(100, await context['cents.cents.cents.amount']);
  });

  it('test_drop_with_accessor_called_only_once', async () => {
    context['counter'] = new CounterDrop();

    assert.equal(1, context.counter.count);
    assert.equal(2, context.counter.count);
    assert.equal(3, context.counter.count);
  });

  it('test_drop_with_variable_called_only_once', async () => {
    context['counter'] = new CounterDrop();

    assert.equal(1, await context['counter.count']);
    assert.equal(2, await context['counter.count']);
    assert.equal(3, await context['counter.count']);
  });

  it('test_drop_with_key_called_only_once', async () => {
    context['counter'] = new CounterDrop();

    assert.equal(1, await context['counter["count"]']);
    assert.equal(2, await context['counter["count"]']);
    assert.equal(3, await context['counter["count"]']);
  });

  it('test_proc_as_variable', async () => {
    context['dynamic'] = 'Hello';

    assert.equal('Hello', await context['dynamic']);
  });

  it('test_lambda_as_variable', async () => {
    context['dynamic'] = () => { return 'Hello'; };
    assert.equal('Hello', await context['dynamic']);
  });

  it('test_nested_lambda_as_variable', async () => {
    context['dynamic'] = { lambda: () => { return 'Hello'; } };
    assert.equal('Hello', await context['dynamic.lambda']);
  });

  it('test_array_containing_lambda_as_variable', async () => {
    context['dynamic'] = [1, 2, async () => { return 'Hello'; }, 4, 5];
    assert.equal('Hello', await context['dynamic[2]']);
  });

  it('test_lambda_is_called_once', async () => {
    let count = 0;

    context['callcount'] = function() {
      count++;
      return String(count);
    };

    assert.equal('1', await context['callcount']);
    assert.equal('1', await context['callcount']);
    assert.equal('1', await context['callcount']);
  });

  it('test_nested_lambda_is_called_once', async () => {
    let count = 0;

    context['callcount'] = {
      lambda: function() {
        count++;
        return String(count);
      }
    };

    assert.equal('1', await context['callcount.lambda']);
    assert.equal('1', await context['callcount.lambda']);
    assert.equal('1', await context['callcount.lambda']);
  });

  it('test_lambda_in_array_is_called_once', async () => {
    let count = 0;

    context['callcount'] = [0, 1,
      function() {
        count++;
        return String(count);
      }, 4, 5];

    assert.equal('1', await context['callcount[2]']);
    assert.equal('1', await context['callcount[2]']);
    assert.equal('1', await context['callcount[2]']);
  });

  it('test_access_to_context_from_proc', async () => {
    context.registers['magic'] = 345392;

    context['magic'] = () => { return context.registers['magic']; };

    assert.equal(345392, await context['magic']);
  });

  it('test_to_liquid_and_context_at_first_level', async () => {
    context['category'] = new Category('foobar');
    assert((await context.category) instanceof CategoryDrop, 'expected an instance of CategoryDrop');
    assert.deepEqual({ ...context }, { ...(await context['category'].context) });
  });

  it('test_context_initialization_with_a_function_in_environment', async () => {
    context = new Context({ environments: [ { test: c => c.poutine } ], outer_scope: { test: 'foo' } });
    assert(context);
    assert(await (context['poutine']) == null);
  });

  it('test_apply_global_filter', async () => {
    const global_filter_proc = output => `${output} filtered`;

    context = new Context();
    context.global_filter = global_filter_proc;

    assert.equal('hi filtered', context.apply_global_filter('hi'));
  });

  it('test_static_environments_are_read_with_lower_priority_than_environments', async () => {
    context = new Context({
      static_environments: { shadowed: 'static', unshadowed: 'static' },
      environments: { shadowed: 'dynamic' }
    });

    assert.equal('dynamic', await context['shadowed']);
    assert.equal('static', await context['unshadowed']);
  });

  it('test_apply_global_filter_when_no_global_filter_exist', async () => {
    context = new Context();
    assert.equal('hi', context.apply_global_filter('hi'));
  });

  it('test_new_isolated_subcontext_does_not_inherit_variables', async () => {
    const super_context = new Context();
    super_context['my_variable'] = 'some value';
    const subcontext = super_context.new_isolated_subcontext();

    assert.equal(undefined, await subcontext['my_variable']);
  });

  it('test_new_isolated_subcontext_inherits_static_environment', async () => {
    const super_context = new Context({ static_environments: { my_environment_value: 'my value' } });
    const subcontext = super_context.new_isolated_subcontext();
    assert.equal('my value', await subcontext['my_environment_value']);
  });

  it('test_new_isolated_subcontext_inherits_resource_limits', async () => {
    const resource_limits = new ResourceLimits({});
    const super_context = new Context({
      environments: {},
      outer_scope: {},
      registers: {},
      rethrow_errors: false,
      resource_limits
    });

    const subcontext = super_context.new_isolated_subcontext();
    assert.deepEqual(resource_limits, subcontext.resource_limits);
  });

  it('test_new_isolated_subcontext_inherits_exception_renderer', async () => {
    const super_context = new Context();
    super_context.exception_renderer = _e => 'my exception message';
    const subcontext = super_context.new_isolated_subcontext();
    assert.equal('my exception message', subcontext.handle_error(new Dry.Error()));
  });

  it('test_new_isolated_subcontext_does_not_inherit_non_static_registers', async () => {
    const registers = { my_register: 'my_value' };
    const super_context = new Context({ registers: new StaticRegisters(registers) });
    super_context.registers['my_register'] = 'my_alt_value';
    const subcontext = super_context.new_isolated_subcontext();
    assert.equal('my_value', await subcontext.registers['my_register']);
  });

  it('test_new_isolated_subcontext_inherits_static_registers', async () => {
    const super_context = new Context({ registers: { my_register: 'my_value' } });
    const subcontext = super_context.new_isolated_subcontext();
    assert.equal('my_value', await subcontext.registers['my_register']);
  });

  it('test_new_isolated_subcontext_registers_do_not_pollute_context', async () => {
    const super_context = new Context({ registers: { my_register: 'my_value' } });
    assert.equal('my_value', super_context.registers['my_register']);

    const subcontext = super_context.new_isolated_subcontext();
    subcontext.registers['my_register'] = 'my_alt_value';
    assert.equal('my_value', super_context.registers['my_register']);
  });

  it('test_new_isolated_subcontext_inherits_filters', async () => {
    const my_filters = {
      my_filter() {
        return 'my filter result';
      }
    };

    const super_context = new Context();
    super_context.add_filters([my_filters]);
    const subcontext = super_context.new_isolated_subcontext();
    const template = Template.parse('{{ 123 | my_filter }}');
    assert.equal('my filter result', await template.render(subcontext));
  });

  it('test_disables_tag_specified', async () => {
    context = new Context();
    context.with_disabled_tags(['foo', 'bar'], async () => {
      assert.equal(true, context.tag_disabled('foo'));
      assert.equal(true, context.tag_disabled('bar'));
      assert.equal(false, context.tag_disabled('unknown'));
    });
  });

  it('test_disables_nested_tags', async () => {
    context = new Context();
    context.with_disabled_tags(['foo'], async () => {
      context.with_disabled_tags(['foo'], async () => {
        assert.equal(true, context.tag_disabled('foo'));
        assert.equal(false, context.tag_disabled('bar'));
      });

      context.with_disabled_tags(['bar'], async () => {
        assert.equal(true, context.tag_disabled('foo'));
        assert.equal(true, context.tag_disabled('bar'));

        context.with_disabled_tags(['foo'], async () => {
          assert.equal(true, context.tag_disabled('foo'));
          assert.equal(true, context.tag_disabled('bar'));
        });
      });

      assert.equal(true, context.tag_disabled('foo'));
      assert.equal(false, context.tag_disabled('bar'));
    });
  });

  it('test_override_global_filter', async () => {
    const globals = {
      notice(output) {
        return `Global ${output}`;
      }
    };

    const locals = {
      notice(output) {
        return `Local ${output}`;
      }
    };

    with_global_filter(globals, async () => {
      assert.equal('Global test', Template.parse("{{'test' | notice }}").render_strict());
      assert.equal('Local test', Template.parse("{{'test' | notice }}").render_strict({}, {
        filters: [locals]
      }));
    });
  });

  it('test_has_key_will_not_add_an_error_for_missing_keys', async () => {
    with_error_mode('strict', async () => {
      context = new Context();
      context.has('unknown');
      assert.equal(context.errors.length, 0);
    });
  });
});
