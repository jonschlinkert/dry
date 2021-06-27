'use strict';

require('mocha');
const assert = require('assert').strict;
const { assert_raises, with_global_filter } = require('../test_helpers');
const Dry = require('../..');
const { Context } = Dry;

const ProtectedMethodOverrideFilter = {
  constructor() {
    return 'overriden as protected';
  }
};

const PrivateMethodOverrideFilter = {
  assign() {
    return 'overriden as private';
  }
};

const PublicMethodOverrideFilter = {
  public_filter() {
    return 'public';
  }
};

describe('strainer template unit tests', () => {
  it('test_add_filter_when_wrong_filter_class', () => {
    const c = new Context();
    const s = c.strainer;
    const wrong_filter = v => v.reverse();

    const error = assert_raises(Dry.TypeError, () => {
      s.constructor.add_filter(wrong_filter);
    });

    assert.equal(error.message, 'Dry error: wrong argument type "function" (expected an object)');
  });

  it('test_add_filter_raises_when_module_privately_overrides_registered_public_methods', () => {
    const strainer = new Context().strainer;

    const error = assert_raises(Dry.MethodOverrideError, () => {
      strainer.constructor.add_filter(PrivateMethodOverrideFilter);
    });

    assert.equal('Dry error: Filter overrides registered public methods as non public: assign', error.message);
  });

  it('test_add_filter_raises_when_module_overrides_registered_public_method_as_protected', () => {
    const strainer = new Context().strainer;

    const error = assert_raises(Dry.MethodOverrideError, () => {
      strainer.constructor.add_filter(ProtectedMethodOverrideFilter);
    });

    assert.equal('Dry error: Filter overrides registered public methods as non public: constructor', error.message);
  });

  it('test_add_filter_does_not_raise_when_module_overrides_previously_registered_method', () => {
    const strainer = new Context().strainer;

    with_global_filter(() => {
      strainer.constructor.add_filter(PublicMethodOverrideFilter);
      assert(strainer.constructor.filter_methods.has('public_filter'));
    });
  });

  it('test_add_filter_does_not_include_already_included_module', () => {
    let count = 0;
    const mod = {
      included(_mod) {
        count += 1;
      }
    };

    const strainer = new Context().strainer;
    strainer.constructor.add_filter(mod);
    strainer.constructor.add_filter(mod);
    assert.equal(count, 1);
  });
});
