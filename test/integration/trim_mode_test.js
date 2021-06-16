'use strict';

const { assert_template_result } = require('../test_helpers');
const assert = require('assert').strict;
const Dry = require('../..');

describe('trim_mode_test', () => {
  let template;
  let expected;
  let text;

  // Make sure the trim isn't applied to standard output
  it('test_standard_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_variable_output_with_multiple_blank_lines', () => {
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
    assert_template_result(expected, text);
  });

  it('test_tag_output_with_multiple_blank_lines', () => {
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
    assert_template_result(expected, text);
  });

  // Make sure the trim isn't applied to standard tags
  it('test_standard_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  // Make sure the trim isn't too agressive
  it('test_no_trim_output', () => {
    text     = '<p>{{- \'John\' -}}</p>';
    expected = '<p>John</p>';
    assert_template_result(expected, text);
  });

  // Make sure the trim isn't too agressive
  it('test_no_trim_tags', () => {
    text     = '<p>{%- if true -%}yes{%- endif -%}</p>';
    expected = '<p>yes</p>';
    assert_template_result(expected, text);

    text     = '<p>{%- if false -%}no{%- endif -%}</p>';
    expected = '<p></p>';
    assert_template_result(expected, text);
  });

  it('test_single_line_outer_tag', () => {
    text     = '<p> {%- if true %} yes {% endif -%} </p>';
    expected = '<p> yes </p>';
    assert_template_result(expected, text);

    text     = '<p> {%- if false %} no {% endif -%} </p>';
    expected = '<p></p>';
    assert_template_result(expected, text);
  });

  it('test_single_line_inner_tag', () => {
    text     = '<p> {% if true -%} yes {%- endif %} </p>';
    expected = '<p> yes </p>';
    assert_template_result(expected, text);

    text     = '<p> {% if false -%} no {%- endif %} </p>';
    expected = '<p>  </p>';
    assert_template_result(expected, text);
  });

  it('test_single_line_post_tag', () => {
    text     = '<p> {% if true -%} yes {% endif -%} </p>';
    expected = '<p> yes </p>';
    assert_template_result(expected, text);

    text     = '<p> {% if false -%} no {% endif -%} </p>';
    expected = '<p> </p>';
    assert_template_result(expected, text);
  });

  it('test_single_line_pre_tag', () => {
    text     = '<p> {%- if true %} yes {%- endif %} </p>';
    expected = '<p> yes </p>';
    assert_template_result(expected, text);

    text     = '<p> {%- if false %} no {%- endif %} </p>';
    expected = '<p> </p>';
    assert_template_result(expected, text);
  });

  it('test_pre_trim_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_pre_trim_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  it('test_post_trim_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_post_trim_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  it('test_pre_and_post_trim_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  it('test_post_and_pre_trim_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  it('test_trim_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_trim_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  it('test_whitespace_trim_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_whitespace_trim_tags', () => {
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
    assert_template_result(expected, text);

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
    assert_template_result(expected, text);
  });

  it('test_complex_trim_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_complex_trim', () => {
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
    assert_template_result(expected, text);
  });

  it('test_right_trim_followed_by_tag', () => {
    assert_template_result('ab c', '{{ "a" -}}{{ "b" }} c');
  });

  it('test_raw_output', () => {
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
    assert_template_result(expected, text);
  });

  it('test_pre_trim_blank_preceding_text', () => {
    template = Dry.Template.parse('\n{%- raw %}{% endraw %}');
    assert.equal('', template.render());

    template = Dry.Template.parse('{%- raw %}{% endraw -%}\n');
    assert.equal('', template.render());

    template = Dry.Template.parse('\n{%- if true %}{% endif %}');
    assert.equal('', template.render());

    template = Dry.Template.parse("{{ 'B' }} \n{%- if true %}C{% endif %}");
    assert.equal('BC', template.render());
  });

  it('test_bug_compatible_pre_trim', () => {
    template = Dry.Template.parse('\n {%- raw %}{% endraw %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('\n', template.render());

    template = Dry.Template.parse('\n {%- if true %}{% endif %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('\n', template.render());

    template = Dry.Template.parse("{{ 'B' }} \n{%- if true %}C{% endif %}", { bug_compatible_whitespace_trimming: true });
    assert.equal('B C', template.render());

    template = Dry.Template.parse('B\n {%- raw %}{% endraw %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('B', template.render());

    template = Dry.Template.parse('B\n {%- if true %}{% endif %}', { bug_compatible_whitespace_trimming: true });
    assert.equal('B', template.render());
  });

  it('test_trim_blank', () => {
    assert_template_result('foobar', 'foo {{-}} bar');
  });
});

