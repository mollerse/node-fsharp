'use strict';

require('mocha');
var expect = require('chai').expect;
var sinon = require('sinon');
var stream = require('stream');
var childProcess = require('child_process');
var requireSubvert = require('require-subvert')(__dirname);
var os = require('os');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');

var linuxExecutable = 'fsharpi';
var windowsExecutable = 'fsi';
var windowsDefaultInstallLocation = [
  process.env['PROGRAMFILES(X86)'],
  'Microsoft SDKs',
  'F#',
  '3.0',
  'Framework',
  'v4.0',
  'fsi.exe'
].join(require('path').sep);

describe('Fsharp', function () {
  var stdin, stdout, stderr, ps, cpMock, osMock, Fsharp, whichStub;
  beforeEach(function () {
    cpMock = sinon.mock(childProcess);
    osMock = sinon.mock(os);

    whichStub = sinon.stub();
    requireSubvert.subvert('which', {sync: whichStub});
    Fsharp = requireSubvert.require('../');
    stdin = new stream.PassThrough();

    stdout = new stream.PassThrough();
    stderr = new stream.PassThrough();
    ps = new EventEmitter();
    ps.stdin = stdin;
    ps.stderr = stderr;
    ps.stdout = stdout;
  });

  afterEach(function () {
    osMock.restore();
    cpMock.restore();
  });

  describe('locate executable', function () {
    describe('Linux', function () {
      beforeEach(function () {
        osMock.expects('type').once().returns('Linux');
      });

      it('should set executable to fsharpi if it exists on path', function () {
        whichStub.withArgs(linuxExecutable).returns('/usr/bin/fsharpi');
        cpMock.expects('spawn').once().withArgs('/usr/bin/fsharpi').returns(ps);

        new Fsharp('asdf');
        expect(whichStub.calledOnce).ok;
        osMock.verify();
        cpMock.verify();
      });

      it('should throw error if unable to find executable', function () {
        whichStub.withArgs(linuxExecutable).throws();
        cpMock.expects('spawn').never();

        try {
          new Fsharp('asdf');
          expect(whichStub.calledOnce).ok;
          expect(whichStub.threw()).ok;
          osMock.verify();
          cpMock.verify();
        } catch (err) {}
      });
    });

    describe('Windows', function () {
      beforeEach(function () {
        osMock.expects('type').once().returns('Windows_NT');
      });

      it('should set executable to fsi if it exists on path', function () {
        whichStub.withArgs(windowsExecutable).returns('fsi');
        cpMock.expects('spawn').once().withArgs('fsi').returns(ps);
        new Fsharp('asdf');
        expect(whichStub.calledOnce).ok;
        osMock.verify();
        cpMock.verify();
      });

      it('should set executable to default windows install path if it exists and fsi is not on path', function () {
        var fsMock = sinon.mock(fs);
        whichStub.withArgs('fsi').throws();
        fsMock.expects('existsSync').once().withArgs(windowsDefaultInstallLocation).returns(true);
        cpMock.expects('spawn').once().withArgs(windowsDefaultInstallLocation).returns(ps);
        new Fsharp('asdf');
        expect(whichStub.calledOnce);
        osMock.verify();
        cpMock.verify();
        fsMock.verify();

        fsMock.restore();
      });

      it('should throw error if unable to find executable', function () {
        var fsMock = sinon.mock(fs);
        whichStub.withArgs('fsi').throws();
        fsMock.expects('existsSync').once().withArgs(windowsDefaultInstallLocation).returns(false);
        cpMock.expects('spawn').never();
        try {
          new Fsharp('asdf');
          expect(whichStub.calledOnce).ok;
          osMock.verify();
          cpMock.verify();
          fsMock.verify();
        } catch (err) {}

        fsMock.restore();
      });
    });
    describe('other OS', function () {
      beforeEach(function () {
        osMock.expects('type').twice().returns('Darwin');
      });

      it('should throw error if unsupported OS', function () {
        cpMock.expects('spawn').never();
        try {
          new Fsharp('asdf');
          expect(whichStub.callCount).equals(0);
          osMock.verify();
          cpMock.verify();
        } catch (err) {
          expect(err.toString()).to.equal(new Error('OS not supported: Darwin').toString());
        }
      });
    });
  });

  describe('spawn fsharpi', function () {
    beforeEach(function () {
      osMock.expects('type').returns('Linux');
      whichStub.withArgs(linuxExecutable).returns('fsharpi');
    });

    afterEach(function () {
      cpMock.verify();
    });

    it('should use opts.executable if defined', function () {
      cpMock.expects('spawn').withArgs('exe').returns(ps);
      new Fsharp({path: 'asdf', executable: 'exe'});
    });

    it('should set opts.path when called with string', function () {
      cpMock.expects('spawn').withArgs('fsharpi', ['asdf']).returns(ps);
      new Fsharp('asdf');
    });

    it('should set arguments if defined', function () {
      cpMock.expects('spawn').withArgs('fsharpi', ['asdf', '1', '2']).returns(ps);
      new Fsharp({path: 'asdf', args: ['1', '2']});
    });
  });

  describe('constructor', function () {

    it('should error if missing path argument as string', function () {
      try {
        new Fsharp();
      } catch (err) {
        expect(err.toString()).to.equal(new Error('Path to script (*.fsx file) is required').toString());
      }
    });

    it('should error if missing path in options', function () {
      try {
        new Fsharp({executable: 'exe'});
      } catch (err) {
        expect(err.toString()).to.equal(new Error('Path to script (*.fsx file) is required').toString());
      }
    });

    it('should work without new keyword', function () {
      cpMock.expects('spawn').twice().withArgs('exe', ['asdf']).returns(ps);

      expect(Fsharp({path: 'asdf', executable: 'exe'})).to.be.an.instanceof(Fsharp);
      expect(Fsharp({path: 'asdf', executable: 'exe'})).to.be.an.instanceof(stream.Duplex);
    });

  });

  describe('stdio', function () {
    var fsharp;
    beforeEach(function () {
      cpMock.expects('spawn').once().withArgs('exe', ['asdf']).returns(ps);
      fsharp = new Fsharp({path: 'asdf', executable: 'exe'});
    });
    describe('stdin', function () {
      it('should reemit error events', function (done) {
        fsharp.on('error', function (e) {
          expect(e).ok;
          done();
        });
        stdin.emit('error', 'err');
      });

      it('should end fsharp on end', function (done) {
        fsharp.on('finish', function () {
          done();
        });
        stdin.emit('finish');
      });

      it('should end stdin on end', function (done) {
        stdin.on('finish', function () {
          done();
        });
        fsharp.emit('finish');
      });

      it('should re-emit drain event', function (done) {
        fsharp.on('drain', function () {
          done();
        });
        stdin.emit('drain');
      });

      it('should direct writes to stdin', function (done) {
        fsharp.write('asdf');
        stdin.on('data', function (chunk) {
          expect(chunk.toString()).to.equal('asdf');
          done();
        });
      });
    });

    describe('stderr', function () {
      it('should collect error-message and output on end if code is non-0', function (done) {
        stderr.write('asdf');
        fsharp.on('error', function (err) {
          expect(err.toString()).to.equal(new Error('non-zero exit code ' + 1 + '\n  running: ' + 'exe' + ' ' + 'asdf' + '\n\n  ' + 'asdf').toString());
          done();
        });
        ps.emit('close', 1);
      });
    });

    describe('stdout', function () {
      it('should redirect data from stdin', function (done) {
        fsharp.on('data', function (chunk) {
          expect(chunk.toString()).to.equal('asdf');
          done();
        });
        stdout.write('asdf');
      });

      it('should re-emit error events', function (done) {
        fsharp.on('error', function () {
          done();
        });
        stdout.emit('error');
      });
    });

  });

});