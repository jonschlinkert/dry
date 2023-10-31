
const Dry = require('../Dry');
const { regex, utils } = Dry;
const { QuotedString: q, QuotedFragment: f, VariableSegment: s } = regex;

/**
 * From is similar to `include` but specifically for macros.
 *
 *   {% from "signup" as "form" %}
 *
 */

class From extends Dry.BlockTag {
  static Syntax = utils.r`(${q}+)\\s+import\\s+(.+)$`;

  constructor(node, state, parent) {
    super(node, state, parent);
    this.markup = this.match[3];
    this.assignments = [];
  }

  push(node) {
    super.push(node);

    if (node.type === 'open') {
      this.markup = node.markup;
      this.parse();
    }
  }

  parse() {
    if (this.ParseSyntax(this.markup, From.Syntax)) {
      this.template_name      = this.last_match[1];
      this.assignment_markup  = this.last_match[2].trim();
      this.template_name_expr = this.parse_expression(this.template_name);
      this.parse_assignments(this.assignment_markup);
    } else {
      this.raise_syntax_error('include');
    }
  }

  parse_assignments(markup) {
    const p = new Dry.expressions.Parser(markup);
    while (!p.eos()) {
      const name = p.expression();
      this.assignments.push({ name, to: p.accept('id', 'as') && p.expression() });
      p.accept('comma');
    }
    p.consume('end_of_string');
  }

  render(context, output = '') {
    return this.render_to_output_buffer(context, output);
  }

  async render_to_output_buffer(context, output = '') {
    const node = this.nodes[0];
    const imported = new Dry.tags.Render(node, this.state, this);
    const { partial } = await imported.find_partial(context);

    if (partial?.options?.registry) {
      const registry = partial.options.registry.macros ||= {};
      const macros = {};

      for (const { name, to = name } of this.assignments) {
        macros[to] = registry[name];
      }

      return context.stack(macros, () => this.render_inner(context));
    }

    return output;
  }
}

module.exports = From;
