var msgpack = require('msgpack-js');

module.exports = parser;

function parser(emit) {
  var left = 0;
  var offset = 0;
  var parts = null;
  return function (chunk) {
    for (var i = 0, l = chunk.length; i < l; i++) {
      if (parts === null) {
        var byte = chunk[i];
        left |= (byte & 0x7f) << offset;
        offset += 7;
        if (!(byte & 0x80)) parts = [];
      }
      else {
        var len = Math.min(l - i, left);
        parts.push(chunk.slice(i, i + len));
        left -= len;
        i += len - 1;
        if (!left) {
          var item = msgpack.decode(Buffer.concat(parts));
          parts = null;
          offset = 0;
          emit(item);
        }
      }
    }
  };
}
