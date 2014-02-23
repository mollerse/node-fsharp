# node-fsharp [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][depstat-image]][depstat-url]

> A module for calling out to the fsharp interactive shell capturing stdin and stdout as a duplex stream

## Usage
This module creates a [Duplex](http://nodejs.org/api/stream.html#stream_class_stream_duplex) stream from the F# Interactive command. Writing to stdin and reading from stdout. Also emitting stderr if the command exits non-0.

This module requires F# to be installed on the system to be useful. Installation guides for F# can be found at [fsharp.org](http://fsharp.org/).

Example:
```
var fsharp = require('fsharp');

var script = fsharp('./script.fsx');
script.pipe(process.stdout);
```

## API

### fsharp(options)

#### options.path
Type: `String`

Required

Path to the script you want to execute.

#### options.executable
Type: `String`

Default: A function that looks for `fsharpi` in your path on Linux or `fsi` on Windows. Will fall back to looking in default install directory on Windows. OSX not supported at the moment.

The path to the F# Interactive executable.

#### options.args
Type: Array[String]

Default: undefined

Array of arguments you want to supply to your script

#### options.*

fsharp inherits from [Stream.Duplex](http://nodejs.org/api/stream.html#stream_class_stream_duplex_1), the options are passed to the parent constructor so you can use it's options too.

### fsharp(String)
Sugar for fsharp({path: String});

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)

[npm-url]: https://npmjs.org/package/fsharp
[npm-image]: https://badge.fury.io/js/fsharp.png

[travis-url]: http://travis-ci.org/mollerse/node-fsharp
[travis-image]: https://secure.travis-ci.org/mollerse/node-fsharp.png?branch=master

[depstat-url]: https://david-dm.org/mollerse/node-fsharp
[depstat-image]: https://david-dm.org/mollerse/node-fsharp.png
