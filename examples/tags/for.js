'use strict';

const Dry = require('../..');
const pkg = require('../../package');

const fixtures = {
//   key_value: `
// {% for key, user in users -%}
//   <li>{{ key }}: {{ user.username|e }}</li>
// {%- endfor %}
//   `,

  //   key_value2: `
  // {% for key in pkg %}
  //   <li>{{ key }}</li>
  // {% endfor %}
  //   `,

  //   key_value3: `
  // {% for key, value in pkg -%}
  //   <li>{{ key }}: {{ value }}</li>
  // {% endfor %}
  //   `,

  //   key_value4: `
  // {%- for link in page.links %}
  //   <li>{{ link[0] }}: {{ link[1].version | default: link[1] }}</li>
  // {%- endfor %}
  //   `,

  //   key_value5: `
  // {% for item in pkg -%}
  //   <li>{{ item[0] }}: {{ item[1] | json }}</li>
  // {% endfor %}
  //   `

  //   for_loop_vars: `
  // {% for a in (1..20) -%}
  //   {{forloop.index0}}
  // {%- endfor %}
  //   `,

  //   for_loop_vars_at: `
  // {% for letter in (1..20) %}
  //   {{ @rindex }}
  // {%- endfor %}
  //   `,

  //   range: `
  // {% for a in (1..10) -%}
  //   {{ forloop.index0 }}
  // {%- endfor -%}

  // `,

  // range_filters: `
  // {%- for letter in ('a'|upcase..'z'|upcase) %}
  //   * {{ letter }} - {{ @index }}
  // {%- endfor -%}
  // `,

  kv: `
  {%- for k, v in pkg -%}
    {%- assign val = v | typeof -%}
    {%- if val != 'object' %}
  - {{k}} = {{v}}
    {%- endif %}
  {%- endfor -%}
  `

  // first: `
  // {% for product in products %}
  //   {% if forloop.first == true %}
  //     First time through!
  //   {% else %}
  //     Not the first time.
  //   {% endif %}
  // {% endfor %}
  // `
};

const locals = {
  pkg,
  users: [
    { username: 'doowb' },
    { username: 'jonschlinkert' }
  ],

  products: [1, 2, 3],

  page: {
    links: {
      demo: 'http://www.github.com/copperegg/mongo-scaling-demo',
      more: 'http://www.github.com/copperegg/mongo-scaling-more',
      deps: {
        version: 'v1.0.1'
      }
    }
  }
};

(async () => {
  for (const [key, source] of Object.entries(fixtures)) {
    process.stdout.write(`  --- ${key}`);
    const output = await Dry.Template.render(source, locals) || '';
    process.stdout.write(output);
    process.stdout.write('\n  ---\n');
    console.log();
  }
})();

