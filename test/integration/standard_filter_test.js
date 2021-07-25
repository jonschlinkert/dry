/* eslint-disable no-useless-catch */
'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { assert_raises, assert_template_result, ThingWithToLiquid } = require('../test_helpers');
const { Context, StandardFilters, Template, utils } = Dry;

const orig_filters = { ...StandardFilters };
let filters;

class TestThing {
  constructor() {
    this.foo = 0;
    return new Proxy(this, {
      get(target, key) {
        return (key in target || typeof key !== 'string') ? target[key] : target.get(key);
      }
    });
  }

  to_s() {
    return `woot: ${this.foo}`;
  }

  toString() {
    return this.to_s();
  }

  get() {
    return this.to_s();
  }

  to_liquid() {
    this.foo += 1;
    return this;
  }
}

class TestDrop extends Dry.Drop {
  test() {
    return 'testfoo';
  }
}

class TestEnumerable extends Dry.Drop {
  each(block) {
    return [{ foo: 1, bar: 2 }, { foo: 2, bar: 1 }, { foo: 3, bar: 3 }].map(block);
  }
}

class NumberLikeThing extends Dry.Drop {
  constructor(amount) {
    super();
    this.amount = amount;
  }

  to_number() {
    return this.amount;
  }
}

const w = s => !s ? [] : s.split(' ');

const with_timezone = (tz, callback) => {
  const old_tz = process.env['TZ'];
  try {
    process.env['TZ'] = tz;
    return callback();
  } catch (err) {
    throw err;
  } finally {
    process.env['TZ'] = old_tz;
  }
};

describe('standard_filters_test', () => {
  beforeEach(() => {
    filters = {};
    for (const [key, value] of Object.entries(orig_filters)) {
      filters[key] = function(...args) {
        const ctx = this || {};
        ctx.context ||= new Context();
        return value.call(ctx, ...args);
      };
    }
  });

  it('test_size', () => {
    assert.equal(3, filters.size([1, 2, 3]));
    assert.equal(0, filters.size([]));
    assert.equal(0, filters.size(null));
  });

  it('test_downcase', () => {
    assert.equal('testing', filters.downcase('Testing'));
    assert.equal('', filters.downcase(null));
  });

  it('test_upcase', () => {
    assert.equal('TESTING', filters.upcase('Testing'));
    assert.equal('', filters.upcase(null));
  });

  it('test_slice', async () => {
    assert.equal('oob', filters.slice('foobar', 1, 3));
    assert.equal('oobar', filters.slice('foobar', 1, 1000));
    assert.equal('', filters.slice('foobar', 1, 0));
    assert.equal('o', filters.slice('foobar', 1, 1));
    assert.equal('bar', filters.slice('foobar', 3, 3));
    assert.equal('ar', filters.slice('foobar', -2, 2));
    assert.equal('ar', filters.slice('foobar', -2, 1000));
    assert.equal('r', filters.slice('foobar', -1));
    assert.equal('', filters.slice(null, 0));
    assert.equal('', filters.slice('foobar', 100, 10));
    assert.equal('', filters.slice('foobar', -100, 10));
    assert.equal('oob', filters.slice('foobar', '1', '3'));

    await assert.rejects(async () => filters.slice('foobar', null), Dry.ArgumentError);
    await assert.rejects(async () => filters.slice('foobar', 0, ''), Dry.ArgumentError);
  });

  it('test_slice_on_arrays', () => {
    const input = 'foobar'.split('');
    assert.deepEqual(w('o o b'), filters.slice(input, 1, 3));
    assert.deepEqual(w('o o b a r'), filters.slice(input, 1, 1000));
    assert.deepEqual(w(''), filters.slice(input, 1, 0));
    assert.deepEqual(w('o'), filters.slice(input, 1, 1));
    assert.deepEqual(w('b a r'), filters.slice(input, 3, 3));
    assert.deepEqual(w('a r'), filters.slice(input, -2, 2));
    assert.deepEqual(w('a r'), filters.slice(input, -2, 1000));
    assert.deepEqual(w('r'), filters.slice(input, -1));
    assert.deepEqual(w(''), filters.slice(input, 100, 10));
    assert.deepEqual(w(''), filters.slice(input, -100, 10));
  });

  it('test_truncate', () => {
    assert.equal('1234...', filters.truncate('1234567890', 7));
    assert.equal('1234567890', filters.truncate('1234567890', 20));
    assert.equal('...', filters.truncate('1234567890', 0));
    assert.equal('1234567890', filters.truncate('1234567890'));
    assert.equal('测试...', filters.truncate('测试测试测试测试', 5));
    assert.equal('12341', filters.truncate('1234567890', 5, 1));
  });

  it('test_split', () => {
    assert.deepEqual(['12', '34'], filters.split('12~34', '~'));
    assert.deepEqual(['A? ', ' ,Z'], filters.split('A? ~ ~ ~ ,Z', '~ ~ ~'));
    assert.deepEqual(['A?Z'], filters.split('A?Z', '~'));
    assert.deepEqual([], filters.split(null, ' '));
    assert.deepEqual(['A', 'Z'], filters.split('A1Z', 1));
  });

  it('test_escape', () => {
    assert.equal('&lt;strong&gt;', filters.escape('<strong>'));
    assert.equal('1', filters.escape(1));
    assert.equal('2001-02-03', filters.escape(utils.format_date(2001, 2, 3)));
    assert.equal(filters.escape(null), null);
  });

  it('test_h', () => {
    assert.equal('&lt;strong&gt;', filters.h('<strong>'));
    assert.equal('1', filters.h(1));
    assert.equal('2001-02-03', filters.h(utils.format_date(2001, 2, 3)));
    assert.equal(filters.h(null), null);
  });

  it('test_escape_once', () => {
    assert.equal('&lt;strong&gt;Hulk&lt;/strong&gt;', filters.escape_once('&lt;strong&gt;Hulk</strong>'));
  });

  it('test_base64_encode', () => {
    assert.equal('b25lIHR3byB0aHJlZQ==', filters.base64_encode('one two three'));
    assert.equal('', filters.base64_encode(null));
  });

  it('test_base64_decode', async () => {
    assert.equal('one two three', filters.base64_decode('b25lIHR3byB0aHJlZQ=='));
    await assert_raises(Dry.ArgumentError, () => filters.base64_decode('invalidbase64'));
    await assert_raises(/invalid base64/, () => filters.base64_decode('invalidbase64'));
  });

  it('test_base64_url_safe_encode', () => {
    const fixture = 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()-=_+/?.:;[]{}\\|';
    const expected = 'YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXogQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVogMTIzNDU2Nzg5MCAhQCMkJV4mKigpLT1fKy8_Ljo7W117fVx8';

    assert.equal(expected, filters.base64_url_safe_encode(fixture));
    assert.equal('', filters.base64_url_safe_encode(null));
  });

  it('test_base64_url_safe_decode', async () => {
    assert.equal('abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890 !@#$%^&*()-=_+/?.:;[]{}\\|', filters.base64_url_safe_decode('YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXogQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVogMTIzNDU2Nzg5MCAhQCMkJV4mKigpLT1fKy8_Ljo7W117fVx8'));

    const exception = await assert_raises(Dry.ArgumentError, () => {
      filters.base64_url_safe_decode('invalidbase64');
    });

    assert.equal('Dry error: invalid base64 provided to base64_url_safe_decode', exception.message);
  });

  it('test_url_encode', () => {
    assert.equal('foo%2B1%40example.com', filters.url_encode('foo+1@example.com'));
    assert.equal('1', filters.url_encode(1));
    assert.equal('2001-02-03', filters.url_encode(utils.format_date(2001, 2, 3)));
    assert.equal(filters.url_encode(null), null);
  });

  it('test_url_decode', () => {
    assert.equal('foo bar', filters.url_decode('foo+bar'));
    assert.equal('foo bar', filters.url_decode('foo%20bar'));
    assert.equal('foo+1@example.com', filters.url_decode('foo%2B1%40example.com'));
    assert.equal('1', filters.url_decode(1));
    assert.equal('2001-02-03', filters.url_decode(utils.format_date(2001, 2, 3)));
    assert.equal(filters.url_decode(null), null);
  });

  it('test_url_decode_errors', async () => {
    await assert.rejects(async () => filters.url_decode('%ff'), Dry.ArgumentError);
    await assert.rejects(async () => filters.url_decode('%ff'), /invalid byte sequence/);
  });

  it('test_truncatewords', () => {
    assert.equal('one two three', filters.truncatewords('one two three', 4));
    assert.equal('one two...', filters.truncatewords('one two three', 2));
    assert.equal('one two three', filters.truncatewords('one two three'));
    assert.equal('Two small (13&//8221; x 5.5&//8221; x 10&//8221; high) baskets fit inside one large basket (13&//8221;...', filters.truncatewords('Two small (13&//8221; x 5.5&//8221; x 10&//8221; high) baskets fit inside one large basket (13&//8221; x 16&//8221; x 10.5&//8221; high) with cover.', 15));
    assert.equal('测试测试测试测试', filters.truncatewords('测试测试测试测试', 5));
    assert.equal('one two1', filters.truncatewords('one two three', 2, 1));
    assert.equal('one two three...', filters.truncatewords('one  two\tthree\nfour', 3));
    assert.equal('one two...', filters.truncatewords('one two three four', 2));
    assert.equal('one...', filters.truncatewords('one two three four', 0));
  });

  it('test_truncatewords_errors', async () => {
    const max = Number.MAX_SAFE_INTEGER;
    await assert.rejects(async () => filters.truncatewords('one two three four', max + 1), Dry.ArgumentError);
    await assert.rejects(async () => filters.truncatewords('one two three four', max + 1), /too big for truncatewords/);
  });

  it('test_strip_html', () => {
    assert.equal('test', filters.strip_html('<div>test</div>'));
    assert.equal('test', filters.strip_html("<div id='test'>test</div>"));
    assert.equal('', filters.strip_html("<script type='text/javascript'>document.write('some stuff');</script>"));
    assert.equal('', filters.strip_html("<style type='text/css'>foo bar</style>"));
    assert.equal('test', filters.strip_html("<div\nclass='multiline'>test</div>"));
    assert.equal('test', filters.strip_html('<!-- foo bar \n test -->test'));
    assert.equal('', filters.strip_html(null));

    // Quirk of the existing implementation
    assert.equal('foo;', filters.strip_html('<<<script </script>script>foo;</script>'));
  });

  it('test_join', () => {
    assert.equal('1 2 3 4', filters.join([1, 2, 3, 4]));
    assert.equal('1 - 2 - 3 - 4', filters.join([1, 2, 3, 4], ' - '));
    assert.equal('1121314', filters.join([1, 2, 3, 4], 1));
  });

  it('test_sort', () => {
    assert.deepEqual([1, 2, 3, 4], filters.sort([4, 3, 2, 1]));
    assert.deepEqual([{ 'a': 1 }, { 'a': 2 }, { 'a': 3 }, { 'a': 4 }], filters.sort([{ 'a': 4 }, { 'a': 3 }, { 'a': 1 }, { 'a': 2 }], 'a'));
  });

  it('test_sort_with_nils', () => {
    assert.deepEqual([1, 2, 3, 4, null], filters.sort([null, 4, 3, 2, 1]));
    assert.deepEqual([{ 'a': 1 }, { 'a': 2 }, { 'a': 3 }, { 'a': 4 }, {}], filters.sort([{ 'a': 4 }, { 'a': 3 }, {}, { 'a': 1 }, { 'a': 2 }], 'a'));
  });

  it('test_sort_when_property_is_sometimes_missing_puts_nils_last', () => {
    const input       = [
      { price: 4, handle: 'alpha' },
      { handle: 'beta' },
      { price: 1, handle: 'gamma' },
      { handle: 'delta' },
      { price: 2, handle: 'epsilon' }
    ];
    const expectation = [
      { price: 1, handle: 'gamma' },
      { price: 2, handle: 'epsilon' },
      { price: 4, handle: 'alpha' },
      { handle: 'beta' },
      { handle: 'delta' }
    ];
    assert.deepEqual(expectation, filters.sort(input, 'price'));
  });

  it('test_sort_natural', () => {
    assert.deepEqual(['a', 'B', 'c', 'D'], filters.sort_natural(['c', 'D', 'a', 'B']));
    assert.deepEqual([{ a: 'a' }, { a: 'B' }, { a: 'c' }, { a: 'D' }], filters.sort_natural([{ a: 'D' }, { a: 'c' }, { a: 'a' }, { a: 'B' }], 'a'));
  });

  it('test_sort_natural_with_nils', () => {
    assert.deepEqual(['a', 'B', 'c', 'D', null], filters.sort_natural([null, 'c', 'D', 'a', 'B']));
    assert.deepEqual([{ a: 'a' }, { a: 'B' }, { a: 'c' }, { a: 'D' }, {}], filters.sort_natural([{ a: 'D' }, { a: 'c' }, {}, { a: 'a' }, { a: 'B' }], 'a'));
  });

  it('test_sort_natural_when_property_is_sometimes_missing_puts_nils_last', () => {
    const input = [
      { price: '4', handle: 'alpha' },
      { handle: 'beta' },
      { price: '1', handle: 'gamma' },
      { handle: 'delta' },
      { price: 2, handle: 'epsilon' }
    ];
    const expectation = [
      { price: '1', handle: 'gamma' },
      { price: 2, handle: 'epsilon' },
      { price: '4', handle: 'alpha' },
      { handle: 'beta' },
      { handle: 'delta' }
    ];
    assert.deepEqual(expectation, filters.sort_natural(input, 'price'));
  });

  it('test_sort_natural_case_check', () => {
    const input = [
      { key: 'X' },
      { key: 'Y' },
      { key: 'Z' },
      { fake: 't' },
      { key: 'a' },
      { key: 'b' },
      { key: 'c' }
    ];

    const expectation = [
      { key: 'a' },
      { key: 'b' },
      { key: 'c' },
      { key: 'X' },
      { key: 'Y' },
      { key: 'Z' },
      { fake: 't' }
    ];

    assert.deepEqual(expectation, filters.sort_natural(input, 'key'));
    assert.deepEqual(['a', 'b', 'c', 'X', 'Y', 'Z'], filters.sort_natural(['X', 'Y', 'Z', 'a', 'b', 'c']));
  });

  it('test_sort_empty_array', () => {
    assert.deepEqual([], filters.sort([], 'a'));
  });

  it('test_sort_invalid_property', async () => {
    const foo = [[1], [2], [3]];
    await assert.rejects(async () => filters.sort(foo, 'bar'), Dry.ArgumentError);
  });

  it('test_sort_natural_empty_array', () => {
    assert.deepEqual([], filters.sort_natural([], 'a'));
  });

  it('test_sort_natural_invalid_property', async () => {
    const foo = [[1], [2], [3]];
    await assert.rejects(async () => filters.sort_natural(foo, 'bar'), Dry.ArgumentError);
  });

  it('test_legacy_sort_hash', () => {
    assert.deepEqual([{ a: 1, b: 2 }], filters.sort({ a: 1, b: 2 }));
  });

  it('test_numerical_vs_lexicographical_sort', () => {
    assert.deepEqual([2, 10], filters.sort([10, 2]));
    assert.deepEqual([{ a: 2 }, { a: 10 }], filters.sort([{ a: 10 }, { a: 2 }], 'a'));
    assert.deepEqual(['10', '2'], filters.sort(['10', '2']));
    assert.deepEqual([{ a: '10' }, { a: '2' }], filters.sort([{ a: '10' }, { a: '2' }], 'a'));
  });

  it('test_uniq', () => {
    assert.deepEqual(['foo'], filters.uniq('foo'));
    assert.deepEqual([1, 3, 2, 4], filters.uniq([1, 1, 3, 2, 3, 1, 4, 3, 2, 1]));
    assert.deepEqual([{ a: 1 }, { a: 3 }, { a: 2 }], filters.uniq([{ a: 1 }, { a: 3 }, { a: 1 }, { a: 2 }], 'a'));
    const testdrop = new TestDrop();
    assert.deepEqual([testdrop], filters.uniq([testdrop, new TestDrop()], 'test'));
  });

  it('test_uniq_empty_array', () => {
    assert.deepEqual([], filters.uniq([], 'a'));
  });

  it('test_uniq_invalid_property', async () => {
    const foo = [[1], [2], [3]];
    await assert.rejects(async () => filters.uniq(foo, 'bar'), Dry.ArgumentError);
  });

  it('test_compact_empty_array', () => {
    assert.deepEqual([], filters.compact([], 'a'));
  });

  it('test_compact_invalid_property', async () => {
    const foo = [[1], [2], [3]];
    await assert.rejects(async () => filters.compact(foo, 'bar'), Dry.ArgumentError);
  });

  it('test_reverse', () => {
    assert.deepEqual([4, 3, 2, 1], filters.reverse([1, 2, 3, 4]));
  });

  it('test_legacy_reverse_hash', () => {
    assert.deepEqual([{ a: 1, b: 2 }], filters.reverse({ a: 1, b: 2 }));
  });

  it('test_map', async () => {
    assert.deepEqual([1, 2, 3, 4], await filters.map([{ a: 1 }, { a: 2 }, { a: 3 }, { a: 4 }], 'a'));
    await assert_template_result('abc', "{{ ary | map:'foo' | map:'bar' }}", {
      ary: [{ foo: { bar: 'a' } }, { foo: { bar: 'b' } }, { foo: { bar: 'c' } }]
    });
  });

  it('test_map_doesnt_call_arbitrary_stuff', async () => {
    await assert_template_result('', '{{ "foo" | map: "__id__" }}');
    await assert_template_result('', '{{ "foo" | map: "inspect" }}');
  });

  it('test_map_calls_to_liquid', async () => {
    const t = new TestThing();
    await assert_template_result('woot: 1', '{{ foo | map: "whatever" }}', { foo: [t] });
  });

  it('test_map_on_hashes', async () => {
    await assert_template_result('4217', '{{ thing | map: "foo" | map: "bar" }}', {
      thing: { foo: [{ bar: 42 }, { bar: 17 }] }
    });
  });

  it('test_legacy_map_on_hashes_with_dynamic_key', async () => {
    const template = "{% assign key = 'foo' %}{{ thing | map: key | map: 'bar' }}";
    const hash = { foo: { bar: 42 } };
    await assert_template_result('42', template, { thing: hash });
  });

  it('test_sort_calls_to_liquid', async () => {
    const t = new TestThing();
    await Template.parse('{{ foo | sort: "whatever" }}').render({ foo: [t] });
    assert.equal(t.foo, 1);
  });

  it('test_map_over_proc', async () => {
    const drop = new TestDrop();
    const p = drop;
    const templ = '{{ procs | map: "test" }}';
    await assert_template_result('testfoo', templ, { procs: [p] });
  });

  it('test_map_over_drops_returning_procs', async () => {
    const drops = [
      { proc: () => 'foo' },
      { proc: () => 'bar' }
    ];

    const templ = '{{ drops | map: "proc" }}';
    await assert_template_result('foobar', templ, { drops: drops });
  });

  it('test_map_works_on_enumerables', async () => {
    await assert_template_result('123', '{{ foo | map: "foo" }}', { foo: new TestEnumerable() });
  });

  it('test_map_returns_empty_on_2d_input_array', async () => {
    const foo = [[1], [2], [3]];
    await assert.rejects(async () => filters.map(foo, 'bar'), Dry.ArgumentError);
  });

  it('test_map_returns_empty_with_no_property', async () => {
    const foo = [[1], [2], [3]];
    await assert.rejects(async () => filters.map(foo, null), Dry.ArgumentError);
  });

  it('test_sort_works_on_enumerables', async () => {
    await assert_template_result('213', '{{ foo | sort: "bar" | map: "foo" }}', { foo: new TestEnumerable() });
  });

  it('test_first_and_last_call_to_liquid', async () => {
    await assert_template_result('foobar', '{{ foo | first }}', { foo: [new ThingWithToLiquid()] });
    await assert_template_result('foobar', '{{ foo | last }}', { foo: [new ThingWithToLiquid()] });
  });

  it('test_truncate_calls_to_liquid', async () => {
    await assert_template_result('wo...', '{{ foo | truncate: 5 }}', { foo: new TestThing() });
  });

  it('test_date', cb => {
    assert.equal('May', filters.date(new Date('2006-05-05 10:00:00'), '%B'));
    assert.equal('June', filters.date(new Date('2006-06-05 10:00:00'), '%B'));
    assert.equal('July', filters.date(new Date('2006-07-05 10:00:00'), '%B'));

    assert.equal('May', filters.date('2006-05-05 10:00:00', '%B'));
    assert.equal('June', filters.date('2006-06-05 10:00:00', '%B'));
    assert.equal('July', filters.date('2006-07-05 10:00:00', '%B'));

    assert.equal('2006-07-05 10:00:00', filters.date('2006-07-05 10:00:00', ''));
    assert.equal('2006-07-05 10:00:00', filters.date('2006-07-05 10:00:00', ''));
    assert.equal('2006-07-05 10:00:00', filters.date('2006-07-05 10:00:00', ''));
    assert.equal('2006-07-05 10:00:00', filters.date('2006-07-05 10:00:00', null));

    assert.equal('07/05/2006', filters.date('2006-07-05 10:00:00', '%m/%d/%Y'));

    assert.equal('07/16/2004', filters.date('Fri Jul 16 01:00:00 2004', '%m/%d/%Y'));

    assert.equal(filters.year(), filters.date('now', '%Y'));
    assert.equal(filters.year(), filters.date('today', '%Y'));
    assert.equal(filters.year(), filters.date('Today', '%Y'));

    assert.equal(filters.date(null, '%B'), null);

    assert.equal(filters.date('', '%B'), '');

    with_timezone('UTC', () => {
      assert.equal('07/05/2006', filters.date(1152098955, '%m/%d/%Y'));
      assert.equal('07/05/2006', filters.date('1152098955', '%m/%d/%Y'));
      cb();
    });
  });

  it('test_first_last', () => {
    assert.equal(1, filters.first([1, 2, 3]));
    assert.equal(3, filters.last([1, 2, 3]));
    assert.equal(filters.first([]), undefined);
    assert.equal(filters.last([]), undefined);
  });

  it('test_replace', async () => {
    assert.equal('2 2 2 2', filters.replace('1 1 1 1', '1', 2));
    assert.equal('2 2 2 2', filters.replace('1 1 1 1', 1, 2));
  });

  it('test_replace_first', async () => {
    assert.equal('2 1 1 1', filters.replace_first('1 1 1 1', '1', 2));
    assert.equal('2 1 1 1', filters.replace_first('1 1 1 1', 1, 2));
    await assert_template_result('2 1 1 1', "{{ '1 1 1 1' | replace_first: '1', 2 }}");
  });

  it('test_replace_last', async () => {
    assert.equal('a a a b', filters.replace_last('a a a a', 'a', 'b'));
    assert.equal('1 1 1 2', filters.replace_last('1 1 1 1', 1, 2));
    await assert_template_result('a a a b', "{{ 'a a a a' | replace_last: 'a', 'b' }}");
    await assert_template_result('1 1 1 2', "{{ '1 1 1 1' | replace_last: 1, 2 }}");
  });

  it('test_remove', async () => {
    assert.equal('   ', filters.remove('a a a a', 'a'));
    assert.equal('   ', filters.remove('1 1 1 1', 1));
  });

  it('test_remove_first', async () => {
    assert.equal('b a a', filters.remove_first('a b a a', 'a '));
    assert.equal(' 2 1 1', filters.remove_first('1 2 1 1', 1));
    await assert_template_result('a a a', "{{ 'a a a a' | remove_first: 'a ' }}");
  });

  it('test_remove_last', async () => {
    assert.equal('a a b', filters.remove_last('a a b a', ' a'));
    assert.equal('1 1 2 ', filters.remove_last('1 1 2 1', 1));
    await assert_template_result('a a b', "{{ 'a a b a' | remove_last: ' a' }}");
    await assert_template_result('1 1 2 ', "{{ '1 1 2 1' | remove_last: 1 }}");
  });

  it('test_pipes_in_string_arguments', async () => {
    await assert_template_result('foobar', "{{ 'foo|bar' | remove: '|' }}");
  });

  it('test_strip', async () => {
    await assert_template_result('ab c', '{{ source | strip }}', { source: ' ab c  ' });
    await assert_template_result('ab c', '{{ source | strip }}', { source: ' \tab c  \n \t' });
  });

  it('test_lstrip', async () => {
    await assert_template_result('ab c  ', '{{ source | lstrip }}', { source: ' ab c  ' });
    await assert_template_result('ab c  \n \t', '{{ source | lstrip }}', { source: ' \tab c  \n \t' });
  });

  it('test_rstrip', async () => {
    await assert_template_result(' ab c', '{{ source | rstrip }}', { source: ' ab c  ' });
    await assert_template_result(' \tab c', '{{ source | rstrip }}', { source: ' \tab c  \n \t' });
  });

  it('test_strip_newlines', async () => {
    await assert_template_result('abc', '{{ source | strip_newlines }}', { source: 'a\nb\nc' });
    await assert_template_result('abc', '{{ source | strip_newlines }}', { source: 'a\r\nb\nc' });
  });

  it('test_newlines_to_br', async () => {
    await assert_template_result('a<br />\nb<br />\nc', '{{ source | newline_to_br }}', { source: 'a\nb\nc' });
    await assert_template_result('a<br />\nb<br />\nc', '{{ source | newline_to_br }}', { source: 'a\r\nb\nc' });
  });

  it('test_plus', async () => {
    await assert_template_result('2', '{{ 1 | plus:1 }}');
    await assert_template_result('2.0', "{{ '1' | plus:'1.0' }}");

    await assert_template_result('5', "{{ price | plus:'2' }}", { price: new NumberLikeThing(3) });
  });

  it('test_minus', async () => {
    await assert_template_result('4', '{{ input | minus:operand }}', { input: 5, operand: 1 });
    await assert_template_result('2.3', "{{ '4.3' | minus:'2' }}");

    await assert_template_result('5', "{{ price | minus:'2' }}", { price: new NumberLikeThing(7) });
  });

  it('test_abs', async  () => {
    await assert_template_result('17', '{{ 17 | abs }}');
    await assert_template_result('17', '{{ -17 | abs }}');
    await assert_template_result('17', "{{ '17' | abs }}");
    await assert_template_result('17', "{{ '-17' | abs }}");
    await assert_template_result('0', '{{ 0 | abs }}');
    await assert_template_result('0', "{{ '0' | abs }}");
    await assert_template_result('17.42', '{{ 17.42 | abs }}');
    await assert_template_result('17.42', '{{ -17.42 | abs }}');
    await assert_template_result('17.42', "{{ '17.42' | abs }}");
    await assert_template_result('17.42', "{{ '-17.42' | abs }}");
  });

  it('test_times', async  () => {
    await assert_template_result('12', '{{ 3 | times:4 }}');
    await assert_template_result('0', "{{ 'foo' | times:4 }}");
    await assert_template_result('6', "{{ '2.1' | times:3 | replace: '.','-' | plus:0}}");
    await assert_template_result('7.25', '{{ 0.0725 | times:100 }}');
    await assert_template_result('-7.25', '{{ "-0.0725" | times:100 }}');
    await assert_template_result('7.25', '{{ "-0.0725" | times: -100 }}');
    await assert_template_result('4', '{{ price | times:2 }}', { price: new NumberLikeThing(2) });
  });

  it('test_divided_by', async  () => {
    await assert_template_result('4', '{{ 12 | divided_by:3 }}');
    await assert_template_result('4', '{{ 14 | divided_by:3 }}');

    await assert_template_result('5', '{{ 15 | divided_by:3 }}');

    await assert_template_result('5', '{{ 15 | divided_by:3 }}');

    await assert_template_result('0.5', '{{ 2.0 | divided_by:4 }}');
    await assert_template_result('1', '{{ 4.0 | divided_by:4 }}');
    await assert_template_result('5', '{{ price | divided_by:2 }}', { price: new NumberLikeThing(10) });
  });

  it('test_divided_by_errors', async () => {
    assert.equal('Dry error: cannot divide by zero', await Template.parse('{{ 5 | divided_by:0 }}').render());
    await assert.rejects(async () => assert_template_result('', '{{ 5 | divided_by:0 }}'), Dry.ZeroDivisionError);
    await assert.rejects(async () => assert_template_result('4', '{{ 1 | modulo: 0 }}'), Dry.ZeroDivisionError);
  });

  it('test_modulo', async  () => {
    await assert_template_result('1', '{{ 3 | modulo:2 }}');
    await assert_template_result('1', '{{ price | modulo:2 }}', { price: new NumberLikeThing(3) });
  });

  it('test_modulo_error', async  () => {
    await assert.rejects(async () => assert_template_result('4', '{{ 1 | modulo: 0 }}'), Dry.ZeroDivisionError);
  });

  it('test_round', async  () => {
    await assert_template_result('5', '{{ input | round }}', { input: 4.6 });
    await assert_template_result('4', "{{ '4.3' | round }}");
    await assert_template_result('4.56', '{{ input | round: 2 }}', { input: 4.5612 });

    await assert_template_result('5', '{{ price | round }}', { price: new NumberLikeThing(4.6) });
    await assert_template_result('4', '{{ price | round }}', { price: new NumberLikeThing(4.3) });
  });

  it('test_round_float_domain_error', async  () => {
    // in ruby this was a FloatDomainError, but in js we're throwing a ZeroDivisionError
    // since floats do not retain decimals when the value is zero
    await assert.rejects(async () => assert_template_result('4', '{{ 1.0 | divided_by: 0.0 | round }}'), Dry.ZeroDivisionError);
  });

  it('test_ceil', async  () => {
    await assert_template_result('5', '{{ input | ceil }}', { input: 4.6 });
    await assert_template_result('5', "{{ '4.3' | ceil }}");

    await assert_template_result('5', '{{ price | ceil }}', { price: new NumberLikeThing(4.6) });
  });

  it('test_ceil_float_domain_error', async  () => {
    await assert.rejects(async () => {
      return assert_template_result('4', '{{ 1.0 | divided_by: 0.0 | ceil }}');
    }, Dry.ZeroDivisionError);
  });

  it('test_floor', async  () => {
    await assert_template_result('4', '{{ input | floor }}', { input: 4.6 });
    await assert_template_result('4', "{{ '4.3' | floor }}");

    await assert_template_result('5', '{{ price | floor }}', { price: new NumberLikeThing(5.4) });
  });

  it('test_floor_float_domain_error', async () => {
    await assert.rejects(async () => {
      return assert_template_result('4', '{{ 1.0 | divided_by: 0.0 | floor }}');
    }, Dry.ZeroDivisionError);
  });

  it('test_at_most', async  () => {
    await assert_template_result('4', '{{ 5 | at_most:4 }}');
    await assert_template_result('5', '{{ 5 | at_most:5 }}');
    await assert_template_result('5', '{{ 5 | at_most:6 }}');

    await assert_template_result('4.5', '{{ 4.5 | at_most:5 }}');
    await assert_template_result('5', '{{ width | at_most:5 }}', { 'width': new NumberLikeThing(6) });
    await assert_template_result('4', '{{ width | at_most:5 }}', { 'width': new NumberLikeThing(4) });
    await assert_template_result('4', '{{ 5 | at_most: width }}', { 'width': new NumberLikeThing(4) });
  });

  it('test_at_least', async  () => {
    await assert_template_result('5', '{{ 5 | at_least:4 }}');
    await assert_template_result('5', '{{ 5 | at_least:5 }}');
    await assert_template_result('6', '{{ 5 | at_least:6 }}');

    await assert_template_result('5', '{{ 4.5 | at_least:5 }}');
    await assert_template_result('6', '{{ width | at_least:5 }}', { 'width': new NumberLikeThing(6) });
    await assert_template_result('5', '{{ width | at_least:5 }}', { 'width': new NumberLikeThing(4) });
    await assert_template_result('6', '{{ 5 | at_least: width }}', { 'width': new NumberLikeThing(6) });
  });

  it('test_append', async  () => {
    const assigns = { 'a': 'bc', 'b': 'd' };
    await assert_template_result('bcd', "{{ a | append: 'd'}}", assigns);
    await assert_template_result('bcd', '{{ a | append: b}}', assigns);
  });

  it('test_concat', cb => {
    assert.deepEqual([1, 2, 3, 4], filters.concat([1, 2], [3, 4]));
    assert.deepEqual([1, 2, 'a'], filters.concat([1, 2], ['a']));
    assert.deepEqual([1, 2, 10], filters.concat([1, 2], [10]));

    try {
      filters.concat([1, 2], 10);
    } catch (err) {
      assert(err instanceof Dry.ArgumentError);
      assert(err.message.includes('concat filter requires an array argument'));
      cb();
    }
  });

  it('test_prepend', async () => {
    const assigns = { 'a': 'bc', 'b': 'a' };
    await assert_template_result('abc', "{{ a | prepend: 'a'}}", assigns);
    await assert_template_result('abc', '{{ a | prepend: b}}', assigns);
    await assert_template_result('helloworld', '{{ "world" | prepend: "hello" }}', assigns);
    await assert_template_result('helloworld', '{{ "world" | prepend : "hello" }}', assigns);

    // should throw when : is missing from filter
    await assert_raises(Dry.SyntaxError, () => {
      return Template.parse('{{ "world" | prepend "hello" }}');
    });
  });

  it('test_default', async () => {
    assert.equal('foo', filters.default('foo', 'bar'));
    assert.equal('bar', filters.default(null, 'bar'));
    assert.equal('bar', filters.default('', 'bar'));
    assert.equal('bar', filters.default(false, 'bar'));
    assert.equal('bar', filters.default([], 'bar'));
    assert.equal('bar', filters.default({}, 'bar'));
    await assert_template_result('bar', "{{ false | default: 'bar' }}");
  });

  it('test_default_handle_false', async () => {
    assert.equal('foo', filters.default('foo', 'bar', { 'allow_false': true }));
    assert.equal('bar', filters.default(null, 'bar', { 'allow_false': true }));
    assert.equal('bar', filters.default('', 'bar', { 'allow_false': true }));
    assert.equal(false, filters.default(false, 'bar', { 'allow_false': true }));
    assert.equal('bar', filters.default([], 'bar', { 'allow_false': true }));
    assert.equal('bar', filters.default({}, 'bar', { 'allow_false': true }));
    await assert_template_result('false', "{{ false | default: 'bar', allow_false: true }}");
  });

  it('test_date_raises_nothing', async () => {
    await assert_template_result('', "{{ '' | date: '%D' }}");
    await assert_template_result('abc', "{{ 'abc' | date: '%D' }}");
  });

  it('test_where', () => {
    const input = [
      { handle: 'alpha', ok: true },
      { handle: 'beta', ok: false },
      { handle: 'gamma', ok: false },
      { handle: 'delta', ok: true }
    ];

    const expectation = [
      { handle: 'alpha', ok: true },
      { handle: 'delta', ok: true }
    ];

    assert.deepEqual(expectation, filters.where(input, 'ok', true));
    assert.deepEqual(expectation, filters.where(input, 'ok'));
  });

  it('test_where_deep', () => {
    const input = [
      { item: { handle: 'alpha', ok: true } },
      { item: { handle: 'beta', ok: false } },
      { item: { handle: 'gamma', ok: false } },
      { item: { handle: 'delta', ok: true } }
    ];

    const expected = [
      { item: { handle: 'alpha', ok: true } },
      { item: { handle: 'delta', ok: true } }
    ];

    assert.deepEqual(expected, filters.where(input, 'item.ok', true));
    assert.deepEqual(expected, filters.where(input, 'item.ok'));
  });

  it('test_where_no_key_set', () => {
    const input = [
      { handle: 'alpha', ok: true },
      { handle: 'beta' },
      { handle: 'gamma' },
      { handle: 'delta', ok: true }
    ];

    const expectation = [
      { handle: 'alpha', ok: true },
      { handle: 'delta', ok: true }
    ];

    assert.deepEqual(expectation, filters.where(input, 'ok', true));
    assert.deepEqual(expectation, filters.where(input, 'ok'));
  });

  it('test_where_non_array_map_input', () => {
    assert.deepEqual([{ a: 'ok' }], filters.where({ a: 'ok' }, 'a', 'ok'));
    assert.deepEqual([], filters.where({ a: 'not ok' }, 'a', 'ok'));
  });

  it('test_where_indexable_but_non_map_value', async () => {
    await assert.rejects(async () => filters.where(1, 'ok', true), Dry.ArgumentError);
    await assert.rejects(async () => filters.where(1, 'ok'), Dry.ArgumentError);
  });

  it('test_where_non_boolean_value', () => {
    const input = [
      { message: 'Bonjour!', language: 'French' },
      { message: 'Hello!', language: 'English' },
      { message: 'Hallo!', language: 'German' }
    ];

    assert.deepEqual([{ message: 'Bonjour!', language: 'French' }], filters.where(input, 'language', 'French'));
    assert.deepEqual([{ message: 'Hallo!', language: 'German' }], filters.where(input, 'language', 'German'));
    assert.deepEqual([{ message: 'Hello!', language: 'English' }], filters.where(input, 'language', 'English'));
  });

  it('test_where_array_of_only_unindexable_values', () => {
    assert.equal(filters.where([null], 'ok', true), null);
    assert.equal(filters.where([null], 'ok'), null);
  });

  it.skip('test_all_filters_never_raise_non_liquid_exception', () => {
    const test_drop = new TestDrop();
    test_drop.context = new Dry.Context();

    const test_enum = new TestEnumerable();
    test_enum.context = new Dry.Context();

    const test_types = [
      'foo',
      123,
      0,
      0.0,
      -1234.003030303,
      -99999999,
      1234.38383000383830003838300,
      null,
      true,
      false,
      new TestThing(),
      test_drop,
      test_enum,
      ['foo', 'bar'],
      { foo: 'bar' },
      { foo: 'bar' },
      [{ foo: 'bar' }, { foo: 123 }, { foo: null }, { foo: true }, { foo: ['foo', 'bar'] }],
      { 1: 'bar' },
      ['foo', 123, null, true, false, Dry.Drop, ['foo'], { foo: 'bar' }]
    ];

    test_types.forEach(first => {
      test_types.forEach(other => {
        Object.keys(filters).forEach(method => {
          const filter = filters[method];
          if (typeof filter !== 'function') return;
          // let arg_count = filter.length;
          // if (arg_count < 0) arg_count *= -1;
          const inputs = [first, other];
          // if (arg_count > 1) inputs.push([other] * (arg_count - 1));
          try {
            return filter(...inputs);
          } catch (err) {
            if (!(err instanceof Dry.DryError)) {
              console.log(err);
            }
            // Dry.ArgumentError, Dry.ZeroDivisionError
            return null;
          }
        });
      });
    });
  });

  it('test_where_no_target_value', () => {
    const input = [
      { foo: false },
      { foo: true },
      { foo: 'for sure' },
      { bar: true }
    ];

    assert.deepEqual([{ foo: true }, { foo: 'for sure' }], filters.where(input, 'foo'));
  });
});
