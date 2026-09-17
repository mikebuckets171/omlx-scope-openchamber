# Changelog

## 0.4.0 — 2026-09-17

- Added an OpenChamber session action that opens OMLX Scope with the selected
  session shown as context.
- Documented the SDK boundary: guest pages cannot mount inside the built-in
  Session inspector.

## 0.3.0 — 2026-09-17

- Rebranded the public plugin as **OMLX Scope**.
- Renamed the OpenChamber identity to `omlx-scope` and the isolated test
  overrides to `OMLX_SCOPE_*`.
- Moved the public repository to `omlx-scope-openchamber`.

## 0.2.0 — 2026-09-17

- Rebranded the extension as **oMLX Telemetry** for OpenChamber.
- Added a clean public-repository boundary, release metadata, privacy/security
  documentation, and CI.
- Refined the panel into a compact instrument surface without adding metrics.
- Renamed isolated test environment variables to `OMLX_TELEMETRY_*`.

## 0.1.0

- Initial read-only oMLX telemetry panel and host service.
