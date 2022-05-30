/* eslint-disable no-unused-vars */
'use strict';

const Dry = require('..');
const { Template } = Dry;

// const locals = { 0: { 0: { 0: 'It worked!' } } };
const locals = { 0: [['foo', 'bar']] };

Template.render(`

  {% assign arr = ["a", "b"] %}
  "0.0.0" => {{ "0.0.0" }},
  0[0] => {{ 0[0] }},
  0["0"] => {{ 0["0"] }}
  0[0].1 => {{ 0[0].1 }}
  0.0.1 => {{ 0.0.1 }}
  0."0".1 => {{ 0."0".1 }}
  "0.0.0" => {{ "0.0.0" }}
  "arr[0]" => {{ arr[0] }}

`, locals)
  .then(console.log)
  .catch(console.error);
