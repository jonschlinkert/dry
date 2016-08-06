'use strict';

var debug = require('debug')('dry');
var RegexCache = require('./regex');
var Position = require('./position');
var utils = require('./utils');

/**
 * Create a new `Lexer` for the given `file` and `options`.
 * @param {object} `file`
 * @param {object} `options`
 */

function Lexer(file, options) {
  debug('lexing <%s>', file.path);
  this.options = utils.extend({}, options);
  this.input = utils.normalize(file.contents.toString());
  this.regex = new RegexCache();

  this.ast = {
    type: 'root',
    name: 'root',
    nodes: []
  };

  this.file = file;
  this.file.ast = this.ast;
  this.file.ast.blocks = {};
  this.tokens = [this.ast];
  this.errors = [];
  this.stack = [];
  this.stash = [];
  this.lexers = {};
  this.fns = [];
  this.init(this);
}

/**
 * Prototype methods
 */

Lexer.prototype = {
  constructor: Lexer,

  /**
   * Create default delimiters and tags
   */

  init: function(lexer) {
    this.lineno = 1;
    this.column = 1;
    this.lexed = '';

    /**
     * Captures
     */

    this.capture('newline', /^\n+/);
    this.capture('escape', /^\\(.)/);
    this.capture('expression', /^\{\{([\s\S]+?)\}\}/);
    this.capture('text', /^[^{%}]+/);

    /**
     * Tags
     */
    this.createTag('extends');
    this.createTag('layout');

    /**
     * Block tags
     */
    this.createBlock('block');

    /**
     * Custom block tags
     */
    var helpers = this.options.helpers || {};
    if (utils.isObject(helpers)) {
      helpers = Object.keys(helpers);
    }

    helpers.forEach(function(key) {
      lexer.createBlock(key);
    });
  },

  /**
   * Set an error message with the current line number and column.
   * @param {String} `msg` Message to use in the Error.
   */

  error: function(msg) {
    var message = this.file.relative
      + ' line:' + this.lineno
      + ' column:' + this.column
      + ': ' + msg;

    var err = new Error(message);
    err.reason = msg;
    err.line = this.lineno;
    err.column = this.column;
    err.source = this.input;
    err.path = this.file.path;

    if (this.options.silent) {
      this.errors.push(err);
    } else {
      throw err;
    }
  },

  /**
   * Mark position and patch `node.position`.
   */

  position: function() {
    var start = { line: this.lineno, column: this.column };
    var self = this;

    return function(node) {
      utils.define(node, 'position', new Position(start, self));
      return node;
    };
  },

  /**
   * Capture `type` with the given regex.
   * @param {String} `type`
   * @param {RegExp} `regex`
   * @return {Function}
   */

  capture: function(type, regex) {
    var cached = this.regex.create(type, regex);
    var lexer = this;

    this.addLexer(function() {
      var pos = lexer.position();
      var m = lexer.match(cached.val);
      if (!m) return;

      var parent = lexer.prev();
      var node = pos({
        type: type,
        val: m[0]
      });

      utils.define(node, 'parent', parent);
      utils.define(node, 'args', m[1]);
      parent.nodes.push(node);
    });

    return this;
  },

  /**
   * Create a tag lexer for the given `type`.
   * @param {String} `type`
   * @return {Function}
   */

  createTag: function(type) {
    var cached = this.regex.createTag(type);
    var file = this.file;
    var lexer = this;

    function fn() {
      var pos = lexer.position();
      var m = lexer.match(cached.strict);
      if (!m) return;

      if (file[type] && !file.isParsed) {
        throw new Error(`only one "${type}" tag may be defined per template`);
      }

      var name = file[type] = utils.getName(m[1]);
      var parent = lexer.prev();
      var tok = pos({
        type: type,
        name: name,
        val: m[0]
      });

      utils.define(tok, 'parent', parent);
      parent.nodes.push(tok);
    }

    fn.type = type;
    this.addLexer(fn);
    return this;
  },

  /**
   * Create an opening tag lexer for block `name`.
   * @param {String} `name`
   * @return {Function}
   */

  createOpen: function(type) {
    var cached = this.regex.createOpen(type);
    var file = this.file;
    var lexer = this;

    return function() {
      var pos = lexer.position();
      var m = lexer.match(cached.strict);
      if (!m) return;

      var name = utils.getName(m[1]);
      var action = utils.getAction(m[1]);
      var val = m[0];

      if (!name && lexer.options[type] && lexer.options[type].args === 'required') {
        throw new Error(`no arguments defined on "${type}": ${m[0]}`);
      }

      var tok = pos({
        type: `${type}.open`,
        name: name,
        val: val
      });

      var parent = lexer.prev();
      if (parent && parent.name && parent.name !== 'root') {
        name = parent.name + '.' + name;
      }

      var block = {
        type: type,
        name: name,
        action: action,
        nodes: [tok]
      };

      lexer.currentBlock = name;
      utils.define(tok, 'parent', block);
      utils.define(block, 'parent', parent);
      utils.define(block, 'match', function() {
        return [].slice.call(m);
      });

      Object.defineProperty(file.ast.blocks[type], name, {
        configurable: true,
        enumerable: true,
        set: function(val) {
          block = val;
        },
        get: function() {
          return block;
        }
      });

      parent.nodes.push(block);
      lexer.tokens.push(block);
      return block;
    };
  },

  /**
   * Create a closing tag lexer for block `name`.
   * @param {String} `name`
   * @return {Function}
   */

  createClose: function fn(type) {
    var cached = this.regex.createClose(type);
    var file = this.file;
    var lexer = this;

    return function() {
      var pos = lexer.position();
      var m = lexer.match(cached.strict);
      if (!m) return;

      var parent = lexer.tokens.pop();
      if (typeof parent === 'undefined' || parent.type !== type) {
        throw new Error(`missing opening ${type}`);
      }

      if (parent.name === 'body') {
        lexer.ast.isLayout = true;
        file.ast.isLayout = true;
      }

      var nodes = parent.nodes;
      Object.defineProperty(file.ast.blocks, parent.name, {
        configurable: true,
        set: function(val) {
          nodes = val;
        },
        get: function() {
          return nodes;
        }
      });

      Object.defineProperty(parent, 'nodes', {
        configurable: true,
        set: function(val) {
          nodes = val;
        },
        get: function() {
          return nodes;
        }
      });

      var tok = pos({
        type: `${type}.close`,
        val: m[0]
      });

      utils.define(parent, 'position', tok.position);
      utils.define(tok, 'parent', parent);
      parent.nodes.push(tok);
      return parent;
    };
  },

  /**
   * Create a block lexer with opening and closing tags for the given `name`.
   * @param {String} `name`
   * @return {Function}
   */

  createBlock: function(type) {
    this.file.ast.blocks[type] = this.file.ast.blocks[type] || {};
    this.addLexer(this.createOpen(type));
    this.addLexer(this.createClose(type));
    return this;
  },

  /**
   * Get the previous AST node
   * @return {Object}
   */

  prev: function() {
    return utils.last(this.tokens);
  },

  /**
   * Push a lexer `fn` onto the `fns` array
   * @param {Function} `fn`
   * @return {undefined}
   */

  addLexer: function(fn) {
    this.fns.push(fn);
    return this;
  },

  /**
   * Consume the given `len` of input.
   * @param {Number} len
   */

  consume: function(str, len) {
    this.input = this.input.substr(len);
  },

  /**
   * Update lineno and column based on `str`.
   */

  updatePosition: function(str, len) {
    var lines = str.match(/\n/g);
    if (lines) this.lineno += lines.length;
    var i = str.lastIndexOf('\n');
    this.column = ~i ? len - i : this.column + len;
    this.lexed += str;
    this.consume(str, len);
  },

  /**
   * Match `regex`, return captures, and update the cursor position by `match[0]` length.
   * @param {RegExp} `regex`
   * @return {Object}
   */

  match: function(regex) {
    var m = regex.exec(this.input);
    if (m) {
      this.updatePosition(m[0], m[0].length);
      return m;
    }
  },

  /**
   * Run lexers to advance the curson position
   */

  advance: function() {
    var len = this.fns.length;
    var idx = -1;
    while (++idx < len) {
      this.fns[idx].call(this);
      if (!this.input) {
        break;
      }
    }
  },

  /**
   * Get the next AST token
   */

  next: function() {
    while (this.input) {
      var prev = this.input;
      this.advance();
      if (this.input && prev === this.input) {
        throw new Error(`no lexers registered for: "${this.input.substr(0, 10)}"`);
      }
    }
  },

  /**
   * Tokenize the given string.
   * @return {Array}
   */

  tokenize: function() {
    while (this.input.length) this.next();
    return this.ast;
  }
};

/**
 * Expose `Lexer`
 */

exports = module.exports = Lexer;
