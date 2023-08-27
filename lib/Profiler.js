
const kSelfTime = Symbol(':self_time');
const kChildren = Symbol(':children');

// Profiler enables support for profiling template rendering to help track down performance issues.
//
// To enable profiling, first require 'liquid/profiler'.
// Then, to profile a parse/render cycle, pass the <tt>profile: true</tt> option to <tt>Liquid::Template.parse</tt>.
// After <tt>Liquid::Template#render</tt> is called, the template object makes available an instance of this
// class via the <tt>Liquid::Template#profiler</tt> method.
//
//   template = Liquid::Template.parse(template_content, profile: true)
//   output  = template.render
//   profile = template.profiler
//
// This object contains all profiling information, containing information on what tags were rendered,
// where in the templates these tags live, and how long each tag took to render.
//
// This is a tree structure that is Enumerable all the way down, and keeps track of tags and rendering times
// inside of <tt>{% include %}</tt> tags.
//
//   profile.each do |node|
//     // Access to the node itself
//     node.code
//
//     // Which template and line number of this node.
//     // The top-level template name is `null` by default, but can be set in the Liquid::Context before rendering.
//     node.partial
//     node.line_number
//
//     // Render time in seconds of this node
//     node.render_time
//
//     // If the template used {% include %}, this node will also have children.
//     node.children.each do |child2|
//       // ...
//     }
//   }
//
// Profiler also exposes the total time of the template's render in <tt>Liquid::Profiler#total_render_time</tt>.
//
// All render times are in seconds. There is a small performance hit when profiling is enabled.
//
class Timing {
  // attr_reader :code, :template_name, :line_number, :children
  // attr_accessor :total_time
  // alias_method :render_time, :total_time
  // alias_method :partial, :template_name

  constructor({ code = null, template_name = null, line_number = null } = {}) {
    this.code = code;
    this.template_name = template_name;
    this.line_number = line_number;
    this.children = [];
  }

  get self_time() {
    this[kSelfTime] ||= (() => {
      let total_children_time = 0;
      for (const child of this.children) {
        total_children_time += child.total_time;
      }
      return this.total_time - total_children_time;
    })();
    return this[kSelfTime];
  }

  get partial() {
    return this.template_name;
  }

  get render_time() {
    return this.total_time;
  }
}

class Profiler {
  // include Enumerable
  // attr_reader :total_time
  // alias_method :total_render_time, :total_time

  constructor() {
    this.root_children = [];
    this.current_children = null;
    this.total_time = 0;

    return new Proxy(this, {
      get(target, key) {
        if (typeof key === 'number') {
          return target.children[key];
        }

        return key in target ? target[key] : target.get(key);
      }
    });
  }

  profile(template_name, options, callback) {
    // nested renders are done from a tag that already has a timing node
    if (this.current_children) return callback();

    const root_children = this.root_children;
    const render_idx = root_children.length;
    let timing;

    try {
      this.current_children = root_children;
      return this.profile_node(template_name, options, callback);
    } catch (err) {
      if (process.DEBUG) console.error(err);
    } finally {
      this.current_children = null;

      if ((timing = root_children[render_idx]) !== undefined) {
        this.total_time += timing.total_time;
      }
    }
  }

  set children(value) {
    this[kChildren] = value;
  }
  get children() {
    this[kChildren] = this.root_children;

    if (this[kChildren].length === 1) {
      return this[kChildren][0].children;
    }

    return this[kChildren] || [];
  }

  each(callback) {
    this.children.forEach(callback);
  }

  get(index) {
    return this.children[index];
  }

  async profile_node(template_name, options = {}, callback) {
    const { code = null, line_number = null } = options;
    const timing = new Timing({ code, template_name, line_number });
    const parent_children = this.current_children || this.root_children;
    const start_time = this.monotonic_time;

    try {
      this.current_children = timing.children;
      await callback();
    } catch (err) {
      if (process.DEBUG) console.error(err);
    } finally {
      this.current_children = parent_children;
      timing.total_time = this.monotonic_time - start_time;
      parent_children.push(timing);
    }
  }

  get total_render_time() {
    return this.total_time;
  }

  get length() {
    return this.children.length;
  }

  // private
  get monotonic_time() {
    return Date.now();
  }
}

module.exports = Profiler;
