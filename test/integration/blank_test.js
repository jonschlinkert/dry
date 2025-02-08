
const Dry = require('../..');
const { assert_template_result, with_custom_tag } = require('../test_helpers');

class FoobarTag extends Dry.Tag {
  render(_context, output = '') {
    return output + ' ';
  }
}

class BlankTestFileSystem {
  read_template_file(_template_path) {
    return _template_path;
  }
}

describe('blank_test', () => {
  const N = 10;

  const wrap_in_for = body => {
    return `{% for i in (1..${N}) %}${body}{% endfor %}`;
  };

  const wrap_in_if = body => {
    return `{% if true %}${body}{% endif %}`;
  };

  const wrap = body => {
    return wrap_in_for(body) + wrap_in_if(body);
  };

  it.skip('test_new_tags_are_not_blank_by_default', () => {
    return with_custom_tag('foobar', FoobarTag, () => {
      return assert_template_result(' '.repeat(N), wrap_in_for('{% foobar %}'));
    });
  });

  it('test_loops_are_blank', async () => {
    await assert_template_result('', wrap_in_for(' '));
  });

  it('test_if_else_are_blank', async () => {
    await assert_template_result('', '{% if true %} {% elsif false %} {% else %} {% endif %}');
  });

  it('test_unless_is_blank', async () => {
    await assert_template_result('', wrap('{% unless true %} {% endunless %}'));
  });

  it.skip('test_mark_as_blank_only_during_parsing', async () => {
    await assert_template_result(' '.repeat(N + 1), wrap(' {% if false %} this never happens, but still, this block is not blank {% endif %}'));
  });

  it('test_comments_are_blank', async () => {
    await assert_template_result('', wrap(' {% comment %} whatever {% endcomment %} '));
  });

  it('test_captures_are_blank', async () => {
    await assert_template_result('', wrap(' {% capture foo %} whatever {% endcapture %} '));
  });

  it.skip('test_nested_blocks_are_blank_but_only_if_all_children_are', async () => {
    await assert_template_result('', wrap(wrap(' ')));
    await assert_template_result('\n       but this is not '.repeat(N + 1),
      wrap(`{% if true %} {% comment %} this is blank {% endcomment %} {% endif %}
      {% if true %} but this is not {% endif %}`));
  });

  it('test_assigns_are_blank', async () => {
    await assert_template_result('', wrap(' {% assign foo = "bar" %} '));
  });

  it('test_whitespace_is_blank', async () => {
    await assert_template_result('', wrap(' '));
    await assert_template_result('', wrap('\t'));
  });

  it('test_whitespace_is_not_blank_if_other_stuff_is_present', async () => {
    const body = '     x ';
    await assert_template_result(body.repeat(N + 1), wrap(body));
  });

  it('test_increment_is_not_blank', async () => {
    await assert_template_result(' 0'.repeat(2 * (N + 1)), wrap('{% assign foo = 0 %} {% increment foo %} {% decrement foo %}'));
  });

  it.skip('test_cycle_is_not_blank', async () => {
    await assert_template_result('  '.repeat((N + 1) / 2) + ' ', wrap("{% cycle ' ', ' ' %}"));
  });

  it.skip('test_raw_is_not_blank', async () => {
    await assert_template_result('  '.repeat(N + 1), wrap(' {% raw %} {% endraw %}'));
  });

  it.skip('test_include_is_blank', async () => {
    Dry.Template.file_system = new BlankTestFileSystem();
    await assert_template_result('foobar'.repeat(N + 1), wrap("{% include 'foobar' %}"));
    await assert_template_result(' foobar '.repeat(N + 1), wrap("{% include ' foobar ' %}"));
    await assert_template_result('   '.repeat(N + 1), wrap(" {% include ' ' %} "));
  });

  it('test_case_is_blank', async () => {
    await assert_template_result('', wrap(" {% assign foo = 'bar' %} {% case foo %} {% when 'bar' %} {% when 'whatever' %} {% else %} {% endcase %} "));
    await assert_template_result('', wrap(" {% assign foo = 'else' %} {% case foo %} {% when 'bar' %} {% when 'whatever' %} {% else %} {% endcase %} "));
    await assert_template_result('   x  '.repeat(N + 1), wrap(" {% assign foo = 'else' %} {% case foo %} {% when 'bar' %} {% when 'whatever' %} {% else %} x {% endcase %} "));
  });
});

