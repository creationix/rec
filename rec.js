#!/usr/bin/env node
var childProcess = require('child_process');
var msgpack = require('msgpack-js');
var inspect = require('util').inspect;

// Extract options, command, and args
var options, command, args;
(function () {
  // Strip out the options and the commands to be run.
  var first = 2;
  for (var i = 2, l = process.argv.length; i < l; i++) {
    if (process.argv[i][0] === '-') first = i + 1;
    else break;
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

if (!command || options.h || options.help) {
  console.error("Record a command's output to a file.");
  console.error("Usage:\n\trec [options] command [args...]\n");
  process.exit(-1);
}

// Erase screen and move home
process.stdout.write("\u001b[2J\u001b[H");

var child = childProcess.spawn(command, args, {
  stdio: [0, 'pipe', 'pipe']
});
child.stdout.on("data", function (chunk) {
  record(1, chunk);
  // process.stdout.write(chunk);
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
  console.log(inspect(events, {colors:true}));
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
  console.log("RECORD", event, value);
  var time = Date.now();
  if (time !== last) {
    var delta = time - last;
    last = time;
    current = [];
    events.push(delta, current);
  }
  current.push(event, value);
}
