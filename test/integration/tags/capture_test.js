'use strict';

const assert = require('assert').strict;
const { assert_template_result } = require('../../test_helpers');
const { Template } = require('../../..');

describe('capture_test', () => {
  it('test_captures_block_content_in_variable', () => {
    assert_template_result('test string', "{% capture 'var' %}test string{% endcapture %}{{var}}", {});
  });

  it('test_capture_with_hyphen_in_variable_name', () => {
    const template_source = `
    {% capture this-thing %}Print this-thing{% endcapture %}
    {{ this-thing }}
    `;
    const template = Template.parse(template_source);
    const rendered = template.render_strict();
    assert.equal('Print this-thing', rendered.trim());
  });

  it('test_capture_to_variable_from_outer_scope_if_existing', () => {
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
    const rendered = template.render_strict();
    assert.equal('test-string', rendered.replace(/\s/g, ''));
  });

  it('test_assigning_from_capture', () => {
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
    const rendered = template.render_strict();
    assert.equal('3-3', rendered.replace(/\s/g, ''));
  });

  it('test_increment_assign_score_by_bytes_not_characters', () => {
    const template = Template.parse('{% capture foo %}すごい{% endcapture %}');
    template.render_strict();
    console.log(template.resource_limits);
    assert.equal(9, template.resource_limits.assign_score);
  });
});
