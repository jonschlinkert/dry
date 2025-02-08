
const { assert_template_result } = require('../../test_helpers');

describe('unless_else_tag_test', () => {
  it('test_unless', async () => {
    await assert_template_result('  ', ' {% unless true %} this text should not go into the output {% endunless %} ');
    await assert_template_result('  this text should go into the output  ', ' {% unless false %} this text should go into the output {% endunless %} ');
    await assert_template_result('  you rock ?', '{% unless true %} you suck {% endunless %} {% unless false %} you rock {% endunless %}?');
  });

  it('test_unless_else', async () => {
    await assert_template_result(' YES ', '{% unless true %} NO {% else %} YES {% endunless %}');
    await assert_template_result(' YES ', '{% unless false %} YES {% else %} NO {% endunless %}');
    await assert_template_result(' YES ', '{% unless "foo" %} NO {% else %} YES {% endunless %}');
  });

  it('test_unless_in_loop', async () => {
    await assert_template_result('23', '{% for i in choices %}{% unless i %}{{ forloop.index }}{% endunless %}{% endfor %}', { choices: [1, null, false] });
  });

  it('test_unless_else_in_loop', async () => {
    await assert_template_result(' TRUE  2  3 ', '{% for i in choices %}{% unless i %} {{ forloop.index }} {% else %} TRUE {% endunless %}{% endfor %}', { choices: [1, null, false] });
  });
});
