'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { Template } = Dry;

describe('parse_append_unit_test', () => {
  it('test_blank_space', () => {
    const template = Template.parse('  ');
    assert.equal('  ', template.root.ast.value);
  });

  it('test_variable', () => {
    const template = Template.parse('{{funk}}  ');
    assert.equal('{{funk}}  ', template.root.ast.value);
  });

  it('test_block', () => {
    const fixture = '  {% comment %} {% endcomment %} ';
    const template = Template.parse(fixture);
    assert.equal(fixture, template.root.ast.value);
  });
});
