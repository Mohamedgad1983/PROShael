const { spawnSync } = require('node:child_process');

const omit = String(process.env.npm_config_omit || '')
  .split(',')
  .map((value) => value.trim());

if (
  process.env.CI === 'true' ||
  process.env.HUSKY === '0' ||
  omit.includes('dev')
) {
  process.exit(0);
}

const result = spawnSync('husky', {
  stdio: 'inherit',
  shell: true
});

if (result.error || result.status === 127) {
  process.exit(0);
}

process.exit(result.status ?? 0);
