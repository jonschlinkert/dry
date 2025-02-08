
const { assert_template_result, render_strict } = require('../../test_helpers');
const assert = require('node:assert/strict');
const Dry = require('../../..');

describe('switch_tag_test', () => {
  it('test_switch', async () => {
    let assigns = { condition: 2 };
    await assert_template_result(' its 2 ',
      '{% switch condition %}{% case 1 %} its 1 {% case 2 %} its 2 {% endswitch %}',
      assigns
    );

    assigns = { condition: 1 };
    await assert_template_result(' its 1 ',
      '{% switch condition %}{% case 1 %} its 1 {% case 2 %} its 2 {% endswitch %}',
      assigns
    );

    assigns = { condition: 3 };
    await assert_template_result('', '{% switch condition %}{% case 1 %} its 1 {% case 2 %} its 2 {% endswitch %}', assigns);

    assigns = { condition: 'string here' };
    await assert_template_result(' hit ', '{% switch condition %}{% case "string here" %} hit {% endswitch %}', assigns);

    assigns = { condition: 'bad string here' };
    await assert_template_result('', '{% switch condition %}{% case "string here" %} hit {% endswitch %}', assigns);
  });

  it('test_switch_with_else', async () => {
    let assigns = { condition: 5 };
    await assert_template_result(' hit ', '{% switch condition %}{% case 5 %} hit {% else %} else {% endswitch %}', assigns);

    assigns = { condition: 6 };
    await assert_template_result(' else ', '{% switch condition %}{% case 5 %} hit {% else %} else {% endswitch %}', assigns);

    assigns = { condition: 6 };
    await assert_template_result(' else ', '{% switch condition %} {% case 5 %} hit {% else %} else {% endswitch %}', assigns);
  });

  it('test_switch_on_size', async () => {
    await assert_template_result('', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% endswitch %}', { a: [] });
    await assert_template_result('1', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% endswitch %}', { a: [1] });
    await assert_template_result('2', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% endswitch %}', { a: [1, 1] });
    await assert_template_result('', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% endswitch %}', { a: [1, 1, 1] });
    await assert_template_result('', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% endswitch %}', { a: [1, 1, 1, 1] });
    await assert_template_result('', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% endswitch %}', { a: [1, 1, 1, 1, 1] });
  });

  it('test_switch_on_size_with_else', async () => {
    await assert_template_result('else', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% else %}else{% endswitch %}', { a: [] });
    await assert_template_result('1', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% else %}else{% endswitch %}', { a: [1] });
    await assert_template_result('2', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% else %}else{% endswitch %}', { a: [1, 1]
    });

    await assert_template_result('else', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% else %}else{% endswitch %}', { a: [1, 1, 1] });

    await assert_template_result('else', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% else %}else{% endswitch %}', { a: [1, 1, 1, 1] });

    await assert_template_result('else', '{% switch a.size %}{% case 1 %}1{% case 2 %}2{% else %}else{% endswitch %}', { a: [1, 1, 1, 1, 1] });
  });

  it('test_switch_on_length_with_else', async () => {
    await assert_template_result('else',
      '{% switch a.empty? %}{% case true %}true{% case false %}false{% else %}else{% endswitch %}',
      {}
    );

    await assert_template_result('false',
      '{% switch false %}{% case true %}true{% case false %}false{% else %}else{% endswitch %}',
      {}
    );

    await assert_template_result('true',
      '{% switch true %}{% case true %}true{% case false %}false{% else %}else{% endswitch %}',
      {}
    );

    await assert_template_result('else',
      '{% switch NULL %}{% case true %}true{% case false %}false{% else %}else{% endswitch %}',
      {}
    );
  });

  it('test_assign_from_switch', async () => {
    // Example from the shopify forums
    const code = "{% switch collection.handle %}{% case 'menswear-jackets' %}{% assign ptitle = 'menswear' %}{% case 'menswear-t-shirts' %}{% assign ptitle = 'menswear' %}{% else %}{% assign ptitle = 'womenswear' %}{% endswitch %}{{ ptitle }}";
    const template = Dry.Template.parse(code);
    assert.equal('menswear', await template.render_strict({ collection: { handle: 'menswear-jackets' } }));
    assert.equal('menswear', await template.render_strict({ collection: { handle: 'menswear-t-shirts' } }));
    assert.equal('womenswear', await template.render_strict({ collection: { handle: 'x' } }));
    assert.equal('womenswear', await template.render_strict({ collection: { handle: 'y' } }));
    assert.equal('womenswear', await template.render_strict({ collection: { handle: 'z' } }));
  });

  it('test_switch_case_or', async () => {
    let code = '{% switch condition %}{% case 1 or 2 or 3 %} its 1 or 2 or 3 {% case 4 %} its 4 {% endswitch %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 2 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 3 });
    await assert_template_result(' its 4 ', code, { condition: 4 });
    await assert_template_result('', code, { condition: 5 });

    code = '{% switch condition %}{% case 1 or "string" or null %} its 1 or 2 or 3 {% case 4 %} its 4 {% endswitch %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 'string' });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: null });
    await assert_template_result('', code, { condition: 'something else' });
  });

  it('test_switch_case_comma', async () => {
    let code = '{% switch condition %}{% case 1, 2, 3 %} its 1 or 2 or 3 {% case 4 %} its 4 {% endswitch %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 2 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 3 });
    await assert_template_result(' its 4 ', code, { condition: 4 });
    await assert_template_result('', code, { condition: 5 });

    code = '{% switch condition %}{% case 1, "string", null %} its 1 or 2 or 3 {% case 4 %} its 4 {% endswitch %}';
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 1 });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: 'string' });
    await assert_template_result(' its 1 or 2 or 3 ', code, { condition: null });
    await assert_template_result('', code, { condition: 'something else' });
  });

  it('test_switch_case_comma_with_assign', async () => {
    const code = handle => `
      {% assign handle = "${handle}" %}
      {% switch handle %}
        {% case "cake" %}
          This is a cake
        {% case "cookie", "biscuit" %}
          This is a cookie
        {% else %}
          This is not a cake nor a cookie
      {% endswitch %}
    `;

    assert.equal((await render_strict(code('cake'))).trim(), 'This is a cake');
    assert.equal((await render_strict(code('cookie'))).trim(), 'This is a cookie');
    assert.equal((await render_strict(code('biscuit'))).trim(), 'This is a cookie');
    assert.equal((await render_strict(code('foo'))).trim(), 'This is not a cake nor a cookie');
  });

  it('test_switch_case_comma_and_blank_body', async () => {
    const code = '{% switch condition %}{% case 1, 2 %} {% assign r = "result" %} {% endswitch %}{{ r }}';
    await assert_template_result('  result', code, { condition: 2 });
  });

  it('test_switch_detects_bad_syntax', async () => {
    await assert.rejects(() => {
      return assert_template_result('',  '{% switch false %}{% case %}true{% endswitch %}', {});
    });

    await assert.rejects(() => {
      return assert_template_result('',  '{% switch false %}{% huh %}true{% endswitch %}', {});
    });
  });
});
