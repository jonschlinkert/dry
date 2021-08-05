'use strict';

const Dry = require('../Dry');
const { regex, utils } = Dry;
const { TagAttributes, QuotedFragment: q, VariableSegment: v } = regex;

class TableRow extends Dry.BlockTag {
  static Syntax = utils.r`(${v}+)\\s+(in|of)\\s+(\\([\\s\\S]*?\\)|${q}+)\\s*(reversed)?`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];

    if (this.ParseSyntax(this.markup, TableRow.Syntax)) {
      this.variable_name   = this.last_match[1];
      this.collection_name = this.parse_expression(this.last_match[3]);
      this.attributes      = {};
      utils.scan(this.markup, TagAttributes, (m, key, value) => {
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

    const from = !utils.isNil(offset) ? utils.to_i(await context.evaluate(offset)) : 0;
    const to   = !utils.isNil(limit) ? utils.to_i(from + (await context.evaluate(limit))) : null;

    collection = utils.slice_collection(collection, from, to);

    const length = collection.length;
    const cols = utils.to_i(await context.evaluate(attribs.cols));

    let output = '<tr class="row1">\n';

    await context.stack({}, async () => {
      const tablerowloop = new Dry.drops.TableRowLoopDrop(length, cols);
      context.set('tablerowloop', tablerowloop);

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
