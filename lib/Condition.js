/* eslint-disable eqeqeq */
'use strict';

const Expression = require('./Expression');
const Context = require('./Context');
const Dry = require('./Dry');
const { isNil, isObject } = Dry.utils;

//
// TODO: <=>	Combined comparison operator.
//    Returns:
//    0 if first operand equals second,
//    1 if first operand is greater than the second and
//    -1 if first operand is less than the second.
//    (a <=> b) returns -1.
//

class MethodLiteral {
  constructor(method_name, to_s) {
    this.method_name = method_name;
    this.to_s = () => to_s;
  }
}

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
    if (left == null) return false;

    if (!isNil(left) && !isNil(right)) {
      if (typeof left === 'string' || Array.isArray(left)) {
        return left.includes(right);
      }
      if (typeof left === 'object' && 'includes' in left) {
        return left.includes(right);
      }
    }

    if (!isObject(left)) {
      return left == right;
    }

    if (left instanceof Dry.Drop) {
      if (typeof left.contains === 'function') {
        return left.contains(right);
      }

      if (typeof left.each === 'function') {
        const arr = [];
        left.each(v => arr.push(v));
        return arr.includes(right);
      }

      return false;
    }

    return hasOwnProperty.call(left, right);
  }
};

class Condition {
  constructor(left, operator, right) {
    this.type = 'condition';
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
      condition = child_condition;
    }
    // while (condition) {
    //   const { left, operator, right, child_condition, child_relation } = condition;
    //   result = this.interpret_condition(left, right, operator, context);
    //   if (child_relation === 'and' && !result) break;
    //   if (child_relation === 'or' && result) break;
    //   if (child_relation && child_relation !== 'and' && child_relation !== 'or') break;
    //   condition = child_condition;
    // }

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

  equal_variables(left, right, operator, { strict = false } = {}) {
    if (left instanceof MethodLiteral) {
      return right[left.method_name] ? right[left.method_name]() :  null;
    }

    if (right instanceof MethodLiteral) {
      return left[right.method_name] ? left[right.method_name]() : null;
    }

    if (isObject(left)) return this.equal_objects(left, right);
    if (isObject(right)) return this.equal_objects(left, right);

    if ((typeof left === 'number' || typeof right === 'number') && typeof left !== typeof right) {
      if (!isNil(left) && !isNil(right)) {
        throw new Dry.ArgumentError(`Invalid comparison: ${typeof left} to ${typeof right}`);
      }

      return false;
    }

    switch (operator) {
      case '<': return left < right;
      case '>': return left > right;
      case '<=': return left <= right;
      case '>=': return left >= right;
      default: {
        /* eslint-disable eqeqeq */
        return strict ? left === right : left == right;
      }
    }
  }

  equal_objects(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  // equal_variables(left, right, operator, { strict = true } = {}) {
  //   if (left == null || right == null) return left == null && right == null;

  //   // if (typeof left !== typeof right) {
  //   //   throw new ArgumentError('Invalid arguments');
  //   // }

  //   if (left instanceof MethodLiteral) {
  //     const fn = right[left.method_name] || helpers[left.method_name];
  //     return fn ? fn(right) : null;
  //   }

  //   if (right instanceof MethodLiteral) {
  //     const fn = left[right.method_name] || helpers[right.method_name];
  //     return fn ? fn(left) : null;
  //   }

  //   if (isObject(left)) left = JSON.stringify(left);
  //   if (isObject(right)) right = JSON.stringify(right);

  //   switch (operator) {
  //     case '<': return left < right;
  //     case '>': return left > right;
  //     case '<=': return left <= right;
  //     case '>=': return left >= right;
  //     default: {
  //       /* eslint-disable eqeqeq */
  //       return strict ? left === right : left == right;
  //     }
  //   }
  // }

  interpret_condition(left, right, operator, context) {
    // If the operator is empty this means that the decision statement is just
    // a single variable. We can just poll this variable from the context and
    // return this as the result.
    if (!operator) {
      let output = context.evaluate(left);

      // if (typeof output === 'string') output = Condition.parse_expression(output);
      if (output && output instanceof Dry.Drop && output.to_liquid_value) {
        output = output.to_liquid_value();
      }

      return output;
    }

    left = context.evaluate(left);
    right = context.evaluate(right);

    const raise = () => { throw new Dry.ArgumentError(`Unknown operator ${operator}`); };
    const operation = this.constructor.operators[operator] || raise();

    if (typeof operation === 'function') {
      if (left && typeof left.equals === 'function') {
        return left.equals(right);
      }
      return operation(left, right, operator, this);
    }

    if (left[operation] && right[operation]) {
      try {
        return left[operation](right);
      } catch (err) {
        throw new Dry.ArgumentError(err.message);
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
