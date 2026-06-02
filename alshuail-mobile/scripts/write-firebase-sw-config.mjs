import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectDir = path.resolve(__dirname, '..');
const publicDir = path.resolve(__dirname, '../public');
const outputPath = path.join(publicDir, 'firebase-sw-config.js');
const mode = process.env.MODE || (process.env.npm_lifecycle_event === 'dev' ? 'development' : 'production');

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) {
        return env;
      }

      const [, key, rawValue] = match;
      env[key] = rawValue.replace(/^['"]|['"]$/g, '');
      return env;
    }, {});
};

const fileEnv = [
  '.env',
  '.env.local',
  `.env.${mode}`,
  `.env.${mode}.local`
].reduce((env, fileName) => {
  return {
    ...env,
    ...parseEnvFile(path.join(projectDir, fileName))
  };
}, {});

const getEnv = (key) => process.env[key] ?? fileEnv[key] ?? '';

const config = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

const content = `self.FIREBASE_WEB_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(outputPath, content);
