
const assert = require('node:assert/strict');
const Dry = require('../../..');

describe('case_tag_unit_test', () => {
  it('test_case_nodelist', () => {
    const template = Dry.Template.parse('{% case var %}{% when true %}WHEN{% else %}ELSE{% endcase %}');
    assert.deepEqual(['WHEN', 'ELSE'], template.root.ast.nodes[0].nodelist.flat());
  });
});

