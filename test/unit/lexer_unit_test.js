'use strict';

const assert = require('assert').strict;
const { expressions } = require('../..');
const { Lexer } = expressions;

describe('lexer_unit_test', () => {
  let tokens;

  it('test_strings', () => {
    tokens = new Lexer(' \'this is a test""\' "wat \'lol\'"').tokenize();
    assert.deepEqual([['string', '\'this is a test""\''], ['string', '"wat \'lol\'"'], ['end_of_string']], tokens);
  });

  it('test_integer', () => {
    tokens = new Lexer('hi 50').tokenize();
    assert.deepEqual([['id', 'hi'], ['number', '50'], ['end_of_string']], tokens);
  });

  it('test_float', () => {
    tokens = new Lexer('hi 5.0').tokenize();
    assert.deepEqual([['id', 'hi'], ['number', '5.0'], ['end_of_string']], tokens);
  });

  it('test_comparison', () => {
    tokens = new Lexer('== <> contains ').tokenize();
    assert.deepEqual([['comparison', '=='], ['comparison', '<>'], ['comparison', 'contains'], ['end_of_string']], tokens);
  });

  it('test_specials', () => {
    tokens = new Lexer('| .:').tokenize();
    assert.deepEqual([['pipe', '|'], ['dot', '.'], ['colon', ':'], ['end_of_string']], tokens);
    tokens = new Lexer('[,]').tokenize();
    assert.deepEqual([['open_square', '['], ['comma', ','], ['close_square', ']'], ['end_of_string']], tokens);
  });

  it('test_fancy_identifiers', () => {
    tokens = new Lexer('hi five?').tokenize();
    assert.deepEqual([['id', 'hi'], ['id', 'five?'], ['end_of_string']], tokens);

    tokens = new Lexer('2foo').tokenize();
    assert.deepEqual([['number', '2'], ['id', 'foo'], ['end_of_string']], tokens);
  });

  it('test_whitespace', () => {
    tokens = new Lexer('five|\n\t ==').tokenize();
    assert.deepEqual([['id', 'five'], ['pipe', '|'], ['comparison', '=='], ['end_of_string']], tokens);
  });

  it('test_unexpected_character', () => {
    assert.throws(() => {
      new Lexer('%').tokenize();
    });
  });
});

