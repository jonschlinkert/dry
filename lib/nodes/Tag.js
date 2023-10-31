
const Dry = require('../Dry');

class Tag extends Dry.Node {
  static disabled_tags = new Set();

  static parse(node, tokenizer, state) {
    const tag = new this(node, state);
    tag.tokenizer = tokenizer;
    tag.parse(tokenizer);
    return tag;
  }

  constructor(node, state, parent) {
    super(node, state, parent);
    this.type = 'tag';
    this.tag_name = node.name;
    this.markup = node.value.trim();
    this.disabled_tags = Tag.disabled_tags;
    this.blank = false;
  }

  parse() {}
  render() {
    return '';
  }

  disable_tags(...tag_names) {
    for (const tag_name of tag_names.flat()) {
      this.disabled_tags.add(tag_name);
    }
    // prepend(Disabler);
  }

  parse_expression(markup) {
    const expr = this.state.parse_expression(markup);

    if (expr instanceof Dry.VariableLookup) {
      Reflect.defineProperty(expr, 'parent', { value: this });
    }

    return expr;
  }

  ParseSyntax(markup, regex) {
    return Dry.utils.ParseSyntax(this, markup, regex);
  }

  raise_syntax_error(key, state = this.state, options) {
    return this.constructor.raise_syntax_error(key, state, options, this);
  }

  raise_file_system_error(key, options, state = this.state) {
    const opts = { ...options, type: 'template' };
    throw new Dry.FileSystemError(state.locale.t(`errors.file_system.${key}`, opts));
  }

  get loc() {
    return this.token.loc;
  }

  get raw() {
    return `${this.tag_name || this.name} ${this.value}`;
  }

  static raise_syntax_error(key, state, options, node) {
    const err = new Dry.SyntaxError(state.locale.t(`errors.syntax.${key}`, options));
    if (state.line_numbers) err.line_number = node.loc.end.line;
    err.message = err.toString();
    throw err;
  }
}

module.exports = Tag;
