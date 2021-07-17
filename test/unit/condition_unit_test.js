'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { Condition, VariableLookup } = Dry;
let context;

const evaluate = (left, op, right) => {
  return new Condition(left, op, right).evaluate(context);
};

const assert_evaluates_true = async (left, op, right) => {
  assert(await evaluate(left, op, right, context), `Evaluated false: ${left} ${op} ${right}`);
};

const assert_evaluates_false = async (left, op, right) => {
  assert(!(await evaluate(left, op, right, context)), `Evaluated true: ${left} ${op} ${right}`);
};

const assert_evaluates_argument_error = (left, op, right) => {
  return assert.rejects(() => evaluate(left, op, right, context), Dry.ArgumentError);
};

describe('condition_unit_test', () => {
  beforeEach(() => {
    context = new Dry.Context();
  });

  it('test_basic_condition', async () => {
    assert.equal(false, await new Condition(1, '==', 2).evaluate());
    assert.equal(true, await new Condition(1, '==', 1).evaluate());
  });

  it('test_default_operators_evalute_true', async () => {
    await assert_evaluates_true(1, '==', 1);
    await assert_evaluates_true(1, '!=', 2);
    await assert_evaluates_true(1, '<>', 2);
    await assert_evaluates_true(1, '<', 2);
    await assert_evaluates_true(2, '>', 1);
    await assert_evaluates_true(1, '>=', 1);
    await assert_evaluates_true(2, '>=', 1);
    await assert_evaluates_true(1, '<=', 2);
    await assert_evaluates_true(1, '<=', 1);
    // negative numbers
    await assert_evaluates_true(1, '>', -1);
    await assert_evaluates_true(-1, '<', 1);
    await assert_evaluates_true(1.0, '>', -1.0);
    await assert_evaluates_true(-1.0, '<', 1.0);
  });

  it('test_default_operators_evalute_false', async () => {
    await assert_evaluates_false(1, '==', 2);
    await assert_evaluates_false(1, '!=', 1);
    await assert_evaluates_false(1, '<>', 1);
    await assert_evaluates_false(1, '<', 0);
    await assert_evaluates_false(2, '>', 4);
    await assert_evaluates_false(1, '>=', 3);
    await assert_evaluates_false(2, '>=', 4);
    await assert_evaluates_false(1, '<=', 0);
    await assert_evaluates_false(1, '<=', 0);
  });

  it('test_contains_works_on_strings', async () => {
    await assert_evaluates_true('bob', 'contains', 'o');
    await assert_evaluates_true('bob', 'contains', 'b');
    await assert_evaluates_true('bob', 'contains', 'bo');
    await assert_evaluates_true('bob', 'contains', 'ob');
    await assert_evaluates_true('bob', 'contains', 'bob');

    await assert_evaluates_false('bob', 'contains', 'bob2');
    await assert_evaluates_false('bob', 'contains', 'a');
    await assert_evaluates_false('bob', 'contains', '---');
  });

  it('test_invalid_comparation_operator', async () => {
    return assert_evaluates_argument_error(1, '~~', 0);
  });

  it.skip('test_comparation_of_int_and_str', async () => {
    await assert_evaluates_argument_error('1', '>', 0);
    await assert_evaluates_argument_error('1', '<', 0);
    await assert_evaluates_argument_error('1', '>=', 0);
    await assert_evaluates_argument_error('1', '<=', 0);
  });

  it('test_hash_compare_backwards_compatibility', async () => {
    assert(!(await new Condition({}, '>', 2).evaluate()));
    assert(!(await new Condition(2, '>', {}).evaluate()));
    assert.equal(false, await new Condition({}, '==', 2).evaluate());
    assert.equal(true, await new Condition({ a: 1 }, '==', { a: 1 }).evaluate());
    assert.equal(true, await new Condition({ a: 2 }, 'contains', 'a').evaluate());
  });

  it('test_contains_works_on_arrays', async () => {
    context = new Dry.Context();
    context['array'] = [1, 2, 3, 4, 5];
    const array_expr = new VariableLookup('array');

    await assert_evaluates_false(array_expr, 'contains', 0);
    await assert_evaluates_true(array_expr, 'contains', 1);
    await assert_evaluates_true(array_expr, 'contains', 2);
    await assert_evaluates_true(array_expr, 'contains', 3);
    await assert_evaluates_true(array_expr, 'contains', 4);
    await assert_evaluates_true(array_expr, 'contains', 5);
    await assert_evaluates_false(array_expr, 'contains', 6);
    await assert_evaluates_false(array_expr, 'contains', '1');
  });

  it('test_contains_returns_false_for_nil_operands', async () => {
    context = new Dry.Context();
    await assert_evaluates_false(new VariableLookup('not_assigned'), 'contains', '0');
    await assert_evaluates_false(0, 'contains', new VariableLookup('not_assigned'));
  });

  it('test_contains_return_false_on_wrong_data_type', async () => {
    await assert_evaluates_false(1, 'contains', 0);
  });

  it('test_contains_with_string_left_operand_coerces_right_operand_to_string', async () => {
    await assert_evaluates_true(' 1 ', 'contains', 1);
    await assert_evaluates_false(' 1 ', 'contains', 2);
  });

  it('test_or_condition', async () => {
    const condition = new Condition(1, '==', 2);

    assert.equal(false, await condition.evaluate());

    condition.or(new Condition(2, '==', 1));

    assert.equal(false, await condition.evaluate());

    condition.or(new Condition(1, '==', 1));

    assert.equal(true, await condition.evaluate());
  });

  it('test_and_condition', async () => {
    const condition = new Condition(1, '==', 1);

    assert.equal(true, await condition.evaluate());

    condition.and(new Condition(2, '==', 2));

    assert.equal(true, await condition.evaluate());

    condition.and(new Condition(2, '==', 1));

    assert.equal(false, await condition.evaluate());
  });

  it('test_should_allow_custom_operator', async () => {
    try {
      Condition.operators['contains'] = (left, right) => new RegExp(`^${right}`).exec(left);
      await assert_evaluates_true('bob', 'starts_with', 'b');
      await assert_evaluates_false('bob', 'starts_with', 'o');
    } catch (err) {
      delete Condition.operators['starts_with'];
    }
  });

  it('test_left_or_right_may_contain_operators', async () => {
    context = new Dry.Context();
    context['one'] = context['another'] = 'gnomeslab-and-or-liquid';
    await assert_evaluates_true(new VariableLookup('one'), '==', new VariableLookup('another'));
  });
});
