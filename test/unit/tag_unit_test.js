'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { Context, State, Tag, expressions } = Dry;
const { Tokenizer } = expressions;

describe('tag_unit_test', () => {
  it('test_tag', () => {
    const state = new State();
    const tag = Tag.parse({ name: 'tag', value: '' }, new Tokenizer('', state), state);
    assert.equal('tag', tag.name);
    assert.equal('', tag.render(new Context()));
  });

  it('test_return_raw_text_of_tag', () => {
    const state = new State();
    const node = { name: 'long_tag', value: 'param1, param2, param3' };
    const tag = Tag.parse(node, new Tokenizer('', state), state);
    assert.equal('long_tag param1, param2, param3', tag.raw);
  });

  it('test_tag_name_should_return_name_of_the_tag', () => {
    const state = new State();
    const node = { name: 'some_tag', value: '' };
    const tag = Tag.parse(node, new Tokenizer('', state), state);
    assert.equal('some_tag', tag.name);
  });
});

