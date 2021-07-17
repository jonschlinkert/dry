'use strict';

const Dry = require('../..');

const source = `{% case shipping_method.title %}
  {% when 'International Shipping' %}
    You're shipping internationally. Your order should arrive in 2–3 weeks.
  {% when 'Domestic Shipping' %}
    Your order should arrive in 3–4 days.
  {% when 'Local Pick-Up' %}
    Your order will be ready for pick-up tomorrow.
  {% else %}
    Thank you for your order!
{% endcase %}`;

const template = Dry.Template.parse(source);
console.log(template.render({ shipping_method: { title: 'Domestic Shipping' } }));
console.log(template.render({ shipping_method: { title: 'Local Pick-Up' } }));
