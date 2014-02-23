'use strict';

var os = require('os');
var path = require('path');
var which = require('which').sync;
var fs = require('fs');
var Duplex = require('stream').Duplex;
var cp = require('child_process');
var util = require('util');

var nixExecutable = 'fsharpi';
var windowsExecutable = 'fsi';
var windowsDefaultInstallLocation = [
  process.env['PROGRAMFILES(X86)'],
  'Microsoft SDKs',
  'F#',
  '3.0',
  'Framework',
  'v4.0',
  'fsi.exe'
].join(path.sep);

var locateExecutable = function () {
  var executable;
  switch (os.type()) {
    case 'Linux':
    case 'Darwin':
      executable = which(nixExecutable);
      break;
    case 'Windows_NT':
      //First try to find fsi on path
      try {
        executable = which(windowsExecutable);
      } catch (err) {
        //Try to check default install location
        if (fs.existsSync(windowsDefaultInstallLocation)) {
          executable = windowsDefaultInstallLocation;
        } else {
          throw err;
        }
      }
      break;
    default:
      throw new Error('OS not supported: ' + os.type());
  }
  return executable;
};

var spawnFsharpi = function (executable, args) {
  return cp.spawn(executable, args);
};

var Fsharp = function (param) {
  //Allow not using new
  if (!(this instanceof Fsharp)) {
    return new Fsharp(param);
  }
  if (!param || (typeof param !== 'string' && !param.path)) {
    throw new Error('Path to script (*.fsx file) is required');
  }

  var opts = (typeof param === 'string' ? {path: param} : util._extend({}, param));

  opts.executable = opts.executable || locateExecutable();

  opts.args = opts.args || [];

  Duplex.call(this, opts);

  var fsharpi = spawnFsharpi(opts.executable, [opts.path].concat(opts.args));

  var readable = this._readable = fsharpi.stdout;
  var writable = this._writable = fsharpi.stdin;

  var _this = this;

  var err = '';
  fsharpi.stderr.on('data', function (buf) {
    err += buf;
  });

  writable.once('finish', function () {
    _this.end();
  });

  this.once('finish', function () {
    writable.end();
  });

  readable.on('data', function (e) {
    if (!_this.push(e)) {
      readable.pause();
    }
  });

  readable.once('end', function () {
    return _this.push(null);
  });

  writable.on('error', function (err) {
    return _this.emit('error', err);
  });

  readable.on('error', function (err) {
    return _this.emit('error', err);
  });

  writable.on('drain', function () {
    return _this.emit('drain');
  });

  fsharpi.on('close', function (code) {
    if (code === 0) { return; }
    return _this.emit('error', new Error('non-zero exit code ' + code + '\n  running: ' + opts.executable + ' ' + [opts.path].concat(opts.args).join(' ') + '\n\n  ' + err));
  });
};

util.inherits(Fsharp, Duplex);

Fsharp.prototype._write = function (input, encoding, done) {
  this._writable.write(input, encoding, done);
};

Fsharp.prototype._read = function () {
  this._readable.resume();
};

module.exports = Fsharp;