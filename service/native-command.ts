import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

/** Resolve at our own deadline even if a runtime fails to deliver a close event.
 * Fixed executable/arguments are supplied by the sampler; never a shell command.
 */
export function readCommand(file: string, args: readonly string[], timeoutMs = 1_500, maxBytes = 64 * 1024): Promise<string | null> {
  return new Promise(resolve => {
    let child: ChildProcessWithoutNullStreams | undefined;
    let settled = false;
    let bytes = 0;
    let chunks: Buffer[] = [];
    const finish = (value: string | null, terminate = false) => {
      if (settled) return;
      settled = true; clearTimeout(timer); chunks = [];
      if (terminate && child) {
        // SIGKILL is limited to our read-only child. Never signal oMLX/OpenChamber.
        try { child.kill('SIGKILL'); } catch { /* Already exited. */ }
        child.stdout.destroy(); child.stderr.destroy(); child.stdin.destroy();
      }
      resolve(value);
    };
    const timer = setTimeout(() => finish(null, true), timeoutMs);
    try {
      child = spawn(file, [...args], { shell: false, windowsHide: true, stdio: 'pipe', env: { LANG: 'C', LC_ALL: 'C' } });
      child.stdin.end();
      const receive = (chunk: Buffer, keep: boolean) => {
        if (settled) return;
        bytes += chunk.byteLength;
        if (bytes > maxBytes) { finish(null, true); return; }
        if (keep) chunks.push(chunk);
      };
      child.stdout.on('data', chunk => receive(chunk, true));
      child.stderr.on('data', chunk => receive(chunk, false));
      child.stdout.on('error', () => finish(null, true));
      child.stderr.on('error', () => finish(null, true));
      child.stdin.on('error', () => finish(null, true));
      child.once('error', () => finish(null, true));
      child.once('close', (code, signal) => finish(code === 0 && signal === null ? Buffer.concat(chunks).toString('utf8') : null));
    } catch { finish(null, true); }
  });
}
