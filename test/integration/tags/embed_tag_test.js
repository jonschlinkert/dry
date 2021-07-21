'use strict';

const { assert_template_result, StubFileSystem } = require('../../test_helpers');
const { Template } = require('../../..');

describe('embed_tag_test', () => {
  beforeEach(() => {
    Template.file_system = new StubFileSystem({
      source: '{% block top %}top{% endblock %}{% block bottom %}bottom{% endblock %}'
    });
  });

  it('test_renders_and_empty_string_when_template_not_found', async () => {
    await assert_template_result('', "{% embed 'not-found' %}test string{% endembed %}", {});
  });

  it('test_embeds_content', async () => {
    Template.file_system = new StubFileSystem({ source: 'test string' });
    await assert_template_result('test string', "{% embed 'source' %}{% endembed %}", {});
  });

  it('test_embeds_content_from_blocks', async () => {
    await assert_template_result('topbottom', "{% embed 'source' %}{% endembed %}", {});
  });

  it('test_overrides_content_from_blocks', async () => {
    await assert_template_result('overriddenbottom', "{% embed 'source' %}{% block top %}overridden{% endblock %}{% endembed %}", {});
  });

  it('test_assign_inside_block', async () => {
    const fixture = '{% embed \'source\' %}{% block top %}{% assign var = \'_assigned\' %}overridden{{var}}{% endblock %}{% endembed %}';
    await assert_template_result('overridden_assignedbottom', fixture, {});
  });

  it('test_assign_outside_block', async () => {
    const fixture = '{% embed "source" %}{% assign var = "_assigned" %}{% block top %}overridden{{var}}{% endblock %}{% endembed %}';
    await assert_template_result('overriddenbottom', fixture, {});
  });

  it('test_embed_with', async () => {
    const fixture = '{% embed "source" with a %}{% block top %}{{b}}{% endblock %}{% endembed %}';
    await assert_template_result('new topbottom', fixture, { a: { b: 'new top' } });
  });
});

