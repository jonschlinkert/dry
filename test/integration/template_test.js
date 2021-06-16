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
  get bad_method() {
    throw new Error('ruby error in drop');
  }
}

class DropWithUndefinedMethod extends Dry.Drop {
  get foo() {
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

  it('test_instance_assigns_persist_on_same_template_object_between_parses', () => {
    t = new Template();

    const expected = 'from instance assigns';
    assert.equal(expected, t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
    assert.equal(expected, t.parse('{{ foo }}').render());
  });

  it('test_warnings_is_not_exponential_time', function() {
    this.timeout(50);
    let str = 'false';

    times(100, () => {
      str = `{% if true %}true{% else %}${str}{% endif %}`;
    });

    t = Template.parse(str);
    assert.equal(t.warnings.length, 0);
  });

  it('test_should_throw_an_error_when_nested_more_than_100_times', function() {
    this.timeout(50);
    let str = 'false';

    times(101, () => {
      str = `{% if true %}true{% else %}${str}{% endif %}`;
    });

    assert.throws(() => Template.parse(str), /Nesting too deep/);
  });

  it('test_instance_assigns_persist_on_same_template_parsing_between_renders', () => {
    t = new Template().parse("{{ foo }}{% assign foo = 'foo' %}{{ foo }}");
    assert.equal('foo', t.render());
    assert.equal('foofoo', t.render());
  });

  it('test_custom_assigns_do_not_persist_on_same_template', () => {
    t = new Template();
    assert.equal('from custom assigns', t.parse('{{ foo }}').render({ foo: 'from custom assigns' }));
    assert.equal('', t.parse('{{ foo }}').render());
  });

  it('test_custom_assigns_squash_instance_assigns', () => {
    t = new Template();
    assert.equal('from instance assigns', t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
    assert.equal('from custom assigns', t.parse('{{ foo }}').render({ foo: 'from custom assigns' }));
  });

  it('test_persistent_assigns_squash_instance_assigns', () => {
    t = new Template();
    assert.equal('from instance assigns', t.parse("{% assign foo = 'from instance assigns' %}{{ foo }}").render());
    t.assigns['foo'] = 'from persistent assigns';
    assert.equal('from persistent assigns', t.parse('{{ foo }}').render());
  });

  it('test_lambda_is_called_once_from_persistent_assigns_over_multiple_parses_and_renders', () => {
    t = new Template();

    let count = 0;
    t.assigns.number = () => {
      count++;
      return count;
    };

    assert.equal('1', t.parse('{{number}}').render());
    assert.equal('1', t.parse('{{number}}').render());
    assert.equal('1', t.render());
    assert.equal('1', t.render());
  });

  it('test_lambda_is_called_once_from_custom_assigns_over_multiple_parses_and_renders', () => {
    t = new Template();
    let count = 0;

    const assigns = {
      number() {
        count++;
        return count;
      }
    };

    assert.equal('1', t.parse('{{number}}').render(assigns));
    assert.equal('1', t.parse('{{number}}').render(assigns));
    assert.equal('1', t.render(assigns));
  });

  it('test_resource_limits_works_with_custom_length_method', () => {
    t = Template.parse('{% assign foo = bar %}');
    t.resource_limits.render_length_limit = 42;
    assert.equal('', t.render({ bar: new SomethingWithLength() }));
  });

  it('test_resource_limits_render_length', () => {
    t = Template.parse('0123456789');

    t.resource_limits.render_length_limit = 9;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.render_length_limit = 10;
    assert.equal(t.render(), '0123456789');
  });

  it.skip('test_resource_limits_render_score', () => {
    t = Template.parse('{% for a in (1..10) %} {% for a in (1..10) %} foo {% endfor %} {% endfor %}');

    t.resource_limits.render_score_limit = 50;
    console.log(t.render());
    // assert.equal('Dry error: Memory limits exceeded', t.render());
    // assert(t.resource_limits.reached);

    // t = Template.parse('{% for a in (1..100) %} foo {% endfor %}');
    // t.resource_limits.render_score_limit = 50;
    // assert.equal('Dry error: Memory limits exceeded', t.render());
    // assert(t.resource_limits.reached);

    // t.resource_limits.render_score_limit = 200;
    // assert.equal(' foo '.repeat(100), t.render_strict());

    // assert(t.resource_limits.render_score);
  });

  it('test_resource_limits_assign_score', () => {
    t = Template.parse('{% assign foo = 42 %}{% assign bar = 23 %}');
    t.resource_limits.assign_score_limit = 1;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.assign_score_limit = 2;
    assert.equal('', t.render());
    assert(t.resource_limits.assign_score);
  });

  it('test_resource_limits_assign_score_counts_bytes_not_characters', () => {
    t = Template.parse("{% assign foo = 'すごい' %}");
    t.render();

    assert.equal(9, t.resource_limits.assign_score);

    t = Template.parse('{% capture foo %}すごい{% endcapture %}');
    t.render();

    assert.equal(9, t.resource_limits.assign_score);
  });

  it('test_resource_limits_assign_score_nested', () => {
    t = Template.parse("{% assign foo = 'aaaa' | reverse %}");

    t.resource_limits.assign_score_limit = 3;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    assert(t.resource_limits.reached);

    t.resource_limits.assign_score_limit = 5;
    assert.equal('', t.render());
  });

  it.skip('test_resource_limits_aborts_rendering_after_first_error', () => {
    t = Template.parse('{% for a in (1..100) %} foo1 {% endfor %} bar {% for a in (1..100) %} foo2 {% endfor %}');
    t.resource_limits.render_score_limit = 50;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    assert(t.resource_limits.reached);
  });

  it('test_resource_limits_hash_in_template_gets_updated_even_if_no_limits_are_set', () => {
    t = Template.parse('{% for a in (1..100) %}x{% assign foo = 1 %} {% endfor %}');
    t.render_strict();
    assert(t.resource_limits.assign_score > 0);
    assert(t.resource_limits.render_score > 0);
  });

  it('test_render_length_persists_between_blocks', () => {
    t = Template.parse('{% if true %}aaaa{% endif %}');
    t.resource_limits.render_length_limit = 3;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    t.resource_limits.render_length_limit = 4;
    assert.equal('aaaa', t.render());

    t = Template.parse('{% if true %}aaaa{% endif %}{% if true %}bbb{% endif %}');
    t.resource_limits.render_length_limit = 6;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    t.resource_limits.render_length_limit = 7;
    assert.equal('aaaabbb', t.render());

    t = Template.parse('{% if true %}a{% endif %}{% if true %}b{% endif %}{% if true %}a{% endif %}{% if true %}b{% endif %}{% if true %}a{% endif %}{% if true %}b{% endif %}');
    t.resource_limits.render_length_limit = 5;
    assert.equal('Dry error: Memory limits exceeded', t.render());
    t.resource_limits.render_length_limit = 6;
    assert.equal('ababab', t.render());
  });

  it('test_render_length_uses_number_of_bytes_not_characters', () => {
    t = Template.parse('{% if true %}すごい{% endif %}');
    t.resource_limits.render_length_limit = 8;

    assert.equal('Dry error: Memory limits exceeded', t.render());
    t.resource_limits.render_length_limit = 9;
    assert.equal('すごい', t.render());
  });

  it('test_default_resource_limits_unaffected_by_render_with_context', () => {
    const context = new Dry.Context();
    t = Template.parse('{% for a in (1..100) %}x{% assign foo = 1 %} {% endfor %}');
    t.render(context);
    assert(context.resource_limits.assign_score > 0);
    assert(context.resource_limits.render_score > 0);
  });

  it('test_can_use_drop_as_context', () => {
    t = new Template();
    t.registers['lulz'] = 'haha';
    const drop = new TemplateContextDrop();
    assert.equal('fizzbuzz', t.parse('{{foo}}').render(drop));
    assert.equal('bar', t.parse('{{bar}}').render(drop));
    assert.equal('haha', t.parse('{{baz}}').render(drop));
  });

  it.skip('test_render_bang_force_rethrow_errors_on_passed_context', () => {
    const context = new Dry.Context({ drop: new ErroneousDrop() });
    t = new Template().parse('{{ drop.bad_method }}');

    assert.throws(() => t.render_strict(context), Dry.RuntimeError);
    assert.throws(() => t.render_strict(context), /error in drop/);
  });

  it.skip('test_exception_renderer_that_returns_string', () => {
    let exception = null;
    const exception_renderer = e => {
      exception = e;
      return '<!-- error -->';
    };

    const output = Template.parse('{{ 1 | divided_by: 0 }}').render({}, { exception_renderer });
    assert(exception instanceof Dry.ZeroDivisionError);
    assert.equal('<!-- error -->', output);
  });

  it('test_exception_renderer_that_raises', () => {
    let exception = null;

    const options = {
      strict_variables: true,
      exception_renderer: e => {
        exception = e;
        throw e;
      }
    };

    assert.throws(() => {
      Template.parse('{{ 1 | divided_by: 0 }}').render({}, options);
    }, Dry.ZeroDivisionError);

    assert(exception instanceof Dry.ZeroDivisionError);
  });

  it('test_global_filter_option_on_render', () => {
    const global_filter_proc = output => `${output} filtered`;

    const rendered_template = Template.parse('{{name}}').render({ name: 'bob' }, { global_filter: global_filter_proc });

    assert.equal('bob filtered', rendered_template);
  });

  it('test_global_filter_option_when_native_filters_exist', () => {
    const global_filter_proc = output => `${output} filtered`;

    const rendered_template = Template.parse('{{name | upcase}}').render({ name: 'bob' }, { global_filter: global_filter_proc });

    assert.equal('BOB filtered', rendered_template);
  });

  it.skip('test_undefined_variables', () => {
    t = Template.parse('{{x}} {{y}} {{z.a}} {{z.b}} {{z.c.d}}');
    const result = t.render({ x: 33, z: { a: 32, c: { e: 31 } } }, { strict_variables: true });

    assert.equal(3, t.errors.length);
    assert(t.errors[0] instanceof Dry.UndefinedVariable);
    assert.equal('undefined variable y', t.errors[0].message);
    assert(t.errors[1] instanceof Dry.UndefinedVariable);
    assert.equal('undefined variable b', t.errors[1].message);
    assert(t.errors[2] instanceof Dry.UndefinedVariable);
    assert.equal('undefined variable d', t.errors[2].message);

    assert.equal('33  32  ', result);
  });

  it.skip('test_nil_value_does_not_raise', () => {
    Template.error_mode = 'strict';
    t = Template.parse('some{{x}}thing');
    const result = t.render({ x: null }, { strict_variables: true });

    assert.equal(0, t.errors.length);
    assert.equal('something', result);
  });

  it.skip('test_undefined_variables_raise', () => {
    t = Template.parse('{{x}} {{y}} {{z.a}} {{z.b}} {{z.c.d}}');

    assert.throws(() => {
      t.render({ x: 33, z: { a: 32, c: { e: 31 } } }, { strict_variables: true });
    }, Dry.UndefinedVariable);
  });

  it.skip('test_undefined_drop_methods', () => {
    const d = new DropWithUndefinedMethod();
    t = Template.parse('{{ foo }} {{ woot }}');
    const result = t.render(d, { strict_variables: true });

    assert.equal('foo ', result);
    assert.equal(1, t.errors.length);
    assert(t.errors[0] instanceof Dry.UndefinedDropMethod);
  });

  it.skip('test_undefined_drop_methods_raise', () => {
    const d = new DropWithUndefinedMethod();
    t = Template.parse('{{ foo }} {{ woot }}');
    assert.throws(() => t.render(d, { strict_variables: true }), Dry.UndefinedDropMethod);
  });

  it.skip('test_undefined_filters', () => {
    t = Template.parse('{{a}} {{x | upcase | somefilter1 | somefilter2 | somefilter3}}');

    const filters = {
      somefilter3(v) {
        return `-${v}-`;
      }
    };

    const result = t.render({ a: 123, x: 'foo' }, { filters: [filters], strict_filters: false });
    assert.equal('123 ', result);
    assert.equal(1, t.errors.length);
    assert(t.errors[0] instanceof Dry.UndefinedFilter);
    assert.equal('Dry error: undefined filter somefilter1', t.errors[0].message);
  });

  it.skip('test_undefined_filters_raise', () => {
    t = Template.parse('{{x | somefilter1 | upcase | somefilter2}}');

    assert.throws(() => {
      t.render({ x: 'foo' }, { strict_filters: true });
    }, Dry.UndefinedFilter);
  });

  it('test_using_range_literal_works_as_expected', () => {
    t = Template.parse('{% assign foo = (x..y) %}{{ foo }}');
    assert.equal('(1..5)', t.render({ x: 1, y: 5 }));

    t = Template.parse('{% assign nums = (x..y) %}{% for num in nums %}{{ num }}{% endfor %}');
    assert.equal('12345', t.render({ x: 1, y: 5 }));
  });
});
