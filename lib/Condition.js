/* eslint-disable eqeqeq */

const typeOf = require('kind-of');
const Dry = require('./Dry');

class MethodLiteral {
  constructor(method_name, to_s) {
    this.method_name = method_name;
    this.to_s = () => to_s;
  }
  toString() {
    return this.to_s();
  }
}

const method_literals = new Map([
  ['blank', new MethodLiteral('blank', '')],
  ['empty', new MethodLiteral('empty', '')]
]);

//
// TODO: <=>	Combined comparison operator.
//    Returns:
//    0 if first operand equals second,
//    1 if first operand is greater than the second and
//    -1 if first operand is less than the second.
//    (a <=> b) returns -1.
//

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
  '!': (left, right, op, node) => !node.equal_variables(left, right, op),
  '!=': (left, right, op, node) => !node.equal_variables(left, right, op),
  '!==': (left, right, op, node) => !node.equal_variables(left, right, op, { strict: true }),
  '<=>': (left, right) => {
    if (left == null && right == null) return 0;
    if (left == null) return -1;
    if (right == null) return 1;
    return left < right ? -1 : left > right ? 1 : 0;
  },
  contains: (left, right) => {
    if (left == null) return false;

    // Track visited objects to prevent circular reference loops
    const visited = new WeakSet();

    const checkContains = (container, value) => {
      if (container == null) return false;

      if (!Dry.utils.isNil(container) && !Dry.utils.isNil(value)) {
        if (typeof container === 'string' || Array.isArray(container)) {
          return container.includes(value);
        }

        if (typeof container === 'object') {
          if (visited.has(container)) return false;
          visited.add(container);

          if ('includes' in container) {
            return container.includes(value);
          }
        }
      }

      if (container instanceof Set || container instanceof Map) {
        return container.has(value);
      }

      if (!Dry.utils.isObject(container)) {
        return container == value;
      }

      if (container instanceof Dry.Drop) {
        if (typeof container.contains === 'function') {
          return container.contains(value);
        }

        if (typeof container.each === 'function') {
          const arr = [];
          container.each(v => arr.push(v));
          return arr.includes(value);
        }

        return false;
      }

      return Object.prototype.hasOwnProperty.call(container, value);
    };

    return checkContains(left, right);
  }
};

class Condition {
  constructor(left, operator, right, node) {
    this.type = 'condition';
    this.node = node;
    this.left = left;
    this.operator = operator;
    this.right = right;

    if (operator === undefined && left?.negate === true) {
      this.operator = '!';
    }

    this.child_relation = null;
    this.child_condition = null;
  }

  async evaluate(context = new Dry.Context()) {
    // eslint-disable-next-line consistent-this
    let condition = this;
    let result = null;

    while (condition) {
      const { left, operator, right, child_condition, child_relation } = condition;
      result = await this.interpret_condition(left, right, operator, context, result);
      if (child_relation === 'and' && !result) break;
      if (child_relation === 'or' && result) break;
      condition = child_condition;
    }

    return result;
  }

  render(context) {
    return this.evaluate(context);
  }

  or(condition) {
    this.child_relation = 'or';
    this.child_condition = condition;
  }

  and(condition) {
    this.child_relation = 'and';
    this.child_condition = condition;
  }

  async interpret_condition(left, right, operator, context) {
    if (left && left.name === 'typeof') {
      left = typeOf(await context.find_variable(left.value));
    }

    // If the operator is empty this means that the decision statement is just
    // a single variable. We can just poll this variable from the context and
    // return this as the result.
    if (!operator) {
      let output = await context.evaluate(left);
      if (output && output instanceof Dry.Drop && output.to_liquid_value) {
        output = output.to_liquid_value();
      }
      return output;
    }

    left = await context.evaluate(left);
    right = await context.evaluate(right);

    const raise = () => { throw new Dry.ArgumentError(`Unknown operator ${operator}`); };
    let operation = Condition.operators[operator] || raise();

    if (Array.isArray(right) && this.node && this.node.name === 'case') {
      const temp = right;
      right = left;
      left = temp;
      operation = Condition.operators.contains;
    }

    if (typeof operation === 'function') {
      if (!Dry.utils.isPrimitive(left) && typeof left?.equals === 'function') {
        return left.equals(right);
      }

      return operation(left, right, operator, this);
    }

    if (left?.[operation] && right?.[operation]) {
      try {
        return left[operation](right);
      } catch (err) {
        throw new Dry.ArgumentError(err.message);
      }
    }
  }

  equal_variables(left, right, operator, { strict = false } = {}) {
    if (left == null || right == null) {
      return left === right;
    }

    if (left instanceof MethodLiteral) {
      if (left.method_name === 'empty') return Dry.utils.isEmpty(right);
      if (left.method_name === 'blank') return Dry.utils.isBlank(right);
      return right[left.method_name] ? right[left.method_name]() :  null;
    }

    if (right instanceof MethodLiteral) {
      if (right.method_name === 'empty') return Dry.utils.isEmpty(left);
      if (right.method_name === 'blank') return Dry.utils.isBlank(left);
      return left[right.method_name] ? left[right.method_name]() : null;
    }

    if (Dry.utils.isObject(left)) return this.equal_objects(left, right);
    if (Dry.utils.isObject(right)) return this.equal_objects(left, right);

    // NOTE (jon): this is ruby's liquid behavior (I think...). AFAIK ruby liquid
    // raises an error when a number is compared with a string-number, but not
    // when a number is compared with a value that is something else. For now,
    // I'm going to honor this behavior until I learn more about why it's done this way
    if ((typeof left === 'number' || typeof right === 'number') && typeof left !== typeof right) {
      const isStringNumber = v => typeof v === 'string' && Dry.utils.isNumber(v);

      if ([left, right].some(v => isStringNumber(v)) && !Dry.utils.isNil(left) && !Dry.utils.isNil(right)) {
        throw new Dry.ArgumentError(`Invalid comparison: ${typeof left} to ${typeof right}`);
      }

      return false;
    }

    return this.get_operator(operator, left, right, strict);
  }

  get_operator(operator, left, right, strict = false) {
    try {
      switch (operator) {
        case '+': return left + right;
        case '-': return left - right;
        case '*': return left * right;
        case '/': {
          if (right === 0) {
            throw new Dry.ZeroDivisionError('Division by zero');
          }
          return left / right;
        }
        case '^': return left ^ right;
        case '%': {
          if (right === 0) {
            throw new Dry.ZeroDivisionError('Modulo by zero');
          }
          return left % right;
        }
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
        default: {
        /* eslint-disable eqeqeq */
          return strict ? left === right : left == right;
        }
      }
    } catch (err) {
      if (err instanceof Dry.ZeroDivisionError) throw err;
      throw new Dry.ArgumentError(`Invalid operation: ${operator}`);
    }
  }

  equal_objects(left, right) {
    if (left === right) return true;
    if (!left || !right) return false;

    const visited = new WeakSet();

    const deepEqual = (a, b) => {
      if (a === b) return true;
      if (!a || !b) return false;
      if (typeof a !== typeof b) return false;

      if (visited.has(a) || visited.has(b)) return false;
      visited.add(a);
      visited.add(b);

      if (Array.isArray(a)) {
        if (!Array.isArray(b) || a.length !== b.length) return false;
        return a.every((val, i) => deepEqual(val, b[i]));
      }

      if (typeof a === 'object') {
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => deepEqual(a[key], b[key]));
      }

      return false;
    };

    return deepEqual(left, right);
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
