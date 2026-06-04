import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const isWatchMode = args.includes('--watch') || args.includes('--watchAll');
const timeoutMs = Number(process.env.JEST_TIMEOUT_MS || (process.env.CI ? 180000 : 120000));
const useNativeEsm = process.env.JEST_NATIVE_ESM !== 'false';
const jestBin = fileURLToPath(new URL('../node_modules/jest/bin/jest.js', import.meta.url));
const nodeArgs = useNativeEsm ? ['--experimental-vm-modules'] : [];

const child = spawn(
  process.execPath,
  [...nodeArgs, jestBin, ...args],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'test'
    }
  }
);

let forceKillTimer;
let timedOut = false;
const timeoutTimer = isWatchMode ? null : setTimeout(() => {
  timedOut = true;
  console.error(`\nJest did not finish within ${Math.round(timeoutMs / 1000)} seconds. Failing instead of hanging indefinitely.`);
  child.kill('SIGTERM');

  forceKillTimer = setTimeout(() => {
    child.kill('SIGKILL');
  }, 5000);
  forceKillTimer.unref();
}, timeoutMs);

child.on('exit', (code, signal) => {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
  }
  if (forceKillTimer) {
    clearTimeout(forceKillTimer);
  }

  if (timedOut) {
    process.exit(124);
  }

  if (signal) {
    process.exit(signal === 'SIGTERM' ? 124 : 1);
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  if (timeoutTimer) {
    clearTimeout(timeoutTimer);
  }
  console.error('Failed to start Jest:', error);
  process.exit(1);
});
