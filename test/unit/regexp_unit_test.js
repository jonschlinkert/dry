
const assert = require('node:assert/strict');
const Dry = require('../..');
const { QuotedFragment, VariableParser } = Dry.regex;

describe('regexp_unit_test', () => {
  it('test_empty', () => {
    assert.deepEqual([], (''.match(QuotedFragment) || []).slice());
  });

  it('test_quote', () => {
    assert.deepEqual(['"arg 1"'], '"arg 1"'.match(QuotedFragment).slice());
  });

  it('test_words', () => {
    assert.deepEqual(['arg1', 'arg2'], 'arg1 arg2'.match(QuotedFragment).slice());
  });

  it('test_tags', () => {
    assert.deepEqual(['<tr>', '</tr>'], '<tr> </tr>'.match(QuotedFragment).slice());
    assert.deepEqual(['<tr></tr>'], '<tr></tr>'.match(QuotedFragment).slice());
    assert.deepEqual(['<style', 'class="hello">', '</style>'], '<style class="hello">\' </style>'.match(QuotedFragment).slice());
  });

  it('test_double_quoted_words', () => {
    assert.deepEqual(['arg1', 'arg2', '"arg 3"'], 'arg1 arg2 "arg 3"'.match(QuotedFragment).slice());
  });

  it('test_single_quoted_words', () => {
    assert.deepEqual(['arg1', 'arg2', "'arg 3'"], 'arg1 arg2 \'arg 3\''.match(QuotedFragment).slice());
  });

  it('test_quoted_words_in_the_middle', () => {
    assert.deepEqual(['arg1', 'arg2', '"arg 3"', 'arg4'], 'arg1 arg2 "arg 3" arg4   '.match(QuotedFragment).slice());
  });

  it('test_VariableParser', () => {
    assert.deepEqual(['var'],                               'var'.match(VariableParser).slice());
    assert.deepEqual(['var', 'method'],                     'var.method'.match(VariableParser).slice());
    assert.deepEqual(['var', '[method]'],                   'var[method]'.match(VariableParser).slice());
    assert.deepEqual(['var', '[method]', '[0]'],            'var[method][0]'.match(VariableParser).slice());
    assert.deepEqual(['var', '["method"]', '[0]'],          'var["method"][0]'.match(VariableParser).slice());
    assert.deepEqual(['var', '[method]', '[0]', 'method'],  'var[method][0].method'.match(VariableParser).slice());
  });
});
