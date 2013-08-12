// Input is JSON serializable values, output is a stream of newline delimited JSON values.
exports.encoder = encoder;
function encoder(emit) {
  return function (item) {
    emit(JSON.stringify(item) + "\n");
  };
}

// Input is an arbitrarly sized text chunk, output is JSON parsed values.
exports.decoder = decoder;
function decoder(emit) {
  var json = "";
  return function (chunk) {
    var start = 0;
    for (var i = 0, l = chunk.length; i < l; i++) {
      if (chunk[i] === "\n") {
        if (i > start) {
          json += chunk.substr(start, i - start);
        }
        if (json) {
          emit(JSON.parse(json));
          json = "";
        }
        start = i + 1;
      }
    }
    if (start < l) {
      json += chunk.substr(start);
    }
  };
}

