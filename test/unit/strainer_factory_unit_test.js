
const assert = require('node:assert/strict');
const Dry = require('../..');
const { Context, StrainerFactory, StrainerTemplate } = Dry;

const accessScopeFilters = {
  public_filter() {
    return 'public';
  },
  private_filter() {
    return 'private';
  }
};

const lateAddedFilter = {
  late_added_filter(_keep /* don't delete unused param, it's tested for arity*/) {
    return 'filtered';
  }
};

describe('strainer factory unit tests', () => {
  let context;

  before(() => {
    StrainerFactory.add_global_filter(accessScopeFilters);
  });

  beforeEach(() => {
    context = new Context();
  });

  it('strainer', () => {
    const strainer = StrainerFactory.create(context);
    assert.equal(5, strainer.invoke('size', 'input'));
    assert.equal('public', strainer.invoke('public_filter'));
  });

  it('strainer_argument_error_contains_backtrace', () => {
    const strainer = StrainerFactory.create(context);
    const errorRe = /wrong number of arguments \((1 for 0|given 1, expected 0)\)/;

    try {
      strainer.invoke('public_filter', 1);
    } catch (err) {
      assert(err instanceof Dry.ArgumentError);
      assert(errorRe.test(err.message));
    }
  });

  it('strainer_only_invokes_public_filter_methods', () => {
    const strainer = StrainerFactory.create(context);
    assert.equal(false, strainer.constructor.invokable('__proto__'));
    assert.equal(false, strainer.constructor.invokable('test'));
    assert.equal(false, strainer.constructor.invokable('eval'));
    assert.equal(false, strainer.constructor.invokable('call'));
    assert.equal(true, strainer.constructor.invokable('size')); // from the standard lib
  });

  it('strainer_returns_nil_if_no_filter_method_found', () => {
    const strainer = StrainerFactory.create(context);
    assert(!strainer.invoke('undef_the_filter'));
  });

  it('strainer_returns_first_argument_if_no_method_and_arguments_given', () => {
    const strainer = StrainerFactory.create(context);
    assert.equal('password', strainer.invoke('undef_the_method', 'password'));
  });

  it('strainer_only_allows_methods_defined_in_filters', () => {
    const strainer = StrainerFactory.create(context);
    assert.equal('1 + 1', strainer.invoke('instance_eval', '1 + 1'));
    assert.equal('puts', strainer.invoke('__send__', 'puts', 'Hi Mom'));
    assert.equal('has_method?', strainer.invoke('invoke', 'has_method?', 'invoke'));
  });

  it('strainer_uses_a_class_cache_to_avoid_method_cache_invalidation', () => {
    const strainer = StrainerFactory.create(context);
    assert(strainer instanceof StrainerTemplate);
  });

  it('add_global_filter_clears_cache', () => {
    assert.equal('input', StrainerFactory.create(context).invoke('late_added_filter', 'input'));
    StrainerFactory.add_global_filter(lateAddedFilter);
    assert.equal('filtered', StrainerFactory.create(null).invoke('late_added_filter', 'input'));
  });
});
