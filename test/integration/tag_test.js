'use strict';

const assert = require('assert').strict;
const { with_custom_tag } = require('../test_helpers');
const Dry = require('../..');

describe('tag_test', () => {
  it('test_custom_tags_have_a_default_render_to_output_buffer_method_for_backwards_compatibility', async () => {
    const klass1 = class extends Dry.Tag {
      render() {
        return 'hello';
      }
    };

    await with_custom_tag('blabla', klass1, async () => {
      const template = Dry.Template.parse('{% blabla %}');
      assert.equal('hello', await template.render());
    });

    const klass2 = class extends klass1 {
      render() {
        return 'foo' + super.render() + 'bar';
      }
    };

    await with_custom_tag('blabla', klass2, async () => {
      const template = Dry.Template.parse('{% blabla %}');
      assert.equal('foohellobar', await template.render());
    });
  });
});
