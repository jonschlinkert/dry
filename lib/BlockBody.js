'use strict';

const Block = require('./Block');
const Dry = require('./Dry');
const { count, empty, r } = Dry.utils;

const {
  TagStart: ts,
  TagEnd: te,
  VariableStart: vs,
  VariableEnd: ve,
  WhitespaceControl: wc
} = Dry.regex;

class BlockBody {
  static ContentOfVariable   = r('m')`^${vs}${wc}?(.*?)${wc}?${ve}$`;
  static FullToken           = r('m')`^${ts}${wc}?(\\s*)(\\w+)(\\s*)(.*?)${wc}?${te}$`;
  static LiquidTagToken      = /^\s*(\w+)\s*(.*?)$/;
  static WhitespaceOrNothing = /^\s*$/

  static TAGSTART     = '{%';
  static VARSTART     = '{{';

  constructor() {
    this.nodelist = [];
    this.blank = true;
  }

  Syntax(markup, regex) {
    return (this.last_match = regex.exec(markup));
  }

  parse(tokenizer, state, block) {
    if (this.frozen) throw new Dry.FrozenError("can't modify frozen Liquid::BlockBody");

    state.line_number = tokenizer.line_number;

    if (tokenizer.for_liquid_tag) {
      this.parse_for_liquid_tag(tokenizer, state, block);
    } else {
      this.parse_for_document(tokenizer, state, block);
    }
  }

  freeze() {
    const nodes = Object.freeze(this.nodelist);
    this.frozen = true;
    return super.freeze(nodes);
  }

  parse_for_liquid_tag(tokenizer, state, block) {
    while ((this.token = tokenizer.shift())) {
      if (!(empty(this.token) || BlockBody.WhitespaceOrNothing.test(this.token))) {
        if (!this.Syntax(this.token, BlockBody.LiquidTagToken)) {
          // line isn't empty but didn't match tag syntax, yield and let the
          // caller throw a syntax error
          return block(this.token, this.token);
        }

        const tag_name = this.last_match[1];
        const markup   = this.last_match[2];
        const Tag = this.registered_tags.get(tag_name);
        if (!Tag) {
          // end parsing if we reach an unknown tag and let the caller decide
          // determine how to proceed
          return block(tag_name, markup);
        }
        const new_tag = Tag.parse(tag_name, markup, tokenizer, state);
        this.blank &&= new_tag.blank;
        this.nodelist.push(new_tag);
      }
      this.state.line_number = tokenizer.line_number;
    }

    return block(null, null);
  }

  // @api private
  static unknown_tag_in_liquid_tag(tag, state) {
    Block.raise_unknown_tag(tag, 'liquid', '%}', state);
  }

  // @api private
  static raise_missing_tag_terminator(token, state) {
    throw new SyntaxError(state.locale.t('errors.syntax.tag_termination', { token, tag_end: te.source }));
  }

  // @api private
  static raise_missing_variable_terminator(token, state) {
    throw new SyntaxError(state.locale.t('errors.syntax.variable_termination', { token, tag_end: ve }));
  }

  // @api private
  static render_node(context, output, node) {
    try {
      return node.render(context, output);
    } catch (exc) {
      const blank_tag = !(node instanceof Dry.Variable) && node.blank;
      return this.rescue_render_node(context, output, node.line_number, exc, blank_tag);
    }
  }

  // @api private
  static rescue_render_node(context, output, line_number, exc, blank_tag) {
    if (exc instanceof Dry.MemoryError) throw exc;

    const errors = [Dry.UndefinedVariable, Dry.UndefinedDropMethod, Dry.UndefinedFilter];
    const error_message = context.handle_error(exc, line_number);
    if (errors.some(E => exc instanceof E)) {
      return error_message;
    }

    // conditional for backwards compatibility
    if (!blank_tag) output += error_message;
    return output;
  }

  parse_liquid_tag(markup, state) {
    const liquid_tag_tokenizer = new Dry.expressions.Tokenizer(markup, {
      start_line_number: state.line_number,
      for_liquid_tag: true
    });

    this.parse_for_liquid_tag(liquid_tag_tokenizer, state, (end_tag_name, _end_tag_markup) => {
      if (end_tag_name) {
        BlockBody.unknown_tag_in_liquid_tag(end_tag_name, state);
      }
    });
  }

  parse_for_document(tokenizer, state, block) {
    let token;
    while ((token = tokenizer.shift())) {
      if (empty(token)) continue;

      if (token.startsWith(BlockBody.TAGSTART)) {
        this.whitespace_handler(token, state);

        if (!this.Syntax(token, BlockBody.FullToken)) {
          return BlockBody.raise_missing_tag_terminator(token, state);
        }

        const tag_name = this.last_match[2];
        const markup   = this.last_match[4];

        if (state.line_number) {
          // newlines inside the tag should increase the line number,
          // particularly important for multiline {% liquid %} tags
          state.line_number += count(this.last_match[1] + this.last_match[3], '\n');
        }

        if (tag_name === 'liquid') {
          this.parse_liquid_tag(markup, state);
          continue;
        }

        const Tag = this.registered_tags.get(tag_name);
        if (!Tag) {
          // } parsing if we reach an unknown tag and let the caller decide
          // determine how to proceed
          return block(tag_name, markup);
        }

        const node = { name: tag_name, value: markup, match: this.last_match };
        const new_tag = Tag.parse(node, tokenizer, state);

        this.blank &&= new_tag.blank;
        this.nodelist.push(new_tag);
      } else if (token.startsWith(BlockBody.VARSTART)) {
        this.whitespace_handler(token, state);
        this.nodelist.push(this.create_variable(token, state));
        this.blank = false;
      } else {
        if (state.trim_whitespace) {
          token = token.trimStart();
        }
        state.trim_whitespace = false;
        this.nodelist.push(token);
        this.blank &&= BlockBody.WhitespaceOrNothing.test(token);
      }

      state.line_number = tokenizer.line_number;
    }

    return block(null, null);
  }

  whitespace_handler(token, state) {
    if (token[2] === wc) {
      let previous_token = this.nodelist[this.nodelist.length - 1];
      if (typeof previous_token === 'string') {
        const first_byte = previous_token[0];
        previous_token = previous_token.trimEnd();
        if (empty(previous_token) && state['bug_compatible_whitespace_trimming'] && first_byte) {
          previous_token += first_byte;
        }
      }
    }
    state.trim_whitespace = (token[token.length - 3] === wc);
  }

  // Remove blank strings in the block body for a control flow tag (e.g. `if`, `for`, `case`, `unless`)
  // with a blank body.
  //
  // For example, in a conditional assignment like the following
  //
  // ```
  // {% if size > max_size %}
  //   {% assign size = max_size %}
  // {% endif %}
  // ```
  //
  // we assume the intention wasn't to output the blank spaces in the `if` tag's block body, so this method
  // will remove them to reduce the render output size.
  //
  // Note that it is now preferred to use the `liquid` tag for this use case.
  remove_blank_strings() {
    if (!this.blank) {
      throw new Dry.DryError('remove_blank_strings only support being called on a blank block body');
    }
    return this.nodelist.filter(node => typeof node === 'string');
  }

  render(context) {
    return this.render_to_output_buffer(context, '');
  }

  render_to_output_buffer(context, output = '') {
    context.resource_limits.increment_render_score(this.nodelist.length);

    let idx = 0;
    let node;
    while ((node = this.nodelist[idx])) {
      if (typeof node === 'string') {
        output += node;
      } else {
        output += this.render_node(context, output, node);
        // If we get an Interrupt that means the block must stop processing. An
        // Interrupt is any command that stops block execution such as {% break %}
        // or {% continue %}. These tags may also occur through Block or Include tags.
        if (context.interrupt) break; // might have happened in a for-block
      }
      idx++;
      context.resource_limits.increment_write_score(output);
    }

    return output;
  }

  render_node(context, output, node) {
    return BlockBody.render_node(context, output, node);
  }

  create_variable(token, state) {
    const match = BlockBody.ContentOfVariable.exec(token);
    if (match) return new Dry.Variable(match[1] || match[0], state);
    BlockBody.raise_missing_variable_terminator(token, state);
  }

  // this.deprecated Use {.raise_missing_tag_terminator} instead
  raise_missing_tag_terminator(token, state) {
    BlockBody.raise_missing_tag_terminator(token, state);
  }

  // this.deprecated Use {.raise_missing_variable_terminator} instead
  raise_missing_variable_terminator(token, state) {
    BlockBody.raise_missing_variable_terminator(token, state);
  }

  get registered_tags() {
    return Dry.Template.tags;
  }
}

module.exports = BlockBody;
