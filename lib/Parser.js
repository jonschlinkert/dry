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
  Operator,
  Range,
  Root,
  Tag,
  Text,
  Variable
} = Dry.nodes;

class Parser {
  constructor(input, options = {}, state = {}) {
    this.options = { error_mode: 'strict', ...options };
    this.lexer = new Lexer(input, options);
    this.ast = new Root();
    this.stack = [this.ast];
    this.block = this.ast;
    this.prev = this.ast;
    this.state = state;
    this.tags = new Map();

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
    this.tags.set(name, Tag);
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

    switch (token.name) {
      case 'else': return this.capture_else(token);
      case 'elsif': return this.push(new tags.Elsif(token));
      case `end${this.block.name}`: return this.pop(new Close(token));
      default: {
        const TagClass = this.tags.get(token.name) || Tag;
        const tag = new TagClass(token);
        this.push(tag);

        if (tag instanceof BlockTag) {
          this.push(new Open(token));
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
    this.push(new Raw(token));
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
    this.push(new TagClass(token));
    this.push(new Open(token));
  }

  /**
   * Variable
   */
  capture_variable(token) {
    this.push(new Variable(token));
  }

  /**
   * Paren
   */
  capture_paren_open(token) {
    this.push(new Range());
    this.push(new Open(token));
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
   * Operator
   */
  capture_operator(token) {
    this.push(new Operator(token));
  }

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
    // this.block.append()
    // this.block.value = Buffer.concat([Buffer.from(this.block.value), Buffer.from(block.value)]);
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
