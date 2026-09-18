import { parseManifestJson } from '@openchamber/sdk/schemas';
import { dirname, join } from 'node:path';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
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
if (['node:os', 'node:fs', 'node:child_process', 'OMLX_SCOPE_API_KEY', '/usr/bin/vm_stat', '/usr/sbin/sysctl'].some((secret) => panel.includes(secret))) throw new Error('Host-only code leaked into the panel');
if (bytes > 160 * 1024) throw new Error('Installable content exceeds the 160 KiB budget. Review before increasing it.');
if (pkg.openchamber?.contributes?.page !== true) throw new Error('Full-page monitor surface is missing.');
// Build from a fresh staging directory, never update a pre-existing ZIP.
// Fixed file order, mode and timestamp make repeat builds reproducible.
const stage = mkdtempSync(join(tmpdir(), 'omlx-scope-package-'));
const archive = join(root, 'dist', `${pkg.name}-${pkg.version}.zip`);
const names = [...entries].sort();
if (new Set(names).size !== names.length) throw new Error('Duplicate package entries.');
const command = (file: string, args: string[], cwd = stage, timeout = 10_000): string => {
  const result = spawnSync(file, args, { cwd, encoding: 'utf8', timeout, maxBuffer: 1_000_000, env: { ...process.env, TZ: 'UTC' } });
  if (result.error || result.status !== 0) throw new Error(`${file} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
};
try {
  for (const name of names) {
    const path = join(stage, name);
    mkdirSync(dirname(path), { recursive: true });
    await Bun.write(path, Bun.file(join(root, name)));
    chmodSync(path, 0o644);
    utimesSync(path, 946684800, 946684800);
  }
  mkdirSync(dirname(archive), { recursive: true });
  rmSync(archive, { force: true });
  command('zip', ['-X', '-q', archive, ...names]);
  const listed = command('unzip', ['-Z1', archive]).trim().split('\n').sort();
  if (JSON.stringify(listed) !== JSON.stringify(names)) throw new Error('ZIP differs from the package allowlist.');
  const extracted = join(stage, 'extracted');
  command('unzip', ['-q', archive, '-d', extracted]);
  for (const name of names) {
    const original = await Bun.file(join(root, name)).bytes();
    const copy = await Bun.file(join(extracted, name)).bytes();
    if (!Buffer.from(original).equals(Buffer.from(copy))) throw new Error(`ZIP content mismatch: ${name}`);
  }
  process.stdout.write(command('node', [join(root, 'scripts/smoke-service.mjs'), extracted], extracted, 20_000));
  console.log(`PASS: SDK manifest, ${names.length} assets, ${(bytes / 1024).toFixed(1)} KiB; ZIP entries and extracted bytes verified; browser boundary clean.`);
} finally { rmSync(stage, { recursive: true, force: true }); }
