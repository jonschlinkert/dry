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

  it('test_custom_block_tags_rendering', () => {
    class klass1 extends Dry.BlockTag {
      render() {
        return 'hello';
      }
    }

    with_custom_tag('blabla', klass1, () => {
      const template = Dry.Template.parse('{% blabla %} bla {% endblabla %}');
      assert.equal('hello', template.render());
      assert.equal('prefix+hello', template.render({}, { output: 'prefix+' }));
    });

    class klass2 extends klass1 {
      render() {
        return 'foo' + super.render() + 'bar';
      }
    }

    with_custom_tag('blabla', klass2, () => {
      const template = Dry.Template.parse('{% blabla %} foo {% endblabla %}');
      assert.equal('foohellobar', template.render());
      assert.equal('prefix+foohellobar', template.render({}, { output: 'prefix+' }));
    });
  });
});

