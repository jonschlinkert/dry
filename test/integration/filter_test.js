
const util = require('util');
const assert = require('node:assert/strict');
const { render_strict, with_global_filter } = require('../test_helpers');
const { Context, Drop } = require('../..');
let context;

/**
 * Casing preserved from ruby liquid tests
 */

const moneyFilter = {
  money(input) {
    return util.format(' %d$ ', input);
  },
  money_with_underscore(input) {
    return util.format(' %d$ ', input);
  }
};

const canadianMoneyFilter = {
  money(input) {
    return util.format(' %d$ CAD ', input);
  }
};

const substituteFilter = {
  substitute(input, params = {}) {
    return input.replace(/%\{(\w+)\}/g, (m, $1) => params[$1]);
  }
};

const overrideObjectMethodFilter = {
  tap() {
    return 'tap overridden';
  }
};

class TestObject extends Drop {
  constructor(a) {
    super(a);
    this.a = a;
  }
}

describe('filters_test', () => {
  beforeEach(() => {
    context = new Context();
  });

  describe('filters', () => {
    it('test_missing_filters', () => {
      return assert.rejects(() => render_strict('{{blah | foo | bar}}', {}, { strict_filters: true }));
    });

    it('test_local_filter', async () => {
      context['blah'] = 1000;
      context.add_filters(moneyFilter);

      assert.equal(' 1000$ ', await render_strict('{{blah | money}}', context));
    });

    it('test_underscore_in_filter_name', async () => {
      context['blah'] = 1000;
      context.add_filters(moneyFilter);
      assert.equal(' 1000$ ', await render_strict('{{blah | money_with_underscore}}', context));
    });

    it('test_second_filter_overwrites_first', async () => {
      context['blah'] = 1000;
      context.add_filters(moneyFilter);
      context.add_filters(canadianMoneyFilter);

      assert.equal(' 1000$ CAD ', await render_strict('{{blah | money}}', context));
    });

    it('test_size', async () => {
      context['blah'] = 'abcd';
      context.add_filters(moneyFilter);

      assert.equal('4', await render_strict('{{blah | size}}', context));
    });

    it('test_join', async () => {
      context['blah'] = [1, 2, 3, 4];

      assert.equal('1 2 3 4', await render_strict('{{blah | join}}', context));
    });

    it('test_sort', async () => {
      context['value'] = 3;
      context['numbers'] = [2, 1, 4, 3];
      context['words'] = ['expected', 'as', 'alphabetic'];
      context['arrays'] = ['flower', 'are'];
      context['case_sensitive'] = ['sensitive', 'Expected', 'case'];

      assert.equal('1 2 3 4', await render_strict('{{numbers | sort | join}}', context));
      assert.equal('alphabetic as expected', await render_strict('{{words | sort | join}}', context));
      assert.equal('3', await render_strict('{{value | sort}}', context));
      assert.equal('are flower', await render_strict('{{arrays | sort | join}}', context));
      assert.equal('Expected case sensitive', await render_strict('{{case_sensitive | sort | join}}', context));
    });

    it('test_sort_natural', async () => {
      context['words'] = ['case', 'Assert', 'Insensitive'];
      context['hashes'] = [{ a: 'A' }, { a: 'b' }, { a: 'C' }];
      context['objects'] = [new TestObject('A'), new TestObject('b'), new TestObject('C')];

      // Test strings
      assert.equal('Assert case Insensitive', await render_strict('{{words | sort_natural | join}}', context));

      // Test hashes
      assert.equal('A b C', await render_strict("{{hashes | sort_natural: 'a' | map: 'a' | join}}", context));

      // Test objects
      assert.equal('A b C', await render_strict("{{objects | sort_natural: 'a' | map: 'a' | join}}", context));
    });

    it('test_compact', async () => {
      context['words'] = ['a', null, 'b', null, 'c'];
      context['hashes'] = [{ a: 'A' }, { a: null }, { a: 'C' }];
      context['objects'] = [new TestObject('A'), new TestObject(null), new TestObject('C')];

      // Test strings
      assert.equal('a b c', await render_strict('{{words | compact | join}}', context));

      // Test hashes
      assert.equal('A C', await render_strict("{{hashes | compact: 'a' | map: 'a' | join}}", context));

      // Test objects
      assert.equal('A C', await render_strict("{{objects | compact: 'a' | map: 'a' | join}}", context));
    });

    it('test_strip_html', async () => {
      context['blah'] = '<b>bla blub</a>';

      assert.equal('bla blub', await render_strict('{{ blah | strip_html }}', context));
    });

    it('test_strip_html_ignore_comments_with_html', async () => {
      context['blah'] = '<!-- split and some <ul> tag --><b>bla blub</a>';

      assert.equal('bla blub', await render_strict('{{ blah | strip_html }}', context));
    });

    it('test_capitalize', async () => {
      context['blah'] = 'blub';

      assert.equal('Blub', await render_strict('{{ blah | capitalize }}', context));
    });

    it('test_nonexistent_filter_is_ignored', async () => {
      context['blah'] = 1000;

      assert.equal('1000', await render_strict('{{ blah | xyzzy }}', context));
    });

    it('test_filter_with_keyword_arguments', async () => {
      context['surname'] = 'john';
      context['input'] = 'hello %{first_name}, %{last_name}';
      context.add_filters(substituteFilter);
      const output = await render_strict('{{ input | substitute: first_name: surname, last_name: "doe" }}', context);
      assert.equal('hello john, doe', output);
    });

    it('test_override_object_method_in_filter', async () => {
      assert.equal('tap overridden', await render_strict('{{blah | tap}}', { blah: 1000 }, { filters: [overrideObjectMethodFilter] }));

      // tap still treated as a non-existent filter
      assert.equal('1000', await render_strict('{{blah | tap}}', { blah: 1000 }));
    });
  });

  describe('filters_in_template', () => {
    it('test_local_global', async () => {
      await with_global_filter(moneyFilter, async () => {
        assert.equal(' 1000$ ', await render_strict('{{1000 | money}}', null, null));
        assert.equal(' 1000$ CAD ', await render_strict('{{1000 | money}}', null, { filters: canadianMoneyFilter }));
        assert.equal(' 1000$ CAD ', await render_strict('{{1000 | money}}', null, { filters: [canadianMoneyFilter] }));
      });
    });

    it('test_local_filter_with_deprecated_syntax', async () => {
      assert.equal(' 1000$ CAD ', await render_strict('{{1000 | money}}', null, [canadianMoneyFilter]));
    });
  });
});
