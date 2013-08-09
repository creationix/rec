var fs = require('fs');

module.exports = function (options, path) {

  // Read the file and decode using extension.
  fs.readFile(path, function (err, data) {
    if (err) throw err;
    var unwrap, deserialize;
    if (path.substr(path.length - 3) === ".gz") {
      path = path.substr(0, path.length - 3);
      unwrap = require('zlib').gunzip;
    }
    else {
      unwrap = function (item, callback) {
        callback(null, item);
      }
    }
    if (path.substr(path.length - 5) === ".json") {
      deserialize = JSON.parse;
    }
    else if (path.substr(path.length - 8) === ".msgpack") {
      deserialize = require('msgpack-js').decode;
    }
    unwrap(data, function (err, data) {
      if (err) throw err;
      data = deserialize(data);
      play(data);
    });
  });

  function play(data) {
    var start = Date.now();
    var target = start;
    var offset = 0;
    var meta;

    // Erase screen and move home
    process.stdout.write("\u001b[2J\u001b[H");
    run();

    function queue() {
      var delta;
      do {
        if (offset >= data.length) return finish(meta);
        target += data[offset++];
        delta = target - Date.now();
        if (delta <= 0) {
          run(true);
        }
      } while (delta <= 0);
      setTimeout(run, delta);
    }

    function run(sync) {
      var items = data[offset++];
      for (var i = 0, l = items.length; i < l; i += 2) {
        var type = items[i];
        var item = items[i + 1];
        if (type === 1) process.stdout.write(item);
        else if (type === 2) process.stdout.write(item);
        if (type === 0) meta = item;
        else if (type === 3) meta.exit = item;
      }
      if (!sync) queue();
    }
  }

  function finish(meta) {
    if (!(options.q || options.quiet)) {
      console.log("Finished", meta)
    }
  }
}
