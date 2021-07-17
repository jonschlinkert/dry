'use strict';

const assert = require('assert').strict;
const { assert_template_result } = require('../../test_helpers');

describe('standard_tag_test', () => {
  it('test_no_transform', async () => {
    await assert_template_result('this text should come out of the template without change...',
      'this text should come out of the template without change...');

    await assert_template_result('blah', 'blah');
    await assert_template_result('<blah>', '<blah>');
    await assert_template_result('|,.:', '|,.:');
    await assert_template_result('', '');

    const text = `this shouldnt see any transformation either but has multiple lines
              as you can clearly see here ...`;
    await assert_template_result(text, text);
  });

  it('test_has_a_block_which_does_nothing', async () => {
    await assert_template_result('the comment block should be removed  .. right?',
      'the comment block should be removed {%comment%} be gone.. {%endcomment%} .. right?');

    await assert_template_result('', '{%comment%}{%endcomment%}');
    await assert_template_result('', '{%comment%}{% endcomment %}');
    await assert_template_result('', '{% comment %}{%endcomment%}');
    await assert_template_result('', '{% comment %}{% endcomment %}');
    await assert_template_result('', '{%comment%}comment{%endcomment%}');
    await assert_template_result('', '{% comment %}comment{% endcomment %}');
    await assert_template_result('', '{% comment %} 1 {% comment %} 2 {% endcomment %} 3 {% endcomment %}');

    await assert_template_result('', '{%comment%}{%blabla%}{%endcomment%}');
    await assert_template_result('', '{% comment %}{% blabla %}{% endcomment %}');
    await assert_template_result('', '{%comment%}{% endif %}{%endcomment%}');
    await assert_template_result('', '{% comment %}{% endwhatever %}{% endcomment %}');
    await assert_template_result('', '{% comment %}{% raw %} {{%%%%}}  }} { {% endcomment %} {% comment {% endraw %} {% endcomment %}');

    await assert_template_result('foobar', 'foo{%comment%}comment{%endcomment%}bar');
    await assert_template_result('foobar', 'foo{% comment %}comment{% endcomment %}bar');
    await assert_template_result('foobar', 'foo{%comment%} comment {%endcomment%}bar');
    await assert_template_result('foobar', 'foo{% comment %} comment {% endcomment %}bar');

    await assert_template_result('foo  bar', 'foo {%comment%} {%endcomment%} bar');
    await assert_template_result('foo  bar', 'foo {%comment%}comment{%endcomment%} bar');
    await assert_template_result('foo  bar', 'foo {%comment%} comment {%endcomment%} bar');

    await assert_template_result('foobar', 'foo{%comment%} {%endcomment%}bar');
  });

  it('test_hyphenated_assign', async () => {
    const assigns = { 'a-b': '1' };
    await assert_template_result('a-b:1 a-b:2', 'a-b:{{a-b}} {%assign a-b = 2 %}a-b:{{a-b}}', assigns);
  });

  it('test_assign_with_colon_and_spaces', async () => {
    const assigns = { 'var': { 'a:b c': { 'paged': '1' } } };
    await assert_template_result('var2: 1', '{%assign var2 = var["a:b c"].paged %}var2: {{var2}}', assigns);
  });

  it('test_capture', async () => {
    const assigns = { 'var': 'content' };
    await assert_template_result('content foo content foo ',
      '{{ var2 }}{% capture var2 %}{{ var }} foo {% endcapture %}{{ var2 }}{{ var2 }}',
      assigns);
  });

  it('test_capture_detects_bad_syntax', async () => {
    return assert.rejects(() => {
      return assert_template_result('content foo content foo ',
        '{{ var2 }}{% capture %}{{ var }} foo {% endcapture %}{{ var2 }}{{ var2 }}',
        { 'var': 'content' });
    }, /Syntax Error in 'capture'/);
  });

  it('test_assign', async () => {
    await assert_template_result('variable', '{% assign a = "variable"%}{{a}}');
  });

  it('test_assign_unassigned', async () => {
    const assigns = { 'var': 'content' };
    await assert_template_result('var2:  var2:content', 'var2:{{var2}} {%assign var2 = var%} var2:{{var2}}', assigns);
  });

  it('test_assign_an_empty_string', async () => {
    await assert_template_result('', '{% assign a = ""%}{{a}}');
  });

  it('test_assign_is_global', async () => {
    await assert_template_result('variable', '{%for i in (1..2) %}{% assign a = "variable"%}{% endfor %}{{a}}');
  });

  it('test_size_of_array', async () => {
    const assigns = { array: [1, 2, 3, 4] };
    await assert_template_result('array has 4 elements', 'array has {{ array.size }} elements', assigns);
  });

  it('test_size_of_hash', async () => {
    const assigns = { 'hash': { a: 1, b: 2, c: 3, d: 4 } };
    await assert_template_result('hash has 4 elements', 'hash has {{ hash.size }} elements', assigns);
  });

  it('test_illegal_symbols', async () => {
    await assert_template_result('', '{% if true == empty %}?{% endif %}', {});
    await assert_template_result('', '{% if true == null %}?{% endif %}', {});
    await assert_template_result('', '{% if empty == true %}?{% endif %}', {});
    await assert_template_result('', '{% if null == true %}?{% endif %}', {});
  });

  it('test_ifchanged', async () => {
    let assigns = { array: [1, 1, 2, 2, 3, 3] };
    await assert_template_result('123', '{%for item in array%}{%ifchanged%}{{item}}{% endifchanged %}{%endfor%}', assigns);

    assigns = { array: [1, 1, 1, 1] };
    await assert_template_result('1', '{%for item in array%}{%ifchanged%}{{item}}{% endifchanged %}{%endfor%}', assigns);
  });

  it('test_multiline_tag', async () => {
    await assert_template_result('0 1 2 3', '0{%\nfor i in (1..3)\n%} {{\ni\n}}{%\nendfor\n%}');
  });
});
