
const assert = require('node:assert/strict');
const { ErrorDrop, assert_raises, assert_template_result, assert_usage_increment } = require('../../test_helpers');
const Dry = require('../../..');
const { Context, Template } = Dry;

class ThingWithValue extends Dry.Drop {
  get value() {
    return 3;
  }
}

class LoaderDrop extends Dry.Drop {
  constructor(data) {
    super(data);
    this.data = data;
  }

  each(block) {
    this.each_called = true;
    this.data.forEach(block);
  }

  load_slice(from, to) {
    this.load_slice_called = true;
    return this.data.slice(from, to);
  }

  * [Symbol.iterator]() {
    this.each_called = true;
    yield* [...this.data];
  }
}

describe('for_tag_test', () => {
  it('test_for', async () => {
    await assert_template_result(' yo  yo  yo  yo ', '{%for item in array%} yo {%endfor%}', { array: [1, 2, 3, 4] });
    await assert_template_result('yoyo', '{%for item in array%}yo{%endfor%}', { array: [1, 2] });
    await assert_template_result(' yo ', '{%for item in array%} yo {%endfor%}', { array: [1] });
    await assert_template_result('', '{%for item in array%}{%endfor%}', { array: [1, 2] });
    const expected = `

  yo

  yo

  yo

`;
    const template = `
{%for item in array%}
  yo
{%endfor%}
`;
    await assert_template_result(expected, template, { array: [1, 2, 3] });
  });

  it('test_for_reversed', async () => {
    const assigns = { array: [1, 2, 3] };
    await assert_template_result('321', '{%for item in array reversed %}{{item}}{%endfor%}', assigns);
  });

  it('test_for_with_range', async () => {
    await assert_template_result(' 1  2  3 ', '{%for item in (1..3) %} {{item}} {%endfor%}');

    await assert_raises(Dry.RangeError, async () => {
      await Template.parse('{% for i in (a..2) %}{% endfor %}').render_strict({ a: [1, 2] });
    });

    await assert_template_result(' 0  1  2  3 ', '{% for item in (a..3) %} {{item}} {% endfor %}', { a: 'invalid integer' });
  });

  it('test_for_with_variable_range', async () => {
    await assert_template_result(' 1  2  3 ', '{%for item in (1..foobar) %} {{item}} {%endfor%}', { foobar: 3 });
  });

  it('test_for_with_hash_value_range', async () => {
    const foobar = { value: 3 };
    await assert_template_result(' 1  2  3 ', '{%for item in (1..foobar.value) %} {{item}} {%endfor%}', { foobar });
  });

  it('test_for_with_drop_value_range', async () => {
    const foobar = new ThingWithValue();
    await assert_template_result(' 1  2  3 ', '{%for item in (1..foobar.value) %} {{item}} {%endfor%}', { foobar });
  });

  it('test_for_with_variable', async () => {
    await assert_template_result(' 1  2  3 ', '{%for item in array%} {{item}} {%endfor%}', { array: [1, 2, 3] });
    await assert_template_result('123', '{%for item in array%}{{item}}{%endfor%}', { array: [1, 2, 3] });
    await assert_template_result('123', '{% for item in array %}{{item}}{% endfor %}', { array: [1, 2, 3] });
    await assert_template_result('abcd', '{%for item in array%}{{item}}{%endfor%}', { array: ['a', 'b', 'c', 'd'] });
    await assert_template_result('a b c', '{%for item in array%}{{item}}{%endfor%}', { array: ['a', ' ', 'b', ' ', 'c'] });
    await assert_template_result('abc', '{%for item in array%}{{item}}{%endfor%}', { array: ['a', '', 'b', '', 'c'] });
  });

  it('test_for_helpers', async () => {
    const assigns = { array: [1, 2, 3] };
    await assert_template_result(
      ' 1/3  2/3  3/3 ',
      '{%for item in array%} {{forloop.index}}/{{forloop.length}} {%endfor%}',
      assigns
    );
    await assert_template_result(' 1  2  3 ', '{%for item in array%} {{forloop.index}} {%endfor%}', assigns);
    await assert_template_result(' 0  1  2 ', '{%for item in array%} {{forloop.index0}} {%endfor%}', assigns);
    await assert_template_result(' 2  1  0 ', '{%for item in array%} {{forloop.rindex0}} {%endfor%}', assigns);
    await assert_template_result(' 3  2  1 ', '{%for item in array%} {{forloop.rindex}} {%endfor%}', assigns);
    await assert_template_result(' true  false  false ', '{%for item in array%} {{forloop.first}} {%endfor%}', assigns);
    await assert_template_result(' false  false  true ', '{%for item in array%} {{forloop.last}} {%endfor%}', assigns);
  });

  it('test_for_and_if', async () => {
    const assigns = { array: [1, 2, 3] };
    await assert_template_result(
      '+--',
      '{%for item in array%}{% if forloop.first %}+{% else %}-{% endif %}{%endfor%}',
      assigns
    );
  });

  it('test_for_else', async () => {
    await assert_template_result('+++', '{%for item in array%}+{%else%}-{%endfor%}', { array: [1, 2, 3] });
    await assert_template_result('-', '{%for item in array%}+{%else%}-{%endfor%}', { array: [] });
    await assert_template_result('-', '{%for item in array%}+{%else%}-{%endfor%}', { array: null });
  });

  it('test_limiting', async () => {
    const assigns = { array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    await assert_template_result('12', '{%for i in array limit:2 %}{{ i }}{%endfor%}', assigns);
    await assert_template_result('1234', '{%for i in array limit:4 %}{{ i }}{%endfor%}', assigns);
    await assert_template_result('3456', '{%for i in array limit:4 offset:2 %}{{ i }}{%endfor%}', assigns);
    await assert_template_result('3456', '{%for i in array limit: 4 offset: 2 %}{{ i }}{%endfor%}', assigns);
  });

  it('test_limiting_with_invalid_limit', async () => {
    const assigns  = { 'array': [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    const input = `
      {% for i in array limit: true offset: 1 %}
        {{ i }}
      {% endfor %}
    `;

    const exception = await assert_raises(Dry.ArgumentError, async () => {
      const template = new Template();
      template.parse(input);
      await template.render(assigns);
    });

    assert.equal('Dry error: invalid integer', exception.message);
  });

  it('test_limiting_with_invalid_offset', async () => {
    const assigns  = { 'array': [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    const input = `
      {% for i in array limit: 1 offset: true %}
        {{ i }}
      {% endfor %}
    `;

    const exception = await assert_raises(Dry.ArgumentError, async () => {
      const template = new Template();
      template.parse(input);
      await template.render(assigns);
    });

    assert.equal('Dry error: invalid integer', exception.message);
  });

  it('test_dynamic_variable_limiting', async () => {
    const assigns = { array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], limit: 2, offset: 2 };
    await assert_template_result('34', '{%for i in array limit: limit offset: offset %}{{ i }}{%endfor%}', assigns);
  });

  it('test_nested_for', async () => {
    const assigns = { array: [[1, 2], [3, 4], [5, 6]] };
    await assert_template_result('123456', '{%for item in array%}{%for i in item%}{{ i }}{%endfor%}{%endfor%}', assigns);
  });

  it('test_offset_only', async () => {
    const assigns = { array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    await assert_template_result('890', '{%for i in array offset:7 %}{{ i }}{%endfor%}', assigns);
  });

  it('test_pause_resume', async () => {
    const assigns = { array: { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] } };
    const markup = `
      {%for i in array.items limit: 3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit: 3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit: 3 %}{{i}}{%endfor%}
      `;
    const expected = `
      123
      next
      456
      next
      789
      `;
    await assert_template_result(expected, markup, assigns);
  });

  it('test_pause_resume_limit', async () => {
    const assigns = { array: { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] } };
    const markup = `
      {%for i in array.items limit:3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit:3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit:1 %}{{i}}{%endfor%}
      `;
    const expected = `
      123
      next
      456
      next
      7
      `;
    await assert_template_result(expected, markup, assigns);
  });

  it('test_pause_resume_big_limit', async () => {
    const assigns = { array: { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] } };
    const markup = `
      {%for i in array.items limit:3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit:3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit:1000 %}{{i}}{%endfor%}
      `;
    const expected = `
      123
      next
      456
      next
      7890
      `;
    await assert_template_result(expected, markup, assigns);
  });

  it('test_pause_resume_big_offset', async () => {
    const assigns = { array: { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] } };
    const markup = `{%for i in array.items limit:3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit:3 %}{{i}}{%endfor%}
      next
      {%for i in array.items offset:continue limit:3 offset:1000 %}{{i}}{%endfor%}`;
    const expected = `123
      next
      456
      next
      `;
    await assert_template_result(expected, markup, assigns);
  });

  it('test_for_with_break', async () => {
    let assigns = { array: { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } };
    let markup = '{% for i in array.items %}{% break %}{% endfor %}';
    let expected = '';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{{ i }}{% break %}{% endfor %}';
    expected = '1';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% break %}{{ i }}{% endfor %}';
    expected = '';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{{ i }}{% if i > 3 %}{% break %}{% endif %}{% endfor %}';
    expected = '1234';
    await assert_template_result(expected, markup, assigns);

    // tests to ensure it only breaks out of the local for loop and not all of them.
    assigns = { array: [[1, 2], [3, 4], [5, 6]] };
    markup = `{% for item in array %}
               {% for i in item %}
                 {% if i == 1 %}
                   {% break %}
                 {% endif %}
                 {{ i }}
               {% endfor %}
             {% endfor %}`;
    expected = '3456';

    const template = new Template();
    template.parse(markup);
    assert.equal((await template.render_strict(assigns)).replace(/\s+/g, ''), expected);

    // test break does nothing when unreached
    assigns = { array: { items: [1, 2, 3, 4, 5] } };
    markup = '{% for i in array.items %}{% if i == 9999 %}{% break %}{% endif %}{{ i }}{% endfor %}';
    expected = '12345';
    await assert_template_result(expected, markup, assigns);
  });

  it('test_for_with_continue', async () => {
    let assigns = { array: { items: [1, 2, 3, 4, 5] } };
    let markup = '{% for i in array.items %}{% continue %}{% endfor %}';
    let expected = '';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{{ i }}{% continue %}{% endfor %}';
    expected = '12345';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% continue %}{{ i }}{% endfor %}';
    expected = '';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% if i > 3 %}{% continue %}{% endif %}{{ i }}{% endfor %}';
    expected = '123';
    await assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% if i == 3 %}{% continue %}{% else %}{{ i }}{% endif %}{% endfor %}';
    expected = '1245';
    await assert_template_result(expected, markup, assigns);

    // tests to ensure it only continues the local for loop and not all of them.
    assigns = { array: [[1, 2], [3, 4], [5, 6]] };
    markup = `{% for item in array %}
               {% for i in item %}
                 {% if i == 1 %}
                   {% continue %}
                 {% endif %}
                 {{ i }}
               {% endfor %}
             {% endfor %}`;
    expected = '23456';

    const template = new Template();
    template.parse(markup);
    assert.equal((await template.render_strict(assigns)).replace(/\s+/g, ''), expected);

    // test continue does nothing when unreached
    assigns = { array: { items: [1, 2, 3, 4, 5] } };
    markup = '{% for i in array.items %}{% if i == 9999 %}{% continue %}{% endif %}{{ i }}{% endfor %}';
    expected = '12345';
    await assert_template_result(expected, markup, assigns);
  });

  it('test_for_tag_string', async () => {
    // ruby 1.8.7 "String".each => Enumerator with single "String" element.
    // ruby 1.9.3 no longer supports .each on String though we mimic
    // the functionality for backwards compatibility
    const assigns = { string: 'test string' };
    await assert_template_result('test string', '{%for val in string%}{{val}}{%endfor%}', assigns);
    await assert_template_result('test string', '{%for val in string limit:1%}{{val}}{%endfor%}', assigns);

    const fixture = `
      {%for val in string%}
      {{forloop.name}}-
      {{forloop.index}}-
      {{forloop.length}}-
      {{forloop.index0}}-
      {{forloop.rindex}}-
      {{forloop.rindex0}}-
      {{forloop.first}}-
      {{forloop.last}}-
      {{val}}{%endfor%}`.replace(/\n\s*/g, '');

    await assert_template_result('val-string-1-1-0-1-0-true-true-test string', fixture, assigns);
  });

  it('test_for_parentloop_references_parent_loop', async () => {
    const assigns = { outer: [[1, 1, 1], [1, 1, 1]] };
    const fixture = '{% for inner in outer %}{% for k in inner %}{{ forloop.parentloop.index }}.{{ forloop.index }} {% endfor %}{% endfor %}';

    await assert_template_result('1.1 1.2 1.3 2.1 2.2 2.3 ', fixture, assigns);
  });

  it('test_for_parentloop_nil_when_not_present', async () => {
    const assigns = { outer: [[1, 1, 1], [1, 1, 1]] };
    const fixture = '{% for inner in outer %}{{ forloop.parentloop.index }}.{{ forloop.index }} {% endfor %}';
    await assert_template_result('.1 .2 ', fixture, assigns);
  });

  it('test_inner_for_over_empty_input', async () => {
    await assert_template_result('oo', '{% for a in (1..2) %}o{% for b in empty %}{% endfor %}{% endfor %}');
  });

  it('test_blank_string_not_iterable', async () => {
    await assert_template_result('', '{% for char in characters %}I WILL NOT BE OUTPUT{% endfor %}', { characters: '' });
  });

  it('test_bad_variable_naming_in_for_loop', async () => {
    await assert_raises(Dry.SyntaxError, () => {
      Template.parse('{% for a/b in x %}{% endfor %}');
    });
  });

  it('test_spacing_with_variable_naming_in_for_loop', async () => {
    const expected = '12345';
    const template = '{% for       item   in   items %}{{item}}{% endfor %}';
    const assigns = { items: [1, 2, 3, 4, 5] };
    await assert_template_result(expected, template, assigns);
  });

  it('test_iterate_with_each_when_no_limit_applied', async () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const assigns = { items: loader };
    const expected = '12345';
    const template = '{% for item in items %}{{item}}{% endfor %}';
    await assert_template_result(expected, template, assigns);
    assert(loader.each_called);
    assert(!loader.load_slice_called);
  });

  it('test_iterate_with_load_slice_when_limit_applied', async () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const assigns = { items: loader };
    const expected = '1';
    const template = '{% for item in items limit:1 %}{{item}}{% endfor %}';
    await assert_template_result(expected, template, assigns);
    assert(!loader.each_called);
    assert(loader.load_slice_called);
  });

  it('test_iterate_with_load_slice_when_limit_and_offset_applied', async () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const assigns = { items: loader };
    const expected = '34';
    const template = '{% for item in items offset:2 limit:2 %}{{item}}{% endfor %}';
    await assert_template_result(expected, template, assigns);
    assert(!loader.each_called);
    assert(loader.load_slice_called);
  });

  it('test_iterate_with_load_slice_returns_same_results_as_without', async () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const loader_assigns = { items: loader };
    const array_assigns = { items: [1, 2, 3, 4, 5] };
    const expected = '34';
    const template = '{% for item in items offset:2 limit:2 %}{{item}}{% endfor %}';
    await assert_template_result(expected, template, loader_assigns);
    await assert_template_result(expected, template, array_assigns);
  });

  it('test_for_cleans_up_registers', async () => {
    const context = new Context(new ErrorDrop());

    const template = new Template();
    template.parse('{% for i in (1..2) %}{{ standard_error }}{% endfor %}');
    template.render_strict(context);

    assert(Dry.utils.empty(context.registers['for_stack']));
  });

  it('test_instrument_for_offset_continue', async () => {
    assert_usage_increment('for_offset_continue', () => {
      Template.parse('{% for item in items offset:continue %}{{item}}{% endfor %}');
    });

    assert_usage_increment('for_offset_continue', { times: 0 }, () => {
      Template.parse('{% for item in items offset:2 %}{{item}}{% endfor %}');
    });
  });

  it('test_instrument_forloop_drop_name', async () => {
    const assigns = { items: [1, 2, 3, 4, 5] };

    assert_usage_increment('forloop_drop_name', { times: 5 }, () => {
      Template.parse('{% for item in items %}{{forloop.name}}{% endfor %}').render_strict(assigns);
    });

    assert_usage_increment('forloop_drop_name', { times: 0 }, () => {
      Template.parse('{% for item in items %}{{forloop.index}}{% endfor %}').render_strict(assigns);
    });

    assert_usage_increment('forloop_drop_name', { times: 0 }, () => {
      Template.parse('{% for item in items %}{{item}}{% endfor %}').render_strict(assigns);
    });
  });
});

module.exports = ThingWithValue;
