
const { Newline } = require('./constants/regex');

class Position {
  constructor(loc) {
    this.index = loc.index;
    this.line = loc.line;
    this.col = loc.col;
  }
}

class Location {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  slice(input) {
    return input.slice(...this.range);
  }

  get range() {
    return [this.start.index, this.end.index];
  }

  get lines() {
    return [this.start.line, this.end.line];
  }

  static get Position() {
    return Position;
  }

  static get Location() {
    return Location;
  }

  static updateLocation(loc, value = '', length = value.length) {
    const lines = value.split(Newline);
    const last = lines[lines.length - 1];
    loc.index += length;
    loc.col = lines.length > 1 ? last.length : loc.col + length;
    loc.line += Math.max(0, lines.length - 1);
  }

  static location(loc) {
    const start = new Position(loc);

    return node => {
      node.loc = new Location(start, new Position(loc));
      return node;
    };
  }
}

module.exports = Location;
