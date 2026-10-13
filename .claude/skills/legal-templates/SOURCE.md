# Source

- **Upstream:** <https://github.com/General-Legal/legal-templates> (General Legal, an organisation account)
- **Version installed:** commit `6d6805425eabd41bed86fc1e2ec51612760f716c` on `main`, committed
  2026-09-22 ("Update template.md"), fetched 2026-10-12.
- **License:** CC0 1.0 Universal — see [LICENSE](LICENSE). The authors ask that the General Legal credit
  footnote inside each template be kept when reproducing it; it is not a legal requirement.
- **Description (upstream):** "Public collection of high-quality templates created by General Legal
  attorneys with CC0 license."

## What was installed

- `templates/*/template.md` and `templates/*/README.md` — all 11 templates, unmodified, byte-for-byte as
  downloaded. Highlighted fill-in fields are `<mark>…</mark>` tags in the Markdown.
- `LICENSE`.

## What was deliberately left out

- `docx-originals/` — about 1 MB of `.docx` binaries, the same text as the Markdown. Fetch them from the
  upstream repo if Word files are needed.
- `scripts/fetch_templates.py` and `scripts/convert_docx.py` — maintainers' helpers that download from
  general.legal and convert `.docx` to Markdown. Not needed to use the templates, and not installed so that
  no third-party code that makes network requests ships in this project.

## Review before installing (2026-10-12)

All downloaded text was read for instructions addressed to an AI or for anything unrelated to legal
drafting; none was found. The two scripts were read: they import only `python-docx` and the standard
library and contact only general.legal.

## Updating

Re-download `templates/` from upstream into a new folder, diff it against this one, and read the diff
before replacing anything. Update the commit above.
