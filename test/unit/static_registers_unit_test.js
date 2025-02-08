'use strict';

const assert = require('node:assert/strict');
const { KeyError, RuntimeError, StaticRegisters } = require('../..');

describe('static_registers_unit_test', () => {
  it('test_set', () => {
    const static_register = new StaticRegisters({ a: 1, b: 2 });
    static_register['b'] = 22;
    static_register['c'] = 33;

    assert.equal(1, static_register['a']);
    assert.equal(22, static_register['b']);
    assert.equal(33, static_register['c']);
  });

  it('test_get_missing_key', () => {
    const static_register = new StaticRegisters();

    assert(!static_register['missing']);
  });

  it('test_delete', () => {
    const static_register = new StaticRegisters({ a: 1, b: 2 });
    static_register['b'] = 22;
    static_register['c'] = 33;

    assert(!static_register.delete('a'));

    assert.equal(22, static_register.delete('b'));

    assert.equal(33, static_register.delete('c'));
    assert(!static_register['c']);

    assert(!static_register.delete('d'));
  });

  it('test_fetch', () => {
    const static_register = new StaticRegisters({ a: 1, b: 2 });
    static_register['b'] = 22;
    static_register['c'] = 33;

    assert.equal(1, static_register.fetch('a'));
    assert.equal(1, static_register.fetch('a', 'default'));
    assert.equal(22, static_register.fetch('b'));
    assert.equal(22, static_register.fetch('b', 'default'));
    assert.equal(33, static_register.fetch('c'));
    assert.equal(33, static_register.fetch('c', 'default'));

    assert.throws(() => static_register.fetch('d'), KeyError);
    assert.equal('default', static_register.fetch('d', 'default'));

    let result = static_register.fetch('d', 'default');
    assert.equal('default', result);

    result = static_register.fetch('d', 'default 1', 'default 2');
    assert.equal('default 2', result);
  });

  it('test_key', () => {
    const static_register = new StaticRegisters({ a: 1, b: 2 });
    static_register['b'] = 22;
    static_register['c'] = 33;

    assert.equal(true, static_register.key('a'));
    assert.equal(true, static_register.key('b'));
    assert.equal(true, static_register.key('c'));
    assert.equal(false, static_register.key('d'));
  });

  it.skip('test_static_register_can_be_frozen', () => {
    const static_register = new StaticRegisters({ a: 1 });
    static_register.static = Object.freeze(static_register.static);

    assert.throws(() => (static_register.static['a'] = 'foo'), RuntimeError);
    assert.throws(() => (static_register.static['b'] = 'foo'), RuntimeError);
    assert.throws(() => static_register.static.delete('a'), RuntimeError);
    assert.throws(() => static_register.static.delete('c'), RuntimeError);
  });

  it('test_new_static_retains_static', () => {
    const static_register = new StaticRegisters({ a: 1, b: 2 });
    static_register['b'] = 22;
    static_register['c'] = 33;

    const new_static_register = new StaticRegisters(static_register);
    new_static_register['b'] = 222;

    const newest_static_register = new StaticRegisters(new_static_register);
    newest_static_register['c'] = 333;

    assert.equal(1, static_register['a']);
    assert.equal(22, static_register['b']);
    assert.equal(33, static_register['c']);

    assert.equal(1, new_static_register['a']);
    assert.equal(222, new_static_register['b']);
    assert(!new_static_register['c']);

    assert.equal(1, newest_static_register['a']);
    assert.equal(2, newest_static_register['b']);
    assert.equal(333, newest_static_register['c']);
  });

  it('test_multiple_instances_are_unique', () => {
    const static_register_1 = new StaticRegisters({ a: 1, b: 2 });
    static_register_1['b'] = 22;
    static_register_1['c'] = 33;

    const static_register_2 = new StaticRegisters({ a: 10, b: 20 });
    static_register_2['b'] = 220;
    static_register_2['c'] = 330;

    assert.deepEqual({ a: 1, b: 2 }, static_register_1.static);
    assert.equal(1, static_register_1['a']);
    assert.equal(22, static_register_1['b']);
    assert.equal(33, static_register_1['c']);

    assert.deepEqual({ a: 10, b: 20 }, static_register_2.static);
    assert.equal(10, static_register_2['a']);
    assert.equal(220, static_register_2['b']);
    assert.equal(330, static_register_2['c']);
  });

  it('test_initialization_reused_static_same_memory_object', () => {
    const static_register_1 = new StaticRegisters({ a: 1, b: 2 });
    static_register_1['b'] = 22;
    static_register_1['c'] = 33;

    const static_register_2 = new StaticRegisters(static_register_1);

    assert.equal(1, static_register_2['a']);
    assert.equal(2, static_register_2['b']);
    assert(!static_register_2['c']);

    static_register_1.static['b'] = 222;
    static_register_1.static['c'] = 333;

    assert(static_register_1.static === static_register_2.static);
  });
});

