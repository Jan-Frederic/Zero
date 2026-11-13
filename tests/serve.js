// Starts server.js on a free port (PORT=0, chosen by the OS) and resolves once it is listening.
// Uses 127.0.0.1 so 'localhost' resolving to IPv6 first cannot get in the way; server errors are reported.
const { spawn } = require('node:child_process');
const path = require('node:path');

module.exports = function serve(env = {}) {
  return new Promise((resolve, reject) => {
    const server = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: '0', ...env } });
    let out = '', err = '', done = false;
    const fail = e => { if (done) return; done = true; clearTimeout(timer); server.kill(); reject(new Error(`${e.message}\n${(err || out).trim()}`)); };
    const timer = setTimeout(() => fail(new Error('test server did not start within 20 s')), 20000);
    server.stdout.on('data', d => {
      out += d; const m = out.match(/http:\/\/localhost:(\d+)/);
      if (m && !done) { done = true; clearTimeout(timer); resolve({ url: `http://127.0.0.1:${m[1]}/`, stop: () => server.kill() }); }
    });
    server.stderr.on('data', d => { err += d; });
    server.on('exit', code => fail(new Error(`test server exited with code ${code}`)));
  });
};
