'use strict';

const { assert_template_result } = require('../../test_helpers');

describe('continue_tag_test', () => {
  // tests that no weird errors are raised if (continue is called outside of a) {
  // block
  it('test_continue_with_no_block', () => {
    const assigns = {};
    const markup = '{% continue %}';
    const expected = '';

    assert_template_result(expected, markup, assigns);
  });
});
