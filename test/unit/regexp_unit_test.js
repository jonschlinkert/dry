'use strict';

const assert = require('assert').strict;
const Dry = require('../..');
const { QUOTED_FRAGMENT, VARIABLE_PARSER } = Dry.regex;

describe('regexp_unit_test', () => {
  it('test_empty', () => {
    assert.deepEqual([], (''.match(QUOTED_FRAGMENT) || []).slice());
  });

  it('test_quote', () => {
    assert.deepEqual(['"arg 1"'], '"arg 1"'.match(QUOTED_FRAGMENT).slice());
  });

  it('test_words', () => {
    assert.deepEqual(['arg1', 'arg2'], 'arg1 arg2'.match(QUOTED_FRAGMENT).slice());
  });

  it('test_tags', () => {
    assert.deepEqual(['<tr>', '</tr>'], '<tr> </tr>'.match(QUOTED_FRAGMENT).slice());
    assert.deepEqual(['<tr></tr>'], '<tr></tr>'.match(QUOTED_FRAGMENT).slice());
    assert.deepEqual(['<style', 'class="hello">', '</style>'], '<style class="hello">\' </style>'.match(QUOTED_FRAGMENT).slice());
  });

  it('test_double_quoted_words', () => {
    assert.deepEqual(['arg1', 'arg2', '"arg 3"'], 'arg1 arg2 "arg 3"'.match(QUOTED_FRAGMENT).slice());
  });

  it('test_single_quoted_words', () => {
    assert.deepEqual(['arg1', 'arg2', "'arg 3'"], 'arg1 arg2 \'arg 3\''.match(QUOTED_FRAGMENT).slice());
  });

  it('test_quoted_words_in_the_middle', () => {
    assert.deepEqual(['arg1', 'arg2', '"arg 3"', 'arg4'], 'arg1 arg2 "arg 3" arg4   '.match(QUOTED_FRAGMENT).slice());
  });

  it('test_variable_parser', () => {
    assert.deepEqual(['var'],                               'var'.match(VARIABLE_PARSER).slice());
    assert.deepEqual(['var', 'method'],                     'var.method'.match(VARIABLE_PARSER).slice());
    assert.deepEqual(['var', '[method]'],                   'var[method]'.match(VARIABLE_PARSER).slice());
    assert.deepEqual(['var', '[method]', '[0]'],            'var[method][0]'.match(VARIABLE_PARSER).slice());
    assert.deepEqual(['var', '["method"]', '[0]'],          'var["method"][0]'.match(VARIABLE_PARSER).slice());
    assert.deepEqual(['var', '[method]', '[0]', 'method'],  'var[method][0].method'.match(VARIABLE_PARSER).slice());
  });
});
