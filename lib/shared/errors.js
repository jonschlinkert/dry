'use strict';

const kToStringCalled = Symbol(':to_string_called');

class DryError extends Error {
  constructor(...args) {
    super(...args);
    this.name = this.constructor.name;
  }

  to_s(...args) {
    return this.toString(...args);
  }

  toString(with_prefix = true) {
    if (this[kToStringCalled]) return;
    this[kToStringCalled] = true;

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

    if (this instanceof DryError.SyntaxError) {
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
    this.name = 'Dry error';

    if (typeof expected === 'number' && typeof actual === 'number') {
      this.message = `wrong number of arguments (${actual} for ${expected})`;
    } else if (typeof expected === 'string' && actual == null) {
      this.message = expected;
    } else {
      this.message = 'argument error';
    }
  }
}

DryError.ArgumentError       = ArgumentError;
DryError.ContextError        = class ContextError extends DryError {};
DryError.DisabledError       = class DisabledError extends DryError {};
DryError.DryError            = DryError;
DryError.Error               = DryError;
DryError.FileSystemError     = class FileSystemError extends DryError {};
DryError.FloatDomainError    = class FloatDomainError extends DryError {};
DryError.InternalError       = class InternalError extends DryError {};
DryError.KeyError            = KeyError;
DryError.MemoryError         = class MemoryError extends DryError {};
DryError.MethodOverrideError = class MethodOverrideError extends DryError {};
DryError.RangeError          = class RangeError extends DryError {};
DryError.StackLevelError     = class StackLevelError extends DryError {};
DryError.StandardError       = class StandardError extends DryError {};
DryError.SyntaxError         = class DrySyntaxError extends DryError {};
DryError.TaintedError        = class TaintedError extends DryError {};
DryError.TypeError           = class DryTypeError extends DryError {};
DryError.UndefinedDropMethod = class UndefinedDropMethod extends DryError {};
DryError.UndefinedFilter     = class UndefinedFilter extends DryError {};
DryError.UndefinedVariable   = class UndefinedVariable extends DryError {};
DryError.ZeroDivisionError   = class ZeroDivisionError extends DryError {};

module.exports = DryError;

