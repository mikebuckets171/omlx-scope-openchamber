# Contributing

## Local setup

```bash
bun install --frozen-lockfile
bun run check
```

Keep `panel/main.js` and `service/main.js` synchronized with their TypeScript
sources. The OpenChamber host installs the built JavaScript files and does not
compile TypeScript for users.

## Pull requests

- Keep changes focused and explain user-visible behavior.
- Do not include `node_modules`, credentials, raw telemetry captures, or local
  configuration files.
- Run `bun run check` before opening a pull request.
- For visual changes, include the tested viewport sizes and a screenshot when
  practical.
- Preserve the read-only scope and loopback-only service boundary.
