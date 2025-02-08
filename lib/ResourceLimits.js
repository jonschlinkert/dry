const Dry = require('./Dry');
const { isPlainObject } = require('./shared/utils');

class ResourceLimits {
  constructor(limits = {}) {
    this.render_length_limit = limits['render_length_limit'] || 0;
    this.render_score_limit = limits['render_score_limit'] || 0;
    this.assign_score_limit = limits['assign_score_limit'] || 0;
    this.reset();
  }

  increment_render_score(amount) {
    if (amount > Number.MAX_SAFE_INTEGER - this.render_score) {
      this.raise_limits_reached();
    }
    this.render_score += amount;

    if (this.render_score_limit && this.render_score > this.render_score_limit) {
      this.raise_limits_reached();
    }
  }

  increment_assign_score(amount) {
    if (amount > Number.MAX_SAFE_INTEGER - this.assign_score) {
      this.raise_limits_reached();
    }
    this.assign_score += amount;

    if (this.assign_score_limit && this.assign_score > this.assign_score_limit) {
      this.raise_limits_reached();
    }
  }

  // update either render_length or assign_score based on
  // whether or not the writes are captured
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

  assign_score_of(value, visited = new WeakSet()) {
    if (value === null || value === undefined) return 0;
    if (visited.has(value)) return 0;

    if (typeof value === 'string') {
      return Buffer.from(value).length;
    }

    if (Array.isArray(value)) {
      visited.add(value);
      let sum = 1;
      for (const item of value) {
        sum += this.assign_score_of(item, visited);
        if (sum > Number.MAX_SAFE_INTEGER) {
          this.raise_limits_reached();
        }
      }
      return sum;
    }

    if (isPlainObject(value)) {
      visited.add(value);
      let sum = 1;
      for (const [k, v] of Object.entries(value)) {
        sum += this.assign_score_of(k, visited);
        sum += this.assign_score_of(v, visited);
        if (sum > Number.MAX_SAFE_INTEGER) {
          this.raise_limits_reached();
        }
      }
      return sum;
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

  async with_capture(block) {
    const old_capture_length = this.last_capture_length;
    let restored = false;

    try {
      this.last_capture_length = 0;
      await block();
    } catch (err) {
      if (process.env.DEBUG) console.error(err);
      throw err;
    } finally {
      if (!restored) {
        this.last_capture_length = old_capture_length;
        restored = true;
      }
    }
  }
}

module.exports = ResourceLimits;
