'use strict';

const assert = require('assert').strict;
const { with_custom_tag } = require('../test_helpers');
const Dry = require('../..');

describe('block_test', () => {
  it('test_unexpected_end_tag', () => {
    assert.throws(() => Dry.Template.parse('{% if true %}{% endunless %}'));

    try {
      Dry.Template.parse('{% if true %}{% endunless %}');
    } catch (err) {
      assert.equal(err.message, "Dry syntax error: 'endunless' is not a valid delimiter for if tags. use endif");
    }
  });

  it('test_with_custom_tag', () => {
    with_custom_tag('testtag', class extends Dry.BlockTag {}, () => {
      assert(Dry.Template.parse('{% testtag %} {% endtesttag %}'));
    });
  });

  it('test_custom_block_tags_rendering', async () => {
    class klass1 extends Dry.BlockTag {
      render() {
        return 'hello';
      }
    }

    await with_custom_tag('blabla', klass1, async () => {
      const template = Dry.Template.parse('{% blabla %} bla {% endblabla %}');
      assert.equal('hello', await template.render());
      assert.equal('prefix+hello', await template.render({}, { output: 'prefix+' }));
    });

    class klass2 extends klass1 {
      render() {
        return 'foo' + super.render() + 'bar';
      }
    }

    await with_custom_tag('blabla', klass2, async () => {
      const template = Dry.Template.parse('{% blabla %} foo {% endblabla %}');
      assert.equal('foohellobar', await template.render());
      assert.equal('prefix+foohellobar', await template.render({}, { output: 'prefix+' }));
    });
  });
});

