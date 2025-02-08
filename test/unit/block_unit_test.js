
const assert = require('node:assert/strict');
const Dry = require('../..');
const { Variable, nodes, tags } = Dry;
const { Comment } = tags;
const { Text } = nodes;

const block_types = nodes => {
  return nodes.map(node => node.constructor);
};

describe('block_unit_test', () => {
  it('test_blankspace', () => {
    const template = Dry.Template.parse('  ');
    assert.equal('  ', template.root.ast.nodes[0].value);
  });

  it('test_variable_beginning', () => {
    const template = Dry.Template.parse('{{funk}}  ');
    assert.equal(2, template.root.ast.nodes.length);
    assert.equal(Variable, template.root.ast.nodes[0].constructor);
    assert.equal(Text, template.root.ast.nodes[1].constructor);
  });

  it('test_variable_end', () => {
    const template = Dry.Template.parse('  {{funk}}');
    assert.equal(2, template.root.ast.nodes.length);
    assert.equal(Text, template.root.ast.nodes[0].constructor);
    assert.equal(Variable, template.root.ast.nodes[1].constructor);
  });

  it('test_variable_middle', () => {
    const template = Dry.Template.parse('  {{funk}}  ');
    assert.equal(3, template.root.ast.nodes.length);
    assert.equal(Text, template.root.ast.nodes[0].constructor);
    assert.equal(Variable, template.root.ast.nodes[1].constructor);
    assert.equal(Text, template.root.ast.nodes[2].constructor);
  });

  it('test_variable_many_embedded_fragments', () => {
    const template = Dry.Template.parse('  {{funk}} {{so}} {{brother}} ');
    assert.equal(7, template.root.ast.nodes.length);
    assert.deepEqual([Text, Variable, Text, Variable, Text, Variable, Text], block_types(template.root.ast.nodes));
  });

  it('test_with_block', () => {
    const template = Dry.Template.parse('  {% comment %} {% endcomment %} ');
    assert.equal(3, template.root.ast.nodes.length);
    assert.deepEqual([Text, Comment, Text], block_types(template.root.ast.nodes));
  });
});
