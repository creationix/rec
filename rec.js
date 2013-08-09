var childProcess = require('child_process');
var msgpack = require('msgpack-js');

// Extract options, command, and args
var options, command, args;
(function () {
  // Strip out the options and the commands to be run.
  var first = 2;
  for (var i = 2, l = process.argv.length; i < l; i++) {
    if (process.argv[i][0] === '-') first = i + 1;
  }
  // Ultra simple option parser
  options = {};
  var pattern = /^(?:--([a-zA-Z0-9_][a-zA-Z0-9_-]+)(?:=(.*))?|-([a-zA-Z_]))$/
  process.argv.slice(2, first).forEach(function (option) {
    var match = option.match(/^--([a-z][a-z-0-9_-]+)(?:=(.*))?$/i) ||
                option.match(/^-([a-z])$/i);
    options[match[1]] = match[2] || true;
  });
  args = process.argv.slice(first);
  command = args.shift();
}());


console.log(options, command, args);
