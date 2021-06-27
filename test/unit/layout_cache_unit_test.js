'use strict';

const assert = require('assert').strict;
const { StubFileSystem, StubTemplateFactory, times } = require('../test_helpers');
const Dry = require('../..');

describe('layout_cache_unit_test', () => {
  it('test_uses_the_file_system_register_if_present', () => {
    const context = Dry.Context.build({
      registers: {
        layouts: new StubFileSystem({ my_layout: 'my layout body' })
      }
    });

    const layout = Dry.LayoutCache.load('my_layout', {
      context,
      state: new Dry.State()
    });

    assert.equal('my layout body', layout.render());
  });

  it('test_reads_from_the_file_system_only_once_per_file', () => {
    const layouts = new StubFileSystem({ my_layout: 'some layout body' });
    const context = Dry.Context.build({ registers: { layouts } });
    const options = { context, state: new Dry.State() };

    times(2, () => {
      Dry.LayoutCache.load('my_layout', options);
    });

    assert.equal(1, layouts.file_read_count);
  });

  it('test_cache_state_is_stored_per_context', () => {
    const state = new Dry.State();
    const shared_file_system = new StubFileSystem({ my_layout: 'my shared value' });
    const context_one = Dry.Context.build({ registers: { layouts: shared_file_system } });
    const context_two = Dry.Context.build({ registers: { layouts: shared_file_system } });

    times(2, () => {
      Dry.LayoutCache.load('my_layout', { context: context_one, state });
    });

    Dry.LayoutCache.load('my_layout', { context: context_two, state });
    assert.equal(2, shared_file_system.file_read_count);
  });

  it('test_cache_is_not_broken_when_a_different_parse_context_is_used', () => {
    const layouts = new StubFileSystem({ my_layout: 'some layout body' });
    const context = Dry.Context.build({ registers: { layouts } });

    Dry.LayoutCache.load('my_layout', {
      context,
      state: new Dry.State({ my_key: 'value one' })
    });

    Dry.LayoutCache.load('my_layout', {
      context,
      state: new Dry.State({ my_key: 'value two' })
    });

    // Technically what we care about is that the file was parsed twice,
    // but measuring file reads is an OK proxy for this.
    assert.equal(1, layouts.file_read_count);
  });

  it('test_uses_default_template_factory_when_no_template_factory_found_in_register', () => {
    const context = Dry.Context.build({
      registers: {
        layouts: new StubFileSystem({ my_layout: 'my layout body' })
      }
    });

    const layout = Dry.LayoutCache.load('my_layout', {
      context,
      state: new Dry.State()
    });

    assert.equal('my layout body', layout.render());
  });

  it('test_uses_template_factory_register_if_present', () => {
    const layout_factory = new StubTemplateFactory();

    const context = Dry.Context.build({
      registers: {
        layouts: new StubFileSystem({ my_layout: 'my layout body' }),
        layout_factory
      }
    });

    const layout = Dry.LayoutCache.load('my_layout', {
      context,
      state: new Dry.State()
    });

    assert.equal('my layout body', layout.render());
    assert.equal(1, layout_factory.count);
  });
});

