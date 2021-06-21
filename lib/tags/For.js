'use strict';

const Dry = require('../Dry');
const Parser = require('../expressions/Parser');
const { Expression, constants, drops, nodes, utils } = Dry;
const { ForLoopDrop } = drops;
const { BlockBody, BlockTag } = nodes;
const { isEmpty, isNil, r, scan, slice_collection, toInteger } = utils;
const { QUOTED_FRAGMENT, TAG_ATTRIBUTES, VARIABLE_SEGMENT } = constants.regex;
const { BreakInterrupt } = require('../tags/Interrupts');

const kNodes = Symbol(':nodes');

class For extends BlockTag {
  ForSyntax = r`^(${VARIABLE_SEGMENT}+)\\s+(in|of)\\s+(\\(.*?\\)|${QUOTED_FRAGMENT}+)\\s*(reversed)?`;

  constructor(node, state) {
    super(node, state);
    this.state = state;
    this.pointer = 0;
    this.blank = true;
    this.else = null;
  }

  parse() {
    if (!this.parsed) {
      this.parsed = true;
      const open = this.nodes[0];
      const markup = open ? open.match[3] : this.value;

      if (this.Syntax(markup, this.ForSyntax)) {
        this.parse_blocks(markup);

        const [, variable_name, preposition, collection_name, reversed] = this.last_match;
        this.variable_name = variable_name.trim();
        this.preposition = preposition;
        this.collection_name = this.parse_expression(collection_name);
        this.reversed = Boolean(reversed);
        this.key = `${this.variable_name}-${collection_name}`;

        scan(markup, TAG_ATTRIBUTES, (_match, key, value) => {
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
    this.for_block = new BlockBody(this.nodes[0]);
    this.else_block = new BlockBody({ type: 'else' });
    let block = this.for_block;

    for (const node of this.nodes) {
      if (node.name === 'else') {
        block = this.else_block = new BlockBody(node);
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

  parse_from(offsets, context) {
    if (this.from === 'continue') {
      return toInteger(offsets[this.key]);
    }

    const value = context.evaluate(this.from);
    return isNil(value) ? 0 : toInteger(value);
  }

  parse_to(from, context) {
    const limit = context.evaluate(this.limit);
    return isNil(limit) ? null : toInteger(limit) + from;
  }

  collection_segment(context) {
    const offsets = (context.registers['for'] ||= {});
    const from = this.parse_from(offsets, context);
    const to = this.parse_to(from, context);

    let collection = context.evaluate(this.collection_name);
    if (typeof collection === 'string' && Expression.isRange(collection)) {
      collection = this.parse_expression(collection);
    }

    const segment = slice_collection(collection, from, to);
    if (this.reversed) segment.reverse();

    offsets[this.key] = from + segment.length;
    return segment;
  }

  render(context) {
    const segment = this.collection_segment(context);

    if (isEmpty(segment)) {
      return this.renderElse(context);
    }

    return this.render_segment(context, segment);
  }

  render_segment(context, segment, collection) {
    const [k, v] = this.variable_name && this.variable_name.split(/\s*,\s*/);
    const for_stack = context.registers['for_stack'] ||= [];
    const keys = new Set(Reflect.ownKeys(ForLoopDrop.prototype));
    let output = '';

    for (const key of keys) {
      if (typeof key !== 'string' || !Dry.utils.isSafeKey(key)) {
        keys.delete(key);
      }
    }

    context.stack({}, () => {
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
          output += this.for_block.render(context);
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
}

module.exports = For;
