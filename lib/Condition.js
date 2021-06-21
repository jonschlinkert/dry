/* eslint-disable eqeqeq */
'use strict';

const Dry = require('./Dry');
const { isBlank, isEmpty, isNil, isObject, isPrimitive } = Dry.utils;

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
  ['blank', new MethodLiteral('blank', '')],
  ['empty', new MethodLiteral('empty', '')]
]);

const operators = {
  '+': (left, right, op, node) => node.equal_variables(left, right, op),
  '/': (left, right, op, node) => node.equal_variables(left, right, op),
  '*': (left, right, op, node) => node.equal_variables(left, right, op),
  '-': (left, right, op, node) => node.equal_variables(left, right, op),
  '%': (left, right, op, node) => node.equal_variables(left, right, op),
  '<': (left, right, op, node) => node.equal_variables(left, right, op),
  '>': (left, right, op, node) => node.equal_variables(left, right, op),
  '>=': (left, right, op, node) => node.equal_variables(left, right, op),
  '<=': (left, right, op, node) => node.equal_variables(left, right, op),
  '==': (left, right, op, node) => node.equal_variables(left, right, op),
  '===': (left, right, op, node) => node.equal_variables(left, right, op, { strict: true }),
  '<>': (left, right, op, node) => !node.equal_variables(left, right, op),
  '!=': (left, right, op, node) => !node.equal_variables(left, right, op),
  '!==': (left, right, op, node) => !node.equal_variables(left, right, op, { strict: true }),
  '<=>': (left, right, op, node) => { throw new SyntaxError('Not implemented yet: <=>'); },
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

    if (left instanceof Set || left instanceof Map) {
      return left.has(right);
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
  constructor(left, operator, right, node) {
    this.type = 'condition';
    this.node = node;
    this.left = left;
    this.operator = operator;
    this.right = right;

    this.child_relation = null;
    this.child_condition = null;
  }

  evaluate(context = new Dry.Context()) {
    let condition = this;
    let result = null;

    while (condition) {
      const { left, operator, right, child_condition, child_relation } = condition;
      result = this.interpret_condition(left, right, operator, context, result);
      if (child_relation === 'and' && !result) break;
      if (child_relation === 'or' && result) break;
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

  interpret_condition(left, right, operator, context, previous_result) {
    // If the operator is empty this means that the decision statement is just
    // a single variable. We can just poll this variable from the context and
    // return this as the result.
    if (!operator) {
      let output = context.evaluate(left);
      if (output && output instanceof Dry.Drop && output.to_liquid_value) {
        output = output.to_liquid_value();
      }
      return output;
    }

    left = context.evaluate(left);
    right = context.evaluate(right);

    const raise = () => { throw new Dry.ArgumentError(`Unknown operator ${operator}`); };
    let operation = this.constructor.operators[operator] || raise();

    if (Array.isArray(right) && this.node && this.node.name === 'case') {
      const temp = right;
      right = left;
      left = temp;
      operation = this.constructor.operators.contains;
    }

    if (typeof operation === 'function') {
      if (!isPrimitive(left) && typeof left.equals === 'function') {
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

  equal_variables(left, right, operator, { strict = false } = {}) {
    if (left instanceof MethodLiteral) {
      if (left.method_name === 'empty') return isEmpty(right);
      if (left.method_name === 'blank') return isBlank(right);
      return right[left.method_name] ? right[left.method_name]() :  null;
    }

    if (right instanceof MethodLiteral) {
      if (right.method_name === 'empty') return isEmpty(left);
      if (right.method_name === 'blank') return isBlank(left);
      return left[right.method_name] ? left[right.method_name]() : null;
    }

    if (isObject(left)) return this.equal_objects(left, right);
    if (isObject(right)) return this.equal_objects(left, right);

    if ((typeof left === 'number' || typeof right === 'number') && typeof left !== typeof right) {
      // if (!isNil(left) && !isNil(right)) {
      //   throw new Dry.ArgumentError(`Invalid comparison: ${typeof left} to ${typeof right}`);
      // }

      return false;
    }

    switch (operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '^': return left ^ right;
      case '%': return left % right;
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

  static parse_expression(state, markup) {
    return this.method_literals.get(markup) || state.parse_expression(markup);
  }

  static get method_literals() {
    return method_literals;
  }

  static get operators() {
    return operators;
  }

  static get elsif() {
    return Elsif;
  }

  static get ElseCondition() {
    return Else;
  }

  static get else() {
    return Else;
  }
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
