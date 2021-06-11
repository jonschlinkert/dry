'use strict';

const { assert_template_result, assert_match_syntax_error } = require('../../test_helpers');

describe('raw tag tests', () => {
  it('tag_in_raw', () => {
    assert_template_result('{% comment %} test {% endcomment %}', '{% raw %}{% comment %} test {% endcomment %}{% endraw %}');
  });

  it('output_in_raw', () => {
    assert_template_result('{{ test }}', '{% raw %}{{ test }}{% endraw %}');
  });

  it('open_tag_in_raw', () => {
    assert_template_result(' Foobar {% invalid ', '{% raw %} Foobar {% invalid {% endraw %}');
    assert_template_result(' Foobar invalid %} ', '{% raw %} Foobar invalid %} {% endraw %}');
    assert_template_result(' Foobar {{ invalid ', '{% raw %} Foobar {{ invalid {% endraw %}');
    assert_template_result(' Foobar invalid }} ', '{% raw %} Foobar invalid }} {% endraw %}');
    assert_template_result(' Foobar {% invalid {% {% endraw ', '{% raw %} Foobar {% invalid {% {% endraw {% endraw %}');
    assert_template_result(' Foobar {% {% {% ', '{% raw %} Foobar {% {% {% {% endraw %}');
    assert_template_result(' test {% raw %} {% endraw %}', '{% raw %} test {% raw %} {% {% endraw %}endraw %}');
    assert_template_result(' Foobar {{ invalid 1', '{% raw %} Foobar {{ invalid {% endraw %}{{ 1 }}');
  });

  it.skip('invalid_raw', () => {
    assert_match_syntax_error(/tag was never closed/, '{% raw %} foo');
    assert_match_syntax_error(/Valid syntax/, '{% raw } foo {% endraw %}');
    assert_match_syntax_error(/Valid syntax/, '{% raw } foo %}{% endraw %}');
  });
});
