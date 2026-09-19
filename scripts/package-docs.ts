import { posix } from 'node:path';

/** Check local Markdown links against what is actually shipped, not just the checkout. */
export function missingPackageLinks(file: string, markdown: string, entries: ReadonlySet<string>): string[] {
  const text = markdown.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  const targets = [
    ...[...text.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(match => match[1]!),
    ...[...text.matchAll(/^\s*\[[^\]\n]+\]:\s*(\S+)/gm)].map(match => match[1]!),
  ];
  const missing = new Set<string>();
  for (const raw of targets) {
    const target = raw.replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;
    const path = target.split(/[?#]/, 1)[0]!;
    if (!path) continue;
    let decoded: string;
    try { decoded = decodeURIComponent(path); } catch { missing.add(target); continue; }
    const resolved = posix.normalize(posix.join(posix.dirname(file), decoded));
    if (decoded.startsWith('/') || decoded.includes('\\') || /^[a-z][\w+.-]*:/i.test(decoded)
      || resolved === '..' || resolved.startsWith('../') || !entries.has(resolved)) missing.add(target);
  }
  return [...missing];
}
