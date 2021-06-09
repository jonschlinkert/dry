'use strict';

const assert = require('assert').strict;
const Parser = require('../../lib/expression/Parser');
const Dry = require('../..');
const { Context, Expression, Template } = Dry;

const parse_and_eval = (markup, assigns) => {
  if (Template.error_mode === 'strict') {
    const parser = new Parser(markup);
    markup = parser.expression();
    parser.consume('end_of_string');
  }

  const expression = Expression.parse(markup);
  const context = new Context(assigns);
  return context.evaluate(expression);
};

describe('expression_test', () => {
  it('test_keyword_literals', () => {
    assert.equal(true, parse_and_eval('true'));
    assert.equal(true, parse_and_eval(' true '));
  });

  it('test_string', () => {
    assert.equal('single quoted', parse_and_eval("'single quoted'"));
    assert.equal('double quoted', parse_and_eval('"double quoted"'));
    assert.equal('spaced', parse_and_eval(" 'spaced' "));
    assert.equal('spaced2', parse_and_eval(' "spaced2" '));
  });

  it('test_int', () => {
    assert.equal(123, parse_and_eval('123'));
    assert.equal(456, parse_and_eval(' 456 '));
    assert.equal(12, parse_and_eval('012'));
  });

  it('test_float', () => {
    assert.equal(1.5, parse_and_eval('1.5'));
    assert.equal(2.5, parse_and_eval(' 2.5 '));
  });

  it('test_range', () => {
    assert.deepEqual([1, 2], parse_and_eval('(1..2)'));
    assert.deepEqual([3, 4, 5], parse_and_eval(' ( 3 .. 5 ) '));
  });
});
