import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VERSION = "0.0.3";

if (!VERSION) {
  console.error('Usage: node sync-version.js <version>');
  process.exit(1);
}

const packagePath = path.join(__dirname, '..', 'package.json');
const tauriConfPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
const cargoPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const tauriJson = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
const cargoToml = fs.readFileSync(cargoPath, 'utf8');

console.log(`Syncing version: ${VERSION}`);

packageJson.version = VERSION;
tauriJson.version = VERSION;

fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriJson, null, 2) + '\n');

const newCargoToml = cargoToml.replace(
  /^version = "[\d.]+"$/m,
  `version = "${VERSION}"`
);
fs.writeFileSync(cargoPath, newCargoToml);

console.log('Version synced to package.json, tauri.conf.json and Cargo.toml');