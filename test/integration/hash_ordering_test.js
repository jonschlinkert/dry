'use strict';

const util = require('util');
const assert = require('assert').strict;
const { with_global_filter } = require('../test_helpers');
const Dry = require('../..');

const MoneyFilter = {
  money(input) {
    return util.format(' %d$ ', input);
  }
};

const CanadianMoneyFilter = {
  money(input) {
    return util.format(' %d$ CAD ', input);
  }
};

describe('hash_ordering_test', () => {
  it('test_global_register_order', () => {
    with_global_filter([MoneyFilter, CanadianMoneyFilter], () => {
      assert.equal(' 1000$ CAD ', Dry.Template.parse('{{1000 | money}}').render(null, null));
    });
  });
});
