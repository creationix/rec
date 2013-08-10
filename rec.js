#!/usr/bin/env node

// Extract options, command, and args
var options, command, args;
(function () {
  // Strip out the options and the commands to be run.
  var first = 2;
  for (var i = 2, l = process.argv.length; i < l; i++) {
    if (process.argv[i][0] === '-') first = i + 1;
    else break;
  }
  args = process.argv.slice(first);
  command = args.shift();
  // Ultra simple option parser
  var table = {
    j: "json", m: "msgpack", g: "gzip", p: "play", q: "quiet", c: "clear", s: "stream"
  };
  options = {};
  process.argv.slice(2, first).forEach(function (option) {
    var match;
    if (match = option.match(/^--([a-z0-9][a-z0-9_-]+)(?:=(.*))?$/i)) {
      options[match[1]] = match[2] || true;
    }
    else if (match = option.match(/^-([a-z0-9]+)$/i)) {
      var letters = match[1];
      for (var i = 0, l = letters.length; i < l; i++) {
        var option = table[letters[i]];
        if (!option) throw new SyntaxError("Invalid short option '" + letters[i] + "'");
        options[option] = true;
      }
    }
    else {
      throw new SyntaxError("Malformed option: " + JSON.stringify(option));
    }
  });
}());

if (!(command || options.play)) {
  console.error("\n  Usage:  rec [options] command [args...]\n");
  console.error("  Common Options:\n");
  console.error("    -j --json        Output JSON format (default)");
  console.error("    -m --msgpack     Output MsgPack format");
  console.error("    -g --gzip        Gzip output");
  console.error("    -q --quiet       Suppress message at end");
  console.error("    -c --clear       Clear screen before starting");
  console.error("    -s --stream      Stream data to stdout or from stdin");
  console.error("\n  Recording Options:\n");
  console.error("    --name=filename  File to save to (default is 'out')");
  console.error("\n  Playback Options:\n");
  console.error("    -p --play        Play back a recording (required)");
  console.error();
  process.exit(-1);
}

if (options.play) {
  require('./play.js')(options, command);
}
else {
  require('./record.js')(options, command, args);
}

