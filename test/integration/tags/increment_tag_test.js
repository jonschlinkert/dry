
const { assert_template_result } = require('../../test_helpers');

describe('increment tag tests', () => {
  it('inc', async () => {
    await assert_template_result('0', '{%increment port %}', {});
    await assert_template_result('0 1', '{%increment port %} {%increment port%}', {});
    await assert_template_result('0 0 1 2 1', '{%increment port %} {%increment starboard%} {%increment port %} {%increment port%} {%increment starboard %}', {});
  });

  it('dec', async () => {
    // await assert_template_result('9', '{%decrement port %}', { port: 10 });
    await assert_template_result('-1 -2', '{%decrement port %} {%decrement port%}', {});
    await assert_template_result('1 5 2 2 5', '{%increment port %} {%increment starboard%} {%increment port %} {%decrement port%} {%decrement starboard %}', { port: 1, starboard: 5 });
  });
});
