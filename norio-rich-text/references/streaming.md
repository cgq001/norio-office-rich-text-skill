# Streaming Events

The host binds `streamId`, target, mode, and permissions. An event has `protocolVersion:1`, `streamId`, increasing `seq`, `type`, and `payload`. Transport is UTF-8 NDJSON; each line is one complete JSON event. Do not output prose or Markdown fences in the event stream.

For a paragraph still being generated, emit several deltas before closing it:

```ndjson
{"protocolVersion":1,"streamId":"HOST_STREAM","seq":1,"type":"node.open","payload":{"nodeRef":"p1","nodeType":"paragraph"}}
{"protocolVersion":1,"streamId":"HOST_STREAM","seq":2,"type":"text.delta","payload":{"nodeRef":"p1","text":"The first part "}}
{"protocolVersion":1,"streamId":"HOST_STREAM","seq":3,"type":"text.delta","payload":{"nodeRef":"p1","text":"appears immediately."}}
{"protocolVersion":1,"streamId":"HOST_STREAM","seq":4,"type":"node.close","payload":{"nodeRef":"p1"}}
{"protocolVersion":1,"streamId":"HOST_STREAM","seq":5,"type":"stream.end","payload":{}}
```

`node.attrs` may update attributes of the current open node. `operation` queues one structured patch operation in `operations` mode. In `replaceText` mode, send `text.delta` to the host replacement slot instead of wrapping a paragraph. Close nodes in reverse opening order. `stream.end` is necessary but not sufficient for success: only the host can confirm normal transport completion, validate the final result, and call commit. Cancellation/errors discard the local preview without changing official content.
