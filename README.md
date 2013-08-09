rec
===

A tool for recording CLI programs and posting their output.

To install, first install [node.js][] and then `npm install -g rec`.

## Instructions

```
> rec

  Usage:  rec [options] command [args...]

  Options:

    -m --msgpack     Output MsgPack format (default)
    -j --json        Output JSON format
    -g --gzip        Gzip output
    -p --play        Play back a recording
    -q --quiet       Suppress message at end
    --name=filename  File to save to (default is 'out')

```

## Record a Terminalcast

```
> rec my program
```

## Play Back a Terminalcast

```
> rec --play rec.msgpack
```

[node.js]: http://nodejs.org/
