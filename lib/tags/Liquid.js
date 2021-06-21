'use strict';

const Tokenizer = require('../expressions/Tokenizer');
const Tag = require('../nodes/Tag');
const Dry = require('../Dry');
const { empty, r } = Dry.utils;

class Liquid extends Tag {
  LiquidTagToken      = /^\s*(\w+)\s*(.*?)$/;
  FullToken           = r('m')`^${Dry.regex.TagStart}${Dry.regex.WhitespaceControl}?(\\s*)(\\w+)(\\s*)(.*?)${Dry.regex.WhitespaceControl}?${Dry.regex.TagEnd}$`;
  ContentOfVariable   = r('m')`^${Dry.regex.VariableStart}${Dry.regex.WhitespaceControl}?(.*?)${Dry.regex.WhitespaceControl}?${Dry.regex.VariableEnd}$`;
  WhitespaceOrNothing = /^\s*$/
  TAGSTART            = '{%';
  VARSTART            = '{{';

  constructor(node, state) {
    super(node, state);
    this.nodelist = [];
  }

  parse(block) {
    if (this.parsed) return;
    this.parsed = true;

    try {
      const tokenizer = new Tokenizer(this.value, { ...this.state, for_liquid_tag: true });
      tokenizer.shift();

      while ((this.token = tokenizer.shift())) {
        if (/^-?%}/.test(this.token.trim())) break;

        if (!(empty(this.token) || this.WhitespaceOrNothing.test(this.token))) {
          if (!this.Syntax(this.token, this.LiquidTagToken)) {
            // line isn't empty but didn't match tag syntax, yield
            // and let the caller throw a syntax error
            return block(this.token, this.token);
          }

          const tag_name = this.last_match[1];
          const markup   = this.last_match[2];
          const Tag = this.registered_tags.get(tag_name);
          if (!Tag) {
            // end parsing if we reach an unknown tag and let the
            // caller decide determine how to proceed
            return block(tag_name, markup);
          }

          const node = { name: tag_name, value: markup, match: this.last_match };
          const new_tag = Tag.parse(node, tokenizer, this.state);
          this.blank &&= new_tag.blank;
          this.nodelist.push(new_tag);
        }

        this.state.line_number = tokenizer.line_number;
      }

      block(null, null);
    } catch (error) {
      console.error(error);
    }
  }

  render(context, _output) {
    this.parse((tag_name, markup) => {
      // console.log({ tag_name, markup });
    });

    let output = '';
    for (const node of this.nodelist) {
      output += node.render(context);
    }

    return output;
  }

  get registered_tags() {
    return Dry.Template.tags;
  }
}

module.exports = Liquid;
