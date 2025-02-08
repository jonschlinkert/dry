
// const { unstyle } = require('ansi-colors');
const assert = require('node:assert/strict');
const { assert_raises, ErrorDrop, with_error_mode } = require('../test_helpers');
const Dry = require('../..');

describe('error_handling_test', () => {
  it('test_templates_parsed_with_line_numbers_renders_them_in_errors', async () => {
    const template = `
      Hello,

      {{ errors.standard_error }} will throw new Error(a standard error.);

      Bla bla test.

      {{ errors.syntax_error }} will throw new Error(a syntax error.);

      This is an argument error: {{ errors.argument_error }}

      Bla.
    `;

    const expected = `
      Hello,

      Dry error (line 3): standard error will throw new Error(a standard error.);

      Bla bla test.

      Dry syntax error (line 7): syntax error will throw new Error(a syntax error.);

      This is an argument error: Dry error (line 9): argument error

      Bla.
    `;

    const output = await Dry.Template
      .parse(template, { line_numbers: true })
      .render({ 'errors': new ErrorDrop() });

    assert.equal(expected, output);
  });

  it('test_standard_error', async () => {
    const template = Dry.Template.parse(' {{ errors.standard_error }} ');
    assert.equal(' Dry error: standard error ', await template.render({ 'errors': new ErrorDrop() }));

    assert.equal(1, template.errors.length);
    assert.deepEqual(Dry.StandardError, template.errors[0].constructor);
  });

  it('test_syntax', async () => {
    const template = Dry.Template.parse(' {{ errors.syntax_error }} ');
    assert.equal(' Dry syntax error: syntax error ', await template.render({ 'errors': new ErrorDrop() }));

    assert.equal(1, template.errors.length);
    assert.equal(Dry.SyntaxError, template.errors[0].constructor);
  });

  it('test_argument', async () => {
    const template = Dry.Template.parse(' {{ errors.argument_error }} ');
    assert.equal(' Dry error: argument error ', await template.render({ 'errors': new ErrorDrop() }));

    assert.equal(1, template.errors.length);
    assert.equal(Dry.ArgumentError, template.errors[0].constructor);
  });

  it('test_missing_endtag_parse_time_error', async () => {
    await assert_raises(Dry.SyntaxError, async () => {
      return Dry.Template.parse(' {% for a in b %} ... ');
    });
  });

  it('test_unrecognized_operator', () => {
    with_error_mode('strict', () => {
      assert_raises(Dry.SyntaxError, () => {
        Dry.Template.parse(' {% if 1 =! 2 %}ok{% endif %} ');
      });
    });
  });

  it('test_lax_unrecognized_operator', async () => {
    const template = Dry.Template.parse(' {% if 1 =! 2 %}ok{% endif %} ', { error_mode: 'lax' });
    assert.equal(' Dry error: Unknown operator =! ', await template.render());
    assert.equal(template.errors.length, 1);
    assert.equal(Dry.ArgumentError, template.errors[0].constructor);
  });

  it('test_with_line_numbers_adds_numbers_to_parser_errors', async () => {
    const err = await assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse(`
          foobar

          {% "cat" | foobar %}

          bla
        `,
      { line_numbers: true });
    });

    assert.match(err.message, /Dry syntax error \(line 4\)/);
  });

  it('test_with_line_numbers_adds_numbers_to_parser_errors_with_whitespace_trim', async () => {
    const err = await assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse(`
          foobar

          {%- "cat" | foobar -%}

          bla
        `,
      { line_numbers: true });
    });

    assert.match(err.message, /Dry syntax error \(line 4\)/);
  });

  it('test_parsing_warn_with_line_numbers_adds_numbers_to_lexer_errors', () => {
    const template = Dry.Template.parse(`
        foobar

        {% if 1 =! 2 %}ok{% endif %}

        bla
            `,
    {
      error_mode: 'warn',
      eager_parse_tags: true,
      line_numbers: true
    });

    assert.deepEqual(['Dry syntax error (line 4): Unexpected character ! in "1 =! 2"'],
      template.warnings.map(e => e.message));
  });

  it('test_parsing_strict_with_line_numbers_adds_numbers_to_lexer_errors', async () => {
    const err = await assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse(`
          foobar

          {% if 1 =! 2 %}ok{% endif %}

          bla
                `,
      {
        error_mode: 'strict',
        eager_parse_tags: true,
        line_numbers: true
      });
    });

    assert.equal('Dry syntax error (line 4): Unexpected character ! in "1 =! 2"', err.message);
  });

  it('test_syntax_errors_in_nested_blocks_have_correct_line_number', async () => {
    const err = await assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse(`
          foobar

          {% if 1 != 2 %}
            {% foo %}
          {% endif %}

          bla
                `,
      { line_numbers: true });
    });

    assert.equal("Dry syntax error (line 5): Unknown tag 'foo'", err.message);
  });

  it('test_strict_error_messages', async () => {
    let err = await assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse(' {% if 1 =! 2 %}ok{% endif %} ', { error_mode: 'strict', eager_parse_tags: true });
    });

    assert.equal('Dry syntax error (line 1): Unexpected character ! in "1 =! 2"', err.message);

    err = await assert_raises(Dry.SyntaxError, () => {
      Dry.Template.parse('{{%%%}}', { error_mode: 'strict' });
    });

    assert.equal('Dry syntax error (line 1): "%%%" is not a valid expression in "{{%%%}}"', err.message);
  });

  it('test_warnings', async () => {
    const template = Dry.Template.parse('{% if ~~~ %}{{%%%}}{% else %}{{ hello. }}{% endif %}', { error_mode: 'warn', eager_parse_tags: true });

    assert.equal(3, template.warnings.length);
    assert.equal('"%%%" is not a valid expression in "{{%%%}}"', template.warnings[0].toString(false));
    assert.equal('Expected id but found end_of_string in "{{ hello. }}"', template.warnings[1].toString(false));
    assert.equal('"~~~" is not a valid expression in "~~~"', template.warnings[2].toString(false));
    assert.equal('', await template.render());
  });

  it('test_warning_line_numbers', async () => {
    const template = Dry.Template.parse('{% if ~~~ %}\n{{%%%}}{% else %}\n{{ hello. }}{% endif %}', { error_mode: 'warn', line_numbers: true, eager_parse_tags: true });
    const warnings = template.warnings.map(w => w.message).sort();
    assert.equal('Dry syntax error (line 1): "~~~" is not a valid expression in "~~~"', warnings[0]);
    assert.equal('Dry syntax error (line 2): "%%%" is not a valid expression in "{{%%%}}"', warnings[1]);
    assert.equal('Dry syntax error (line 3): Expected id but found end_of_string in "{{ hello. }}"', warnings[2]);
    assert.equal(3, template.warnings.length);
    assert.deepEqual([1, 2, 3], template.warnings.map(e => e.line_number).sort());
  });

  // Dry should not catch Exceptions that are not subclasses of Dry.StandardError,
  // like Interrupt and NoMemoryError
  it('test_exceptions_propagate', async () => {
    await assert_raises(Error, () => {
      const template = Dry.Template.parse('{{ errors.exception }}');
      return template.render({ 'errors': new ErrorDrop() });
    });
  });

  it('test_default_exception_renderer_with_internal_error', async () => {
    const template = Dry.Template.parse('This is a runtime error: {{ errors.runtime_error }}', {
      line_numbers: true,
      eager_parse_tags: true
    });

    const output = await template.render({ 'errors': new ErrorDrop() });
    assert.equal('This is a runtime error: Dry error (line 1): runtime error', output);
    assert.deepEqual([Dry.Error], template.errors.map(e => e.constructor));
  });

  // it('test_setting_default_exception_renderer', async () => {
  //   const old_exception_renderer = Dry.Template.default_exception_renderer;
  //   const exceptions = [];

  //   Dry.Template.default_exception_renderer = e => {
  //     exceptions.push(e);
  //     return '';
  //   };

  //   const template = Dry.Template.parse('This is a runtime error: {{ errors.argument_error }}');

  //   const output = template.render({ 'errors': new ErrorDrop() });

  //   assert.equal('This is a runtime error: ', output);
  //   assert.deepEqual([Dry.ArgumentError], template.errors.map(e => e.constructor));
  // // }); catch (err) {
  // //   Dry.Template.default_exception_renderer = old_exception_renderer if (old_exception_renderer) {
  // });

  it('test_exception_renderer_exposing_non_liquid_error', async () => {
    const template = Dry.Template.parse('This is a runtime error: {{ errors.runtime_error }}', {
      line_numbers: true,
      eager_parse_tags: true
    });

    const exceptions = [];
    const handler = e => {
      exceptions.push(e);
      return e.message;
    };

    const output = await template.render({ 'errors': new ErrorDrop() }, { exception_renderer: handler });

    assert.equal('This is a runtime error: Dry error (line 1): runtime error', output);
    assert.deepEqual([Dry.Error], exceptions.map(e => e.constructor));
    assert.deepEqual(exceptions, template.errors);
    assert.equal('Dry error: runtime error', exceptions[0].message);
  });

  class TestFileSystem {
    read_template_file(_template_path) {
      return '{{ errors.argument_error }}';
    }
  }

  it('test_included_template_name_with_line_numbers', async () => {
    const old_file_system = Dry.Template.file_system;
    let template;
    let page;

    try {
      Dry.Template.file_system = new TestFileSystem();
      template = Dry.Template.parse("Argument error:\n{% include 'product' %}", { line_numbers: true });
      page = await template.render({ 'errors': new ErrorDrop() });
    } catch (err) {
      Dry.Template.file_system = old_file_system;
    }

    assert.equal('Argument error:\nDry error (product line 1): argument error', page);
    assert.equal('product', template.errors[0].template_name);
  });

  it.skip('test_bug_compatible_silencing_of_errors_in_blank_nodes', async () => {
    let output = await Dry.Template
      .parse("{% assign x = 0 %}{% if 1 < '2' %}not blank{% assign x = 3 %}{% endif %}{{ x }}")
      .render();

    assert.equal('Dry error: Invalid comparison: number to string0', output);

    output = await Dry.Template
      .parse("{% assign x = 0 %}{% if 1 < '2' %}{% assign x = 3 %}{% endif %}{{ x }}")
      .render();

    assert.equal('0', output);
  });
});

