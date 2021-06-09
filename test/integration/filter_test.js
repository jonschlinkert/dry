'use strict';

const util = require('util');
const assert = require('assert').strict;
const { assert_raises, with_global_filter } = require('../test_helpers');
const { ArgumentError, Template, Context, Drop } = require('../..');
let context;

const render = (input, assigns, options) => {
  return Template.parse(input).render_strict(assigns, options);
};

/**
 * Casing preserved from ruby liquid tests
 */

const MoneyFilter = {
  money(input) {
    return util.format(' %d$ ', input);
  },
  money_with_underscore(input) {
    return util.format(' %d$ ', input);
  }
};

const CanadianMoneyFilter = {
  money(input) {
    return util.format(' %d$ CAD ', input);
  }
};

const SubstituteFilter = {
  substitute(input, params = {}) {
    return input.replace(/%\{(\w+)\}/g, (m, $1) => params[$1]);
  }
};

const OverrideObjectMethodFilter = {
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
    it('test_local_filter', () => {
      context['var'] = 1000;
      context.add_filters(MoneyFilter);

      assert.equal(' 1000$ ', render('{{var | money}}', context));
    });

    it('test_underscore_in_filter_name', () => {
      context['var'] = 1000;
      context.add_filters(MoneyFilter);
      assert.equal(' 1000$ ', render('{{var | money_with_underscore}}', context));
    });

    it('test_second_filter_overwrites_first', () => {
      context['var'] = 1000;
      context.add_filters(MoneyFilter);
      context.add_filters(CanadianMoneyFilter);

      assert.equal(' 1000$ CAD ', render('{{var | money}}', context));
    });

    it('test_size', () => {
      context['var'] = 'abcd';
      context.add_filters(MoneyFilter);

      assert.equal('4', render('{{var | size}}', context));
    });

    it('test_join', () => {
      context['var'] = [1, 2, 3, 4];

      assert.equal('1 2 3 4', render('{{var | join}}', context));
    });

    it('test_sort', () => {
      context['value'] = 3;
      context['numbers'] = [2, 1, 4, 3];
      context['words'] = ['expected', 'as', 'alphabetic'];
      context['arrays'] = ['flower', 'are'];
      context['case_sensitive'] = ['sensitive', 'Expected', 'case'];

      assert.equal('1 2 3 4', render('{{numbers | sort | join}}', context));
      assert.equal('alphabetic as expected', render('{{words | sort | join}}', context));
      assert.equal('3', render('{{value | sort}}', context));
      assert.equal('are flower', render('{{arrays | sort | join}}', context));
      assert.equal('Expected case sensitive', render('{{case_sensitive | sort | join}}', context));
    });

    it('test_sort_natural', () => {
      context['words'] = ['case', 'Assert', 'Insensitive'];
      context['hashes'] = [{ a: 'A' }, { a: 'b' }, { a: 'C' }];
      context['objects'] = [new TestObject('A'), new TestObject('b'), new TestObject('C')];

      // Test strings
      assert.equal('Assert case Insensitive', render('{{words | sort_natural | join}}', context));

      // Test hashes
      assert.equal('A b C', render("{{hashes | sort_natural: 'a' | map: 'a' | join}}", context));

      // Test objects
      assert.equal('A b C', render("{{objects | sort_natural: 'a' | map: 'a' | join}}", context));
    });

    it('test_compact', () => {
      context['words'] = ['a', null, 'b', null, 'c'];
      context['hashes'] = [{ a: 'A' }, { a: null }, { a: 'C' }];
      context['objects'] = [new TestObject('A'), new TestObject(null), new TestObject('C')];

      // Test strings
      assert.equal('a b c', render('{{words | compact | join}}', context));

      // Test hashes
      assert.equal('A C', render("{{hashes | compact: 'a' | map: 'a' | join}}", context));

      // Test objects
      assert.equal('A C', render("{{objects | compact: 'a' | map: 'a' | join}}", context));
    });

    it('test_strip_html', () => {
      context['var'] = '<b>bla blub</a>';

      assert.equal('bla blub', render('{{ var | strip_html }}', context));
    });

    it('test_strip_html_ignore_comments_with_html', () => {
      context['var'] = '<!-- split and some <ul> tag --><b>bla blub</a>';

      assert.equal('bla blub', render('{{ var | strip_html }}', context));
    });

    it('test_capitalize', () => {
      context['var'] = 'blub';

      assert.equal('Blub', render('{{ var | capitalize }}', context));
    });

    it('test_nonexistent_filter_is_ignored', () => {
      context['var'] = 1000;

      assert.equal('1000', render('{{ var | xyzzy }}', context));
    });

    it('test_filter_with_keyword_arguments', () => {
      context['surname'] = 'john';
      context['input'] = 'hello %{first_name}, %{last_name}';
      context.add_filters(SubstituteFilter);
      const output = render('{{ input | substitute: first_name: surname, last_name: "doe" }}', context);
      assert.equal('hello john, doe', output);
    });

    it.skip('test_override_object_method_in_filter', () => {
      assert.equal('tap overridden', render('{{var | tap}}', { var: 1000 }, { filters: [OverrideObjectMethodFilter] }));

      // tap still treated as a non-existent filter
      assert.equal('1000', render('{{var | tap}}', { var: 1000 }));
    });

    it.skip('test_liquid_argument_error', () => {
      const source = "{{ '' | size: 'too many args' }}";
      const exc = assert_raises(ArgumentError, () => render(source));
      assert(/Dry error: wrong number of arguments/.test(exc.message));
      assert.equal(exc.message, render(source));
    });
  });

  describe('filters_in_template', () => {
    it('test_local_global', () => {
      with_global_filter(MoneyFilter, () => {
        assert.equal(' 1000$ ', render('{{1000 | money}}', null, null));
        assert.equal(' 1000$ CAD ', render('{{1000 | money}}', null, { filters: CanadianMoneyFilter }));
        assert.equal(' 1000$ CAD ', render('{{1000 | money}}', null, { filters: [CanadianMoneyFilter] }));
      });
    });

    it('test_local_filter_with_deprecated_syntax', () => {
      assert.equal(' 1000$ CAD ', render('{{1000 | money}}', null, CanadianMoneyFilter));
      assert.equal(' 1000$ CAD ', render('{{1000 | money}}', null, [CanadianMoneyFilter]));
    });
  });
});
