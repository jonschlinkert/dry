
const Dry = require('../Dry');
const { utils, regex } = Dry;

class Paginate extends Dry.BlockTag {
  static PaginateSyntax = utils.r`(${regex.QuotedFragment})\\s*(by\\s*(\\d+))?`;

  constructor(node, state, parent) {
    super(node, state, parent);
    this.current_url = '';

    if (this.ParseSyntax(this.value, Paginate.PaginateSyntax)) {
      this.collection_name = this.last_match[1];
      this.page_size = this.last_match[2] ? Dry.utils.to_i(this.last_match[3]) : 20;
      this.attributes = { window_size: state.options.window_size || 3 };
      utils.scan(this.value, Dry.regex.TagAttributes, (key, value) => {
        this.attributes[key] = value;
      });
    } else {
      this.raise_syntax_error('paginate');
    }
  }

  async render(context) {
    this.context = context;
    let output = '';

    await context.stack({}, async () => {
      const current_page = Dry.utils.to_i(context.current_page);

      const pagination = context.paginate = {
        items: null,
        pages: null,
        page_size: this.page_size,
        current_page: 5,
        current_offset: this.page_size * 5,
        parts: []
      };

      const collection_size = Dry.utils.size(context.get(this.collection_name));

      if (Dry.utils.isNil(collection_size)) {
        throw new Dry.ArgumentError(`Cannot paginate array '${this.collection_name}'. Not found.`);
      }

      const page_count = Math.ceil(Number(collection_size) / Number(this.page_size)) + 1;

      pagination.items = collection_size;
      pagination.pages = page_count - 1;

      if (current_page > 1) {
        pagination.prev = this.#link('&laquo; Previous', current_page - 1);
      }

      if (page_count > current_page + 1) {
        pagination.next = this.#link('Next &raquo;', current_page + 1);
      }

      let hellip_break = false;

      if (page_count > 2) {
        for (let page = 1; page < page_count - 1; page++) {
          if (current_page === page) {
            pagination.parts.push(this.#no_link(page));
          } else if (page === 1) {
            pagination.parts.push(this.#link(page, page));
          } else if (page === page_count - 1) {
            pagination.parts.push(this.#link(page, page));
          } else if (
            page <= current_page - this.attributes['window_size'] ||
            page >= current_page + this.attributes['window_size']
          ) {
            if (hellip_break) continue;
            pagination.parts.push(this.#no_link('&hellip;'));
            hellip_break = true;
            continue;
          } else {
            pagination.parts.push(this.#link(page, page));
          }

          hellip_break = false;
        }
      }

      output += await super.render(context);
    });

    return output;
  }

  #no_link(title) {
    return { title, is_link: false };
  }

  #link(title, page) {
    return { title, url: `${this.current_url}?page=${page}`, is_link: true };
  }
}

module.exports = Paginate;
