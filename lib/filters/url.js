'use strict';

module.exports = {
  url_decode: x => x.split('+').map(decodeURIComponent).join(' '),
  url_encode: x => x.split(' ').map(encodeURIComponent).join('+')
};
