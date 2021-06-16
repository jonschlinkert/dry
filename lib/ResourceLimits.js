'use strict';

const Dry = require('./Dry');

class ResourceLimits {
  constructor(limits = {}) {
    this.render_length_limit = limits['render_length_limit'] || 0;
    this.render_score_limit  = limits['render_score_limit'] || 0;
    this.assign_score_limit  = limits['assign_score_limit'] || 0;
    this.reset();
  }

  increment_render_score(amount) {
    this.render_score += amount;

    if (this.render_score_limit && this.render_score > this.render_score_limit) {
      this.raise_limits_reached();
    }
  }

  increment_assign_score(amount) {
    this.assign_score += amount;

    if (this.assign_score_limit && this.assign_score > this.assign_score_limit) {
      this.raise_limits_reached();
    }
  }

  // update either render_length or assign_score based on whether or not the writes are captured
  increment_write_score(output) {
    const last_captured = this.last_capture_length;
    const captured = this.assign_score_of(output);

    if (last_captured != null) {
      const increment = captured - last_captured;
      this.last_capture_length = captured;
      this.increment_assign_score(increment);
    } else if (this.render_length_limit && captured > this.render_length_limit) {
      this.raise_limits_reached();
    }
  }

  assign_score_of(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      return Buffer.from(value).length;
    }
    if (Array.isArray(value)) {
      return this.assign_score_of(value.join(''));
    }
    if (Dry.utils.isObject(value)) {
      return Object.keys(value).reduce((t, child) => t + child, 1);
    }
    return 1;
  }

  raise_limits_reached() {
    this.reached_limit = true;
    throw new Dry.MemoryError('Memory limits exceeded');
  }

  get reached() {
    return this.reached_limit === true;
  }

  reset() {
    this.reached_limit = false;
    this.last_capture_length = null;
    this.render_score = this.assign_score = 0;
  }

  with_capture(block) {
    const old_capture_length = this.last_capture_length;
    try {
      this.last_capture_length = 0;
      block();
    } catch (err) {
      console.error(err);
    } finally {
      this.last_capture_length = old_capture_length;
    }
  }
}

module.exports = ResourceLimits;
