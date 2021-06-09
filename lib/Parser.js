'use strict';

const Lexer = require('./Lexer');
const nodes = require('./nodes');
const tags = require('./tags');

const {
  BlockTag,
  Close,
  Condition,
  Literal,
  Node,
  Open,
  Operator,
  Range,
  Root,
  Tag,
  Text,
  Variable
} = nodes;

class Parser {
  constructor(input, options = {}, state = {}) {
    this.options = { ...options };
    this.lexer = new Lexer(input, options);
    this.ast = new Root();
    this.stack = [this.ast];
    this.block = this.ast;
    this.prev = this.ast;
    this.state = state;
    this.inside = { variable: 0, block: 0 };
    this.tags = new Map();

    for (const [name, Tag] of Object.entries(nodes)) {
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

  isInside(type) {
    const { tag, variable, comment } = this.inside;
    return type ? this.inside[type] > 0 : (tag + variable + comment > 0);
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
      throw new SyntaxError(`Expected "{% end${this.block.name} %}" but got "${token.value}"`);
    }

    if (typeof capture !== 'function') {
      throw new SyntaxError(`Unsupported token type: "${type}"`);
    }

    return capture.call(this, token);
  }

  push(node) {
    if (!node) return;
    const { block, prev, stack } = this;

    block.append(node);

    if (prev.type === 'text' && !prev.kind && node.type === 'text') {
      prev.value += node.value;
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
      this.inside.block++;
    }

    this.prev = node;
    return node;
  }

  pop(node, type) {
    if (node) this.push(node);
    const block = this.stack.pop();
    this.inside.block--;

    if (type && block.type !== type) {
      throw new SyntaxError(`Invalid syntax: expected a "${type}" block, but got "${block.type}"`);
    }

    this.block = this.stack[this.stack.length - 1];
    this.block.value = Buffer.concat([Buffer.from(this.block.value), Buffer.from(block.value)]);
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

  static parse(input) {
    return new this(input).parse();
  }
}

Parser.tags = tags;
Parser.nodes = nodes;
module.exports = Parser;
