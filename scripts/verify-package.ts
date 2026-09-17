import { parseManifestJson } from '@openchamber/sdk/schemas';
import { join } from 'node:path';
const root = join(import.meta.dir, '..');
const document = await Bun.file(join(root, 'package.json')).text();
const parsed = parseManifestJson(document);
if (!parsed.ok) throw new Error(`OpenChamber manifest: ${parsed.message}`);
const pkg = JSON.parse(document);
const sessionAction = pkg.openchamber?.contributes?.actions?.find((action: { id?: string; where?: string }) => action.id === 'open-omlx-scope' && action.where === 'session');
if (!sessionAction) throw new Error('Missing session action: open-omlx-scope');
const entries: string[] = pkg.files;
for (const file of ['panel/index.html', 'panel/main.js', 'panel/style.css', 'panel/scope-icon.svg', 'service/main.js', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) {
  if (!entries.includes(file) || !await Bun.file(join(root, file)).exists()) throw new Error(`Missing installable asset: ${file}`);
}
let bytes = 0;
for (const entry of entries) {
  if (entry.includes('..') || entry.startsWith('/') || /\.(ts|test\.js)$/.test(entry)) throw new Error(`Unsafe or source-only package entry: ${entry}`);
  const file = Bun.file(join(root, entry));
  if (!await file.exists()) throw new Error(`Missing package entry: ${entry}`);
  bytes += file.size;
}
const panel = await Bun.file(join(root, 'panel/main.js')).text();
if (panel.includes('node:os') || panel.includes('node:fs') || panel.includes('OMLX_SCOPE_API_KEY')) throw new Error('Host-only code leaked into the panel');
console.log(`PASS: SDK manifest, ${entries.length} allowlisted assets, ${(bytes / 1024).toFixed(1)} KiB installable content; no host config/OS code in panel.`);
