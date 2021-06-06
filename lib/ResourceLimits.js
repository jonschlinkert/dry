'use strict';

const { MemoryError } = require('./errors');

class ResourceLimits {
  constructor(limits) {
    this.render_length_limit = limits['render_length_limit'];
    this.render_score_limit  = limits['render_score_limit'];
    this.assign_score_limit  = limits['assign_score_limit'];
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
    if (last_captured) {
      const captured = output.length;
      const increment = captured - last_captured;
      this.last_capture_length = captured;
      this.increment_assign_score(increment);
    } else if (this.render_length_limit && output.bytesize > this.render_length_limit) {
      this.raise_limits_reached();
    }
  }

  raise_limits_reached() {
    this.reached_limit = true;
    throw new MemoryError('Memory limits exceeded');
  }

  reached() {
    return this.reached_limit === true;
  }

  reset() {
    this.assign_score = 0;
    this.render_score = 0;
    this.reached_limit = false;
    this.last_capture_length = null;
  }

  with_capture(block) {
    const old_capture_length = this.last_capture_length;
    try {
      this.last_capture_length = 0;
      block();
    } catch (error) {
      this.last_capture_length = old_capture_length;
    }
  }
}

module.exports = ResourceLimits;
