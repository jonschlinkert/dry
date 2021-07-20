'use strict';

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

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, Layout.Syntax)) {
      this.template_name_expr = this.parse_expression(this.last_match[1]);
    } else {
      this.raise_syntax_error('layout');
    }
  }

  async render_nodes(nodes = [], context, output) {
    return shared.helpers.render.render_nodes(this, nodes, context, output);
  }

  async render_content(nodes = [], context, output = '') {
    const template_name = this.template_name_expr;
    const layout_name = await context.evaluate(template_name);
    const layout = Dry.PartialCache.load_type('layouts', layout_name, { context, state: this.state });

    if (!layout) {
      this.raise_file_system_error('missing', { template_name });
    }

    this.check_stack(layout_name);
    Layout.stack.add(layout_name);

    const content = await this.render_nodes(nodes, context, output);
    const result = await context.stack({ content }, () => layout.render(context));

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

  render() {
    return '';
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
