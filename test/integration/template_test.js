'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { Template } = Dry;

const times = (n = 0, fn) => {
  for (let i = 0; i < n; i++) fn();
};

class TemplateContextDrop extends Dry.Drop {
  liquid_method_missing(method) {
    return method;
  }

  get foo() {
    return 'fizzbuzz';
  }
  get baz() {
    return this.context && this.context.registers['lulz'];
  }
}

class SomethingWithLength extends Dry.Drop {
  get length() {
    return null;
  }
}

class ErroneousDrop extends Dry.Drop {
  bad_method() {
    throw new Error('error in drop');
  }
}

class DropWithUndefinedMethod extends Dry.Drop {
  foo() {
    return 'foo';
  }
}

describe('template tests', () => {
  let mode, t;

  before(() => {
    mode = Template.error_mode;
  });

  afterEach(() => {
    Template.error_mode = mode;
  });

  it('test_instance_assigns_persist_on_same_template_object_between_parses', async () => {
    t = new Template();

    const expected = 'from instance assigns';
    assert.equal(expected, await t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
    assert.equal(expected, await t.parse('{{ foo }}').render());
  });

  it('test_warnings_is_not_exponential_time', async function() {
    this.timeout(50);
    let str = 'false';

    times(100, () => {
      str = `{% if true %}true{% else %}${str}{% endif %}`;
    });

    t = Template.parse(str);
    assert.equal(t.warnings.length, 0);
  });

  it('test_should_throw_an_error_when_nested_more_than_100_times', async function() {
    this.timeout(50);
    let str = 'false';

    times(101, () => {
      str = `{% if true %}true{% else %}${str}{% endif %}`;
    });

    assert.rejects(() => Template.parse(str), /Nesting too deep/);
  });

  it('test_instance_assigns_persist_on_same_template_parsing_between_renders', async () => {
    t = new Template().parse("{{ foo }}{% assign foo = 'foo' %}{{ foo }}");
    assert.equal('foo', await t.render());
    assert.equal('foofoo', await t.render());
  });

  it('test_custom_assigns_do_not_persist_on_same_template', async () => {
    t = new Template();
    assert.equal('from custom assigns', await t.parse('{{ foo }}').render({ foo: 'from custom assigns' }));
    assert.equal('', await t.parse('{{ foo }}').render());
  });

  it('test_custom_assigns_squash_instance_assigns', async () => {
    t = new Template();
    assert.equal('from instance assigns', await t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
    assert.equal('from custom assigns', await t.parse('{{ foo }}').render({ foo: 'from custom assigns' }));
  });

  it('test_persistent_assigns_squash_instance_assigns', async () => {
    t = new Template();
    assert.equal('from instance assigns', await t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
    t.assigns['foo'] = 'from persistent assigns';
    assert.equal('from persistent assigns', await t.parse('{{ foo }}').render());
  });

  it('test_lambda_is_called_once_from_persistent_assigns_over_multiple_parses_and_renders', async () => {
    t = new Template();

    let count = 0;
    t.assigns.number = () => {
      count++;
      return count;
    };

    assert.equal('1', await t.parse('{{number}}').render());
    assert.equal('1', await t.parse('{{number}}').render());
    assert.equal('1', await t.render());
    assert.equal('1', await t.render());
  });

  it('test_lambda_is_called_once_from_custom_assigns_over_multiple_parses_and_renders', async () => {
    t = new Template();
    let count = 0;

    const assigns = {
      number() {
        count++;
        return count;
      }
    };

    assert.equal('1', await t.parse('{{number}}').render(assigns));
    assert.equal('1', await t.parse('{{number}}').render(assigns));
    assert.equal('1', await t.render(assigns));
  });

  it('test_resource_limits_works_with_custom_length_method', async () => {
    t = Template.parse('{% assign foo = bar %}');
    t.resource_limits.render_length_limit = 42;
    assert.equal('', await t.render({ bar: new SomethingWithLength() }));
  });

  it('test_resource_limits_render_length', async () => {
    t = Template.parse('0123456789');

    t.resource_limits.render_length_limit = 9;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.render_length_limit = 10;
    assert.equal(await t.render(), '0123456789');
  });

  it.skip('test_resource_limits_render_score', async () => {
    t = Template.parse('{% for a in (1..10) %} {% for a in (1..10) %} foo {% endfor %} {% endfor %}');

    t.resource_limits.render_score_limit = 50;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t = Template.parse('{% for a in (1..100) %} foo {% endfor %}');
    t.resource_limits.render_score_limit = 50;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.render_score_limit = 200;
    assert.equal(' foo '.repeat(100), await t.render_strict());

    assert(t.resource_limits.render_score);
  });

  it.skip('test_resource_limits_assign_score', async () => {
    t = Template.parse('{% assign foo = 42 %}{% assign bar = 23 %}');
    t.resource_limits.assign_score_limit = 1;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.assign_score_limit = 2;
    assert.equal('', await t.render());
    assert(t.resource_limits.assign_score);
  });

  it('test_resource_limits_assign_score_counts_bytes_not_characters', async () => {
    t = Template.parse("{% assign foo = 'すごい' %}");
    await t.render();

    assert.equal(9, t.resource_limits.assign_score);

    t = Template.parse('{% capture foo %}すごい{% endcapture %}');
    await t.render();

    assert.equal(9, t.resource_limits.assign_score);
  });

  it.skip('test_resource_limits_assign_score_nested', async () => {
    t = Template.parse("{% assign foo = 'aaaa' | reverse %}");

    t.resource_limits.assign_score_limit = 3;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.assign_score_limit = 5;
    assert.equal('', await t.render());
  });

  it.skip('test_resource_limits_aborts_rendering_after_first_error', async () => {
    t = Template.parse('{% for a in (1..100) %} foo1 {% endfor %} bar {% for a in (1..100) %} foo2 {% endfor %}');
    t.resource_limits.render_score_limit = 50;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    assert(t.resource_limits.reached);
  });

  it('test_resource_limits_hash_in_template_gets_updated_even_if_no_limits_are_set', async () => {
    t = Template.parse('{% for a in (1..100) %}x{% assign foo = 1 %} {% endfor %}');
    await t.render_strict();
    assert(t.resource_limits.assign_score > 0);
    assert(t.resource_limits.render_score > 0);
  });

  it('test_render_length_persists_between_blocks', async () => {
    t = Template.parse('{% if true %}aaaa{% endif %}');
    t.resource_limits.render_length_limit = 3;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    t.resource_limits.render_length_limit = 4;
    assert.equal('aaaa', await t.render());

    t = Template.parse('{% if true %}aaaa{% endif %}{% if true %}bbb{% endif %}');
    t.resource_limits.render_length_limit = 6;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    t.resource_limits.render_length_limit = 7;
    assert.equal('aaaabbb', await t.render());

    t = Template.parse('{% if true %}a{% endif %}{% if true %}b{% endif %}{% if true %}a{% endif %}{% if true %}b{% endif %}{% if true %}a{% endif %}{% if true %}b{% endif %}');
    t.resource_limits.render_length_limit = 5;
    assert.equal('Dry error: Memory limits exceeded', await t.render());
    t.resource_limits.render_length_limit = 6;
    assert.equal('ababab', await t.render());
  });

  it('test_render_length_uses_number_of_bytes_not_characters', async () => {
    t = Template.parse('{% if true %}すごい{% endif %}');
    t.resource_limits.render_length_limit = 8;

    assert.equal('Dry error: Memory limits exceeded', await t.render());
    t.resource_limits.render_length_limit = 9;
    assert.equal('すごい', await t.render());
  });

  it('test_default_resource_limits_unaffected_by_render_with_context', async () => {
    const context = new Dry.Context();
    t = Template.parse('{% for a in (1..100) %}x{% assign foo = 1 %} {% endfor %}');
    await t.render(context);
    assert(context.resource_limits.assign_score > 0);
    assert(context.resource_limits.render_score > 0);
  });

  it('test_can_use_drop_as_context', async () => {
    t = new Template();
    t.registers['lulz'] = 'haha';
    const drop = new TemplateContextDrop();
    assert.equal('fizzbuzz', await t.parse('{{foo}}').render(drop));
    assert.equal('bar', await t.parse('{{bar}}').render(drop));
    assert.equal('haha', await t.parse('{{baz}}').render(drop));
  });

  it('test_render_bang_force_rethrow_errors_on_passed_context', async () => {
    const context = new Dry.Context({ environments: { drop: new ErroneousDrop() } });
    t = Template.parse('{{ drop.bad_method }}');
    await assert.rejects(() => t.render_strict(context), Dry.RuntimeError);
    await assert.rejects(() => t.render_strict(context), /error in drop/);
  });

  it('test_exception_renderer_that_returns_string', async () => {
    let exception = null;
    const exception_renderer = e => {
      exception = e;
      return '<!-- error -->';
    };

    const output = await Template.parse('{{ 1 | divided_by: 0 }}').render({}, { exception_renderer });
    assert(exception instanceof Dry.ZeroDivisionError);
    assert.equal('<!-- error -->', output);
  });

  it('test_exception_renderer_that_raises', async () => {
    let exception = null;

    const options = {
      strict_variables: true,
      exception_renderer: e => {
        exception = e;
        throw e;
      }
    };

    await assert.rejects(() => {
      return Template.parse('{{ 1 | divided_by: 0 }}').render({}, options);
    }, Dry.ZeroDivisionError);

    assert(exception instanceof Dry.ZeroDivisionError);
  });

  it('test_global_filter_option_on_render', async () => {
    const global_filter_proc = output => `${output} filtered`;

    const rendered_template = await Template.parse('{{name}}').render({ name: 'bob' }, { global_filter: global_filter_proc });

    assert.equal('bob filtered', rendered_template);
  });

  it('test_global_filter_option_when_native_filters_exist', async () => {
    const global_filter_proc = output => `${output} filtered`;

    const rendered_template = await Template.parse('{{name | upcase}}').render({ name: 'bob' }, { global_filter: global_filter_proc });

    assert.equal('BOB filtered', rendered_template);
  });

  it('test_undefined_variables', async () => {
    t = Template.parse('{{x}} {{y}} {{z.a}} {{z.b}} {{z.c.d}}');
    const result = await t.render({ x: 33, z: { a: 32, c: { e: 31 } } }, { strict_variables: true });

    assert.equal(3, t.errors.length);
    assert(t.errors[0] instanceof Dry.UndefinedVariable);
    assert.equal('Dry error: undefined variable y', t.errors[0].message);
    assert(t.errors[1] instanceof Dry.UndefinedVariable);
    assert.equal('Dry error: undefined variable b', t.errors[1].message);
    assert(t.errors[2] instanceof Dry.UndefinedVariable);
    assert.equal('Dry error: undefined variable d', t.errors[2].message);

    assert.equal('33  32  ', result);
  });

  it('test_nil_value_does_not_raise', async () => {
    Template.error_mode = 'strict';
    t = Template.parse('some{{x}}thing');
    const result = await t.render({ x: null }, { strict_variables: true });

    assert.equal(0, t.errors.length);
    assert.equal('something', result);
  });

  it('test_undefined_variables_raise', async () => {
    t = Template.parse('{{x}} {{y}} {{z.a}} {{z.b}} {{z.c.d}}');

    assert.rejects(() => {
      return t.render_strict({ x: 33, z: { a: 32, c: { e: 31 } } }, { strict_variables: true });
    }, Dry.UndefinedVariable);
  });

  it('test_undefined_drop_methods', async () => {
    const d = new DropWithUndefinedMethod();
    t = Template.parse('{{ foo }} {{ woot }}');
    const result = await t.render(d, { strict_variables: true });
    assert.equal(1, t.errors.length);
    assert(t.errors[0] instanceof Dry.UndefinedDropMethod);
    assert.equal('foo ', result);
  });

  it('test_undefined_drop_methods_raise', async () => {
    const d = new DropWithUndefinedMethod();
    t = Template.parse('{{ foo }} {{ woot }}');
    return assert.rejects(() => t.render_strict(d, { strict_variables: true }), Dry.UndefinedDropMethod);
  });

  it('test_undefined_filters', async () => {
    t = Template.parse('{{a}} {{x | upcase | somefilter1 | somefilter2 | somefilter3}}');

    const filters = {
      somefilter3(v) {
        return `-${v}-`;
      }
    };

    const result = await t.render({ a: 123, x: 'foo' }, { filters: [filters], strict_filters: false });
    assert.equal(2, t.errors.length);
    assert(t.errors[0] instanceof Dry.UndefinedFilter);
    assert.equal('Dry error: undefined filter somefilter1', t.errors[0].message);
    assert.equal('123 -FOO-', result);
  });

  it('test_undefined_filters_raise', async () => {
    t = Template.parse('{{x | somefilter1 | upcase | somefilter2}}');

    return assert.rejects(() => {
      return t.render_strict({ x: 'foo' }, { strict_filters: true });
    }, Dry.UndefinedFilter);
  });

  it('test_using_range_literal_works_as_expected', async () => {
    t = Template.parse('{% assign foo = (x..y) %}{{ foo }}');
    assert.equal('(1..5)', await t.render({ x: 1, y: 5 }));

    t = Template.parse('{% assign nums = (x..y) %}{% for num in nums %}{{ num }}{% endfor %}');
    assert.equal('12345', await t.render({ x: 1, y: 5 }));
  });
});
