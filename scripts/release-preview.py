#!/usr/bin/env python3
"""Publish exact, verified CI artifacts. Never use this path for signed updates."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import plistlib
import re
import struct
import subprocess
import tempfile
import zipfile

REPO = "mikebuckets171/omlx-scope-openchamber"
REQUIRED_JOBS = {"verify (ubuntu-latest)", "verify (macos-latest)", "browser", "native"}


def gh(*args: str, payload: dict | None = None) -> str:
    command = ["gh", *args]
    data = None
    if payload is not None:
        command += ["--input", "-"]
        data = json.dumps(payload)
    return subprocess.check_output(command, input=data, text=True)


def api(path: str, method: str = "GET", payload: dict | None = None):
    return json.loads(gh("api", f"repos/{REPO}/{path}", "--method", method, payload=payload))


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def digest(path: Path) -> str:
    return "sha256:" + hashlib.sha256(path.read_bytes()).hexdigest()


def validate_extension(path: Path, package: dict, root: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None, "Corrupt extension archive")
        require(sorted(archive.namelist()) == sorted(package["files"]), "Unexpected extension entries")
        require(sum(item.file_size for item in archive.infolist()) <= 224 * 1024, "Extension size budget exceeded")
        for name in archive.namelist():
            require(archive.read(name) == (root / name).read_bytes(), f"Source mismatch: {name}")


def validate_native(path: Path, version: str) -> None:
    with zipfile.ZipFile(path) as archive:
        require(archive.testzip() is None, "Corrupt native archive")
        names = archive.namelist()
        require(len(names) == len(set(names)), "Duplicate native archive entries")
        require(all(name.startswith(("OMLX Scope.app/", "__MACOSX/")) and ".." not in Path(name).parts for name in names), "Unexpected native path")
        require(sum(item.file_size for item in archive.infolist()) <= 40_000_000, "Native archive exceeds budget")
        prefix = "OMLX Scope.app/Contents/"
        info = plistlib.loads(archive.read(prefix + "Info.plist"))
        require(info.get("CFBundleIdentifier") == "com.mikebuckets171.omlx-scope", "Bundle identifier mismatch")
        require(info.get("CFBundleVersion") == version == info.get("CFBundleShortVersionString"), "Native version mismatch")
        require(info.get("LSMinimumSystemVersion") == "14.0", "Unexpected native deployment target")
        require("SUFeedURL" not in info and "SUPublicEDKey" not in info, "Preview publisher cannot publish signed-update builds")
        require(info.get("SURequireSignedFeed") is True and info.get("SUVerifyUpdateBeforeExtraction") is True, "Missing update verification policy")
        binary = archive.read(prefix + "MacOS/OMLXScope")
        require(binary[:4] == bytes.fromhex("cffaedfe") and struct.unpack("<I", binary[4:8])[0] == 0x0100000C, "Expected ARM64 executable")
        require(len(binary) < 8_000_000, "Executable size budget exceeded")
        require(any(name.endswith("Sparkle.framework/Versions/B/Sparkle") for name in names), "Missing update framework")
        require(prefix + "Resources/Sparkle-LICENSE.txt" in names, "Missing third-party license")
        require(not any("node_modules" in name or "ScopePreview" in name for name in names), "Development-only files in native archive")


def release_notes(changelog: str, version: str) -> str:
    match = re.search(r"^## " + re.escape(version) + r"[^\n]*\n(.*?)(?=^## |\Z)", changelog, re.M | re.S)
    require(match is not None and bool(match.group(1).strip()), "Missing version changelog")
    return match.group(1).strip() + f"""

## Install

**OpenChamber extension:** install `omlx-scope-openchamber-{version}.zip` under **Settings → Extensions**, or update your Git installation. Requires OpenChamber 1.24.0 or newer.

**Mac app:** download `OMLX-Scope-macOS-{version}.zip`, quit OMLX Scope, and replace the app in Applications. Requires Apple Silicon and macOS 14 or newer. The packages install separately.

The native build is a **hardened, ad-hoc-signed preview, not Developer ID signed or notarized**. Check for Updates discovers Mac releases on GitHub; automatic installation is disabled in preview builds. The [release guide](https://github.com/{REPO}/blob/v{version}/docs/RELEASING.md) explains the publisher signing requirements. Do not disable Gatekeeper.

## Verification

These artifacts come from passing CI for this exact release commit. `SHA256SUMS` records their SHA-256 digests. Checksums detect changed bytes; they do not replace a trusted publisher signature. See the [CI run](https://github.com/{REPO}/actions/runs/{os.environ['CI_RUN']}) for native, extension, browser, and packaging checks.

Synthetic previews are not live hardware results. End-user OpenChamber/oMLX behavior, long-running battery impact, and signed update installation remain separate validation tasks.
"""


def main() -> None:
    root = Path.cwd()
    sha = os.environ["RELEASE_SHA"]
    run_id = os.environ["CI_RUN"]
    require(re.fullmatch(r"[0-9a-f]{40}", sha) is not None and run_id.isdecimal(), "Invalid CI inputs")
    require(gh("repo", "view", REPO, "--json", "nameWithOwner", "--jq", ".nameWithOwner").strip() == REPO, "Wrong repository")
    require(subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip() == sha, "Wrong source checkout")
    run = api(f"actions/runs/{run_id}")
    require(run["head_sha"] == sha and run["head_branch"] == "main" and run["event"] == "push", "CI must be a main-branch push")
    require(run["repository"]["full_name"] == REPO and run["status"] == "completed" and run["conclusion"] == "success", "CI is not successful")
    require(run["path"] == ".github/workflows/ci.yml", "Unexpected CI workflow")
    jobs = api(f"actions/runs/{run_id}/jobs?per_page=100")["jobs"]
    require({job["name"] for job in jobs} == REQUIRED_JOBS and all(job["conclusion"] == "success" for job in jobs), "Required checks are missing or failed")
    package = json.loads((root / "package.json").read_text())
    version = package["version"]
    require(re.fullmatch(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", version) is not None, "Expected stable version")
    tag = "v" + version
    releases = api("releases?per_page=100")
    existing = next((release for release in releases if release["tag_name"] == tag), None)
    if existing and not existing["draft"]:
        print(f"{tag} is already published; no changes made.")
        return
    require(not any(ref["ref"] == "refs/heads/updates" for ref in api("git/matching-refs/heads/updates")), "Signed update feed exists. Use the signed release process, not preview publication.")
    require(api("git/ref/heads/main")["object"]["sha"] == sha, "Main has advanced; use its latest CI")
    notes = release_notes((root / "CHANGELOG.md").read_text(), version)
    with tempfile.TemporaryDirectory(prefix="scope-release-") as folder:
        work = Path(folder)
        for name in ["omlx-scope-package", "native-macos"]:
            gh("run", "download", run_id, "--repo", REPO, "--name", name, "--dir", str(work / name))
        packages = []
        for name in [f"omlx-scope-openchamber-{version}.zip", f"OMLX-Scope-macOS-{version}.zip"]:
            matches = list(work.rglob(name))
            require(len(matches) == 1, f"Expected exactly one {name}")
            packages.append(matches[0])
        validate_extension(packages[0], package, root)
        validate_native(packages[1], version)
        checksums = work / "SHA256SUMS"
        checksums.write_text("".join(digest(path).removeprefix("sha256:") + "  " + path.name + "\n" for path in packages))
        assets = packages + [checksums]
        refs = api(f"git/matching-refs/tags/{tag}")
        ref = next((value for value in refs if value["ref"] == "refs/tags/" + tag), None)
        if ref:
            require(ref["object"]["type"] == "tag", "Expected an annotated tag")
            target = api("git/tags/" + ref["object"]["sha"])["object"]
            require(target["type"] == "commit" and target["sha"] == sha, "Existing tag has different source")
        else:
            obj = api("git/tags", "POST", {"tag": tag, "message": f"OMLX Scope {tag}", "object": sha, "type": "commit"})
            api("git/refs", "POST", {"ref": "refs/tags/" + tag, "sha": obj["sha"]})
        release = existing or api("releases", "POST", {"tag_name": tag, "target_commitish": sha, "name": f"OMLX Scope {tag}", "body": notes, "draft": True, "prerelease": False})
        require(release["draft"] and release["target_commitish"] == sha, "Draft source mismatch")
        release_id = release["id"]
        for path in assets:
            uploaded = api(f"releases/{release_id}")["assets"]
            found = next((asset for asset in uploaded if asset["name"] == path.name), None)
            if found:
                require(found.get("digest") == digest(path) and found["size"] == path.stat().st_size, "Existing asset differs; do not overwrite")
            else:
                subprocess.run(["gh", "api", "--method", "POST", f"https://uploads.github.com/repos/{REPO}/releases/{release_id}/assets?name={path.name}", "-H", "Content-Type: " + ("application/zip" if path.suffix == ".zip" else "text/plain"), "--input", str(path)], check=True, stdout=subprocess.DEVNULL)
        final_assets = api(f"releases/{release_id}")["assets"]
        require({asset["name"] for asset in final_assets} == {path.name for path in assets}, "Unexpected release assets")
        for path in assets:
            asset = next(asset for asset in final_assets if asset["name"] == path.name)
            require(asset["state"] == "uploaded" and asset["digest"] == digest(path) and asset["size"] == path.stat().st_size, "Uploaded bytes do not match CI")
        require(api("git/ref/heads/main")["object"]["sha"] == sha, "Main advanced before publication")
        published = api(f"releases/{release_id}", "PATCH", {"draft": False, "prerelease": False, "make_latest": "true", "body": notes})
        require(not published["draft"] and api("releases/latest")["id"] == release_id, "Publication verification failed")
        print(published["html_url"])


if __name__ == "__main__":
    main()
