# Local Operations

All local edits require the host-bound `documentId`, `contextId`, `requestId`, `baseRevision`, and an authorized `targetRef`. These are ProseMirror/Yjs targets, not character offsets.

Supported operation names: `insertContent`, `replaceText`, `replaceFragment`, `setMarks`, `unsetMarks`, `setNodeAttributes`, `unsetNodeAttributes`, `deleteContent`, `moveBlocks`, `transformBlocks`, and `tableOperation`. The structural schema is `schemas/patch.schema.json`; runtime target and permission checks happen only in the editor Bridge.

Example, replace a selected phrase:

```json
{"protocolVersion":1,"documentId":"HOST_ID","requestId":"HOST_REQUEST","contextId":"HOST_CONTEXT","baseRevision":0,"operations":[{"type":"replaceText","targetRef":"HOST_TARGET","text":"Revised phrase"}]}
```

For color, use `setMarks` with the registered `textStyle` Mark attributes. For a highlighted block, use `setNodeAttributes` on a `highlightBlock`; for a table cell use `tableOperation` or a cell attribute operation. A changed/deleted target must be reselected. Never substitute a whole-document write after a local conflict.
