'use strict';

class DryError extends Error {
  constructor(...args) {
    super(...args);
    this.name = this.constructor.name;
  }

  toString(with_prefix = true) {
    let output = '';

    if (with_prefix) {
      output += this.message_prefix();
    }

    output += super.toString();

    if (this.markup_context) {
      output += ' ';
      output += this.markup_context;
    }

    return output;
  }

  message_prefix() {
    this.name = '';
    let output = '';

    if (this instanceof DrySyntaxError) {
      output += 'Dry syntax error';
    } else {
      output += 'Dry error';
    }

    if (typeof this.line_number === 'number') {
      output += ' (';
      if (this.template_name) output += this.template_name + ' ';
      output += 'line ' + this.line_number + ')';
    }

    output += ': ';
    return output;
  }
}

class KeyError extends DryError {
  constructor(message) {
    super(message);
    this.message = `key not found: "${this.message}"`;
  }
}

class ArgumentError extends DryError {
  constructor(expected, actual) {
    super();
    if (typeof expected === 'number' && typeof actual === 'number') {
      this.message = `wrong number of arguments (${actual} for ${expected})`;
    } else if (typeof expected === 'string' && actual == null) {
      this.message = expected;
    } else {
      this.message = 'argument error';
    }
  }
}

class DrySyntaxError extends DryError {
  name = '';
}

class DryTypeError extends DryError {
  name = '';
}

DryError.DryError            = DryError;
DryError.ArgumentError       = ArgumentError;
DryError.KeyError            = KeyError;
DryError.SyntaxError         = DrySyntaxError;
DryError.TypeError           = DryTypeError;
DryError.ZeroDivisionError   = class ZeroDivisionError extends DryError {};
DryError.ContextError        = class ContextError extends DryError {};
DryError.FileSystemError     = class FileSystemError extends DryError {};
DryError.StandardError       = class StandardError extends DryError {};
DryError.StackLevelError     = class StackLevelError extends DryError {};
DryError.TaintedError        = class TaintedError extends DryError {};
DryError.MemoryError         = class MemoryError extends DryError {};
DryError.FloatDomainError    = class FloatDomainError extends DryError {};
DryError.UndefinedVariable   = class UndefinedVariable extends DryError {};
DryError.UndefinedDropMethod = class UndefinedDropMethod extends DryError {};
DryError.UndefinedFilter     = class UndefinedFilter extends DryError {};
DryError.MethodOverrideError = class MethodOverrideError extends DryError {};
DryError.InternalError       = class InternalError extends DryError {};

module.exports = DryError;

