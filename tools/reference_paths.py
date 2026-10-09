"""Resolve the website checkout and its separate, local reference library.

NOVA_DOCS_DIR overrides the default sibling ``docs`` directory. A relative
override is resolved against the repository root, never the calling directory.
Existing manifest paths retain their logical ``docs/...`` form so the moved
archive remains byte-for-byte unchanged and works at the preview /docs/ mount.
"""
from __future__ import annotations

import os
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
_override = os.environ.get("NOVA_DOCS_DIR", "").strip()
_docs_path = Path(_override).expanduser() if _override else ROOT.parent / "docs"
DOCS_ROOT = (_docs_path if _docs_path.is_absolute() else ROOT / _docs_path).resolve()


def resolve_source_path(value: str | Path) -> Path:
    """Read legacy docs/... references from the external library, other paths from ROOT."""
    path = Path(value)
    if path.is_absolute():
        return path.resolve()
    if path.parts and path.parts[0] == "docs":
        resolved = (DOCS_ROOT / Path(*path.parts[1:])).resolve()
        if not resolved.is_relative_to(DOCS_ROOT):
            raise ValueError(f"Reference escapes the documents directory: {value}")
        return resolved
    return (ROOT / path).resolve()


def manifest_path(value: str | Path) -> str:
    """Serialize repository assets or external documents using existing logical paths."""
    path = Path(value).resolve()
    if path.is_relative_to(DOCS_ROOT):
        return "docs/" + path.relative_to(DOCS_ROOT).as_posix()
    if path.is_relative_to(ROOT):
        return path.relative_to(ROOT).as_posix()
    return path.as_posix()
