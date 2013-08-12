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
  if (options.msgpack) options.format = "msgpack";
  else options.format = "json";

  var path = options.name || command + "-" + Date.now().toString(36);
  if (options.format === "json") path += ".json";
  else path += ".msgpack";
  if (options.gzip) path += ".gz";

  var file;
  if (options.stream) {
    file = process.stdout;
  }
  else {
    file = fs.createWriteStream(path);
  }
  var output = file;

  var encoder;
  if (options.format === "msgpack") {
    encoder = require('./msgpack.js').encoder;
  }
  else {
    encoder = require('./json.js').encoder;
  }
  if (options.gzip) {
    var output = require('zlib').createGzip();
    output.pipe(file);
  }
  // Erase screen and move home
  if (options.clear) {
    process.stdout.write("\u001b[2J\u001b[H");
  }

  var write = encoder(function (chunk) {
    output.write(chunk);
  });

  var child = childProcess.spawn(command, args, {
    stdio: [0, 'pipe', 'pipe']
  });
  if (options.format === "json") {
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
  }
  child.stdout.on("data", function (chunk) {
    record(1, chunk);
    if (!options.stream) {
      process.stdout.write(chunk);
    }
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
    if (!options.stream) {
      output.end();
      if (!(options.quiet)) {
        console.error();
        console.error("Recording written to " + path);
      }
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
