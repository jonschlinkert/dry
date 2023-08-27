/* eslint-disable no-case-declarations */

const colors = require('ansi-colors');
const tags = require('./tags');
const Dry = require('./Dry');
const { constants, nodes, utils } = Dry;

const {
  BlockTag,
  Close,
  Literal,
  Node,
  Open,
  Root,
  Tag,
  Text,
  Variable
} = nodes;

class Parser {
  constructor(input, options = {}, state = {}) {
    Reflect.defineProperty(this, 'state', { value: state });

    this.options = { error_mode: 'strict', ...options };
    this.lexer = new Dry.Lexer(input, options);
    this.ast = new Root({}, this.state, null);
    this.stack = [this.ast];
    this.block = this.ast;
    this.prev = this.ast;

    this.tags = Dry.Template.tags;
    this.inside = 0;
    this.depth = 0;
    this.start = Date.now();
    this.state.loc = this.lexer.loc;

    for (const [name, Tag] of Object.entries(Dry.nodes)) {
      this.register_tag(name.toLowerCase(), Tag);
    }

    for (const [name, Tag] of Object.entries(tags)) {
      this.register_tag(name.toLowerCase(), Tag);
    }

    if (options.tags) {
      for (const [name, Tag] of Object.entries(options.tags)) {
        this.register_tag(name.toLowerCase(), Tag);
      }
    }
  }

  register_tag(name, Tag) {
    if (typeof Tag === 'function') {
      this.tags.set(name, Tag);
    }
  }

  eos() {
    return this.lexer.eos();
  }

  /**
   * Tag
   */

  capture_tag(token) {
    if (token.name === 'for') {
      return this.capture_forloop(token);
    }

    const { block, state } = this;
    if (block.name === 'switch' && token.name === 'case') {
      token.name = 'when';
    }

    switch (token.name) {
      case 'else': return this.capture_else(token);
      case 'elsif': return this.push(new tags.Elsif(token, state, block));
      case `end${this.block.name}`: {
        const tag = this.pop(new Close(token, state, block));

        if (this.options.eager_parse_tags) {
          tag.markup ||= tag.nodes[0].markup;
          tag.parse();
        }

        return tag;
      }
      default: {
        const TagClass = this.tags.get(token.name);
        if (!TagClass) return this.unknown_tag(token);

        const tag = new TagClass(token, state, block);
        this.push(tag);

        if (tag instanceof BlockTag) {
          this.push(new Open(token, state, block));
        }

        break;
      }
    }
  }

  unknown_tag(token) {
    if (this.block.name === 'comment' || this.block.name === 'raw') return;
    const { block_name, block_delimiter } = this.block;
    const tag_name = token.name || token.match[2];

    const raise = () => {
      if (block_name && block_delimiter !== tag_name && tag_name.startsWith('end')) {
        this.raise_syntax_error('invalid_delimiter', { block_name, block_delimiter, tag_name });
      } else {
        this.raise_syntax_error('unknown_tag', { tag_name });
      }
    };

    if (process.env.DEBUG) {
      try {
        raise();
      } catch (error) {
        error.message += '\n\n' + this.create_error_context(token) + '\n';
        throw error;
      }
    } else {
      raise();
    }
  }

  create_error_context(token) {
    const { loc: { line, col }, remaining } = this.lexer;
    const { red: r, cyan: c, gray: g } = colors;

    const line_count = Math.min(5, line);
    const lines = this.lexer.consumed.split(constants.Newline).slice(-line_count);
    const output = [];

    const pipe = g('|');
    const len = String(line).length;
    const pad = ' '.repeat(len);

    for (let i = 0; i < lines.length; i++) {
      const num = line - line_count + i;
      output.push([c(String(num).padEnd(len)), pipe, lines[i]].join(' '));
    }

    const nindex = remaining.indexOf('\n');
    const append = nindex > -1 ? remaining.slice(0, Math.min(20, nindex)) : remaining.slice(0, 20);

    output[output.length - 1] += append;
    output[output.length - 1] = output[output.length - 1].split(token.value).join(r(token.value));

    output.push([pad, pipe, ' '.repeat(col - token.value.length) + '^'].join(' '));
    return output.join('\n');
  }

  raise_syntax_error(key, data) {
    const err = new Dry.SyntaxError(this.state.locale.t(`errors.syntax.${key}`, data));
    if (this.options.line_numbers) err.line_number = this.lexer.loc.line;
    err.message = err.toString();
    throw err;
  }

  /**
   * Comments
   */

  capture_comment(token) {
    if (token.match[1] === '{#') {
      this.capture_line_comment(token);
    } else {
      this.capture_block_comment(token);
    }
  }

  /**
   * Block Comments: {% comment %}This is inside a block comment {% endcomment %}
   */

  capture_block_comment(token) {
    token.end = token.match[2] === 'end';
    token.type = 'open';

    if (token.end) {
      token.type = 'close';
      this.pop(token);
      return;
    }

    const Comment = this.tags.get('comment');
    this.push(new Comment(undefined, this.state, this.block));
    this.push(token);
  }

  /**
   * Line Comments: {# this is a comment #}
   */

  capture_line_comment(token) {
    const Comment = this.tags.get('comment');
    this.push(new Comment.Line(token, this.state, this.block));
  }

  /**
   * Front-matter
   */

  capture_fence(token) {
    if (this.block.type === 'front_matter') {
      token.type = 'close';
      this.pop(token);
      return;
    }

    const FrontMatter = this.tags.get('frontmatter');
    this.push(new FrontMatter(undefined, this.state, this.block));
    this.push(token);
  }

  /**
   * Raw
   */

  capture_raw(token) {
    const RawTag = this.tags.get('raw');
    this.push(new RawTag(token, this.state, this.block));
  }

  /**
   * Else
   */

  capture_else(token) {
    const else_block = new tags.Else(token, this.state, this.block);
    this.block.else = else_block;
    this.push(else_block);
  }

  /**
   * For Loop
   */

  capture_forloop(token) {
    const TagClass = this.tags.get(token.name) || Tag;
    this.push(new TagClass(token, this.state));
    this.push(new Open(token, this.state));
  }

  /**
   * Variable
   */

  capture_variable(token) {
    const variable = new Variable(token, this.state, this.block);
    this.push(variable);
    variable.trim_whitespace(this.lexer.peek());
  }

  // /**
  //  * Paren
  //  */
  // capture_paren_open(token) {
  //   this.push(new Range());
  //   this.push(new Open(token, this.state));
  // }
  // capture_paren_close(token) {
  //   this.push(new Close(token));
  //   this.pop();
  // }

  /**
   * Bracket
   */

  // capture_bracket_open(token) {
  //   this.push(new Node(token));
  // }
  // capture_bracket_close(token) {
  //   this.push(new Node(token));
  // }

  /**
   * Braces
   */

  // capture_brace_open(token) {
  //   this.push(new Text(token));
  // }
  // capture_brace_close(token) {
  //   this.push(new Text(token));
  // }

  /**
   * Spaces
   */

  capture_space(token) {
    if (this.inside === 0) token.type = 'text';
    this.push(token);
  }

  /**
   * Text
   */

  capture_text(token) {
    this.push(new Text(token));
  }

  /**
   * Literal (quoted text)
   */

  capture_literal(token) {
    this.push(new Literal(token));
  }

  /**
   * Capture a token
   */

  capture(token) {
    const type = `capture_${token.type}`;
    const capture = this[type];

    if (token.end && token.block_name !== this.block.name) {
      throw new Dry.SyntaxError(`Expected "{% end${this.block.name} %}" but got "${token.value}"`);
    }

    if (typeof capture !== 'function' && this.options.error_mode === 'strict') {
      throw new Dry.SyntaxError(`Unsupported token type: "${type}"`);
    }

    return capture.call(this, token);
  }

  push(node) {
    if (!node) return;
    const { block, prev, stack } = this;

    // append consecutive text nodes
    if (prev.type === 'text' && node.type === 'text') {
      prev.append(node);
      return;
    }

    // ensure it's an instance of Node
    if (!(node instanceof Node)) {
      node = node.type === 'text' ? new Text(node) : new Node(node);
    }

    node.state = this.state;
    block.push(node);

    // trim whitespace before or after tag, if specified by user
    if (node.name === 'raw') node.parse_whitespace();
    if (node.type !== 'text') utils.maybe_trim_whitespace(node, this);

    // if the node is a block node, push it onto the stack
    // and set the node as the new block
    if (node.nodes && !(node instanceof Dry.Condition)) {
      stack.push(node);
      this.block = node;
      this.depth++;

      if (this.depth > Dry.MAX_DEPTH) {
        throw new Dry.StackLevelError('Nesting too deep');
      }

    } else {
      block.append(node);
    }

    this.prev = node;
    return node;
  }

  pop(node, type) {
    if (node) this.push(node);
    const block = this.stack.pop();

    if (type && block.type !== type) {
      throw new Dry.SyntaxError(`Invalid syntax: expected a "${type}" block, but got "${block.type}"`);
    }

    this.block = this.stack[this.stack.length - 1];
    this.depth--;
    return block;
  }

  advance() {
    return this.capture(this.lexer.next());
  }

  tokenize() {
    return this.lexer.tokenize();
  }

  parse() {
    while (!this.eos()) this.advance();
    const block = this.pop();
    if (this.stack.length || block?.type !== 'root') {
      this.fail(block);
    }
    return this;
  }

  fail(block) {
    const open = block?.nodes[0];
    const close = block?.nodes[block?.nodes?.length - 1];

    if (block instanceof Dry.BlockTag && (!close || close.type !== 'close')) {
      throw new Dry.SyntaxError(`Missing closing tag for ${block.constructor.name}: "${open.value}"`);
    }

    throw new Dry.SyntaxError(`Unexpected "${block.name || block.type}" tag`);
  }

  render(context, output) {
    return this.ast.render(context, output);
  }

  static get parse() {
    return (input, options) => new this(input, options).parse();
  }
}

Parser.tags = Dry.tags;
Parser.nodes = Dry.nodes;
module.exports = Parser;
