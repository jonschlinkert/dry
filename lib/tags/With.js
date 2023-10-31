
const Dry = require('../Dry');
const { constants } = Dry;

// {% with %}
//   {% assign foo = 42 %}
//   {{ foo }} {% comment %}foo is 42 here{% endcomment %}
// {% endwith %}
class With extends Dry.BlockTag {
  constructor(node, state, parent) {
    super(node, state, parent);
    this.markup = this.match[3].trim();
    this.only = this.markup.endsWith(' only');
    this.parse_variable_name();
  }

  parse_variable_name() {
    if (this.only) this.markup = this.markup.slice(0, -5);

    // const segs = this.markup.split(/(?<=\.\.)\//);
    // const props = segs.map(v => v === '.' ? 'this' : v === '..' ? '@parent' : v);
    // let key = props.shift();

    // while (props.length) {
    //   key += `["${props.shift()}"]`;
    // }

    this.variable_name      = this.markup;
    this.variable_name_expr = this.parse_expression(this.markup);
  }

  async evaluate(context) {
    const result = await context.get(await context.evaluate(this.variable_name));

    if (result === undefined) {
      try {
        return JSON.parse(this.variable_name);
      } catch (err) {
        // do nothing
      }
    }

    return result;
  }

  async render(context) {
    const data = await this.evaluate(context);
    const scope = this.only ? context.new_isolated_subcontext() : context;
    const last = context.scopes[context.scopes.length - 1];

    if (this.variable_name === '.' && context.allow_this_variable) {
      scope.merge(last);
    }

    scope.set(constants.symbols.kWithParent, [last]);
    scope.set('this_value', data);

    scope.inside_with_scope ||= 0;
    scope.inside_with_scope++;
    const output = await scope.stack(data, () => super.render(scope));
    scope.inside_with_scope--;
    return output;
  }
}

module.exports = With;
