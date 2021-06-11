'use strict';

const { assert_template_result } = require('../../test_helpers');

describe('break_tag_test', () => {
  // tests that no weird errors are raised if (break is called outside of a) {
  // block
  it('test_break_with_no_block', () => {
    const assigns = { i: 1 };
    const markup = '{% break %}';
    const expected = '';

    assert_template_result(expected, markup, assigns);
  });
});
