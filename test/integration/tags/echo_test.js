
const { assert_template_result } = require('../../test_helpers');

describe('echo_test', () => {
  it('test_echo_outputs_its_input', async () => {
    await assert_template_result('BAR', '{%- echo variable-name | upcase -%}', { 'variable-name': 'bar' });
  });
});

