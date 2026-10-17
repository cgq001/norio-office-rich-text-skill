# Integration

Install `@norio-office/rich-text` and its documented Vue/Tiptap peer dependencies. Pure protocol and Nordox entries work in Node 20+ and browsers; the editor component and Bridge use a browser.

```ts
import { validateRichTextDocument, getRichTextToolDefinitions } from '@norio-office/rich-text/ai-protocol'
import { packNordox, unpackNordox } from '@norio-office/rich-text/nordox'
import { createRichTextAiBridge, createRichTextToolHandlers, consumeRichTextAiStream } from '@norio-office/rich-text/ai'
```

Bind `createRichTextAiBridge(editorInstance, { documentId, policy, resourceResolver, authorizeExternalReference })` to the actual mounted editor. `createRichTextToolHandlers(bridge, { createDocument, resourceResolver, authorizeExternalReference })` creates handlers for the names in `getRichTextToolDefinitions()`. The Bridge authorizer is a synchronous boolean lookup against host-approved image/video/file IDs or URLs, links, mention IDs and existing comment-thread IDs; the create-document handler also accepts an asynchronous lookup. Missing or denied authorization rejects newly AI-introduced references before preview or commit. It does not reject existing document references, create threads, or upload files. The host must also authorize document/session access, provide model transport, call the correct handler, persist returned Nordox bytes, and manage chat history. The package does not create application tabs, database rows, API keys, or model requests.

For an explicit user-selected AI editing scope, set `<RichTextEditor :show-ai-target-button="true" />`. Subscribe to `bridge.onEvent`; `ai-target-change` carries the selected target or `null` when the editor body, marker close button, host, commit, or lifecycle clears it. On send, call `bridge.getAiTarget()` and pass its `targetId` to `bridge.createEditContext({ requestId, instruction, targetId })`; then use only returned `targetRefs`. A repeated toolbar click keeps the same target when selection is unchanged. The host range-card close button calls `bridge.clearAiTarget({ targetId, reason: 'host-close' })` and cancels its own model request. Clearing invalidates uncommitted contexts and streams locally; it does not cancel remote transport by itself. The legacy context-without-`targetId` path remains for older hosts.

Tool results use `{ ok: true, data }` or `{ ok: false, error: { code, message, retryable, requiresContextRefresh } }`. When `requiresContextRefresh` is true (`TARGET_CHANGED`, `TARGET_NOT_FOUND`, `CONTEXT_EXPIRED`, or `DOCUMENT_NOT_FOUND`), obtain a fresh context/selection and read the target again before retrying; do not fall back to overwriting the whole document. An exception from the host `createDocument` callback, or a callback that returns no nonempty `documentId`, becomes `DOCUMENT_SAVE_FAILED` with `retryable: true` and `requiresContextRefresh: false`; the original exception text is not sent to the model. Keep detailed storage diagnostics in the host's own logs, not in tool responses. Unknown exceptions are likewise returned as a generic `TOOL_EXECUTION_FAILED` rather than exposing paths, credentials or document content.

For a model that only returns complete JSON, the host can validate it against the same public input schema and then call the same handler. For example, with a host-installed JSON Schema 2020-12 validator such as Ajv:

```ts
import Ajv2020 from 'ajv/dist/2020.js'
import { getRichTextToolDefinitions } from '@norio-office/rich-text/ai-protocol'
import { createRichTextToolHandlers } from '@norio-office/rich-text/ai'

const definition = getRichTextToolDefinitions().find(tool => tool.name === 'richtext_apply_patch')!
const validate = new Ajv2020({ strict: false }).compile(definition.inputSchema)
function applyCompleteModelJson(raw: string, handlers: ReturnType<typeof createRichTextToolHandlers>) {
  const input: unknown = JSON.parse(raw) // Reject incomplete JSON; do not apply it.
  if (!validate(input)) throw new Error('Invalid rich-text patch')
  return handlers.richtext_apply_patch(input)
}
```

Invoke this only after the model has finished its complete response. For incremental display, use the NDJSON stream path below instead; never animate a completed JSON result and describe it as streaming.

For a stream, call `bridge.beginStream(...)`, then pass the source `AsyncIterable<string | Uint8Array>` to `consumeRichTextAiStream(bridge, source, { streamId, signal })`. That function forwards complete decoded events while chunks arrive and commits only after transport ends normally. On failure it discards preview. Do not call `modelValue = newDocument` to apply a local edit; Bridge dispatches its own scoped transaction. In a Vue host, `update:modelValue` remains the one persistence change path; use the AI `applied` event for provenance, not a second save.

Offline CLI examples (run from a copied Skill directory with the package installed):

```bash
node scripts/rich-text.mjs capabilities
node scripts/rich-text.mjs validate-document --input examples/basic-document.json
node scripts/rich-text.mjs create --input examples/basic-document.json --output result.nordox
node scripts/rich-text.mjs create --stream --input - --output result.nordox < examples/streamed-document.ndjson
```

The CLI does not bind a live editor. NorioWork imports `SKILL.md` text but does not automatically register or run `scripts/`; its application team must bind tools and resources separately.
