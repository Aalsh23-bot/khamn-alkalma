#!/usr/bin/env python3
from __future__ import annotations

import zipfile
from pathlib import Path

ROOT = Path("/workspace")
OUT = ROOT / "artifacts" / "khamsa-appstore.zip"
INCLUDE = [
    "README.md",
    "اقرأني.txt",
    "خطوات-البناء.md",
    "src",
    "native",
    "ios",
    "android",
    "public",
    "resources",
    "dist-native",
    "package.json",
    "package-lock.json",
    "capacitor.config.ts",
    "vite.native.config.ts",
    "vite.config.ts",
    "tsconfig.json",
    "scripts/generate-native-assets.py",
    "scripts/pack-native.py",
]


def skip(rel: str) -> bool:
    n = rel.replace("\\", "/")
    return any(
        part in n
        for part in (
            "/node_modules/",
            "node_modules/",
            "/ios/App/Pods/",
            "/android/.gradle/",
            "/android/app/build/",
            "/android/build/",
            "/public/__grok/",
            "public/__grok/",
            ".DS_Store",
        )
    )


def collect() -> list[tuple[Path, str]]:
    files: list[tuple[Path, str]] = []
    for item in INCLUDE:
        abs_path = ROOT / item
        if not abs_path.exists():
            continue
        if abs_path.is_file():
            rel = str(abs_path.relative_to(ROOT))
            if not skip(rel):
                files.append((abs_path, rel))
            continue
        for path in abs_path.rglob("*"):
            if not path.is_file():
                continue
            rel = str(path.relative_to(ROOT))
            if skip(rel):
                continue
            files.append((path, rel))
    return files


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if OUT.exists():
        OUT.unlink()
    files = collect()
    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for abs_path, rel in files:
            zf.write(abs_path, f"khamsa/{rel}")
    mb = OUT.stat().st_size / (1024 * 1024)
    print(f"wrote {OUT} ({mb:.1f} MB, {len(files)} files)")


if __name__ == "__main__":
    main()
