
const assert = require('node:assert/strict');
const Dry = require('../../..');

describe('if_tag_unit_test', () => {
  it('test_if_nodelist', () => {
    const template = Dry.Template.parse('{% if true %}IF{% else %}ELSE{% endif %}');
    assert.deepEqual(['IF', 'ELSE'], template.root.ast.nodelist[0].nodelist);
  });
});

