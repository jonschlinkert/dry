const Dry = require('../Dry');

// The embed tag combines features from includes and extends, allowing you
// to include a template, while also overriding any blocks defined within
// the included template.
//
//     {% embed "teasers_skeleton.liquid" %}
//       {# These blocks are defined in "teasers_skeleton.liquid" #}
//       {# and we override them right here: #}
//       {% block left_teaser %}
//         Some content for the left teaser box
//       {% endblock %}
//       {% block right_teaser %}
//         Some content for the right teaser box
//       {% endblock %}
//     {% endembed %}
//
class Embed extends Dry.BlockTag {
  async render(context, output = '') {
    const template = new Dry.tags.Render(this.nodes[0], this.state, this);

    await context.stack({ blocks: this.state.blocks }, async () => {
      output = await template.render(context);
    });

    return output;
  }
}

module.exports = Embed;
