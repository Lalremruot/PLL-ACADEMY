import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const rawArgs = process.argv.slice(2);
const cleanArgs = [];

let port = '3000';
let hostname = '0.0.0.0';

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];
  if (arg === '--' || !arg) continue;

  if (arg === '--host' || arg === '-H' || arg === '--hostname') {
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
      hostname = rawArgs[i + 1];
      i++;
    }
  } else if (arg.startsWith('--host=') || arg.startsWith('-H=') || arg.startsWith('--hostname=')) {
    hostname = arg.split('=')[1] || '0.0.0.0';
  } else if (arg === '--port' || arg === '-p') {
    if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
      port = rawArgs[i + 1];
      i++;
    }
  } else if (arg.startsWith('--port=') || arg.startsWith('-p=')) {
    port = arg.split('=')[1] || '3000';
  }
}

cleanArgs.push('-p', port);
cleanArgs.push('-H', hostname);

const require = createRequire(import.meta.url);
let nextBin;
try {
  nextBin = require.resolve('next/dist/bin/next');
} catch (e) {
  try {
    const nextPkg = require.resolve('next/package.json');
    nextBin = path.join(path.dirname(nextPkg), 'dist/bin/next');
  } catch (e2) {
    nextBin = './node_modules/next/dist/bin/next';
  }
}

const env = { ...process.env, PORT: port, HOSTNAME: hostname };

const child = spawn(process.execPath, [nextBin, 'start', ...cleanArgs], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
