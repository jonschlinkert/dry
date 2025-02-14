
const Dry = require('../../..');
const { assert_template_result, assert_match_syntax_error } = require('../../test_helpers');

describe.skip('liquid_tag_test', () => {
  it('test_liquid_tag', async () => {
    let fixture = `
      {%- liquid
        echo array | join: " "
      -%}
    `;
    await assert_template_result('1 2 3', fixture, { array: [1, 2, 3] });

    fixture = `
      {%- liquid
        for value in array
          echo value
          unless forloop.last
            echo " "
          endunless
        endfor
      -%}
    `;
    await assert_template_result('1 2 3', fixture, { array: [1, 2, 3] });

    fixture = `
      {%- liquid
        for value in array
          assign double_value = value | times: 2
          echo double_value | times: 2
          unless forloop.last
            echo " "
          endunless
        endfor

        echo " "
        echo double_value
      -%}
    `;
    await assert_template_result('4 8 12 6', fixture, { array: [1, 2, 3] });

    fixture = `
      {%- liquid echo "a" -%}
      b
      {%- liquid echo "c" -%}
    `;
    await assert_template_result('abc', fixture);
  });

  it('test_liquid_tag_errors', async () => {
    let fixture = `
      {%- liquid error no such tag -%}
    `;
    await assert_match_syntax_error("syntax error (line 1): Unknown tag 'error'", fixture);

    fixture = `
      {{ test });}

      {%-
      liquid
        for value in array

          error no such tag
        endfor
      -%}
    `;
    await assert_match_syntax_error("syntax error (line 7): Unknown tag 'error'", fixture);

    fixture = `
      {%- liquid
        !!! the guards are vigilant
      -%}
    `;
    await assert_match_syntax_error("syntax error (line 2): Unknown tag '!!! the guards are vigilant'", fixture);

    fixture = `
      {%- liquid
        for value in array
          echo 'forgot to close the for tag'
      -%}
    `;
    await assert_match_syntax_error("syntax error (line 4): 'for' tag was never closed", fixture);
  });

  it('test_line_number_is_correct_after_a_blank_token', async () => {
    await assert_match_syntax_error(/syntax error (line 3): Unknown tag 'error'/, "{% liquid echo ''\n\n error %}");
    await assert_match_syntax_error(/syntax error (line 3): Unknown tag 'error'/, "{% liquid echo ''\n  \n error %}");
  });

  it('test_nested_liquid_tag', async () => {
    const fixture = `
      {%- if true %}
        {%- liquid
          echo "good"
        %}
      {%- endif -%}
    `;
    await assert_template_result('good', fixture);
  });

  it('test_cannot_open_blocks_living_past_a_liquid_tag', async () => {
    const fixture = `
      {%- liquid
        if (true) {
      -%}
      {%- endif -%}
    `;
    await assert_match_syntax_error("syntax error (line 3): 'if' tag was never closed", fixture);
  });

  it('test_cannot_close_blocks_created_before_a_liquid_tag', async () => {
    const fixture = `
      {%- if true -%}
      42
      {%- liquid endif -%}
    `;
    await assert_match_syntax_error("syntax error (line 3): 'endif' is not a valid delimiter for liquid tags. use %}", fixture);
  });

  it('test_liquid_tag_in_raw', async () => {
    const fixture = '{% raw %}{% liquid echo "test" %}{% endraw %}\n';
    await assert_template_result('{% liquid echo "test" %}\n', fixture);
  });
});

