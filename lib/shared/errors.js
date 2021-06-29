'use strict';

const kMessage = Symbol(':message');
const kToStringCalled = Symbol(':to_string_called');

class DryError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    this.message = message;
    this.message = this.to_s();
  }

  to_s(with_prefix = true) {
    return this.toString(with_prefix);
  }

  message_prefix() {
    this.name = '';
    let str = this.prefix;

    if (typeof this.line_number === 'number') {
      str += ' (';
      str += this.template_name ? `${this.template_name} ` : '';
      str += `line ${this.line_number})`;
    }

    str += ': ';
    return str;
  }

  toString(with_prefix = true) {
    if (this[kToStringCalled]) return this[kMessage];
    Reflect.defineProperty(this, kToStringCalled, { value: true });

    let prefix = '';
    let str = '';

    if (with_prefix) {
      prefix = this.message_prefix();
      str += prefix;
    }

    str += super.toString().replace(prefix, '');

    if (this.markup_context) {
      str += ' ';
      str += this.markup_context;
    }

    this[kMessage] = str;
    return str;
  }

  get prefix() {
    return this instanceof DryError.SyntaxError ? 'Dry syntax error' : 'Dry error';
  }

  set message(value) {
    this[kMessage] = value;
  }
  get message() {
    if (!this[kToStringCalled]) {
      this.toString();
    }
    return this[kMessage];
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
    // this.name = 'Dry error';

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

