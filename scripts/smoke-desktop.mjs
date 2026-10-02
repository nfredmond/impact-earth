import { spawn } from 'node:child_process';
import path from 'node:path';

const executable = process.argv[2] ?? {
  linux: '/opt/Impact Earth/impact-earth',
  darwin: 'release/mac-universal/Impact Earth.app/Contents/MacOS/Impact Earth',
  win32: 'release/win-unpacked/Impact Earth.exe',
}[process.platform];
if (!executable) throw new Error('Unsupported desktop platform');
const env = { ...process.env, SMOKE_OUT: path.resolve('release/desktop-smoke.png') };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(path.resolve(executable), ['--smoke'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
let passed = false;
let output = '';
child.stdout.on('data', data => {
  process.stdout.write(data);
  output += data.toString();
  passed = output.includes('[smoke] ok:');
});
child.stderr.on('data', data => process.stderr.write(data));
const timeout = setTimeout(() => { console.error('Desktop process did not finish'); child.kill(); process.exitCode = 1; }, 60000);
child.on('error', error => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
child.on('close', code => {
  clearTimeout(timeout);
  if (code !== 0 || !passed) {
    console.error(`Desktop smoke failed: exit=${code}, completed=${passed}`);
    process.exitCode = 1;
  }
});
