'use strict';

const Dry = require('../Dry');
const { Expression, constants, drops, nodes, utils } = Dry;
const { ForLoopDrop } = drops;
const { BlockBody, BlockTag, Range } = nodes;
const { isEmpty, isNil, r, scan, slice_collection, toInteger } = utils;
const { QUOTED_FRAGMENT, TAG_ATTRIBUTES, VARIABLE_SEGMENT } = constants.regex;
const { BreakInterrupt } = require('../tags/Interrupts');

const kNodes = Symbol(':nodes');

// expand value to a range with fill-range
const toArray = range => {
  // throw new Error('.toArray(range) is not implemented yet');
  return Expression.RangeLookup.parse(range);
};

class For extends BlockTag {
  ForSyntax = r`^(${VARIABLE_SEGMENT}+)\\s+(in|of)\\s+(${QUOTED_FRAGMENT}+)\\s*(reversed)?`;

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
      const markup = open.match[3];

      if (this.Syntax(markup, this.ForSyntax)) {
        this.parse_blocks(markup);
        const [, variable_name, p, collection_name, reversed] = this.last_match;
        this.variable_name = variable_name.trim();
        this.p = p;
        this.key = `${this.variable_name}-${collection_name}`;
        this.reversed = Boolean(reversed);
        this.collection_name = Dry.Expression.parse(collection_name);

        scan(markup, TAG_ATTRIBUTES, (_match, key, value) => {
          this.set_attribute(key, value);
        });

        delete this.last_match;
      } else {
        this.raise_syntax_error('errors.syntax.for');
      }
    }
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

  collection_segment(context) {
    const offsets = (context.registers['for'] ||= {});

    const from = (() => {
      if (this.from === 'continue') {
        return toInteger(offsets[this.key]);
      }
      const value = context.evaluate(this.from);
      return isNil(value) ? 0 : toInteger(value);
    })();


    let collection = context.evaluate(this.collection_name);
    if (typeof collection === 'string' && Expression.isRange(collection)) {
      collection = Expression.parse(collection);
    }

    const limit = context.evaluate(this.limit);
    const to = isNil(limit) ? null : toInteger(limit) + from;

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

  render_segment(context, segment) {
    const for_stack = context.registers['for_stack'] ||= [];
    let output = '';

    context.stack({}, () => {
      const parentloop = for_stack[for_stack.length - 1];
      const loop_vars = new ForLoopDrop(this.key, segment.length, parentloop, this);
      for_stack.push(loop_vars);
      context.set('forloop', loop_vars);

      try {
        for (const item of segment) {
          context.set(this.variable_name, item);
          output += this.for_block.render(context);
          loop_vars.increment();

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

  set_attribute(key, expr) {
    if (key === 'offset' && expr === 'continue') {
      Dry.Usage.increment('for_offset_continue');
      this.from = 'continue';
      return;
    }

    if (key === 'offset') {
      this.from = Dry.Expression.parse(expr);
      this.assert_integer(this.from);
    }

    if (key === 'limit') {
      this.limit = Dry.Expression.parse(expr);
      this.assert_integer(this.limit);
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
