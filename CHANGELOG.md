# Changelog

## 0.5.1 — 2026-09-17

- Fixed a service startup failure that left the monitor waiting for oMLX.
- Added clear startup error details and packaged-service regression checks.
- No changes to the panel or Mac resource monitoring features.

## 0.5.0 — 2026-09-17

- Added a full-page monitor alongside the compact OpenChamber panel.
- Added bounded CPU and memory history, Mac wired/compressed memory, and swap readings.
- Kept host readings available during oMLX connection failures.
- Added pause/resume and stale-response handling without changing model execution.
- Improved retry scheduling and retained separate freshness states for session totals.
- Corrected environment-dependent configuration tests and strengthened package checks.
- Expanded macOS and cross-browser verification.
- Refreshed the installation guide and metric reference.

## 0.4.1 — 2026-09-17

- Added JSONC configuration support and clearer connection diagnostics.
- Improved handling of incomplete activity and stale session statistics.
- Added request deadlines, loopback integration tests, and browser checks.
- Clarified that monitoring covers the runtime rather than an individual chat.

## 0.4.0 — 2026-09-17

- Added an OpenChamber session-menu shortcut to the monitor.

## 0.3.0 — 2026-09-17

- Updated package identity and installation settings.

## 0.2.0 — 2026-09-17

- Added public distribution, licensing, privacy documentation, and CI.
- Refined the compact monitoring panel.

## 0.1.0

- Initial read-only oMLX monitor and local service.
