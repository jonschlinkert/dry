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

function Lexer(options) {
  this.options = utils.extend({}, options);
  this.regex = new RegexCache();
  this.names = [];
  this.ast = {
    tags: {},
    type: 'root',
    name: 'root',
    nodes: []
  };
  this.unknown = {tags: [], blocks: []};
  this.known = {
    tags: ['extends', 'layout'],
    blocks: ['block']
  };
  this.tokens = [this.ast];
  this.errors = [];
  this.stack = [];
  this.stash = [];
  this.lexers = {};
  this.fns = [];
}

/**
 * Prototype methods
 */

Lexer.prototype = {
  constructor: Lexer,

  /**
   * Create default delimiters and tags
   */

  init: function(lexer, file) {
    this.lineno = 1;
    this.column = 1;
    this.lexed = '';

    this.input = this.input.split('{% body %}')
      .join('{% block "body" %}{% endblock %}')

    /**
     * Tags
     */
    this.captureTag('extends');
    this.captureTag('layout');

    /**
     * Block tags
     */
    this.captureBlock('block');

    /**
     * Captures
     */
    this.capture('newline', /^\n+/);
    this.capture('escape', /^\\(.)/);
    this.capture('text', /^[^{%}]+/);

    /**
     * Custom helpers
     */
    var helpers = this.options.helpers || {};
    if (utils.isObject(helpers)) {
      helpers = Object.keys(helpers);
    }
    helpers.forEach(function(key) {
      lexer.known.blocks.push(key);
      lexer.captureBlock(key);
    });

    /**
     * Add other names to return un-rendered
     */

    var matches = this.input.match(/\{%\s*([^%}]+)/g);
    var names = utils.getNames(matches);
    names.tags.forEach(function(key) {
      if (!utils.isRegistered(lexer, key)) {
        lexer.unknown.tags.push(key);
        lexer.captureTag(key);
      }
    });

    names.blocks.forEach(function(key) {
      if (!utils.isRegistered(lexer, key)) {
        lexer.unknown.blocks.push(key);
        lexer.captureBlock(key);
      }
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

    var fn = this.lexers[type] = function() {
      var pos = lexer.position();
      var m = lexer.match(cached.val);
      if (!m) return;

      var parent = lexer.prev();
      var node = pos({
        type: type,
        val: m[0]
      });

      utils.define(node, 'parent', parent);
      utils.define(node, 'rawArgs', m[1]);
      utils.define(node, 'args', function() {
        return utils.parseArgs(m[1]);
      });

      parent.nodes.push(node);
    };

    this.addLexer(fn);
    return this;
  },

  /**
   * Create a tag lexer for the given `type`.
   * @param {String} `type`
   * @return {Function}
   */

  captureVariable: function(type) {
    var cached = this.regex.createVariable(type);
    var file = this.file;
    var lexer = this;

    var fn = this.lexers[type] = function() {
      var pos = lexer.position();
      var m = lexer.match(cached.strict);
      if (!m) return;

      var parent = this.prev();
      var node = pos({
        known: utils.has(this.known.tags, type),
        type: type,
        val: m[0],
      });

      parent.known = node.known;
      var nodes = parent.nodes;

      Object.defineProperty(file.ast.variables, type, {
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

      utils.define(node, 'parent', parent);
      parent.nodes.push(node);
    };

    this.addLexer(fn);
    return this;
  },

  /**
   * Create a tag lexer for the given `type`.
   * @param {String} `type`
   * @return {Function}
   */

  captureTag: function(type) {
    this.ast.tags[type] = null;
    this.names.push(type);

    var cached = this.regex.createTag(type);
    var file = this.file;
    var lexer = this;

    var fn = this.lexers[type] = function() {
      var pos = lexer.position();
      var m = lexer.match(cached.strict);
      if (!m) return;

      var name = utils.getName(m[1]);
      var isKnown = utils.has(this.known.tags, type);
      if (isKnown && file.hasOwnProperty(type) && !file.hasOwnProperty('isParsed')) {
        throw new Error(`only one "${type}" tag may be defined per template`);
      }

      file[type] = name;
      lexer.ast.tags[type] = name;
      lexer.createNode(type, name, m, pos);
    };

    this.addLexer(fn);
    return this;
  },

  /**
   * Push AST node `type` onto `parent.nodes`
   * @param {String} `type`
   * @param {String} `name`
   * @param {String} `val`
   * @param {Function} `pos`
   */

  createNode: function(type, name, m, pos) {
    var parent = this.prev();
    var tok = {type: 'args', val: m[1], parentType: type};
    var node = pos({
      type: type,
      name: name,
      known: utils.has(this.known.tags, type),
      val: m[1],
      nodes: [tok]
    });

    utils.define(node, 'parent', parent);
    utils.define(tok, 'parent', node);
    parent.nodes.push(node);
  },

  /**
   * Create an opening tag lexer for block `name`.
   * @param {String} `name`
   * @return {Function}
   */

  captureOpen: function(type) {
    this.names.push(type);
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

      if (!name) name = 'unnamed';
      var tok = pos({
        type: `${type}.open`,
        known: utils.has(this.known.blocks, type),
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
        known: tok.known,
        action: action,
        nodes: [tok]
      };

      utils.define(tok, 'parent', block);
      utils.define(block, 'parent', parent);
      block.rawArgs = m[1];
      block.args = utils.parseArgs(m[1]);

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

  captureClose: function(type) {
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
        known: utils.has(this.known.blocks, type),
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

  captureBlock: function(type) {
    this.file.ast.blocks[type] = this.file.ast.blocks[type] || {};
    this.addLexer(this.captureOpen(type));
    this.addLexer(this.captureClose(type));
    return this;
  },

  /**
   * Unshift node `prop` onto the AST
   */

  prefixNode: function(file, prop) {
    return this.createNode(prop, file[prop], `{% ${prop} "${file[prop]}" %}`, this.position());
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

  prepare: function(file) {
    debug('lexing <%s>', file.path);
    this.input = utils.normalize(file.contents.toString());
    this.file = file;
    this.file.orig = file.contents;
    this.file.ast = this.ast;
    this.file.ast.variables = {};
    this.file.ast.blocks = {};
    if (file.extends) {
      this.prefixNode(file, 'extends');
    }
    this.init(this, file);
  },

  tokenize: function(file) {
    this.prepare(file);
    while (this.input.length) this.next();
    utils.define(this.ast, 'lexer', this);
    return this.ast;
  }
};

/**
 * Expose `Lexer`
 */

exports = module.exports = Lexer;
