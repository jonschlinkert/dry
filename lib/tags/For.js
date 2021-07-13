'use strict';

const Dry = require('../Dry');
const Parser = require('../expressions/Parser');
const { BreakInterrupt } = require('./Interrupts');
const { drops, regex, utils, shared: { parse_with_selected_parser } } = Dry;
const { ForLoopDrop } = drops;
const { isEmpty, isNil, r, scan, slice_collection, toInteger } = utils;
const { QuotedFragment, TagAttributes, VariableSegment } = regex;

const kNodes = Symbol(':nodes');

class For extends Dry.BlockTag {
  static ForSyntax = r`^(${VariableSegment}+)\\s+(in|of)\\s+(\\(.*?\\)|${QuotedFragment}+)\\s*(reversed)?`;

  constructor(node, state) {
    super(node, state);
    // this.blank = true;
    this.markup = this.match[3];

    // this.from = this.limit = null;
    // parse_with_selected_parser(this, this.markup);
    // this.for_block = this.new_body();
    // this.else_block = null;
  }

  // parse(tokens) {
  //   if (this.parse_body(this.for_block, tokens)) {
  //     this.parse_body(this.else_block, tokens);
  //   }

  //   if (this.blank) {
  //     this.else_block?.remove_blank_strings();
  //     this.for_block.remove_blank_strings();
  //   }
  // }

  parse() {
    if (!this.parsed) {
      this.parsed = true;
      const open = this.nodes[0];
      const markup = open ? open.match[3] : this.value;

      if (this.ParseSyntax(markup, For.ForSyntax)) {
        this.parse_blocks(markup);

        const [, variable_name, preposition, collection_name, reversed] = this.last_match;
        this.variable_name = variable_name.trim();
        this.preposition = preposition;
        this.collection_name = this.parse_expression(collection_name);
        this.reversed = Boolean(reversed);
        this.key = `${this.variable_name}-${collection_name}`;

        scan(markup, TagAttributes, (_match, key, value) => {
          this.set_attribute(key, value);
        });

        delete this.last_match;
      } else {
        this.raise_syntax_error('errors.syntax.for');
      }
    }
  }

  strict_parse(markup, tag = this) {
    const p = new Parser(markup);
    tag.variable_name = p.consume('id');
    if (!p.id('in')) return this.raise_syntax_error('errors.syntax.for_invalid_in');

    const collection_name  = p.expression();
    tag.collection_name = this.parse_expression(collection_name);

    tag.name = `${tag.variable_name}-${collection_name}`;
    tag.reversed = p.id('reversed');

    while (p.look('id') && p.look('colon', 1)) {
      const attribute = p.id('limit') || p.id('offset');
      if (!attribute) return this.raise_syntax_error('errors.syntax.for_invalid_attribute');
      p.consume();
      this.set_attribute(attribute, p.expression, tag);
    }

    p.consume('end_of_string');
    return tag;
  }

  parse_blocks(markup) {
    this.for_block = new Dry.BlockBody(this.nodes[0]);
    this.else_block = new Dry.BlockBody({ type: 'else' });
    let block = this.for_block;

    for (const node of this.nodes) {
      this.blank &&= node.blank;

      if (node.name === 'else') {
        block = this.else_block = new Dry.BlockBody(node);
      } else {
        block.push(node);
      }
    }
  }

  push(node) {
    super.push(node);

    if (node.type === 'close') {
      this.parse();
    }
  }

  async parse_from(offsets, context) {
    if (this.from === 'continue') {
      return toInteger(offsets[this.key]);
    }

    const value = await context.evaluate(this.from);
    return isNil(value) ? 0 : toInteger(value);
  }

  async parse_to(from, context) {
    const limit = await context.evaluate(this.limit);
    return isNil(limit) ? null : toInteger(limit) + from;
  }

  async collection_segment(context) {
    const offsets = (context.registers['for'] ||= {});
    const from = await this.parse_from(offsets, context);
    const to = await this.parse_to(from, context);

    let collection = await context.evaluate(this.collection_name);
    if (typeof collection === 'string' && Dry.Expression.isRange(collection)) {
      collection = this.parse_expression(collection);
    }

    const segment = slice_collection(collection, from, to);
    if (this.reversed) segment.reverse();

    offsets[this.key] = from + segment.length;
    return segment;
  }

  async render(context) {
    const segment = await this.collection_segment(context);

    if (isEmpty(segment)) {
      return this.renderElse(context);
    }

    return this.render_segment(context, segment);
  }

  async render_segment(context, segment, collection) {
    const [k, v] = this.variable_name && this.variable_name.split(/\s*,\s*/);
    const for_stack = context.registers['for_stack'] ||= [];
    const keys = new Set(Reflect.ownKeys(ForLoopDrop.prototype));
    let output = '';

    for (const key of keys) {
      if (typeof key !== 'string' || !Dry.utils.isSafeKey(key)) {
        keys.delete(key);
      }
    }

    await context.stack({}, async () => {
      const parentloop = for_stack[for_stack.length - 1];
      const foorloop = new ForLoopDrop(this.key, segment.length, parentloop, this);
      for_stack.push(foorloop);

      context.set('forloop', foorloop);
      context.set('loop', foorloop);

      try {
        for (const item of segment) {
          for (const key of keys) {
            context.set(`@${key}`, () => foorloop[key]);
          }

          if (k && v && Array.isArray(item) && item.length === 2) {
            context.set(k, item[0]);
            context.set(v, item[1]);
          }

          context.set(this.variable_name, item);
          output += await this.for_block.render(context);
          foorloop.increment();

          // Handle any interrupts if they exist.
          if (context.pop_interrupt() instanceof BreakInterrupt) break;
        }
      } catch (err) {
        if (process.env.DEBUG) console.error(err);
      } finally {
        for_stack.pop();
      }
    });

    if (output && (this.blank === true || this.parent.type === 'root') && output.trim() === '') {
      return '';
    }

    return output;
  }

  renderElse(context) {
    return this.else_block ? this.else_block.render(context) : '';
  }

  set_attribute(key, expr, tag = this) {
    if (key === 'offset' && expr === 'continue') {
      Dry.Usage.increment('for_offset_continue');
      tag.from = 'continue';
      return;
    }

    if (key === 'offset') {
      tag.from = this.parse_expression(expr);
      this.assert_integer(tag.from);
    }

    if (key === 'limit') {
      tag.limit = this.parse_expression(expr);
      this.assert_integer(tag.limit);
    }
  }

  assert_integer(value) {
    if (!isNil(value) && typeof value !== 'number' && !(value instanceof Dry.VariableLookup)) {
      throw new Dry.ArgumentError('Dry error: invalid integer');
    }
  }

  set nodes(value) {
    this[kNodes] = value;
  }
  get nodes() {
    return this[kNodes] || (this.else_block ? [this.for_block, this.else_block] : [this.for_block]);
  }

  get nodelist() {
    const { for_block, else_block } = this;

    if (else_block.nodes.length) {
      return [for_block.nodes.slice(1), else_block.nodes.slice(0, -1)].flat().map(n => n.value);
    }

    return for_block.nodes.slice(1, -1).map(n => n.value);
  }

  static get ParseTreeVisitor() {
    return class ParseTreeVisitor extends Dry.ParseTreeVisitor {
      get children() {
        const { from, limit, collection_name } = this.node;
        return (super.children + [limit, from, collection_name]).filter(Boolean);
      }
    };
  }
}

module.exports = For;
