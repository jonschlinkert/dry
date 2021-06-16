'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { Condition, VariableLookup } = Dry;
let context;

const evaluate = (left, op, right) => {
  return new Condition(left, op, right).evaluate(context);
};

const assert_evaluates_true = (left, op, right) => {
  assert(evaluate(left, op, right, context), `Evaluated false: ${left} ${op} ${right}`);
};

const assert_evaluates_false = (left, op, right) => {
  assert(!evaluate(left, op, right, context), `Evaluated true: ${left} ${op} ${right}`);
};

const assert_evaluates_argument_error = (left, op, right) => {
  assert.throws(() => evaluate(left, op, right, context), Dry.ArgumentError);
};

describe('condition_unit_test', () => {
  beforeEach(() => {
    context = new Dry.Context();
  });

  it('test_basic_condition', () => {
    assert.equal(false, new Condition(1, '==', 2).evaluate());
    assert.equal(true, new Condition(1, '==', 1).evaluate());
  });

  it('test_default_operators_evalute_true', () => {
    assert_evaluates_true(1, '==', 1);
    assert_evaluates_true(1, '!=', 2);
    assert_evaluates_true(1, '<>', 2);
    assert_evaluates_true(1, '<', 2);
    assert_evaluates_true(2, '>', 1);
    assert_evaluates_true(1, '>=', 1);
    assert_evaluates_true(2, '>=', 1);
    assert_evaluates_true(1, '<=', 2);
    assert_evaluates_true(1, '<=', 1);
    // negative numbers
    assert_evaluates_true(1, '>', -1);
    assert_evaluates_true(-1, '<', 1);
    assert_evaluates_true(1.0, '>', -1.0);
    assert_evaluates_true(-1.0, '<', 1.0);
  });

  it('test_default_operators_evalute_false', () => {
    assert_evaluates_false(1, '==', 2);
    assert_evaluates_false(1, '!=', 1);
    assert_evaluates_false(1, '<>', 1);
    assert_evaluates_false(1, '<', 0);
    assert_evaluates_false(2, '>', 4);
    assert_evaluates_false(1, '>=', 3);
    assert_evaluates_false(2, '>=', 4);
    assert_evaluates_false(1, '<=', 0);
    assert_evaluates_false(1, '<=', 0);
  });

  it('test_contains_works_on_strings', () => {
    assert_evaluates_true('bob', 'contains', 'o');
    assert_evaluates_true('bob', 'contains', 'b');
    assert_evaluates_true('bob', 'contains', 'bo');
    assert_evaluates_true('bob', 'contains', 'ob');
    assert_evaluates_true('bob', 'contains', 'bob');

    assert_evaluates_false('bob', 'contains', 'bob2');
    assert_evaluates_false('bob', 'contains', 'a');
    assert_evaluates_false('bob', 'contains', '---');
  });

  it('test_invalid_comparation_operator', () => {
    assert_evaluates_argument_error(1, '~~', 0);
  });

  it.skip('test_comparation_of_int_and_str', () => {
    assert_evaluates_argument_error('1', '>', 0);
    assert_evaluates_argument_error('1', '<', 0);
    assert_evaluates_argument_error('1', '>=', 0);
    assert_evaluates_argument_error('1', '<=', 0);
  });

  it('test_hash_compare_backwards_compatibility', () => {
    assert(!new Condition({}, '>', 2).evaluate());
    assert(!new Condition(2, '>', {}).evaluate());
    assert.equal(false, new Condition({}, '==', 2).evaluate());
    assert.equal(true, new Condition({ a: 1 }, '==', { a: 1 }).evaluate());
    assert.equal(true, new Condition({ a: 2 }, 'contains', 'a').evaluate());
  });

  it('test_contains_works_on_arrays', () => {
    context = new Dry.Context();
    context['array'] = [1, 2, 3, 4, 5];
    const array_expr = new VariableLookup('array');

    assert_evaluates_false(array_expr, 'contains', 0);
    assert_evaluates_true(array_expr, 'contains', 1);
    assert_evaluates_true(array_expr, 'contains', 2);
    assert_evaluates_true(array_expr, 'contains', 3);
    assert_evaluates_true(array_expr, 'contains', 4);
    assert_evaluates_true(array_expr, 'contains', 5);
    assert_evaluates_false(array_expr, 'contains', 6);
    assert_evaluates_false(array_expr, 'contains', '1');
  });

  it('test_contains_returns_false_for_nil_operands', () => {
    context = new Dry.Context();
    assert_evaluates_false(new VariableLookup('not_assigned'), 'contains', '0');
    assert_evaluates_false(0, 'contains', new VariableLookup('not_assigned'));
  });

  it('test_contains_return_false_on_wrong_data_type', () => {
    assert_evaluates_false(1, 'contains', 0);
  });

  it('test_contains_with_string_left_operand_coerces_right_operand_to_string', () => {
    assert_evaluates_true(' 1 ', 'contains', 1);
    assert_evaluates_false(' 1 ', 'contains', 2);
  });

  it('test_or_condition', () => {
    const condition = new Condition(1, '==', 2);

    assert.equal(false, condition.evaluate());

    condition.or(new Condition(2, '==', 1));

    assert.equal(false, condition.evaluate());

    condition.or(new Condition(1, '==', 1));

    assert.equal(true, condition.evaluate());
  });

  it('test_and_condition', () => {
    const condition = new Condition(1, '==', 1);

    assert.equal(true, condition.evaluate());

    condition.and(new Condition(2, '==', 2));

    assert.equal(true, condition.evaluate());

    condition.and(new Condition(2, '==', 1));

    assert.equal(false, condition.evaluate());
  });

  it('test_should_allow_custom_operator', () => {
    try {
      Condition.operators['contains'] = (left, right) => new RegExp(`^${right}`).exec(left);
      assert_evaluates_true('bob', 'starts_with', 'b');
      assert_evaluates_false('bob', 'starts_with', 'o');
    } catch (err) {
      delete Condition.operators['starts_with'];
    }
  });

  it('test_left_or_right_may_contain_operators', () => {
    context = new Dry.Context();
    context['one'] = context['another'] = 'gnomeslab-and-or-liquid';
    assert_evaluates_true(new VariableLookup('one'), '==', new VariableLookup('another'));
  });
});
