import { parseManifestJson } from '@openchamber/sdk/schemas';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

const archiveName = `${pkg.name}-${pkg.version}.zip`;
const dist = join(root, 'dist');
await Bun.write(join(dist, '.keep'), '');
const staging = mkdtempSync(join(tmpdir(), 'omlx-scope-pkg-'));
try {
  const zip = spawnSync('zip', ['-X', '-q', '-r', join(dist, archiveName), ...entries], { cwd: root, encoding: 'utf8' });
  if (zip.status !== 0) throw new Error(`zip failed: ${zip.stderr || zip.stdout}`);
  const inspect = spawnSync('unzip', ['-l', join(dist, archiveName)], { encoding: 'utf8' });
  if (inspect.status !== 0) throw new Error(`unzip failed: ${inspect.stderr || inspect.stdout}`);
  const listed = inspect.stdout.split('\n').filter((line) => /^\s+[0-9].*\s\d+:\d+\s/.test(line));
  const archiveEntries = listed.map((line) => {
    const trimmed = line.trim();
    const parts = trimmed.split(/\s+/);
    return parts[parts.length - 1];
  });
  for (const expected of entries) {
    if (!archiveEntries.some((entry) => entry === expected || entry.endsWith(`/${expected}`))) {
      throw new Error(`Archive missing expected entry: ${expected}`);
    }
  }
  const forbiddenPrefixes = ['node_modules/', '.git/', '.github/', 'src/', 'tests/', 'scripts/', 'dev/', '.vscode/'];
  const allowed = new Set(entries);
  for (const entry of archiveEntries) {
    if (forbiddenPrefixes.some((needle) => entry.startsWith(needle) || entry.includes(`/${needle}`))) {
      throw new Error(`Unexpected archive entry: ${entry}`);
    }
    if (!allowed.has(entry) && !allowed.has(entry.split('/').slice(1).join('/'))) {
      throw new Error(`Unexpected archive entry: ${entry}`);
    }
  }
  const extracted = join(staging, 'extracted');
  const extract = spawnSync('unzip', ['-q', join(dist, archiveName), '-d', extracted], { encoding: 'utf8' });
  if (extract.status !== 0) throw new Error(`unzip -d failed: ${extract.stderr || extract.stdout}`);
  const extractedFiles = spawnSync('find', [extracted, '-type', 'f'], { encoding: 'utf8' });
  if (extractedFiles.status !== 0) throw new Error(`find failed: ${extractedFiles.stderr || extractedFiles.stdout}`);
  const fileCount = extractedFiles.stdout.split('\n').filter(Boolean).length;
  if (fileCount !== entries.length) throw new Error(`Extracted archive contains ${fileCount} files; expected ${entries.length}.`);
  console.log(`PASS: SDK manifest, ${entries.length} allowlisted assets, ${(bytes / 1024).toFixed(1)} KiB installable content; archive ${archiveName} lists ${archiveEntries.length} entries; extracted folder contains ${fileCount} files; no host config/OS code in panel.`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
