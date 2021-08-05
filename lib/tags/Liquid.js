'use strict';

const Dry = require('../Dry');
const { isEmpty, r } = Dry.utils;

const {
  TagStart: ts,
  TagEnd: te,
  VariableStart: vs,
  VariableEnd: ve,
  WhitespaceControl: wc
} = Dry.regex;

class Liquid extends Dry.Tag {
  static ContentOfVariable   = r('m')`^${vs}${wc}?(.*?)${wc}?${ve}$`;
  static FullToken           = r('m')`^${ts}${wc}?(\\s*)(\\w+)(\\s*)(.*?)${wc}?${te}$`;
  static LiquidTagToken      = /^\s*(\w+)\s*(.*?)$/;
  static WhitespaceOrNothing = /^\s*$/

  static TAGSTART     = '{%';
  static VARSTART     = '{{';

  constructor(node, state) {
    super(node, state);
    this.nodelist = [];
    this.markup = this.match[3];
  }

  parse_block(tokenizer, block) {
    if (tokenizer.tokens[0] === '') tokenizer.shift();

    while ((this.token = tokenizer.shift())) {
      if (!(isEmpty(this.token) || Liquid.WhitespaceOrNothing.test(this.token))) {
        if (!this.ParseSyntax(this.token, Liquid.LiquidTagToken)) {
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

      this.line_number = tokenizer.line_number;
    }
  }

  // parse(block = v => v) {
  //   console.log(block)
  //   if (this.parsed) return;
  //   this.parsed = true;

  //   try {
  //     const tokenizer = new Dry.Tokenizer(this.value, { ...this.state, for_liquid_tag: true });
  //     tokenizer.shift();

  //     while ((this.token = tokenizer.shift())) {
  //       if (/^-?%}/.test(this.token.trim())) break;

  //       if (!(empty(this.token) || Liquid.WhitespaceOrNothing.test(this.token))) {
  //         if (!this.ParseSyntax(this.token, Liquid.LiquidTagToken)) {
  //           // line isn't empty but didn't match tag syntax, yield
  //           // and let the caller throw a syntax error
  //           return block(this.token, this.token);
  //         }

  //         const tag_name = this.last_match[1];
  //         const markup   = this.last_match[2];
  //         const Tag = this.registered_tags.get(tag_name);

  //         if (!Tag) {
  //           // end parsing if we reach an unknown tag and let the
  //           // caller decide determine how to proceed
  //           return block(tag_name, markup);
  //         }

  //         const node = { name: tag_name, value: markup, match: this.last_match };
  //         const new_tag = Tag.parse(node, tokenizer, this.state);
  //         this.blank &&= new_tag.blank;
  //         this.nodelist.push(new_tag);
  //       }

  //       this.line_number = tokenizer.line_number;
  //     }

  //     block(null, null);
  //   } catch (error) {
  //     console.error(error);
  //   }
  // }

  async render(context, _output) {
    const tokenizer = new Dry.Tokenizer(this.markup, { ...this.state, for_liquid_tag: true });

    this.parse_block(tokenizer, (tag_name, markup) => {
      // console.log({ tag_name, markup });
    });

    let output = '';
    for (const node of this.nodelist) {
      output += await node.render(context);
    }

    return output;
  }

  get registered_tags() {
    return Dry.Template.tags;
  }
}

module.exports = Liquid;
