import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packagePath = path.join(__dirname, '..', 'package.json');
const tauriPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const tauriJson = JSON.parse(fs.readFileSync(tauriPath, 'utf8'));

if (packageJson.version !== tauriJson.version) {
  console.log(`Syncing version: ${packageJson.version}`);
  tauriJson.version = packageJson.version;
  fs.writeFileSync(tauriPath, JSON.stringify(tauriJson, null, 2) + '\n');
}
