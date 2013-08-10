var fs = require('fs');

module.exports = function (options, path) {

  var file;
  if (!path) {
    options.stream = true;
    file = process.stdin;
  }
  else {
    file = fs.createReadStream(path);
    if (path.substr(path.length - 3) === ".gz") {
      path = path.substr(0, path.length - 3);
      options.gzip = true;
    }
    if (path.substr(path.length - 5) === ".json" && options.json === undefined) {
      options.json = true;
    }
    if (path.substr(path.length - 8) === ".msgpack" && options.msgpack === undefined) {
      options.msgpack = true;
    }
  }
  if (options.msgpack) options.format = "msgpack";
  if (options.json) options.format = "json";
  if (!options.format) throw new Error("Please specify an input encoding");

  var input = file;
  if (options.gzip) {
    var input = require('zlib').createGunzip();
    file.pipe(input);
  }

  var parser;
  if (options.format === "json") {
    parser = require('./jsonMachine.js');
  }
  else {
    parser = require('./msgpackMachine.js');
  }

  if (options.clear) {
    process.stdout.write("\u001b[2J\u001b[H");
  }
  var target = Date.now();
  var queue = [];
  var delay = 0;
  var done = false;
  var waiting = null;
  var meta;
  input.on("data", parser(function (item) {
    if (delay === null) {
      delay = item;
      return;
    }
    queue.push([delay, item]);
    delay = null;
    check();
  }));
  input.on("end", function () {
    done = true;
    check();
  });

  function check() {
    var delta, next;
    while (!waiting && (next = queue.shift())) {
      target += next[0];
      delta = target - Date.now();
      if (delta <= 0) {
        run(next[1]);
      }
      else {
        waiting = next[1];
        setTimeout(resume, delta);
      }
    }
    if (done && !waiting && !next) {
      finish();
    }
  }

  function resume() {
    var item = waiting;
    waiting = null;
    run(item);
    check();
  }

  function run(items) {
    for (var i = 0, l = items.length; i < l; i += 2) {
      var type = items[i];
      var item = items[i + 1];
      if (type === 1) process.stdout.write(item);
      else if (type === 2) process.stderr.write(item);
      else if (type === 0) meta = item;
      else if (type === 3) meta.exit = item;
    }
  }

  function finish() {
    if (!options.quiet) {
      console.error("\nFinished", meta)
    }
  }
}
