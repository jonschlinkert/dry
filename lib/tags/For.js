'use strict';

const Dry = require('..');
const { ForLoopDrop } = require('../drops');
const { BlockBody, BlockTag, Expression, VariableLookup } = require('../nodes');
const { BreakInterrupt, ContinueInterrupt } = require('../tags/Interrupts');
const { regex } = require('../constants');
const { isEmpty, isNil, r, scan, slice_collection, toInteger } = require('../utils');
const { QUOTED_FRAGMENT, TAG_ATTRIBUTES, VARIABLE_SEGMENT } = regex;

const FOR_SYNTAX = r`^(${VARIABLE_SEGMENT}+)\\s+(in|of)\\s+(${QUOTED_FRAGMENT}+)\\s*(reversed)?`;

class Range {}
const toArray = range => {}; // expand value to a range with fill-range

class For extends BlockTag {
  constructor(node) {
    super(node);
    this.branches = [];
    this.pointer = 0;
    this.blank = true;
    this.else = null;
  }

  parse() {
    if (!this.parsed) {
      this.parsed = true;
      const open = this.nodes[0];
      const markup = open.match[3];
      const match = FOR_SYNTAX.exec(markup);

      if (match) {
        this.parse_nodes();
        this.parse_branches(markup);
        this.variable_name = match[1];
        this.p = match[2];
        const collection_name = match[3];
        this.reversed = Boolean(match[4]);
        this.key = `${this.variable_name}-${collection_name}`;
        this.collection_name = Expression.parse(collection_name);

        scan(markup, TAG_ATTRIBUTES, (_match, key, value) => {
          this.set_attribute(key, value);
        });

      } else {
        throw new SyntaxError('errors.syntax.for');
        // throw new SyntaxError(options[:locale].t("errors.syntax.for"))
      }

      // this.branches.push(new Branch('main', this.nodes[0]));
    }
  }

  parse_branches(markup) {
    this.for_block = new BlockBody({ type: 'for', value: markup });
    this.else_block = new BlockBody({ type: 'else' });
    let block = this.for_block;

    for (const node of this.nodes) {
      if (node.name === 'else') {
        block = this.else_block;
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
    if (collection instanceof Range) collection = toArray(collection);

    const limit_value = context.evaluate(this.limit);
    const to = isNil(limit_value) ? null : toInteger(limit_value) + from;

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
    const for_stack = (context.registers['for_stack'] ||= []);
    const length = segment.length;

    const loop_vars = new ForLoopDrop(this.key, length, for_stack[for_stack.length - 1], this);
    for_stack.push(loop_vars);

    let output = '';

    context.stack({}, () => {
      try {
        context['forloop'] = loop_vars;
        context.continue = false;

        for (const item of segment) {
          if (context.continue) {
            context.continue = false;
            continue;
          }

          context[this.variable_name] = item;

          output += this.for_block.render(context);
          loop_vars.increment();

          if (context.continue) {
            context.continue = false;
            continue;
          }

          // Handle any interrupts if they exist.
          if (context.interrupt) continue;
          const interrupt = context.pop_interrupt();

          if (interrupt instanceof BreakInterrupt) {
            context.break = true;
          }

          if (interrupt instanceof ContinueInterrupt) {
            context.continue = true;
          }
        }

      } catch (err) {
        console.error(err);
      } finally {
        for_stack.pop();
      }
    });

    return output;
  }

  render2(context) {
    for (const branch of this.branches) {
      if (branch.evaluate(context)) {
        return branch.render(context);
      }
    }
    // return this.context.stack(locals, context => {
    //   for (const branch of this.branches) {
    //     if (branch.evaluate(context)) {
    //       return branch.attachment.render(context);
    //     }
    //   }
    // });
  }

  renderElse(context) {
    return this.else_block ? this.else_block.render(context) : '';
  }

  set_attribute(key, expr) {
    if (key === 'offset' && expr === 'continue') {
      // Usage.increment('for_offset_continue')
      this.from = 'continue';
      return;
    }

    if (key === 'offset') {
      this.from = Expression.parse(expr);
      this.assert_integer(this.from);
    }

    if (key === 'limit') {
      this.limit = Expression.parse(expr);
      this.assert_integer(this.limit);
    }
  }

  assert_integer(value) {
    if (value != null && typeof value !== 'number' && !(value instanceof VariableLookup)) {
      throw new Dry.ArgumentError('Dry error: invalid integer');
    }
  }
}

module.exports = For;
