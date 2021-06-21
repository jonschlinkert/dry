'use strict';

const assert = require('assert').strict;
const { Template } = require('../../..');

const assert_template_result = (expected, fixture, assigns = {}, message = null) => {
  const template = Template.parse(fixture, { line_numbers: true });
  assert.equal(expected.trim(), template.render_strict(assigns).trim(), message);
};

class FileSystem {
  constructor(values) {
    this.values = values;
  }
  read_template_file(template_path) {
    return this.values[template_path];
  }
}

describe('embed_tag_test', () => {
  beforeEach(() => {
    Template.file_system = new FileSystem({
      source: '{% block top %}top{% endblock %}{% block bottom %}bottom{% endblock %}'
    });
  });

  it('test_renders_and_empty_string_when_template_not_found', () => {
    assert_template_result('', "{% embed 'not-found' %}test string{% endembed %}", {});
  });

  it('test_embeds_content', () => {
    Template.file_system = new FileSystem({ source: 'test string' });
    assert_template_result('test string', "{% embed 'source' %}{% endembed %}", {});
  });

  it('test_embeds_content_from_blocks', () => {
    assert_template_result('topbottom', "{% embed 'source' %}{% endembed %}", {});
  });

  it('test_overrides_content_from_blocks', () => {
    assert_template_result('overriddenbottom', "{% embed 'source' %}{% block top %}overridden{% endblock %}{% endembed %}", {});
  });

  it('test_assign_inside_block', () => {
    const fixture = '{% embed \'source\' %}{% block top %}{% assign var = \'_assigned\' %}overridden{{var}}{% endblock %}{% endembed %}';
    assert_template_result('overridden_assignedbottom', fixture, {});
  });

  it('test_assign_outside_block', () => {
    const fixture = '{% embed "source" %}{% assign var = "_assigned" %}{% block top %}overridden{{var}}{% endblock %}{% endembed %}';
    assert_template_result('overriddenbottom', fixture, {});
  });

  it('test_embed_with', () => {
    const fixture = '{% embed "source" with a %}{% block top %}{{b}}{% endblock %}{% endembed %}';
    assert_template_result('new topbottom', fixture, { a: { b: 'new top' } });
  });
});

