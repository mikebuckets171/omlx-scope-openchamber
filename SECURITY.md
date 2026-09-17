# Security policy

## Supported versions

Only the latest GitHub release is supported. The plugin targets OpenChamber
1.24.0 or newer and a local oMLX server exposing the endpoint
shapes described in the metric reference. Dashboard APIs may change between
oMLX versions.

## Reporting a vulnerability

Please do not open a public issue for a credential, local-service, or
request-routing vulnerability. Use a private GitHub security advisory for this
repository when available. If advisories are unavailable, contact the
repository owner through the GitHub profile and include:

- the affected release or commit;
- a minimal reproduction;
- the impact and any required local permissions;
- a proposed mitigation, if known.

Do not include API keys, auth files, session cookies, or raw oMLX payloads in a
report. The service must remain loopback-only, reject non-numeric loopback
origins, and keep credentials out of the panel and logs.
