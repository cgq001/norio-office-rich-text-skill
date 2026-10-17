# Nordox Container

`.nordox` is a ZIP with `manifest.json`, `document.json`, and optional `assets/images/`, `assets/videos/`, and `assets/files/` entries. `manifest.json` records format version 1, schema version, title, packaging policy, and resources. This file is separate from Skill `runtime-manifest.json`.

The model generates native JSON or stream events, never ZIP bytes. `packNordox` validates and creates the ZIP; `unpackNordox` verifies paths, sizes, format versions, document structure, and resource references. Embedded resources are stored as original bytes without transcoding. Different resource IDs with identical bytes, kind, and MIME type may share one ZIP asset path; each ID remains separately listed in the manifest and document. Their `nordox:asset/<id>` reference is converted to a temporary display URL only by the browser adapter; the temporary URL is never persisted.

`assetPackaging` has `images`, `videos`, and `files` settings, each `embed` or `reference`. A missing setting preserves an already embedded resource; a new external resource defaults to `reference`. Embedding needs a host byte resolver. A reference needs a persistent address, not `blob:`, `data:`, `file:`, or a credential-bearing URL. Failed preparation must leave the existing document and file untouched.
