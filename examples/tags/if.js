
const Dry = require('../..');

// {% if line_item.grams > 20000 or line_item.weight > 1000 and customer_address.city == 'Ottawa' %}
//   You're buying a heavy item, and live in the same city as our store. Choose local pick-up as a shipping option to avoid paying high shipping costs.
// {% else %}
//   ...
// {% endif %}
const source = `
{% if linkpost -%}
  {%- capture title %}→ {{ post.title}}{% endcapture -%}
{% else %}
  {%- capture title %}★ {{ post.title }}{% endcapture -%}
{% endif -%}
{{ title }}
{% if linkpost %}→{% else %}★{% endif %} [{{ post.title }}](#{{ post.id }})
`;

const template = Dry.Template.parse(source);
const locals = { line_item: { grams: 19000, weight: 1001 }, customer_address: { city: 'Ottawa' } };

template.render_strict({ linkpost: false, post: { title: 'My Blog', id: 'abc' } })
  .then(console.log)
  .catch(console.error);

