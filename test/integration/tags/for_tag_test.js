'use strict';

const assert = require('assert').strict;
const Dry = require('../../..');
const { Template } = Dry;

const assert_template_result = (expected, input, locals) => {
  const template = new Template();
  template.parse(input);
  assert.equal(template.render(locals), expected);
};

const assert_raises = (ErrorClass, fn) => {
  try {
    fn();
  } catch (err) {
    assert(err instanceof ErrorClass);
    return err;
  }

  return {};
};

class ThingWithValue extends Dry.Drop {
  get value() {
    return 3;
  }
}

describe('for_tag_test', () => {
  it('test_for', () => {
    assert_template_result(' yo  yo  yo  yo ', '{%for item in array%} yo {%endfor%}', { array: [1, 2, 3, 4] });
    assert_template_result('yoyo', '{%for item in array%}yo{%endfor%}', { array: [1, 2] });
    assert_template_result(' yo ', '{%for item in array%} yo {%endfor%}', { array: [1] });
    assert_template_result('', '{%for item in array%}{%endfor%}', { array: [1, 2] });
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
    assert_template_result(expected, template, { array: [1, 2, 3] });
  });

  it('test_for_reversed', () => {
    const assigns = { array: [1, 2, 3] };
    assert_template_result('321', '{%for item in array reversed %}{{item}}{%endfor%}', assigns);
  });

  it('test_for_with_range', () => {
    assert_template_result(' 1  2  3 ', '{%for item in (1..3) %} {{item}} {%endfor%}');

    assert_raises(Dry.ArgumentError, () => {
      Template.parse('{% for i in (a..2) %}{% endfor %}').render({ a: [1, 2] });
    });

    assert_template_result(' 0  1  2  3 ', '{% for item in (a..3) %} {{item}} {% endfor %}', { a: 'invalid integer' });
  });

  it('test_for_with_variable_range', () => {
    assert_template_result(' 1  2  3 ', '{%for item in (1..foobar) %} {{item}} {%endfor%}', { foobar: 3 });
  });

  it('test_for_with_hash_value_range', () => {
    const foobar = { value: 3 };
    assert_template_result(' 1  2  3 ', '{%for item in (1..foobar.value) %} {{item}} {%endfor%}', { foobar });
  });

  it('test_for_with_drop_value_range', () => {
    const foobar = new ThingWithValue();
    assert_template_result(' 1  2  3 ', '{%for item in (1..foobar.value) %} {{item}} {%endfor%}', { foobar });
  });

  it('test_for_with_variable', () => {
    assert_template_result(' 1  2  3 ', '{%for item in array%} {{item}} {%endfor%}', { array: [1, 2, 3] });
    assert_template_result('123', '{%for item in array%}{{item}}{%endfor%}', { array: [1, 2, 3] });
    assert_template_result('123', '{% for item in array %}{{item}}{% endfor %}', { array: [1, 2, 3] });
    assert_template_result('abcd', '{%for item in array%}{{item}}{%endfor%}', { array: ['a', 'b', 'c', 'd'] });
    assert_template_result('a b c', '{%for item in array%}{{item}}{%endfor%}', { array: ['a', ' ', 'b', ' ', 'c'] });
    assert_template_result('abc', '{%for item in array%}{{item}}{%endfor%}', { array: ['a', '', 'b', '', 'c'] });
  });

  it('test_for_helpers', () => {
    const assigns = { array: [1, 2, 3] };
    assert_template_result(
      ' 1/3  2/3  3/3 ',
      '{%for item in array%} {{forloop.index}}/{{forloop.length}} {%endfor%}',
      assigns
    );
    assert_template_result(' 1  2  3 ', '{%for item in array%} {{forloop.index}} {%endfor%}', assigns);
    assert_template_result(' 0  1  2 ', '{%for item in array%} {{forloop.index0}} {%endfor%}', assigns);
    assert_template_result(' 2  1  0 ', '{%for item in array%} {{forloop.rindex0}} {%endfor%}', assigns);
    assert_template_result(' 3  2  1 ', '{%for item in array%} {{forloop.rindex}} {%endfor%}', assigns);
    assert_template_result(' true  false  false ', '{%for item in array%} {{forloop.first}} {%endfor%}', assigns);
    assert_template_result(' false  false  true ', '{%for item in array%} {{forloop.last}} {%endfor%}', assigns);
  });

  it('test_for_and_if', () => {
    const assigns = { array: [1, 2, 3] };
    assert_template_result(
      '+--',
      '{%for item in array%}{% if forloop.first %}+{% else %}-{% endif %}{%endfor%}',
      assigns
    );
  });

  it('test_for_else', () => {
    assert_template_result('+++', '{%for item in array%}+{%else%}-{%endfor%}', { array: [1, 2, 3] });
    assert_template_result('-', '{%for item in array%}+{%else%}-{%endfor%}', { array: [] });
    assert_template_result('-', '{%for item in array%}+{%else%}-{%endfor%}', { array: null });
  });

  it('test_limiting', () => {
    const assigns = { array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    assert_template_result('12', '{%for i in array limit:2 %}{{ i }}{%endfor%}', assigns);
    assert_template_result('1234', '{%for i in array limit:4 %}{{ i }}{%endfor%}', assigns);
    assert_template_result('3456', '{%for i in array limit:4 offset:2 %}{{ i }}{%endfor%}', assigns);
    assert_template_result('3456', '{%for i in array limit: 4 offset: 2 %}{{ i }}{%endfor%}', assigns);
  });

  it('test_limiting_with_invalid_limit', () => {
    const assigns  = { 'array': [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    const input = `
      {% for i in array limit: true offset: 1 %}
        {{ i }}
      {% endfor %}
    `;

    const exception = assert_raises(Dry.ArgumentError, () => {
      const template = new Template();
      template.parse(input);
      template.render(assigns);
    });

    assert.equal('Dry error: invalid integer', exception.message);
  });

  it('test_limiting_with_invalid_offset', () => {
    const assigns  = { 'array': [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    const input = `
      {% for i in array limit: 1 offset: true %}
        {{ i }}
      {% endfor %}
    `;

    const exception = assert_raises(Dry.ArgumentError, () => {
      const template = new Template();
      template.parse(input);
      template.render(assigns);
    });

    assert.equal('Dry error: invalid integer', exception.message);
  });

  it('test_dynamic_variable_limiting', () => {
    const assigns = { array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], limit: 2, offset: 2 };
    assert_template_result('34', '{%for i in array limit: limit offset: offset %}{{ i }}{%endfor%}', assigns);
  });

  it('test_nested_for', () => {
    const assigns = { array: [ [1, 2], [3, 4], [5, 6] ] };
    assert_template_result('123456', '{%for item in array%}{%for i in item%}{{ i }}{%endfor%}{%endfor%}', assigns);
  });

  it('test_offset_only', () => {
    const assigns = { array: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
    assert_template_result('890', '{%for i in array offset:7 %}{{ i }}{%endfor%}', assigns);
  });

  it('test_pause_resume', () => {
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
    assert_template_result(expected, markup, assigns);
  });

  it('test_pause_resume_limit', () => {
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
    assert_template_result(expected, markup, assigns);
  });

  it('test_pause_resume_big_limit', () => {
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
    assert_template_result(expected, markup, assigns);
  });

  it('test_pause_resume_big_offset', () => {
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
    assert_template_result(expected, markup, assigns);
  });

  it.skip('test_for_with_break', () => {
    let assigns = { array: { items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] } };
    let markup = '{% for i in array.items %}{% break %}{% endfor %}';
    let expected = '';
    assert_template_result(expected, markup, assigns);

    // markup = '{% for i in array.items %}{{ i }}{% break %}{% endfor %}';
    // expected = '1';
    // assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% break %}{{ i }}{% endfor %}';
    expected = '';
    assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{{ i }}{% if i > 3 %}{% break %}{% endif %}{% endfor %}';
    expected = '1234';
    assert_template_result(expected, markup, assigns);

    // tests to ensure it only breaks out of the local for loop and not all of them.
    assigns = { array: [ [1, 2], [3, 4], [5, 6] ] };
    markup = `{% for item in array %}
               {% for i in item %}
                 {% if i == 1 %}
                   {% break %}
                 {% endif %}
                 {{ i }}
               {% endfor %}
             {% endfor %}`;
    expected = '3456';
    assert_template_result(expected, markup, assigns);

    // test break does nothing when unreached
    assigns = { array: { items: [1, 2, 3, 4, 5] } };
    markup = '{% for i in array.items %}{% if i == 9999 %}{% break %}{% endif %}{{ i }}{% endfor %}';
    expected = '12345';
    assert_template_result(expected, markup, assigns);
  });

  it.skip('test_for_with_continue', () => {
    let assigns = { array: { items: [1, 2, 3, 4, 5] } };
    let markup = '{% for i in array.items %}{% continue %}{% endfor %}';
    let expected = '';
    assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{{ i }}{% continue %}{% endfor %}';
    expected = '12345';
    assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% continue %}{{ i }}{% endfor %}';
    expected = '';
    assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% if i > 3 %}{% continue %}{% endif %}{{ i }}{% endfor %}';
    expected = '123';
    assert_template_result(expected, markup, assigns);

    markup = '{% for i in array.items %}{% if i == 3 %}{% continue %}{% else %}{{ i }}{% endif %}{% endfor %}';
    expected = '1245';
    assert_template_result(expected, markup, assigns);

    // tests to } catch (err) { it only continues the local for loop and not all of them.
    assigns = { array: [ [1, 2], [3, 4], [5, 6] ] };
    markup = `{% for item in array %}
               {% for i in item %}
                 {% if i == 1 %}
                   {% continue %}
                 {% endif %}
                 {{ i }}
               {% endfor %}
             {% endfor %}`;
    expected = '23456';
    assert_template_result(expected, markup, assigns);

    // test continue does nothing when unreached
    assigns = { array: { items: [1, 2, 3, 4, 5] } };
    markup = '{% for i in array.items %}{% if i == 9999 %}{% continue %}{% endif %}{{ i }}{% endfor %}';
    expected = '12345';
    assert_template_result(expected, markup, assigns);
  });

  it('test_for_tag_string', () => {
    // ruby 1.8.7 "String".each => Enumerator with single "String" element.
    // ruby 1.9.3 no longer supports .each on String though we mimic
    // the functionality for backwards compatibility
    const assigns = { string: 'test string' };
    assert_template_result('test string', '{%for val in string%}{{val}}{%endfor%}', assigns);
    assert_template_result('test string', '{%for val in string limit:1%}{{val}}{%endfor%}', assigns);

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

    assert_template_result('val-string-1-1-0-1-0-true-true-test string', fixture, assigns);
  });

  it('test_for_parentloop_references_parent_loop', () => {
    const assigns = { outer: [ [1, 1, 1], [1, 1, 1] ] };
    const fixture = '{% for inner in outer %}{% for k in inner %}{{ forloop.parentloop.index }}.{{ forloop.index }} {% endfor %}{% endfor %}';

    assert_template_result('1.1 1.2 1.3 2.1 2.2 2.3 ', fixture, assigns);
  });

  it('test_for_parentloop_nil_when_not_present', () => {
    const assigns = { outer: [ [1, 1, 1], [1, 1, 1] ] };
    const fixture = '{% for inner in outer %}{{ forloop.parentloop.index }}.{{ forloop.index }} {% endfor %}';
    assert_template_result('.1 .2 ', fixture, assigns);
  });

  it('test_inner_for_over_empty_input', () => {
    assert_template_result('oo', '{% for a in (1..2) %}o{% for b in empty %}{% endfor %}{% endfor %}');
  });

  it('test_blank_string_not_iterable', () => {
    assert_template_result('', '{% for char in characters %}I WILL NOT BE OUTPUT{% endfor %}', { characters: '' });
  });

  it.skip('test_bad_variable_naming_in_for_loop', () => {
    assert_raises(Dry.SyntaxError, () => {
      Template.parse('{% for a/b in x %}{% endfor %}');
    });
  });

  it('test_spacing_with_variable_naming_in_for_loop', () => {
    const expected = '12345';
    const template = '{% for       item   in   items %}{{item}}{% endfor %}';
    const assigns = { items: [1, 2, 3, 4, 5] };
    assert_template_result(expected, template, assigns);
  });

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
      yield* [...this.data];
    }
  }

  it('test_iterate_with_each_when_no_limit_applied', () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const assigns = { items: loader };
    const expected = '12345';
    const template = '{% for item in items %}{{item}}{% endfor %}';
    assert_template_result(expected, template, assigns);
    assert(loader.each_called);
    assert(!loader.load_slice_called);
  });

  it('test_iterate_with_load_slice_when_limit_applied', () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const assigns = { items: loader };
    const expected = '1';
    const template = '{% for item in items limit:1 %}{{item}}{% endfor %}';
    assert_template_result(expected, template, assigns);
    assert(!loader.each_called);
    assert(loader.load_slice_called);
  });

  it('test_iterate_with_load_slice_when_limit_and_offset_applied', () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const assigns = { items: loader };
    const expected = '34';
    const template = '{% for item in items offset:2 limit:2 %}{{item}}{% endfor %}';
    assert_template_result(expected, template, assigns);
    assert(!loader.each_called);
    assert(loader.load_slice_called);
  });

  it('test_iterate_with_load_slice_returns_same_results_as_without', () => {
    const loader = new LoaderDrop([1, 2, 3, 4, 5]);
    const loader_assigns = { items: loader };
    const array_assigns = { items: [1, 2, 3, 4, 5] };
    const expected = '34';
    const template = '{% for item in items offset:2 limit:2 %}{{item}}{% endfor %}';
    assert_template_result(expected, template, loader_assigns);
    assert_template_result(expected, template, array_assigns);
  });

  it('test_for_cleans_up_registers', () => {
    // context = new Context(new ErrorDrop());
    // assert_raises(StandardError) do
    //   Dry.Template.parse('{% for i in (1..2) %}{{ standard_error }}{% endfor %}').render!(context)
    // }
    // assert(context.registers[kFor_stack].empty?)
  });

  it('test_instrument_for_offset_continue', () => {
    // assert_usage_increment('for_offset_continue') do
    //   Template.parse('{% for item in items offset:continue %}{{item}}{% endfor %}')
    // }
    // assert_usage_increment('for_offset_continue', times: 0) do
    //   Template.parse('{% for item in items offset:2 %}{{item}}{% endfor %}')
    // }
  });

  it('test_instrument_forloop_drop_name', () => {
    // const assigns = { 'items': [1, 2, 3, 4, 5] };
    // assert_usage_increment('forloop_drop_name', times: 5) do
    //   Template.parse('{% for item in items %}{{forloop.name}}{% endfor %}').render!(assigns)
    // }
    // assert_usage_increment('forloop_drop_name', times: 0) do
    //   Template.parse('{% for item in items %}{{forloop.index}}{% endfor %}').render!(assigns)
    // }
    // assert_usage_increment('forloop_drop_name', times: 0) do
    //   Template.parse('{% for item in items %}{{item}}{% endfor %}').render!(assigns)
    // }
  });
});

module.exports = ThingWithValue;
