'use strict';

const BlockTag = require('../nodes/BlockTag');
const Dry = require('../Dry');
const { isNil, r, scan, slice_collection, to_i } = Dry.utils;
const { TagAttributes, QuotedFragment: q, VariableSegment: v } = Dry.regex;

class TableRow extends BlockTag {
  static Syntax = r`(${v}+)\\s+(in|of)\\s+(\\([\\s\\S]*?\\)|${q}+)\\s*(reversed)?`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, TableRow.Syntax)) {
      this.variable_name   = this.last_match[1];
      this.collection_name = this.parse_expression(this.last_match[3]);
      this.attributes      = {};
      scan(this.markup, TagAttributes, (m, key, value) => {
        this.attributes[key] = this.parse_expression(value);
      });
    } else {
      this.raise_syntax_error('table_row');
    }
  }

  async render(context) {
    let collection = await context.evaluate(this.collection_name);
    if (collection == null) return '';

    const attribs = this.attributes;
    const { offset, limit } = attribs;

    const from = !isNil(offset) ? to_i(await context.evaluate(offset)) : 0;
    const to   = !isNil(limit) ? to_i(from + (await context.evaluate(limit))) : null;

    collection = slice_collection(collection, from, to);

    const length = collection.length;
    const cols = to_i(await context.evaluate(attribs['cols']));

    let output = '<tr class="row1">\n';

    await context.stack({}, async () => {
      const tablerowloop = new Dry.drops.TableRowLoopDrop(length, cols);
      context['tablerowloop'] = tablerowloop;

      for (const item of collection) {
        context.set(this.variable_name, item);
        output += `<td class="col${tablerowloop.col}">`;
        output += await super.render(context);
        output += '</td>';

        if (tablerowloop.col_last && !tablerowloop.last) {
          output += `</tr>\n<tr class="row${tablerowloop.row + 1}">`;
        }

        tablerowloop.increment();
      }
    });

    output += '</tr>\n';
    return output;
  }

  static get ParseTreeVisitor() {
    return ParseTreeVisitor;
  }
}

class ParseTreeVisitor extends Dry.ParseTreeVisitor {
  get children() {
    return super.children.concat(Object.values(this.node.attributes), [this.node.collection_name]);
  }
}

module.exports = TableRow;
