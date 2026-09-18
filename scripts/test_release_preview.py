import importlib.util
import os
from pathlib import Path
import plistlib
import struct
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location("publisher", Path(__file__).with_name("release-preview.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class ReleaseValidationTests(unittest.TestCase):
    def test_extension_requires_exact_source_bytes_and_allowlist(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "package.json").write_text('{"version":"0.5.6"}')
            archive = root / "extension.zip"
            with zipfile.ZipFile(archive, "w") as output:
                output.write(root / "package.json", "package.json")
            publisher.validate_extension(archive, {"files": ["package.json"]}, root)
            (root / "package.json").write_text("changed")
            with self.assertRaisesRegex(RuntimeError, "Source mismatch"):
                publisher.validate_extension(archive, {"files": ["package.json"]}, root)
            with self.assertRaisesRegex(RuntimeError, "Unexpected extension"):
                publisher.validate_extension(archive, {"files": []}, root)

    def native_archive(self, root, **overrides):
        info = {
            "CFBundleIdentifier": "com.mikebuckets171.omlx-scope",
            "CFBundleVersion": "0.5.6", "CFBundleShortVersionString": "0.5.6",
            "LSMinimumSystemVersion": "14.0", "SURequireSignedFeed": True,
            "SUVerifyUpdateBeforeExtraction": True,
            "SUSignedFeedFailureExpirationInterval": 0, "SUEnableSystemProfiling": False,
        }
        info.update(overrides)
        archive = root / "native.zip"
        prefix = "OMLX Scope.app/Contents/"
        with zipfile.ZipFile(archive, "w") as output:
            output.writestr(prefix + "Info.plist", plistlib.dumps(info))
            output.writestr(prefix + "MacOS/OMLXScope", bytes.fromhex("cffaedfe") + struct.pack("<I", 0x0100000C))
        return archive

    def test_native_rejects_wrong_version_or_missing_verification(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            publisher.validate_native(self.native_archive(root), "0.5.6")
            with self.assertRaisesRegex(RuntimeError, "version mismatch"):
                publisher.validate_native(self.native_archive(root), "0.5.7")
            with self.assertRaisesRegex(RuntimeError, "verification policy"):
                publisher.validate_native(self.native_archive(root, SURequireSignedFeed=False), "0.5.6")

    def test_preview_publication_rejects_signed_channel(self):
        with tempfile.TemporaryDirectory() as folder:
            with self.assertRaisesRegex(RuntimeError, "cannot publish signed"):
                publisher.validate_native(self.native_archive(Path(folder), SUFeedURL="https://example.invalid/appcast.xml"), "0.5.6")

    def test_preview_publication_rejects_path_escape(self):
        with tempfile.TemporaryDirectory() as folder:
            archive = self.native_archive(Path(folder))
            with zipfile.ZipFile(archive, "a") as output:
                output.writestr("OMLX Scope.app/../unexpected", "fixture")
            with self.assertRaisesRegex(RuntimeError, "Unexpected native path"):
                publisher.validate_native(archive, "0.5.6")

    def test_notes_use_only_selected_version_and_disclose_preview_limits(self):
        with patch.dict(os.environ, {"CI_RUN": "123"}):
            notes = publisher.release_notes("# Changelog\n\n## 0.5.6\nNew features.\n\n## 0.5.5\nOld features.\n", "0.5.6")
        self.assertIn("New features.", notes)
        self.assertNotIn("Old features.", notes)
        self.assertIn("not Developer ID signed or notarized", notes)
        with self.assertRaisesRegex(RuntimeError, "Missing version"):
            publisher.release_notes("# Changelog\n", "0.5.6")


if __name__ == "__main__":
    unittest.main()
