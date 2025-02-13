const assert = require('node:assert/strict');
const Dry = require('../..');
const { assert_raises } = require('../test_helpers');
const { Context, StandardFilters } = Dry;

class TestThing {
  constructor() {
    this.foo = 0;
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
    return [
      { foo: 1, bar: 2 },
      { foo: 2, bar: 1 },
      { foo: 3, bar: 3 }
    ].map(block);
  }
}

describe.skip('standard_filters_error_handling', () => {
  let context;
  let filters;

  // Test data types to run through filters
  const TEST_VALUES = [
    'foo',
    123,
    0,
    0.0,
    -1234.003030303,
    -99999999,
    1234.38383,
    null,
    true,
    false,
    new TestThing(),
    new TestDrop(),
    new TestEnumerable(),
    ['foo', 'bar'],
    { foo: 'bar' },
    [{ foo: 'bar' }, { foo: 123 }, { foo: null }],
    { '1': 'bar' },
    ['foo', 123, null, true, false]
  ];

  beforeEach(() => {
    context = new Context({
      environments: {},
      registers: {},
      strict_filters: false
    });

    filters = {};
    for (const [key, value] of Object.entries(StandardFilters)) {
      filters[key] = function(...args) {
        return value.call({ context }, ...args);
      };
    }
  });

  afterEach(() => {
    context = null;
    filters = null;
  });

  it('filters should only raise Dry errors', async () => {
    for (const filterName of Object.keys(filters)) {
      const filter = filters[filterName];
      if (typeof filter !== 'function') continue;

      for (const input of TEST_VALUES) {
        for (const arg of TEST_VALUES) {
          try {
            await filter(input, arg);
          } catch (error) {
            assert(
              error instanceof Dry.DryError,
              `Filter "${filterName}" raised non-Dry error: ${error.constructor.name}\n` +
            `Input: ${JSON.stringify(input)}\n` +
            `Argument: ${JSON.stringify(arg)}\n` +
            `Error: ${error.message}`
            );
          }
        }
      }
    }
  });

  it('numeric filters should raise ZeroDivisionError for division by zero', async () => {
    const numericTests = [
      ['divided_by', 10, 0],
      ['modulo', 10, 0],
      ['times', 10, null],
      ['plus', null, null],
      ['minus', undefined, 10]
    ];

    for (const [filterName, input, arg] of numericTests) {
      if (filterName === 'divided_by' || filterName === 'modulo') {
        await assert_raises(Dry.ZeroDivisionError, async () => {
          await filters[filterName](input, arg);
        });
      } else {
        const result = await filters[filterName](input, arg);
        assert.equal(result, 0, `Filter ${filterName} should safely handle null/undefined`);
      }
    }
  });

  it('filters should handle invalid property access', async () => {
    const accessTests = [
      ['map', [{ a: 1 }], 'nonexistent'],
      ['where', [{ a: 1 }], 'nonexistent'],
      ['sort', [{ a: 1 }], 'nonexistent']
    ];

    for (const [filterName, input, property] of accessTests) {
      await assert_raises(Dry.ArgumentError, async () => {
        await filters[filterName](input, property);
      });
    }
  });

  it('filters should handle type conversion errors', async () => {
    const conversionTests = [
      ['plus', 'not_a_number', 1],
      ['minus', 'not_a_number', 1],
      ['times', 'not_a_number', 1],
      ['divided_by', 'not_a_number', 1],
      ['modulo', 'not_a_number', 1],
      ['round', 'not_a_number', 1],
      ['ceil', 'not_a_number'],
      ['floor', 'not_a_number']
    ];

    for (const [filterName, input, arg] of conversionTests) {
      const result = await filters[filterName](input, arg);
      assert.equal(result, 0, `Filter ${filterName} should safely handle invalid number conversion`);
    }
  });

  it('filters should handle array operation errors', async () => {
    const arrayTests = [
      ['sort', null, 'prop'],
      ['map', null, 'prop'],
      ['where', null, 'prop'],
      ['uniq', null, 'prop'],
      ['compact', null, 'prop']
    ];

    for (const [filterName, input, property] of arrayTests) {
      const result = await filters[filterName](input, property);
      assert(Array.isArray(result) && result.length === 0,
        `Filter ${filterName} should return empty array for null input`);
    }
  });

  it('filters should preserve error context', async () => {
    const template = "{{ 'test' | divided_by: 0 }}";
    const error = await assert_raises(Dry.ZeroDivisionError, async () => {
      await Dry.Template.parse(template).render(context);
    });

    assert(error.message.includes('divide by zero'),
      'Error should contain original message');
    assert(error.template_name === undefined,
      'Error should preserve template context');
  });
});
