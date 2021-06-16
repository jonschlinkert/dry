'use strict';

const assert = require('assert').strict;
const { assert_template_result } = require('../../test_helpers');

describe('raw_tag_tests', () => {
  it('test_tag_in_raw', () => {
    assert_template_result('{% comment %} test {% endcomment %}', '{% raw %}{% comment %} test {% endcomment %}{% endraw %}');
  });

  it('test_trim_mode_in_raw', () => {
    assert_template_result('{% comment %} test {% endcomment %}', '{%- raw -%}  {% comment %} test {% endcomment %}  {%- endraw -%}');
  });

  it('test_output_in_raw', () => {
    assert_template_result('{{ test }}', '{% raw %}{{ test }}{% endraw %}');
  });

  it('test_open_tag_in_raw', () => {
    assert_template_result(' Foobar {% invalid ', '{% raw %} Foobar {% invalid {% endraw %}');
    assert_template_result(' Foobar invalid %} ', '{% raw %} Foobar invalid %} {% endraw %}');
    assert_template_result(' Foobar {{ invalid ', '{% raw %} Foobar {{ invalid {% endraw %}');
    assert_template_result(' Foobar invalid }} ', '{% raw %} Foobar invalid }} {% endraw %}');
    assert_template_result(' Foobar {% invalid {% {% endraw ', '{% raw %} Foobar {% invalid {% {% endraw {% endraw %}');
    assert_template_result(' Foobar {% {% {% ', '{% raw %} Foobar {% {% {% {% endraw %}');
    assert_template_result(' test {% raw %} {% endraw %}', '{% raw %} test {% raw %} {% {% endraw %}endraw %}');
    assert_template_result(' Foobar {{ invalid 1', '{% raw %} Foobar {{ invalid {% endraw %}{{ 1 }}');
  });

  it('test_invalid_raw', () => {
    assert.throws(() => assert_template_result('', '{% raw %} foo'), /tag was never closed/);
    assert.throws(() => assert_template_result('', '{% raw } foo {% endraw %}'), /Valid syntax/);
    assert.throws(() => assert_template_result('', '{% raw } foo %}{% endraw %}'), /Valid syntax/);
  });
});
