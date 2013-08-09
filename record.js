var childProcess = require('child_process');

module.exports = function (options, command, args) {

  var encode, path;
  (function () {
    var serialize, name;
    path = options.name || "rec";
    if (options.json || options.j) {
      serialize = function (item) {
        function stringifyContents(item) {
          if (Array.isArray(item)) return item.map(stringifyContents);
          if (Buffer.isBuffer(item)) return item.toString();
          return item;
        }
        return JSON.stringify(stringifyContents(item)) + "\n";
      };
      path += ".json";
    }
    else {
      serialize = require('msgpack-js').encode;
      path += ".msgpack"
    }
    if (options.gzip || options.g) {
      var gzip = require('zlib').gzip;
      encode = function (item, callback) {
        gzip(serialize(item), callback);
      };
      path += ".gz";
    }
    else {
      encode = function (item, callback) {
        callback(null, serialize(item));
      };
    }
  }());

  // Erase screen and move home
  process.stdout.write("\u001b[2J\u001b[H");

  var child = childProcess.spawn(command, args, {
    stdio: [0, 'pipe', 'pipe']
  });
  child.stdout.on("data", function (chunk) {
    record(1, chunk);
    process.stdout.write(chunk);
  });
  child.stderr.on("data", function (chunk) {
    record(2, chunk);
    process.stderr.write(chunk);
  });

  // Forward basic signals to child.
  process.on('SIGINT', function () { child.kill('SIGINT'); });
  process.on('SIGTERM', function () { child.kill('SIGTERM'); });

  child.on('exit', function (code, signal) {
    record(3, { code: code, signal: signal });
  });

  child.on('close', function () {
    console.log();
    encode(events, function (err, buffer) {
      if (err) throw err;
      require('fs').writeFileSync(path, buffer);
      if (!(options.q || options.quiet)) {
        console.log("Recording written to " + path);
      }
    });
  });

  var last = Date.now();
  var current = [];
  var events = [current];
  record(0, {
    start: last,
    command: command,
    args: args,
    platform: process.platform,
    arch: process.arch
  });

  function record(event, value) {
    var time = Date.now();
    if (time !== last) {
      var delta = time - last;
      last = time;
      current = [];
      events.push(delta, current);
    }
    current.push(event, value);
  }

};
