/* eslint-disable no-unused-vars */
'use strict';

const Dry = require('..');
const { Template } = Dry;

const s1 = `
<div class="sb-widget d-none d-lg-block">
  <div class="sb-menu">
    {% unless section.settings.sb_categories_type == 'none' %}

      {% unless section.settings.sb_categories_title == blank %}
        <h5 class="sb-title">{{ section.settings.sb_categories_title }}</h5>
      {% endunless %}

      <ul class="categories-menu">
        {% if section.settings.sb_categories_type == 'categories' %}

          {% for collection in collections limit: section.settings.sb_categories_limit %}
            {% unless collection.handle == 'frontpage' or collection.handle == 'all' %}
              <li><a href="{{ collection.url }}">{{ collection.title }}</a></li>
            {% endunless %}
          {% endfor %}

        {% else %}
          {% for l in linklists[section.settings.sb_categories_menu].links %}
            {% assign submenu = l.title | handleize %}

            {% if linklists[submenu].links.size > 0 %}
              {% include 'sb-dropdown-menu' %}
            {% else %}
              <li{% if l.active %} class="active"{% endif %}><a href="{{ l.url }}">{{ l.title }}</a></li>
            {% endif %}

          {% endfor %}

        {% endif %}
      </ul>

    {% endunless %}
  </div>
</div>

{% if collection.all_tags.size > 0 and section.settings.sb_filters != 'none' %}
<div class="sb-widget filter-sidebar no-sidebar {{ section.settings.sb_filters_style }}">
  <h2 class="sb-title">Filter By:</h2>

  <div class="sb-filter-wrapper">
    {% comment %} -- filter by group -- {% endcomment %}
    {% if section.settings.sb_filters == 'groups' %}

      {% assign _prefix_group = section.settings.group_filter_prefix | split: ',' %}

      {% assign _count = 0 %}
      {% for prefix in _prefix_group %}
        {% assign my_prefix = prefix | downcase | strip | append: '_+++' %}
        {% assign _prefix_new_str = _prefix_new_str | append: my_prefix  %}
      {% endfor %}
      {% assign _prefix_group = _prefix_new_str | split: '+++' %}
      {% if template contains 'collection' and collection.all_tags.size > 0 %}
        {% assign c = 0 %}
        {% for t in collection.all_tags %}
          {% capture cat %}{{ cat }}{% capture temp_cat %}{% if t contains '_' %}{% assign cat_grp = t | split: '_' %}{{ cat_grp.first }}{% endif %}{% endcapture %}{% unless cat contains temp_cat %}{% if t contains '_' %}{% assign new_cat_grp = t | split: '_' %}{{ new_cat_grp.first }}{% endif %}{% unless forloop.last %}+{% endunless %}{% assign c = c | plus: 1 %}{% endunless %}{% endcapture %}
        {% endfor %}
        {% assign cat_array = cat | split: '+' %}
      {% endif %}

      <div class="sbw-filter">
        <div class="filter__widget">
          {% comment %}
          Loop through tag categories
          {% endcomment %}
          {% assign i = 0 %}
          {% for cat_item in cat_array %}
            {% assign i = i | plus: 1 %}
            {% assign cat_item_plus = cat_item | downcase | append: '_' %}
            {% comment %}
            Ignore if tag category is empty
            {% endcomment %}
            {% unless cat_item == '' %}
              {% if _prefix_group contains cat_item_plus %}

                <div class="sb-filter {{ cat_item | downcase }}" id="filter-{{ i }}">
                  <div class="sbf-title">
                    <span>{{ cat_item }}</span>
<!--                       <a href="javascript:void(0);" class="clear-filter hidden" id="clear-filter-{{ i }}" style="float: right;">Clear</a> -->
                  </div>
                  {% capture ci %}{{ cat_item | downcase }}{% endcapture %}
                  <ul class="advanced-filters{% if ci == 'color' %} list-inline afs-color{% endif %}">
                    {% comment %}
                    Loop through collection tags
                    {% endcomment %}
                    {% if ci == 'size' %}
                      <li class="advanced-filter rt size-all hidden" data-group="{{ cat_item }}"></li>
                    {% endif %}
                    {% for custom_tag in collection.all_tags %}
                      {% if custom_tag contains cat_item %}
                        {% comment %}
                        Strip out tag category prefix and add/remove link for tag filtering
                        {% endcomment %}
                        {% assign file_extension = 'png' %}
                        {% assign value = custom_tag | remove_first: cat_item | remove: '_' %}
                        {% if current_tags contains custom_tag %}
                          {% if ci == 'color' %}
                            <li class="active-filter advanced-filter af-color {{ custom_tag | handleize }}" data-group="{{ cat_item }}" data-handle="{{ custom_tag | handleize }}" style="background-color:{{ value | handle }}; background-image: url({{ value | handle | append: '.' | append: file_extension | asset_url }});">
                              {{ custom_tag | remove_first: cat_item | remove: '_' | link_to_remove_tag: custom_tag | replace: 'tag Color_', '' }}
                          </li>
                          {% else %}
                            <li class="checkcontainer active-filter advanced-filter rt{% if ci == 'size' %} size-{{ value | handleize }}{% endif %}" data-group="{{ cat_item }}" data-handle="{{ custom_tag | handleize }}">
                              {{ custom_tag | remove_first: cat_item | remove: '_' | link_to_remove_tag: custom_tag }}
                              <input type="checkbox" checked="checked">
                <span class="checkmark"></span>
                            </li>
                          {% endif %}
                        {% else %}
                          {% if ci == 'color' %}
                            <li class="advanced-filter af-color {{ custom_tag | handleize }}" data-group="{{ cat_item }}" style="background-color:{{ value | handle }}; background-image: url({{ value | handle | append: '.' | append: file_extension | asset_url }});">
                              {{ custom_tag | remove_first: cat_item | remove: '_' | link_to_add_tag: custom_tag | replace: 'Narrow selection to products matching tag Color_', '' }}
                            </li>
                          {% else %}
                            <li class="checkcontainer advanced-filter rt{% if ci == 'size' %} size-{{ value | handleize }}{% endif %}" data-group="{{ cat_item }}">
                              {{ custom_tag | remove_first: cat_item | remove: '_' | link_to_add_tag: custom_tag }}
                              <input type="checkbox" checked="checked">
                <span class="checkmark"></span>
                            </li>
                          {% endif %}
                        {% endif %}
                      {% endif %}
                    {% endfor %}
                  </ul>
                </div>
              {% endif %}
            {% endunless %}
          {% endfor %}
        </div>
      </div>
    {% comment %} -- filter by tag -- {% endcomment %}
    {% else %}
      <div class="sb-tag">
        <ul class="list-unstyled sb-filter-tag">
          {% unless current_tags %}
            <li class="active first"><span>All Items</span></li>
          {% else %}
            {% if collection.handle %}
              {% capture collection_url %}/collections/{{ collection.handle }}{% unless collection.sort_by == blank %}?sort_by={{ collection.sort_by }}{% endunless %}{% endcapture %}
            {% endif %}
            <li class="first">
              <a href="{{ collection_url }}"><span>All Items</span></a>
            </li>
          {% endunless %}
          {% for tag in collection.all_tags %}
            {% if current_tags contains tag %}
              <li class="active{% if forloop.length == forloop.index %} last{% endif %}">
                <span>{{ tag }}</span>
              </li>
            {% else %}
              <li {% if forloop.length == forloop.index %}class="last"{% endif %}>
                <a href="/collections/{% if collection.handle.size > 0 %}{{ collection.handle }}{% else %}all{% endif %}/{{ tag | handle }}">
                  <span>{{ tag }}</span>
                </a>
              </li>
            {% endif %}
          {% endfor %}
        </ul>
      </div>
    {% endif %}
  </div>
</div>
{% endif %}
`;

const s2 = `
<ul class="categories-menu">
    Before If
      {% if section.settings.sb_categories_type == 'categories' %}
        Main condition;
        {% for collection in collections limit: section.settings.sb_categories_limit %}
          {% unless collection.handle == 'frontpage' or collection.handle == 'all' %}
          {% endunless %}
        {% endfor %}
      {%
      else
      %}
        Else condition;

        {% for l in linklists[section.settings.sb_categories_menu].links %}
          {% if linklists[submenu].links.size > 0 %}
          {% else %}
            <li{% if l.active %} class="active"{% endif %}><a href="{{ l.url }}">{{ l.title }}</a></li>
          {% endif %}
        {% endfor %}

      {% endif %}
    After If
</ul>
`;

const template = Template.parse(s1);
const parser = template.root;
const ast = parser.ast;
console.log(ast.nodes[1].nodes);
// console.log(parser.stack.length);

const collection = { handle: 'products', url: '/products', title: 'Start shopping' };
console.log(template.render({ collections: [collection] }));

// console.log(s2.split(/(\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}?|\{%|\{\{)/));
// console.log('foo,bar,baz'.split(/(,)/));
