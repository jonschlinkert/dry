'use strict';

const assert = require('assert').strict;
const Dry = require('../../..');

describe('for_tag_unit_test', () => {
  it('test_for_nodelist', () => {
    const template = Dry.Template.parse('{% for item in items %}FOR{% endfor %}');
    assert.deepEqual(['FOR'], template.root.ast.nodelist[0].nodelist.flat());
  });

  it('test_for_else_nodelist', () => {
    const template = Dry.Template.parse('{% for item in items %}FOR{% else %}ELSE{% endfor %}');
    assert.deepEqual(['FOR', 'ELSE'], template.root.ast.nodelist[0].nodelist);
  });
});

