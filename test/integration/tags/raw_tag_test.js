'use strict';

const assert = require('assert').strict;
const { assert_template_result } = require('../../test_helpers');

describe('raw_tag_tests', () => {
  it('test_tag_in_raw', async () => {
    await assert_template_result('{% comment %} test {% endcomment %}', '{% raw %}{% comment %} test {% endcomment %}{% endraw %}');
  });

  it('test_trim_mode_in_raw', async () => {
    await assert_template_result('{% comment %} test {% endcomment %}', '{%- raw -%}  {% comment %} test {% endcomment %}  {%- endraw -%}');
  });

  it('test_output_in_raw', async () => {
    await assert_template_result('{{ test }}', '{% raw %}{{ test }}{% endraw %}');
  });

  it('test_open_tag_in_raw', async () => {
    await assert_template_result(' Foobar {% invalid ', '{% raw %} Foobar {% invalid {% endraw %}');
    await assert_template_result(' Foobar invalid %} ', '{% raw %} Foobar invalid %} {% endraw %}');
    await assert_template_result(' Foobar {{ invalid ', '{% raw %} Foobar {{ invalid {% endraw %}');
    await assert_template_result(' Foobar invalid }} ', '{% raw %} Foobar invalid }} {% endraw %}');
    await assert_template_result(' Foobar {% invalid {% {% endraw ', '{% raw %} Foobar {% invalid {% {% endraw {% endraw %}');
    await assert_template_result(' Foobar {% {% {% ', '{% raw %} Foobar {% {% {% {% endraw %}');
    await assert_template_result(' test {% raw %} {% endraw %}', '{% raw %} test {% raw %} {% {% endraw %}endraw %}');
    await assert_template_result(' Foobar {{ invalid 1', '{% raw %} Foobar {{ invalid {% endraw %}{{ 1 }}');
  });

  it('test_invalid_raw', async () => {
    await assert.rejects(() => assert_template_result('', '{% raw %} foo'), /tag was never closed/);
    await assert.rejects(() => assert_template_result('', '{% raw } foo {% endraw %}'), /Valid syntax/);
    await assert.rejects(() => assert_template_result('', '{% raw } foo %}{% endraw %}'), /Valid syntax/);
  });
});
