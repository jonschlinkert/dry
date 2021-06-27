'use strict';

const assert = require('assert').strict;
const { with_custom_tag } = require('../test_helpers');
const Dry = require('../..');

const sleep = (ms = 1000) => new Promise(res => setTimeout(res, ms));

class ProfilingFileSystem {
  read_template_file(template_path) {
    return `Rendering template {% assign template_name = '${template_path}'%}\n{{ template_name }}`;
  }
}

class SleepTag extends Dry.Tag {
  constructor(node, state) {
    super(node, state);
    this.duration = Number(this.value);
  }

  render() {
    return sleep(this.duration);
  }
}

describe.skip('profiler_test', () => {
  before(() => {
    Dry.profiler();
  });

  beforeEach(() => {
    Dry.Template.file_system = new ProfilingFileSystem();
  });

  it('test_template_allows_flagging_profiling', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}");
    await t.render();

    assert(!t.profiler);
  });

  it('test_parse_makes_available_simple_profiling', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}", { profile: true });
    await t.render();

    assert.equal(1, t.profiler.length);

    const node = t.profiler[0];
    assert.equal(" 'a string' | upcase ", node.code);
  });

  it('test_render_ignores_raw_strings_when_profiling', async () => {
    const t = Dry.Template.parse('This is raw string\nstuff\nNewline', { profile: true });
    await t.render();

    assert.equal(0, t.profiler.length);
  });

  it('test_profiling_includes_line_numbers_of_liquid_nodes', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}\n{% increment test %}", { profile: true });
    await t.render();
    assert.equal(2, t.profiler.length);

    // {{ 'a string' | upcase }}
    assert.equal(1, t.profiler[0].line_number);
    // {{ increment test }}
    assert.equal(2, t.profiler[1].line_number);
  });

  it('test_profiling_includes_line_numbers_of_included_partials', async () => {
    const t = Dry.Template.parse("{% include 'a_template' %}", { profile: true });
    await t.render();

    const included_children = t.profiler[0].children;

    // {% assign template_name = 'a_template' %}
    assert.equal(1, included_children[0].line_number);
    // {{ template_name }}
    assert.equal(2, included_children[1].line_number);
  });

  it('test_profiling_render_tag', async () => {
    const t = Dry.Template.parse("{% render 'a_template' %}", { profile: true });
    await t.render();

    const render_children = t.profiler[0].children;
    render_children.forEach(timing => {
      assert.equal('a_template', timing.partial);
    });
    assert.deepEqual([1, 2], render_children.map(timing => timing.line_number));
  });

  it('test_profiling_times_the_rendering_of_tokens', async () => {
    const t = Dry.Template.parse("{% include 'a_template' %}", { profile: true });
    await t.render();

    const node = t.profiler[0];
    assert(node.render_time);
  });

  it('test_profiling_times_the_entire_render', async () => {
    const t = Dry.Template.parse("{% include 'a_template' %}", { profile: true });
    await t.render();

    assert(t.profiler.total_render_time >= 0, 'Total render time was not calculated');
  });

  it('test_profiling_multiple_renders', async () => {
    await with_custom_tag('sleep', SleepTag, async () => {
      const context = new Dry.Context();
      const t = Dry.Dry.Template.parse('{% sleep 0.001 %}', { profile: true });
      context.template_name = 'index';
      await t.render(context);
      context.template_name = 'layout';
      const first_render_time = context.profiler.total_time;
      await t.render(context);

      const profiler = context.profiler;
      const children = profiler.children;
      assert(first_render_time >= 0.001);
      assert(profiler.total_time >= 0.001 + first_render_time);
      assert.equal(['index', 'layout'], children.map(c => c.template_name));
      assert.equal([null, null], children.map(c => c.code));
      assert.equal(profiler.total_time, children.map(c => c.total_time).reduce((a, n) => a + n, 0));
    });
  });

  it('test_profiling_uses_include_to_mark_children', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}\n{% include 'a_template' %}", { profile: true });
    await t.render();

    const include_node = t.profiler[1];
    assert.equal(2, include_node.children.length);
  });

  it('test_profiling_marks_children_with_the_name_of_included_partial', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}\n{% include 'a_template' %}", { profile: true });
    await t.render();

    const include_node = t.profiler[1];
    include_node.children.forEach(child => {
      assert.equal('a_template', child.partial);
    });
  });

  it('test_profiling_supports_multiple_templates', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}\n{% include 'a_template' %}\n{% include 'b_template' %}", { profile: true });
    await t.render();

    const a_template = t.profiler[1];
    a_template.children.forEach(child => {
      assert.equal('a_template', child.partial);
    });

    const b_template = t.profiler[2];
    b_template.children.forEach(child => {
      assert.equal('b_template', child.partial);
    });
  });

  it('test_profiling_supports_rendering_the_same_partial_multiple_times', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}\n{% include 'a_template' %}\n{% include 'a_template' %}", { profile: true });
    await t.render();

    const a_template1 = t.profiler[1];
    a_template1.children.forEach(child => {
      assert.equal('a_template', child.partial);
    });

    const a_template2 = t.profiler[2];
    a_template2.children.forEach(child => {
      assert.equal('a_template', child.partial);
    });
  });

  it('test_can_iterate_over_each_profiling_entry', async () => {
    const t = Dry.Template.parse("{{ 'a string' | upcase }}\n{% increment test %}", { profile: true });
    await t.render();

    let timing_count = 0;
    t.profiler.forach(() => {
      timing_count += 1;
    });

    assert.equal(2, timing_count);
  });

  it('test_profiling_marks_children_of_if_blocks', async () => {
    const t = Dry.Template.parse('{% if true %} {% increment test %} {{ test }} {% endif %}', { profile: true });
    await t.render();

    assert.equal(1, t.profiler.length);
    assert.equal(2, t.profiler[0].children.length);
  });

  it('test_profiling_marks_children_of_for_blocks', async () => {
    const t = Dry.Template.parse('{% for item in collection %} {{ item }} {% endfor %}', { profile: true });
    await t.render({ 'collection': ['one', 'two'] });

    assert.equal(1, t.profiler.length);
    // Will profile each invocation of the for block
    assert.equal(2, t.profiler[0].children.length);
  });

  it('test_profiling_supports_self_time', async () => {
    const t = Dry.Template.parse('{% for item in collection %} {{ item }} {% endfor %}', { profile: true });
    await t.render({ 'collection': ['one', 'two'] });
    const leaf = t.profiler[0].children[0];

    assert(leaf.self_time > 0);
  });

  it('test_profiling_supports_total_time', async () => {
    const t = Dry.Template.parse('{% if true %} {% increment test %} {{ test }} {% endif %}', { profile: true });
    await t.render();

    assert(t.profiler[0].total_time > 0);
  });
});

