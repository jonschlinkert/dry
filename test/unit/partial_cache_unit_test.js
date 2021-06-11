'use strict';

const assert = require('assert').strict;
const { StubFileSystem, StubTemplateFactory } = require('../test_helpers');
const Dry = require('../..');

describe('partial_cache_unit_test', () => {
  it('test_uses_the_file_system_register_if_present', () => {
    const context = Dry.Context.build({
      registers: {
        file_system: new StubFileSystem({ my_partial: 'my partial body' })
      }
    });

    const partial = Dry.PartialCache.load('my_partial', {
      context,
      state: new Dry.State()
    });

    assert.equal('my partial body', partial.render());
  });

  it('test_reads_from_the_file_system_only_once_per_file', () => {
    const file_system = new StubFileSystem({ my_partial: 'some partial body' });
    const context = Dry.Context.build({ registers: { file_system } });
    const options = { context, state: new Dry.State() };

    for (let i = 0; i < 2; i++) {
      Dry.PartialCache.load('my_partial', options);
    }

    assert.equal(1, file_system.file_read_count);
  });

  it('test_cache_state_is_stored_per_context', () => {
    const state = new Dry.State();
    const shared_file_system = new StubFileSystem({ my_partial: 'my shared value' });
    const context_one = Dry.Context.build({
      registers: {
        file_system: shared_file_system
      }
    });

    const context_two = Dry.Context.build({
      registers: {
        file_system: shared_file_system
      }
    });

    for (let i = 0; i < 2; i++) {
      Dry.PartialCache.load('my_partial', { context: context_one, state });
    }

    Dry.PartialCache.load('my_partial', { context: context_two, state });
    assert.equal(2, shared_file_system.file_read_count);
  });

  it('test_cache_is_not_broken_when_a_different_parse_context_is_used', () => {
    const file_system = new StubFileSystem({ my_partial: 'some partial body' });
    const context = Dry.Context.build({ registers: { file_system } });

    Dry.PartialCache.load('my_partial', {
      context,
      state: new Dry.State({ my_key: 'value one' })
    });

    Dry.PartialCache.load('my_partial', {
      context,
      state: new Dry.State({ my_key: 'value two' })
    });

    // Technically what we care about is that the file was parsed twice,
    // but measuring file reads is an OK proxy for this.
    assert.equal(1, file_system.file_read_count);
  });

  it('test_uses_default_template_factory_when_no_template_factory_found_in_register', () => {
    const context = Dry.Context.build({
      registers: {
        file_system: new StubFileSystem({ my_partial: 'my partial body' })
      }
    });

    const partial = Dry.PartialCache.load('my_partial', {
      context,
      state: new Dry.State()
    });

    assert.equal('my partial body', partial.render());
  });

  it('test_uses_template_factory_register_if_present', () => {
    const template_factory = new StubTemplateFactory();
    const context = Dry.Context.build({
      registers: {
        file_system: new StubFileSystem({ my_partial: 'my partial body' }),
        template_factory
      }
    });

    const partial = Dry.PartialCache.load('my_partial', {
      context,
      state: new Dry.State()
    });

    assert.equal('my partial body', partial.render());
    assert.equal(1, template_factory.count);
  });
});

