'use strict';

const assert = require('assert').strict;
const Dry = require('../..');

const render = (input, assigns, options) => {
  return Dry.Template.parse(input).render_strict(assigns, options);
};

const FunnyFilter = {
  make_funny(_input) {
    return 'LOL';
  },

  cite_funny(input) {
    return `LOL: ${input}`;
  },

  add_smiley(input, smiley = ':-)') {
    return `${input} ${smiley}`;
  },

  add_tag(input, tag = 'p', id = 'foo') {
    return `<${tag} id="${id}">${input}</${tag}>`;
  },

  paragraph(input) {
    return `<p>${input}</p>`;
  },

  link_to(name, url) {
    return `<a href="${url}">${name}</a>`;
  }
};

describe('output_test', () => {
  let assigns;

  beforeEach(() => {
    assigns = { best_cars: 'bmw', car: { bmw: 'good', gm: 'bad' } };
  });

  it('test_variable', async () => {
    const text = ' {{best_cars}} ';

    const expected = ' bmw ';
    assert.equal(expected, await render(text, assigns));
  });

  it('test_variable_traversing_with_two_brackets', async () => {
    const text = '{{ site.data.menu[include.menu][include.locale] }}';
    assert.equal('it works!', await render(text, {
      site: { data: { menu: { foo: { bar: 'it works!' } } } },
      include: { menu: 'foo', locale: 'bar' }
    }));
  });

  it('test_variable_traversing', async () => {
    const text = ' {{car.bmw}} {{car.gm}} {{car.bmw}} ';

    const expected = ' good bad good ';
    assert.equal(expected, await render(text, assigns));
  });

  it('test_variable_piping', async () => {
    const text = ' {{ car.gm | make_funny }} ';
    const expected = ' LOL ';

    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_variable_piping_with_input', async () => {
    const text = ' {{ car.gm | cite_funny }} ';
    const expected = ' LOL: bad ';

    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_variable_piping_with_args', async () => {
    const text = ' {{ car.gm | add_smiley : ":-(" }} ';
    const expected = ' bad :-( ';
    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_variable_piping_with_no_args', async () => {
    const text = ' {{ car.gm | add_smiley }} ';
    const expected = ' bad :-) ';
    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_multiple_variable_piping_with_args', async () => {
    const text = ' {{ car.gm | add_smiley : ":-(" | add_smiley : ":-(" }} ';
    const expected = ' bad :-( :-( ';
    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_variable_piping_with_multiple_args', async () => {
    const text = ' {{ car.gm | add_tag : "span", "bar" }} ';
    const expected = ' <span id="bar">bad</span> ';

    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_variable_piping_with_variable_args', async () => {
    const text = ' {{ car.gm | add_tag : "span", car.bmw }} ';
    const expected = ' <span id="good">bad</span> ';

    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_multiple_pipings', async () => {
    const text = ' {{ best_cars | cite_funny | paragraph }} ';
    const expected = ' <p>LOL: bmw</p> ';

    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });

  it('test_link_to', async () => {
    const text = ' {{ "Typo" | link_to: "http://typo.leetsoft.com" }} ';
    const expected = ' <a href="http://typo.leetsoft.com">Typo</a> ';

    assert.equal(expected, await render(text, assigns, { filters: [FunnyFilter] }));
  });
});
