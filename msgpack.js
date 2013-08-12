var encode = require('msgpack-js').encode;
var decode = require('msgpack-js').decode;

exports.encoder = encoder;
function encoder(emit) {
  return function (item) {
    var chunk = encode(item);
    var bytes = [];
    var length = chunk.length;
    while (length > 0x7f) {
      bytes.push(length & 0x7f | 0x80);
      length >>= 7;
    }
    bytes.push(length & 0x7f);
    emit(new Buffer(bytes));
    emit(chunk);
  };
}

exports.decoder = decoder;
function decoder(emit) {
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
          var item = decode(Buffer.concat(parts));
          parts = null;
          offset = 0;
          emit(item);
        }
      }
    }
  };
}

