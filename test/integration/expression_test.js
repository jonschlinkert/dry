
const assert = require('node:assert/strict');
const Parser = require('../../lib/expressions/Parser');
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
  it('test_keyword_literals', async () => {
    assert.equal(true, await parse_and_eval('true'));
    assert.equal(true, await parse_and_eval(' true '));
  });

  it('test_string', async () => {
    assert.equal('single quoted', await parse_and_eval("'single quoted'"));
    assert.equal('double quoted', await parse_and_eval('"double quoted"'));
    assert.equal('spaced', await parse_and_eval(" 'spaced' "));
    assert.equal('spaced2', await parse_and_eval(' "spaced2" '));
  });

  it('test_int', async () => {
    assert.equal(123, await parse_and_eval('123'));
    assert.equal(456, await parse_and_eval(' 456 '));
    assert.equal(12, await parse_and_eval('012'));
  });

  it('test_float', async () => {
    assert.equal(1.5, await parse_and_eval('1.5'));
    assert.equal(2.5, await parse_and_eval(' 2.5 '));
  });

  it('test_range', async () => {
    assert.deepEqual([1, 2], await parse_and_eval('(1..2)'));
    assert.deepEqual([3, 4, 5], await parse_and_eval(' ( 3 .. 5 ) '));
  });
});
