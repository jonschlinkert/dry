'use strict';

const Expression = require('./Expression');
const Context = require('../Context');
const { ArgumentError } = require('../errors');
const { isNil } = require('../utils');

const method_literals = new Map([
  ['blank', new Expression.MethodLiteral('blank', '')],
  ['empty', new Expression.MethodLiteral('empty', '')]
]);

// const operators = {
//   '==': (cond, left, right) => cond.equal_variables(left, right),
//   '!=': (cond, left, right) => !cond.equal_variables(left, right),
//   '<>': (cond, left, right) => !cond.equal_variables(left, right),
//   '<': '<',
//   '>': '>',
//   '>=': '>=',
//   '<=': '<=',
//   // 'or': 'or',
//   // 'and': 'and',
//   'or': (_cond, left, right) => {
//     return left || right;
//   },
//   'and': (_cond, left, right) => {
//     return left && right;
//   },
//   'contains': (_cond, left, right) => {
//     if (left && right && left.includes) {
//       if (typeof left === 'string') right = right.toString();
//       return left.includes(right);
//     }
//     return false;
//   }
// };

const operators = {
  '<': (left, right, op, node) => node.equal_variables(left, right, op),
  '>': (left, right, op, node) => node.equal_variables(left, right, op),
  '>=': (left, right, op, node) => node.equal_variables(left, right, op),
  '<=': (left, right, op, node) => node.equal_variables(left, right, op),
  '==': (left, right, op, node) => node.equal_variables(left, right, op),
  '===': (left, right, op, node) => node.equal_variables(left, right, op, { strict: true }),
  '!=': (left, right, op, node) => !node.equal_variables(left, right, op),
  '!==': (left, right, op, node) => !node.equal_variables(left, right, op, { strict: true }),
  '<>': (left, right, op, node) => !node.equal_variables(left, right, op),
  and: (left, right, op, node) => node.equal_variables(left, right, op),
  is: (left, right, op, node) => node.equal_variables(left, right, op),
  isnt: (left, right, op, node) => !node.equal_variables(left, right, op),
  or: (left, right, op, node) => node.equal_variables(left, right, op),
  contains: (left, right) => {
    if (!isNil(left) && !isNil(right) && left.includes) {
      return left.includes(right);
    }

    // if (isObject(left)) {
    //   if (left.constructor.name.includes('Drop') && typeof left.each === 'function') {
    //     const arr = [];
    //     left.each(v => arr.push(v));
    //     return arr.includes(right);
    //   }

    //   return isSafeKey(right) && right in left;
    // }

    return false;
  }
};

class MethodLiteral {
  constructor(method_name, to_s) {
    this.method_name = method_name;
    this.to_s = to_s;
  }
}

class Condition {
  constructor(left, operator, right) {
    this.type = 'condition';
    this.options = { error_mode: 'strict' };

    this.left = left;
    this.operator = operator;
    this.right = right;

    this.child_relation = null;
    this.child_condition = null;
  }

  evaluate(context = new Context()) {
    let condition = this;
    let result = null;

    while (condition) {
      const { left, operator, right, child_condition, child_relation } = condition;
      result = this.interpret_condition(left, right, operator, context);

      if (child_relation === 'and' && !result) break;
      if (child_relation === 'or' && result) break;
      if (child_relation && child_relation !== 'and' && child_relation !== 'or') break;
      condition = child_condition;
    }

    return result;
  }

  or(condition) {
    this.child_relation = 'or';
    this.child_condition = condition;
  }

  and(condition) {
    this.child_relation = 'and';
    this.child_condition = condition;
  }

  equal_variables(left, right, operator) {
    if (left instanceof MethodLiteral) {
      return right[left.method_name] ? right[left.method_name]() :  null;
    }

    if (right instanceof MethodLiteral) {
      return left[right.method_name] ? left[right.method_name]() : null;
    }

    // eslint-disable-next-line eqeqeq
    return left == right;
  }

  interpret_condition(left, right, operator, context) {
    // If the operator is empty this means that the decision statement is just
    // a single variable. We can just poll this variable from the context and
    // return this as the result.
    if (!operator) {
      let output = context.evaluate(left);
      if (typeof output === 'string') output = Condition.parse_expression(output);
      return output;
    }

    // left = context.evaluate(context.find_variable(left));
    // right = context.evaluate(context.find_variable(right));
    left = context.evaluate(left);
    right = context.evaluate(right);

    const raise = () => { throw new ArgumentError(`Unknown operator ${operator}`); };
    const operation = this.constructor.operators[operator] || raise();

    if (typeof operation === 'function') {
      return operation(left, right, operator, this);
    }

    // console.log(this)
    // if (left[operation] && right[operation] && !isPlainObject(left) && !isPlainObject(right)) {
    if (left[operation] && right[operation]) {
      try {
        return left[operation](right);
      } catch (err) {
        throw new ArgumentError(err.message);
      }
    }
  }

  static parse_expression(markup) {
    return this.method_literals.get(markup) || Expression.parse(markup);
  }

  static get method_literals() {
    return method_literals;
  }

  static get operators() {
    return operators;
  }

  static get main() {
    return Main;
  }

  static get elsif() {
    return Elsif;
  }

  static get else() {
    return Else;
  }
}

class Main extends Condition {
  name = 'main';
}

class Elsif extends Condition {
  name = 'elsif';
}

class Else extends Condition {
  name = 'else';
  parse() {}
  evaluate() {
    return true;
  }
}

module.exports = Condition;
