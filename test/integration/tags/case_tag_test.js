
const { assert_template_result, render_strict } = require('../../test_helpers');
const assert = require('node:assert/strict');
const Dry = require('../../..');

describe('case_tag_test', () => {
  it('test_case', async () => {
    let assigns = { condition: 2 };
    await assert_template_result(' its 2 ',
      '{% case condition %}{% when 1 %} its 1 {% when 2 %} its 2 {% endcase %}',
      assigns
    );

    assigns = { condition: 1 };
    await assert_template_result(' its 1 ',
      '{% case condition %}{% when 1 %} its 1 {% when 2 %} its 2 {% endcase %}',
      assigns
    );

    assigns = { condition: 3 };
    await assert_template_result('', '{% case condition %}{% when 1 %} its 1 {% when 2 %} its 2 {% endcase %}', assigns);

    assigns = { condition: 'string here' };
    await assert_template_result(' hit ', '{% case condition %}{% when "string here" %} hit {% endcase %}', assigns);

    assigns = { condition: 'bad string here' };
    await assert_template_result('', '{% case condition %}{% when "string here" %} hit {% endcase %}', assigns);
  });

  it('test_case_with_else', async () => {
    let assigns = { condition: 5 };
    await assert_template_result(' hit ', '{% case condition %}{% when 5 %} hit {% else %} else {% endcase %}', assigns);

    assigns = { condition: 6 };
    await assert_template_result(' else ', '{% case condition %}{% when 5 %} hit {% else %} else {% endcase %}', assigns);

    assigns = { condition: 6 };
    await assert_template_result(' else ', '{% case condition %} {% when 5 %} hit {% else %} else {% endcase %}', assigns);
  });

  it('test_case_on_size', async () => {
    await assert_template_result('', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% endcase %}', { a: [] });
    await assert_template_result('1', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% endcase %}', { a: [1] });
    await assert_template_result('2', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% endcase %}', { a: [1, 1] });
    await assert_template_result('', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% endcase %}', { a: [1, 1, 1] });
    await assert_template_result('', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% endcase %}', { a: [1, 1, 1, 1] });
    await assert_template_result('', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% endcase %}', { a: [1, 1, 1, 1, 1] });
  });

  it('test_case_on_size_with_else', async () => {
    await assert_template_result('else', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% else %}else{% endcase %}', { a: [] });
    await assert_template_result('1', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% else %}else{% endcase %}', { a: [1] });
    await assert_template_result('2', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% else %}else{% endcase %}', { a: [1, 1]
    });

    await assert_template_result('else', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% else %}else{% endcase %}', { a: [1, 1, 1] });

    await assert_template_result('else', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% else %}else{% endcase %}', { a: [1, 1, 1, 1] });

    await assert_template_result('else', '{% case a.size %}{% when 1 %}1{% when 2 %}2{% else %}else{% endcase %}', { a: [1, 1, 1, 1, 1] });
  });

  it('test_case_on_length_with_else', async () => {
    await assert_template_result('else',
      '{% case a.empty? %}{% when true %}true{% when false %}false{% else %}else{% endcase %}',
      {}
    );

    await assert_template_result('false',
      '{% case false %}{% when true %}true{% when false %}false{% else %}else{% endcase %}',
      {}
    );

    await assert_template_result('true',
      '{% case true %}{% when true %}true{% when false %}false{% else %}else{% endcase %}',
      {}
    );

    await assert_template_result('else',
      '{% case NULL %}{% when true %}true{% when false %}false{% else %}else{% endcase %}',
      {}
    );
  });

  it('test_assign_from_case', async () => {
    // Example from the shopify forums
    const code = "{% case collection.handle %}{% when 'menswear-jackets' %}{% assign ptitle = 'menswear' %}{% when 'menswear-t-shirts' %}{% assign ptitle = 'menswear' %}{% else %}{% assign ptitle = 'womenswear' %}{% endcase %}{{ ptitle }}";
    const template = Dry.Template.parse(code);
    assert.equal('menswear', await template.render_strict({ collection: { handle: 'menswear-jackets' } }));
    assert.equal('menswear', await template.render_strict({ collection: { handle: 'menswear-t-shirts' } }));
    assert.equal('womenswear', await template.render_strict({ collection: { handle: 'x' } }));
    assert.equal('womenswear', await template.render_strict({ collection: { handle: 'y' } }));
    assert.equal('womenswear', await template.render_strict({ collection: { handle: 'z' } }));
  });

  it('test_case_when_or', async () => {
    let code = '{% case condition %}{% when 1 or 2 or 3 %} its 1 or 2 or 3 {% when 4 %} its 4 {% endcase %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 2 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 3 });
    await assert_template_result(' its 4 ', code, { condition: 4 });
    await assert_template_result('', code, { condition: 5 });

    code = '{% case condition %}{% when 1 or "string" or null %} its 1 or 2 or 3 {% when 4 %} its 4 {% endcase %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 'string' });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: null });
    await assert_template_result('', code, { condition: 'something else' });
  });

  it('test_case_when_comma', async () => {
    let code = '{% case condition %}{% when 1, 2, 3 %} its 1 or 2 or 3 {% when 4 %} its 4 {% endcase %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 2 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 3 });
    await assert_template_result(' its 4 ', code, { condition: 4 });
    await assert_template_result('', code, { condition: 5 });

    code = '{% case condition %}{% when 1, "string", null %} its 1 or 2 or 3 {% when 4 %} its 4 {% endcase %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 'string' });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: null });
    await assert_template_result('', code, { condition: 'something else' });
  });

  it('test_case_when_comma_with_assign', async () => {
    const code = handle => `
      {% assign handle = "${handle}" %}
      {% case handle %}
        {% when "cake" %}
          This is a cake
        {% when "cookie", "biscuit" %}
          This is a cookie
        {% else %}
          This is not a cake nor a cookie
      {% endcase %}
    `;

    assert.equal((await render_strict(code('cake'))).trim(), 'This is a cake');
    assert.equal((await render_strict(code('cookie'))).trim(), 'This is a cookie');
    assert.equal((await render_strict(code('biscuit'))).trim(), 'This is a cookie');
    assert.equal((await render_strict(code('foo'))).trim(), 'This is not a cake nor a cookie');
  });

  it('test_case_when_comma_and_blank_body', async () => {
    const code = '{% case condition %}{% when 1, 2 %} {% assign r = "result" %} {% endcase %}{{ r }}';
    await assert_template_result('  result', code, { condition: 2 });
  });

  it('test_case_detects_bad_syntax', async () => {
    await assert.rejects(() => {
      return assert_template_result('',  '{% case false %}{% when %}true{% endcase %}', {});
    });

    await assert.rejects(() => {
      return assert_template_result('',  '{% case false %}{% huh %}true{% endcase %}', {});
    });
  });
});
