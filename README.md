# dry [![NPM version](https://img.shields.io/npm/v/dry.svg?style=flat)](https://www.npmjs.com/package/dry) [![NPM downloads](https://img.shields.io/npm/dm/dry.svg?style=flat)](https://npmjs.org/package/dry) [![Build Status](https://img.shields.io/travis/jonschlinkert/dry.svg?style=flat)](https://travis-ci.org/jonschlinkert/dry)

Template engine with support for block helpers, advanced inheritance features, and more.

WIP. This isn't production-ready, but the inheritance features are implemented if you feel like playing around with the [unit tests](test).

## Why another engine?

Since the main focus of this library is template inheritance, this is probably more of a "layout engine" than a template engine.

Ideally you should be able to use `dry` to apply layouts and blocks as a pre-render step, then use any template engine of your choosing to actually compile and render templates.

**What kind of "template inheritance"?**

With dry, you can create templates with common, re-usable code or content, and define "layouts", and "blocks" that act like placeholders or _default content_, which other templates can prepend, append or override. Layouts and blocks may also be infinitely nested.

## Examples

### Blocks

Define blocks in a template:

```html
<!-- parent.html -->
<!DOCTYPE html>
  <html lang="en">
  <head>
    {% block "head" %}
    <meta charset="UTF-8">
    <title>Document</title>
    {% endblock %}
  </head>
  <body>
    {% block "body" %}
    Default body.
    {% endblock %}

    {% block "footer" %}
    Default footer.
    {% endblock %}
  </body>
</html>
```

You can extend the `parent.html` template like this:

```html
{% extends "parent.html" %}

{% block "head" %}
<meta charset="UTF-8">
<title>Inherited!</title>
<script src="script.js"></script>
{% endblock %}

{% block "body" %}
<div>This is the body</div>
{% endblock %}

{% block "footer" %}
<div>This is the footer</div>
{% endblock %}
```

Resulting in:

```html
<!-- parent.html -->
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Inherited!</title>
    <script src="script.js"></script>
  </head>
  <body>
    <div>This is the body</div>
    <div>This is the footer</div>
  </body>
</html>
```

**Text nodes**

Note that when using `{% extend %}`, in child templates any content that is not inside a `{% block %}` (e.g. text nodes) will not be rendered.

Given the following example:

```html
{% extends "parent.html" %}

{% block "footer" %}
I will be included in `parent.html`
{% endblock %}

I will NOT be included in `parent.html`
```

**Unknown blocks**

Additionally, for blocks to render they must be defined in the parent template. Otherwise the blocks are simply discarded.

For example, given the following:

```html
<!-- parent.html -->
{% block "head" %}{% endblock %}
{% block "footer" %}{% endblock %}

<!-- child.html -->
{% block "footer" %}
I will render
{% endblock %}

{% block "flslslsl" %}
I will NOT render
{% endblock %}
```

### Layouts

Layouts use blocks, but the strategy for merging them differs in important ways:

* **blocks**: content defined in blocks works the same way as with `extends`
* **text nodes** from child and parent templates are preserved. Text nodes from child templates that do not belong to a specific block will be rendered into the `body` block of the parent layout

**Defining layouts**

Layouts are defined using a `{% body %}` tag:

```html
<!-- some-layout.html -->
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Document</title>
  </head>
  <body>
    {% body %}
  </body>
</html>
```

And are used like this:

```html
<!-- some-file.html -->
{% layout "some-layout.html" %}
This is content.
```

**Resulting in:**

```html
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Document</title>
  </head>
  <body>
    This is content.
  </body>
</html>
```

If you need to define placeholder content, you can define a `block` instead:

```html
<!-- some-layout.html -->
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Document</title>
  </head>
  <body>
  {% block "body" %} 
    Nothing yet
  {% endblock %}
  </body>
</html>
```

## Getting started

The simplest way to get started is with the main export, which handles both parsing and rendering.

```js
var dry = require('dry');
```

## API

```js
dry(file[, options]);
```

### Params

* `file` **{Object}**: object with `path` and `contents` buffer or string. [vinyl](http://github.com/gulpjs/vinyl) files may optionally be used.
* `options` **{Object}**: object with `files` to use for layouts and blocks

**Example**

```js
var fs = require('fs');
var dry = require('dry');
var layout = {path: 'some-layout.html', contents: fs.readFileSync('some-layout.html')};
var file = {path: 'some-file.html', contents: fs.readFileSync('some-file.html')};

var str = dry(file, {files: {'some-layout.html': layout}});
```

**Example**

```js
var fs = require('fs');
var dry = require('dry');
var layout = {path: 'some-layout.html', contents: fs.readFileSync('some-layout.html')};
var file = {path: 'some-file.html', contents: fs.readFileSync('some-file.html')};

var str = dry(file, {
  // pass an object of `files` to use as blocks or layouts
  files: {
    'some-layout.html': layout,
    'some-file.html': file,
  }
});
```

**Layouts**

Basic layouts are defined using a `{% body %}` tag. For example:

```html
<!-- some-layout.html -->
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Document</title>
  </head>
  <body>
    {% body %}
  </body>
</html>
```

To define a layout, you can either add a layout tag, like this:

```html
<!-- some-file.html -->
{% layout "some-layout.html" %}
This is content.
```

Or define the layout name directly on the `file` object:

```js
var file = {
  path: 'some-file.html', 
  contents: fs.readFileSync('some-file.html'),
  layout: 'some-layout.html' //<= layout
};
```

## Template inheritance

Let's say you define a template like this:

```html
<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Some title</title>
  </head>
  <body>
    {% block "header" %}
    <section>Header content</section>
    {% endblock %}

    {% block "body" %}
    <div>Body content.</div>
    {% endblock %}

    {% block "footer" %}
    <footer>Footer content</footer>
    {% endblock %}
  </body>
</html>
```

```html
{% extends "foo.html" %}

{% block "head" %}
<title>Head content</title>
{% endblock %}

{% block "body" %}
This is body content.
{% endblock %}

{% block "footer" %}
<footer>Footer content</footer>
{% endblock %}
```

**Layouts**

## Acknowledgements

I've learned a lot from [tj](https://github.com/tj)'s code over the past few years. Some of the code in Dry is inspired by [pug](http://jade-lang.com) and [css](https://github.com/reworkcss/css).

## About

### Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](../../issues/new).

Please read the [contributing guide](contributing.md) for avice on opening issues, pull requests, and coding standards.

### Running tests

Install dev dependencies:

```sh
$ npm install -d && npm test
```

### Author

**Jon Schlinkert**

* [github/jonschlinkert](https://github.com/jonschlinkert)
* [twitter/jonschlinkert](http://twitter.com/jonschlinkert)

### License

Copyright © 2016, [Jon Schlinkert](https://github.com/jonschlinkert).
Released under the [MIT license](https://github.com/jonschlinkert/dry/blob/master/LICENSE).

***

_This file was generated by [verb-generate-readme](https://github.com/verbose/verb-generate-readme), v0.1.28, on August 07, 2016._