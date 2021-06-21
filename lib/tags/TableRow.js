'use strict';

const BlockTag = require('../nodes/BlockTag');
const Dry = require('../Dry');
const { isNil, scan, to_i } = Dry.utils;
const { TAG_ATTRIBUTES, QUOTED_FRAGMENT } = Dry.regex;

class TableRow extends BlockTag {
  TableRowSyntax = Dry.utils.r`(\\w+)\\s+in\\s+(${QUOTED_FRAGMENT}+)`;

  constructor(node, state) {
    super(node, state);
    this.markup = this.match[3];

    if (this.Syntax(this.markup, this.TableRowSyntax)) {
      this.variable_name   = this.last_match[1];
      this.collection_name = Dry.Expression.parse(this.last_match[2]);
      this.attributes      = {};
      scan(this.markup, TAG_ATTRIBUTES, (m, key, value) => {
        this.attributes[key] = Dry.Expression.parse(value);
      });
    } else {
      throw new Dry.SyntaxError(this.state.locale.t('errors.syntax.table_row'));
    }
  }

  render(context) {
    let collection = context.evaluate(this.collection_name);
    if (collection == null) return '';

    const attribs = this.attributes;
    const { offset, limit } = attribs;

    const from = !isNil(offset) ? to_i(context.evaluate(offset)) : 0;
    const to   = !isNil(limit) ? to_i(from + context.evaluate(limit)) : null;

    collection = Dry.utils.slice_collection(collection, from, to);
    const length = collection.length;
    const cols = to_i(context.evaluate(attribs['cols']));

    let output = '<tr class="row1">\n';

    context.stack({}, () => {
      const tablerowloop = new Dry.drops.TableRowLoopDrop(length, cols);
      context['tablerowloop'] = tablerowloop;

      for (const item of collection) {
        context.set(this.variable_name, item);
        output += `<td class="col${tablerowloop.col}">`;
        output += super.render(context);
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
    return super.children.concat(this.node.attributes.values, [this.node.collection_name]);
  }
}

module.exports = TableRow;
