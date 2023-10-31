function fold(hash, text, max = text.length) {
  if (text.length === 0) {
    return hash;
  }

  for (let i = 0, len = max; i < len; i++) {
    const chr = text.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }

  return hash < 0 ? hash * -2 : hash;
}

function foldValue(input, value, key) {
  return fold(fold(fold(input, key), String(value)), typeof value);
}

function hash(value, seed = '', length = 5) {
  return foldValue(0, value, seed).toString(16).padStart(length, '0');
}

module.exports = hash;
