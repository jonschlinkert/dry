
const { assert_template_result } = require('../test_helpers');
const assert = require('node:assert/strict');
const Dry = require('../..');

describe('trim_mode_test', () => {
  let template;
  let expected;
  let text;

  // Make sure the trim isn't applied to standard output
  it('test_standard_output', async () => {
    text = `
      <div>
        <p>
          {{ 'John' }}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          John
        </p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_variable_output_with_multiple_blank_lines', async () => {
    text = `
      <div>
        <p>


          {{- 'John' -}}


        </p>
      </div>
    `;
    expected = `
      <div>
        <p>John</p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_tag_output_with_multiple_blank_lines', async () => {
    text = `
      <div>
        <p>


          {%- if true -%}
          yes
          {%- endif -%}


        </p>
      </div>
    `;
    expected = `
      <div>
        <p>yes</p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  // Make sure the trim isn't applied to standard tags
  it('test_standard_tags', async () => {
    const whitespace = '          ';
    text       = `
      <div>
        <p>
          {% if true %}
          yes
          {% endif %}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
${whitespace}
          yes
${whitespace}
        </p>
      </div>
    `;
    await assert_template_result(expected, text);

    text = `
      <div>
        <p>
          {% if false %}
          no
          {% endif %}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
${whitespace}
        </p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  // Make sure the trim isn't too agressive
  it('test_no_trim_output', async () => {
    text     = '<p>{{- \'John\' -}}</p>';
    expected = '<p>John</p>';
    await assert_template_result(expected, text);
  });

  // Make sure the trim isn't too agressive
  it('test_no_trim_tags', async () => {
    text     = '<p>{%- if true -%}yes{%- endif -%}</p>';
    expected = '<p>yes</p>';
    await assert_template_result(expected, text);

    text     = '<p>{%- if false -%}no{%- endif -%}</p>';
    expected = '<p></p>';
    await assert_template_result(expected, text);
  });

  it('test_single_line_outer_tag', async () => {
    text     = '<p> {%- if true %} yes {% endif -%} </p>';
    expected = '<p> yes </p>';
    await assert_template_result(expected, text);

    text     = '<p> {%- if false %} no {% endif -%} </p>';
    expected = '<p></p>';
    await assert_template_result(expected, text);
  });

  it('test_single_line_inner_tag', async () => {
    text     = '<p> {% if true -%} yes {%- endif %} </p>';
    expected = '<p> yes </p>';
    await assert_template_result(expected, text);

    text     = '<p> {% if false -%} no {%- endif %} </p>';
    expected = '<p>  </p>';
    await assert_template_result(expected, text);
  });

  it('test_single_line_post_tag', async () => {
    text     = '<p> {% if true -%} yes {% endif -%} </p>';
    expected = '<p> yes </p>';
    await assert_template_result(expected, text);

    text     = '<p> {% if false -%} no {% endif -%} </p>';
    expected = '<p> </p>';
    await assert_template_result(expected, text);
  });

  it('test_single_line_pre_tag', async () => {
    text     = '<p> {%- if true %} yes {%- endif %} </p>';
    expected = '<p> yes </p>';
    await assert_template_result(expected, text);

    text     = '<p> {%- if false %} no {%- endif %} </p>';
    expected = '<p> </p>';
    await assert_template_result(expected, text);
  });

  it('test_pre_trim_output', async () => {
    text = `
      <div>
        <p>
          {{- 'John' }}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>John
        </p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_pre_trim_tags', async () => {
    text = `
      <div>
        <p>
          {%- if true %}
          yes
          {%- endif %}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          yes
        </p>
      </div>
    `;
    await assert_template_result(expected, text);

    text = `
      <div>
        <p>
          {%- if false %}
          no
          {%- endif %}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
        </p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_post_trim_output', async () => {
    text = `
      <div>
        <p>
          {{ 'John' -}}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          John</p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_post_trim_tags', async () => {
    text = `
      <div>
        <p>
          {% if true -%}
          yes
          {% endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          yes
          </p>
      </div>
    `;
    await assert_template_result(expected, text);

    text = `
      <div>
        <p>
          {% if false -%}
          no
          {% endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          </p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_pre_and_post_trim_tags', async () => {
    text = `
      <div>
        <p>
          {%- if true %}
          yes
          {% endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          yes
          </p>
      </div>
    `;
    await assert_template_result(expected, text);

    text = `
      <div>
        <p>
          {%- if false %}
          no
          {% endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p></p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_post_and_pre_trim_tags', async () => {
    text = `
      <div>
        <p>
          {% if true -%}
          yes
          {%- endif %}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
          yes
        </p>
      </div>
    `;
    await assert_template_result(expected, text);

    const whitespace = '          ';
    text       = `
      <div>
        <p>
          {% if false -%}
          no
          {%- endif %}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>
${whitespace}
        </p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_trim_output', async () => {
    text = `
      <div>
        <p>
          {{- 'John' -}}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>John</p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_trim_tags', async () => {
    text = `
      <div>
        <p>
          {%- if true -%}
          yes
          {%- endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>yes</p>
      </div>
    `;
    await assert_template_result(expected, text);

    text = `
      <div>
        <p>
          {%- if false -%}
          no
          {%- endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p></p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_whitespace_trim_output', async () => {
    text = `
      <div>
        <p>
          {{- 'John' -}},
          {{- '30' -}}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>John,30</p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_whitespace_trim_tags', async () => {
    text = `
      <div>
        <p>
          {%- if true -%}
          yes
          {%- endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p>yes</p>
      </div>
    `;
    await assert_template_result(expected, text);

    text = `
      <div>
        <p>
          {%- if false -%}
          no
          {%- endif -%}
        </p>
      </div>
    `;
    expected = `
      <div>
        <p></p>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_complex_trim_output', async () => {
    text = `
      <div>
        <p>
          {{- 'John' -}}
          {{- '30' -}}
        </p>
        <b>
          {{ 'John' -}}
          {{- '30' }}
        </b>
        <i>
          {{- 'John' }}
          {{ '30' -}}
        </i>
      </div>
    `;
    expected = `
      <div>
        <p>John30</p>
        <b>
          John30
        </b>
        <i>John
          30</i>
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_complex_trim', async () => {
    text = `
      <div>
        {%- if true -%}
          {%- if true -%}
            <p>
              {{- 'John' -}}
            </p>
          {%- endif -%}
        {%- endif -%}
      </div>
    `;
    expected = `
      <div><p>John</p></div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_right_trim_followed_by_tag', async () => {
    await assert_template_result('ab c', '{{ "a" -}}{{ "b" }} c');
  });

  it('test_raw_output', async () => {
    const whitespace = '        ';
    text       = `
      <div>
        {% raw %}
          {%- if true -%}
            <p>
              {{- 'John' -}}
            </p>
          {%- endif -%}
        {% endraw %}
      </div>
    `;
    expected = `
      <div>
${whitespace}
          {%- if true -%}
            <p>
              {{- 'John' -}}
            </p>
          {%- endif -%}
${whitespace}
      </div>
    `;
    await assert_template_result(expected, text);
  });

  it('test_pre_trim_blank_preceding_text', async () => {
    template = Dry.Template.parse('\n{%- raw %}{% endraw %}');
    assert.equal('', await template.render());

    template = Dry.Template.parse('{%- raw %}{% endraw -%}\n');
    assert.equal('', await template.render());

    template = Dry.Template.parse('\n{%- if true %}{% endif %}');
    assert.equal('', await template.render());

    template = Dry.Template.parse("{{ 'B' }} \n{%- if true %}C{% endif %}");
    assert.equal('BC', await template.render());
  });

  it('test_bug_compatible_pre_trim', async () => {
    template = Dry.Template.parse('\n {%- raw %}{% endraw %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('\n', await template.render());

    template = Dry.Template.parse('\n {%- if true %}{% endif %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('\n', await template.render());

    template = Dry.Template.parse("{{ 'B' }} \n{%- if true %}C{% endif %}", { bug_compatible_whitespace_trimming: true });
    assert.equal('B C', await template.render());

    template = Dry.Template.parse('B\n {%- raw %}{% endraw %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('B', await template.render());

    template = Dry.Template.parse('B\n {%- if true %}{% endif %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('B', await template.render());
  });

  it('test_trim_blank', () => {
    return assert_template_result('foobar', 'foo {{-}} bar');
  });
});

