
const assert = require('node:assert/strict');
const Dry = require('../..');
const { expressions: { Parser } } = Dry;

describe('parser_unit_test', () => {
  it('test_consume', () => {
    const p = new Parser('wat: 7');
    assert.equal('wat', p.consume('id'));
    assert.equal(':', p.consume('colon'));
    assert.equal('7', p.consume('number'));
  });

  it('test_jump', () => {
    const p = new Parser('wat: 7');
    p.jump(2);
    assert.equal('7', p.consume('number'));
  });

  it('test_consume_', () => {
    const p = new Parser('wat: 7');
    assert.equal('wat', p.accept('id'));
    assert.equal(false, p.accept('dot'));
    assert.equal(':', p.consume('colon'));
    assert.equal('7', p.accept('number'));
  });

  it('test_id_', () => {
    const p = new Parser('wat 6 Peter Hegemon');
    assert.equal('wat', p.id('wat'));
    assert.equal(false, p.id('endgame'));
    assert.equal('6', p.consume('number'));
    assert.equal('Peter', p.id('Peter'));
    assert.equal(false, p.id('Achilles'));
  });

  it('test_look', () => {
    const p = new Parser('wat 6 Peter Hegemon');
    assert.equal(true, p.look('id'));
    assert.equal('wat', p.consume('id'));
    assert.equal(false, p.look('comparison'));
    assert.equal(true, p.look('number'));
    assert.equal(true, p.look('id', 1));
    assert.equal(false, p.look('number', 1));
  });

  it('test_expressions', () => {
    let p = new Parser('hi.there hi?[5].there? hi.there.bob');
    assert.equal('hi.there', p.expression());
    assert.equal('hi?[5].there?', p.expression());
    assert.equal('hi.there.bob', p.expression());

    p = new Parser("567 6.0 'lol' \"wut\"");
    assert.equal('567', p.expression());
    assert.equal('6.0', p.expression());
    assert.equal("'lol'", p.expression());
    assert.equal('"wut"', p.expression());
  });

  it('test_ranges', () => {
    const p = new Parser('(5..7) (1.5..9.6) (young..old) (hi[5].wat..old)');
    assert.equal('(5..7)', p.expression());
    assert.equal('(1.5..9.6)', p.expression());
    assert.equal('(young..old)', p.expression());
    assert.equal('(hi[5].wat..old)', p.expression());
  });

  it('test_arguments', () => {
    const p = new Parser('filter: hi.there[5], keyarg: 7');
    assert.equal('filter', p.consume('id'));
    assert.equal(':', p.consume('colon'));
    assert.equal('hi.there[5]', p.argument());
    assert.equal(',', p.consume('comma'));
    assert.equal('keyarg: 7', p.argument());
  });

  it('test_invalid_expression', () => {
    assert.throws(() => {
      const p = new Parser('==');
      p.expression();
    }, Dry.SyntaxError);
  });
});

