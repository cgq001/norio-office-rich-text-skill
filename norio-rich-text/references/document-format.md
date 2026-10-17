# Native Document Format

The root is `{ "type": "doc", "content": [...] }`. Use a paragraph even for an empty file: `{ "type": "doc", "content": [{ "type": "paragraph" }] }`. Text belongs in `{ "type": "text", "text": "..." }` children of text blocks. Do not send HTML as native content.

The authoritative allowed node/mark/attribute list comes from `richtext_get_capabilities`, `schemas/document.schema.json`, and the shared editor Schema. Common nodes are `paragraph`, `heading`, `bulletList`, `orderedList`, `taskList`, `blockquote`, `table`, `columnsBlock`, `highlightBlock`, `imageBlock`, `videoBlock`, `localFileBlock`, `formulaBlock`, and `countdownBlock`.

Example:

```json
{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Plan"}]},{"type":"paragraph","content":[{"type":"text","text":"Draft text"}]}]}
```

The editor assigns block `aiId` identities. Do not supply `aiId` in newly created nodes, stream events, or local patch attributes; the executor assigns new IDs. Existing target IDs remain stable when updated or moved. Comments live in host data, and watermarks are visual settings rather than body nodes. Unsupported nodes/marks/attributes are errors, not fields to silently drop.

`examples/custom-blocks-document.json` shows columns, a highlight, a LaTeX formula, a countdown, a code block, and a date. A date has no dedicated native node; use ordinary text for a displayed date, or a `countdownBlock` with a millisecond `targetTimestamp` for a running timer. `reminderEnabled` is only document data: inserting that node does not schedule a host/system reminder. The formula `latex` is data, not executable code; a code block's `language`, `wrapLines`, and `darkTheme` are its native display attributes. Columns need one `columnsColumn` child per `widths` entry. The highlight's `backgroundColor` is a block attribute, not a text Mark.

`examples/media-reference-document.json` shows image, video, and file nodes with persistent reference URLs. The URLs are placeholders; an AI edit may introduce real external references only after the host authorizes them. For offline packaging use `assetPackaging` with `embed` and supply bytes through the resource resolver. A browser `blob:` URL is temporary display state, never a persistent `src` or `url` in a `.nordox` file. Opening media, playing video, downloading a file, and uploading bytes are host/UI actions, not side effects of adding a node.
