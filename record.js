var childProcess = require('child_process');
var fs = require('fs');

function uleb128(num) {

  var bytes = [];
  while (num > 0x7f) {
    bytes.push((num & 0x7f) | 0x80);
    num >>= 7;
  }
  bytes.push(num);
  return new Buffer(bytes);
}

module.exports = function (options, command, args) {

  var path = options.name || "rec";
  if (options.msgpack || options.m) path += ".msgpack";
  else path += ".json";
  if (options.gzip || options.g) path += ".gz";
  var file = fs.createWriteStream(path);
  var output = file;

  var write;
  if (options.msgpack || options.m) {
    // uleb128 length header framed msgpack
    var msgpack = require('msgpack-js');
    write = function (item) {
      var serialized = msgpack.encode(item);

      output.write(uleb128(serialized.length));
      return output.write(serialized);
    };
  }
  else {
    // Newline framed JSON
    write = function (item) {
      return output.write(JSON.stringify(item) + "\n");
    };
  }
  if (options.gzip || options.g) {
    var output = require('zlib').createGzip();
    output.pipe(file);
  }
  // Erase screen and move home
  if (options.c || options.clear) {
    process.stdout.write("\u001b[2J\u001b[H");
  }

  var child = childProcess.spawn(command, args, {
    stdio: [0, 'pipe', 'pipe']
  });
  if (!(options.msgpack || options.m)) {
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
  }
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

  var left = 2;
  child.on('exit', function (code, signal) {
    record(3, { code: code, signal: signal });

  });

  child.on('close', function () {
    write(current);
    output.end();
    if (!(options.q || options.quiet)) {
      console.log();
      console.log("Recording written to " + path);
    }
  });

  var last = Date.now();
  var current = [];
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
      write(current);
      var delta = time - last;
      write(delta);
      last = time;
      current = [];
    }
    current.push(event, value);
  }

};
