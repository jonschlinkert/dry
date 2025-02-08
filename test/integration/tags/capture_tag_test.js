
const assert = require('node:assert/strict');
const { assert_template_result } = require('../../test_helpers');
const { Template } = require('../../..');

describe('capture_tag_test', () => {
  it('test_captures_block_content_in_variable', async () => {
    await assert_template_result('test string', "{% capture 'var' %}test string{% endcapture %}{{var}}", {});
  });

  it('test_capture_with_hyphen_in_variable_name', async () => {
    const template_source = `
    {% capture this-thing %}Print this-thing{% endcapture %}
    {{ this-thing }}
    `;
    const template = Template.parse(template_source);
    const rendered = await template.render_strict();
    assert.equal('Print this-thing', rendered.trim());
  });

  it('test_capture_to_variable_from_outer_scope_if_existing', async () => {
    const template_source = `
    {% assign var = '' %}
    {% if true %}
    {% capture var %}first-block-string{% endcapture %}
    {% endif %}
    {% if true %}
    {% capture var %}test-string{% endcapture %}
    {% endif %}
    {{var}}
    `;
    const template = Template.parse(template_source);
    const rendered = await template.render_strict();
    assert.equal('test-string', rendered.replace(/\s/g, ''));
  });

  it('test_assigning_from_capture', async () => {
    const template_source = `
    {% assign first = '' %}
    {% assign second = '' %}
    {% for number in (1..3) %}
    {% capture first %}{{number}}{% endcapture %}
    {% assign second = first %}
    {% endfor %}
    {{ first }}-{{ second }}
    `;
    const template = Template.parse(template_source);
    const rendered = await template.render_strict();
    assert.equal('3-3', rendered.replace(/\s/g, ''));
  });

  it('test_assigned_variable_from_outer_scope_inside_capture', async () => {
    const template_source = `
      {% assign foo = "assigned" %}
      {% capture bar %}
      Inner content
      {{ foo }}
      {% endcapture %}
      {{ bar }}
    `;

    const template = Template.parse(template_source);
    const rendered = await template.render_strict();
    assert.equal('Innercontentassigned', rendered.replace(/\s/g, ''));
  });

  it('test_increment_assign_score_by_bytes_not_characters', async () => {
    const t = Template.parse('{% capture foo %}すごい{% endcapture %}');
    await t.render_strict();
    assert.equal(9, t.resource_limits.assign_score);
  });
});

