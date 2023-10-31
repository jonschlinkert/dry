
const Dry = require('../Dry');
const { regex, shared, utils } = Dry;

/**
 * The layout tag is used to wrap other templates with common markup.
 *
 * Wrap another template with a layout:
 *
 *   {% layout 'product' %}
 *
 */

class Layout extends Dry.Tag {
  static Syntax = utils.r`(${regex.QuotedFragment}+)`;
  static stack = new Set();

  constructor(node, state, parent) {
    super(node, state, parent);
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, Layout.Syntax)) {
      this.template_name_expr = this.parse_expression(this.last_match[1]);
    } else {
      this.raise_syntax_error('layout');
    }
  }

  async render_nodes(nodes = [], context, output) {
    const include_content = this.state?.template_options?.include_extends_content;
    this.state.template_options.include_extends_content = true;
    const result = await shared.helpers.render.render_nodes(this, nodes, context, output);
    this.state.template_options.include_extends_content = include_content;
    if (this.parent.extended) context.pop_interrupt();
    return result;
  }

  async render_layout(nodes = [], context, output = '') {
    const { markup, state, template_name_expr } = this;

    const template_name = typeof template_name_expr === 'string' ? template_name_expr : markup;
    const layout_name = await context.evaluate(template_name_expr);
    const layout = Dry.PartialCache.load_type('layouts', layout_name, { context, state });

    if (!layout) {
      return this.raise_file_system_error('missing', { template_name });
    }

    this.check_stack(layout_name);
    Layout.stack.add(layout_name);

    const content = await this.render_nodes(nodes, context, output);
    const result = await context.stack({ content }, ctx => layout.render(ctx));

    Layout.stack.delete(layout_name);
    return result;
  }

  check_stack(layout_name) {
    if (Layout.stack.has(layout_name)) {
      this.raise_layout_error('exponential', { expression: Layout.toString(layout_name) });
    }
  }

  raise_layout_error(key, options) {
    throw new Dry.Error(this.state.locale.t(`errors.layout.${key}`, options));
  }

  async render(context) {
    const content_nodes = this.siblings.slice(this.index + 1);
    const [first] = content_nodes;

    if (first?.name === 'extends') {
      // Render before the layout is applied
      const result = await first.render(context);
      first.render = () => result;
    }

    const output = await this.render_layout(content_nodes, context);
    context.push_interrupt(new Dry.tags.Interrupts.BreakInterrupt());
    return output;
  }

  static toString(template_name) {
    return `{% layout "${template_name}" %}`;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  Parent = Layout;
  get children() {
    return [
      this.node.template_name_expr,
      this.node.variable_name_expr
    ].concat(Object.values(this.node.attributes));
  }
}

module.exports = Layout;
