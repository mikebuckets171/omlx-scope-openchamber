# Privacy

## Monitoring

OMLX Scope reads local oMLX activity and host-resource measurements. It does not
send prompts, change models, or upload telemetry. The extension connects through
its host-managed service; the Mac app is a separate loopback client.

Only display measurements and bounded model labels reach the extension panel.
Raw request identifiers, prompts, completions, and credentials are not exposed
in its display contract. Recent observations and captures are held in memory,
not written to a database. Interface preferences are persisted locally.

The extension reads the documented local configuration and oMLX credential
locations listed in [Configuration](docs/CONFIGURATION.md). The native app can
read its existing oMLX/OpenCode connection or store a manually entered API key
in macOS Keychain. Neither rewrites those configuration files.

## Sharing

Copying stats or adding them to a chat draft happens only after a click in the
Share menu. The report excludes credentials, conversation content, model names,
request identifiers, and filesystem paths. Adding to a draft appends text; it
does not replace existing text, send a message, or start inference. Once you send
the draft, the selected chat provider receives that text under its own policies.

## Software updates

Mac update checks contact GitHub over HTTPS for this project’s public releases.
They are manual by default; automatic checks are opt-in and at most daily.
GitHub can see ordinary connection information, such as the source IP address.
No oMLX key, prompt, chat content, model inventory, or local path is sent.

Preview builds only discover releases and offer a browser link. Configured
Developer ID builds use Sparkle to retrieve the signed feed and update archives
hosted on GitHub. Sparkle profile reporting and remote release-note rendering
are disabled. Update preferences are stored locally. There is no project-run
analytics or update server.

## Diagnostics

Copied diagnostics describe versions, measurement availability, and connection
state. Do not attach credentials, auth files, raw runtime responses, or private
chat screenshots to public issues. Review anything you choose to share.


Next reply uses the selected chat’s ID and busy/idle state to time a capture.
The ID stays in the view’s memory and is not included in reports, saved to disk,
or sent to oMLX. It does not request conversation messages or Turn Stats data.
