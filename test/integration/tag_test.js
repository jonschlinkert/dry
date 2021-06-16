'use strict';

const assert = require('assert').strict;
const { with_custom_tag } = require('../test_helpers');
const Dry = require('../..');
const { Tag } = Dry;

describe('tag_test', () => {
  it('test_custom_tags_have_a_default_render_to_output_buffer_method_for_backwards_compatibility', () => {
    const klass1 = class extends Tag {
      render() {
        return 'hello';
      }
    };

    with_custom_tag('blabla', klass1, () => {
      const template = Dry.Template.parse('{% blabla %}');
      assert.equal('hello', template.render());
    });

    const klass2 = class extends klass1 {
      render() {
        return 'foo' + super.render() + 'bar';
      }
    };

    with_custom_tag('blabla', klass2, () => {
      const template = Dry.Template.parse('{% blabla %}');
      assert.equal('foohellobar', template.render());
    });
  });
});
