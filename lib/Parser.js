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
        const TagClass = this.tags.get(token.name) || Tag;
        const tag = new TagClass(token, state);
        this.push(tag);

        if (tag instanceof BlockTag) {
          this.push(new Open(token, state));
        }
        break;
      }
    }
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
    token.type = 'text';
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
      // prev.value += node.value;
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

    if (node.type === 'close') Dry.utils.trim_whitespace_right(block.nodes[0]);
    if (node.type === 'open') Dry.utils.trim_whitespace_left(node);
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
