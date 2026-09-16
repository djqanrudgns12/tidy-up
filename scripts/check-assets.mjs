import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../src/data/catalog.ts';
import { maps } from '../src/data/maps.ts';
import { assetViews } from '../src/data/asset-views.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  ...catalog.map(a => a.path),
  ...assetViews.map(a => a.path),
  ...maps.flatMap(map => [`assets/maps/${map.id}/background.webp`, `assets/maps/${map.id}/thumbnail.webp`]),
  ...['rabbit', 'bear', 'cat', 'bird'].map(id => `assets/characters/${id}.webp`),
  ...['duster', 'broom', 'cloth'].map(id => `assets/tools/${id}.webp`),
  ...['dust', 'stain'].map(id => `assets/effects/${id}.webp`),
];
const missing = [], invalid = [], files = [];
for (const relative of required) {
  const file = path.join(root, 'public', relative);
  if (!fs.existsSync(file)) { missing.push(relative); continue; }
  const content = fs.readFileSync(file);
  if (content.toString('ascii', 0, 4) !== 'RIFF' || content.toString('ascii', 8, 12) !== 'WEBP') invalid.push(relative);
  files.push({ path: relative, bytes: content.length });
}
const used = new Set(maps.flatMap(map => [...map.base, ...map.extras].map(i => i.asset)));
const unused = catalog.filter(a => !used.has(a.id)).map(a => a.id);
const total = files.reduce((sum, file) => sum + file.bytes, 0);
const result = { expected: 127, required: required.length, present: files.length, bytes: total, missing, invalid, unused };
fs.mkdirSync(path.join(root, 'output/qa'), { recursive: true });
fs.writeFileSync(path.join(root, 'output/qa/assets.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, missing: missing.length ? `${missing.length} files; see output/qa/assets.json` : [] }, null, 2));
if (required.length !== 127 || missing.length || invalid.length || unused.length || total > 9535000) process.exitCode = 1;
