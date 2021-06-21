/* eslint-disable no-case-declarations */
'use strict';

const Condition = require('./Condition');
const Lexer = require('./Lexer');
const tags = require('./tags');
const Dry = require('./Dry');

const {
  BlockTag,
  Close,
  Literal,
  Node,
  Open,
  Range,
  Root,
  Tag,
  Text,
  Token,
  Variable
} = Dry.nodes;

class Parser {
  constructor(input, options = {}, state = {}) {
    this.options = { error_mode: 'strict', ...options };
    this.state = state;
    this.lexer = new Lexer(input, options);
    this.ast = new Root({}, this.state);
    this.stack = [this.ast];
    this.block = this.ast;
    this.prev = this.ast;

    this.tags = Dry.Template.tags;
    this.inside = 0;
    this.depth = 0;
    this.start = Date.now();

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

  // capture_tag_open(ndoe) {
  //   this.inside++;
  //   ndoe.type = 'open';
  //   this.push(new BlockTag());
  //   this.push(ndoe);
  // }

  // capture_tag_close(node) {
  //   this.inside--;
  //   node.type = 'close';
  //   const block = this.pop(node);
  //   block.parent.nodes.pop();

  //   const first = block.nodes.find(node => node.type === 'text');
  //   const match = /^{%([-=]*)\s*((?:end)?\S+)\s*([\s\S]*?)\s*([-=]*)%}/.exec(block.value);
  //   const token = new Token({ type: first.value, name: match[2], value: block.value, match });

  //   if (this[`capture_${token.type}`]) {
  //     return this.capture(token);
  //   }

  //   return this.capture_tag(token);

  //   // console.log(match);
  //   // const name = node.match[2];
  //   // const args = args;
  //   // console.log({ value, match });
  //   // this.capture_tag();
  //   // this.capture(token);
  // }

  /**
   * Tag
   */
  capture_tag(token) {
    if (token.name === 'for') {
      return this.capture_forloop(token);
    }

    const state = this.state;

    switch (token.name) {
      case 'else': return this.capture_else(token, state);
      case 'elsif': return this.push(new tags.Elsif(token, state));
      case `end${this.block.name}`: return this.pop(new Close(token, state));
      default: {
        const TagClass = this.get_tag_class(token);
        const tok = token.name === 'raw' ? token : token.clone({ value: '' });
        const tag = new TagClass(tok, state);
        this.push(tag);

        if (tag instanceof BlockTag) {
          this.push(new Open(token, state));
        }
        break;
      }
    }
  }

  get_tag_class(token) {
    const TagClass = this.tags.get(token.name);
    if (TagClass) return TagClass;
    this.unknown_tag(token);
    return Tag;
  }

  unknown_tag(token) {
    if (this.block.name === 'comment' || this.block.name === 'raw') return;
    const { block_name, block_delimiter } = this.block;
    const tag_name = token.name || token.match[2];

    if (process.env.DEBUG) {
      console.error(this.create_error_context(token));
    }

    if (block_name && block_delimiter !== tag_name) {
      console.log({ block_name, block_delimiter, tag_name, name: token.name });
      this.raise_syntax_error('errors.syntax.invalid_delimiter', { block_name, block_delimiter, tag_name });
    } else {
      this.raise_syntax_error('errors.syntax.unknown_tag', { tag_name });
    }
  }

  create_error_context(token) {
    const { loc: { line, col }, remaining } = this.lexer;

    const line_count = Math.min(5, line);
    const lines = this.lexer.consumed.split('\n').slice(-line_count);
    const output = [];

    const r = s => `\u001b[31m${s}\u001b[39m`;
    const c = s => `\u001b[36m${s}\u001b[39m`;
    const gray = s => `\u001b[90m${s}\u001b[39m`;
    const pipe = gray('|');

    for (let i = 0; i < lines.length; i++) {
      output.push([c(line - line_count + i), pipe, lines[i]].join(' '));
    }

    const nindex = remaining.indexOf('\n');
    const append = nindex > -1 ? remaining.slice(0, Math.min(20, nindex)) : remaining.slice(0, 20);

    output[output.length - 1] += append;
    output[output.length - 1] = output[output.length - 1].split(token.value).join(r(token.value));

    const pad = ' '.repeat(String(line).length);
    output.push([pad, pipe, ' '.repeat(col - token.value.length) + '^'].join(' '));
    return output.join('\n');
  }

  raise_syntax_error(key, data) {
    const err = new Dry.SyntaxError(this.state.locale.t(key, data));
    err.message = err.toString();
    throw err;
  }

  /**
   * Comment tag
   */
  capture_comment_tag(token) {
    token.end = token.match[2] === 'end';
    token.type = 'open';

    if (token.end) {
      token.type = 'close';
      this.pop(token);
      return;
    }

    const Comment = this.tags.get('comment');
    this.push(new Comment());
    this.push(token);
  }

  /**
   * Raw
   */
  capture_raw_tag(token) {
    const Raw = this.tags.get('raw');
    this.push(new Raw(token, this.state));
  }

  /**
   * Else
   */
  capture_else(token) {
    const else_block = new tags.Else(token);
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
    const variable = new Variable(token, this.state);
    this.push(variable);
    variable.parse_whitespace(this.lexer.peek());
  }

  /**
   * Paren
   */
  capture_paren_open(token) {
    this.push(new Range());
    this.push(new Open(token, this.state));
  }
  capture_paren_close(token) {
    this.push(new Close(token));
    this.pop();
  }

  /**
   * Bracket
   */
  capture_bracket_open(token) {
    this.push(new Node(token));
  }
  capture_bracket_close(token) {
    this.push(new Node(token));
  }

  /**
   * Braces
   */
  capture_brace_open(token) {
    this.push(new Text(token));
  }
  capture_brace_close(token) {
    this.push(new Text(token));
  }

  /**
   * Spaces
   */
  capture_space(token) {
    if (this.inside === 0) token.type = 'text';
    this.push(token);
  }

  /**
   * Two dots: '..'
   */
  capture_dotdot(token) {
    this.push(new Node(token));
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

    if (prev.type === 'text' && node.type === 'text') {
      prev.append(node);
      return;
    }

    if (!(node instanceof Node)) {
      node = node.type === 'text' ? new Text(node) : new Node(node);
    }

    node.state = this.state;
    block.push(node);

    if (node.nodes && !(node instanceof Condition)) {
      stack.push(node);
      this.block = node;
      this.depth++;

      if (this.depth > Dry.MAX_DEPTH) {
        throw new Dry.StackLevelError('Nesting too deep');
      }

    } else {
      block.append(node);
    }

    if (node.type === 'close') Dry.utils.trim_whitespace(node, this);
    if (node.type === 'open') Dry.utils.trim_whitespace(node, this);
    if (node.name === 'raw') node.parse();

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
    return this;
  }

  render(context) {
    return this.ast.render(context);
  }

  static get parse() {
    return (input, options) => new this(input, options).parse();
  }
}

Parser.tags = Dry.tags;
Parser.nodes = Dry.nodes;
module.exports = Parser;
