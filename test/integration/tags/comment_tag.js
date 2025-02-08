
const { assert_template_result } = require('../../test_helpers');

describe('comment_tag_test', () => {
  describe('block_comments', () => {
    it('test_block_comment_does_not_render_contents', async () => {
      await assert_template_result('the comment block should be removed  .. right?',
        'the comment block should be removed {%comment%} be gone.. {%endcomment%} .. right?');

      await assert_template_result('', '{%comment%}{%endcomment%}');
      await assert_template_result('', '{%comment%}{% endcomment %}');
      await assert_template_result('', '{% comment %}{%endcomment%}');
      await assert_template_result('', '{% comment %}{% endcomment %}');
      await assert_template_result('', '{%comment%}comment{%endcomment%}');
      await assert_template_result('', '{% comment %}comment{% endcomment %}');

      await assert_template_result('foobar', 'foo{%comment%}comment{%endcomment%}bar');
      await assert_template_result('foobar', 'foo{% comment %}comment{% endcomment %}bar');
      await assert_template_result('foobar', 'foo{%comment%} comment {%endcomment%}bar');
      await assert_template_result('foobar', 'foo{% comment %} comment {% endcomment %}bar');

      await assert_template_result('foo  bar', 'foo {%comment%} {%endcomment%} bar');
      await assert_template_result('foo  bar', 'foo {%comment%}comment{%endcomment%} bar');
      await assert_template_result('foo  bar', 'foo {%comment%} comment {%endcomment%} bar');

      await assert_template_result('foobar', 'foo{%comment%} {%endcomment%}bar');
    });

    it('test_block_comments_may_contain_other_tags', async () => {
      await assert_template_result('', '{% comment %}{{ name }}{% endcomment %}', { name: 'doowb' });
      await assert_template_result('', '{% comment %} 1 {% comment %} 2 {% endcomment %} 3 {% endcomment %}');
    });

    it('test_block_comments_may_contain_invalid_tags', async () => {
      await assert_template_result('', '{%comment%}{% endif %}{%endcomment%}');
      await assert_template_result('', '{% comment %}{% endwhatever %}{% endcomment %}');
      await assert_template_result('', '{% comment %}{% raw %} {{%%%%}}  }} { {% endcomment %} {% comment {% endraw %} {% endcomment %}');
    });
  });

  describe('line_comments', () => {
    it('test_line_comment_does_not_render_contents', async () => {
      await assert_template_result('', '{# comment #}');
      await assert_template_result('', '{# this is a comment #}');
      await assert_template_result('', '{# this is {% tag %} #}');
      await assert_template_result('', '{# this is "quoted string" #}');
    });

    it('test_text_renders_before_and_after_line_comment', async () => {
      await assert_template_result('foo  bar', 'foo {# comment #} bar');
      await assert_template_result('foo  bar', 'foo {# this is a comment #} bar');
      await assert_template_result('foo  bar', 'foo {# this is {% tag %} #} bar');
      await assert_template_result('foo  bar', 'foo {# this is "quoted string" #} bar');
    });
  });
});
