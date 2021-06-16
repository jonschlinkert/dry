'use strict';

const Node = require('./Node');
const Condition = require('../Condition');
const Dry = require('../Dry');

class Branch extends Node {
  static MAX_DEPTH = 100

  constructor(node, state) {
    super(node, state);
    this.name = node.name;
    this.markup = node.match[3];
    this.condition = new Condition(node);
    this.body = [];
  }

  parse_body(body, nodes) {
    const { block_name, block_delimiter, state } = this;
    const { depth, locale } = state;

    if (depth >= this.constructor.MAX_DEPTH) {
      throw new Dry.StackLevelError('Nesting too deep');
    }

    state.depth++;

    try {
      return body.parse(nodes, state, (end_tag_name, end_tag_params) => {
        this.blank = this.blank === true && body.blank === true;

        if (end_tag_name === block_delimiter) {
          return false;
        }

        if (!end_tag_name) {
          throw new Dry.SyntaxError(locale.t('errors.syntax.tag_never_closed', { block_name }));
        }

        // this tag is not registered with the system pass it to the
        // current block for special handling or error reporting
        return this.unknown_tag(end_tag_name, end_tag_params, nodes);
      });

    // eslint-disable-next-line no-useless-catch
    } catch (err) {
      console.error(err);
    } finally {
      state.depth--;
    }

    return true;
  }

  push(node) {
    this.body.push(node);
  }

  evaluate(context) {
    if (this.expression instanceof Dry.VariableLookup) {
      return context.evaluate(this.expression);
    }
    return this.condition.evaluate(context);
  }

  render(context) {
    return this.body.map(node => node.render(context)).join('');
  }
}

module.exports = Branch;
