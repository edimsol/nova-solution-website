# NOVA reference documents

Preservation documents, original snapshots, generated source media, and renewal
verification records live outside this repository in `../docs` (on this machine:
`D:\Company\docs`). Consult these documents when maintaining or renewing the site.

- Preservation entry point: `../docs/preservation/2026-10-08/index.html`.
- Page archives: `../docs/preservation/2026-10-08/pages/`.
- Renewal records: `../docs/renewal/`.
- Keep archived evidence and snapshots unchanged unless the user requests edits.
- Do not recreate or commit a repository-local `docs/` directory. It is excluded
  from Git and deployment. The production build must not depend on external docs.
- Python maintenance tools resolve this location through `tools/reference_paths.py`.
  Set `NOVA_DOCS_DIR` to use a different reference directory.
- `python tools/serve_preview.py --port 8000` serves the site and mounts the
  external documents at `/docs/`, keeping their existing relative links working.
