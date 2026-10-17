#!/usr/bin/env node
import { createReadStream } from 'node:fs'
import { open, readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import process from 'node:process'

import {
  createRichTextStreamBuilder,
  createRichTextStreamDecoder,
  getRichTextDocumentSchema,
  getRichTextToolDefinitions,
  validateRichTextDocument,
  validateRichTextPatch,
} from '@norio-office/rich-text/ai-protocol'
import { packNordox, unpackNordox } from '@norio-office/rich-text/nordox'

function argumentsOf(argv) {
  const [command, ...rest] = argv
  const options = {}
  for (let index = 0; index < rest.length; index++) {
    const argument = rest[index]
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`)
    const name = argument.slice(2)
    if (name === 'stream') options.stream = true
    else {
      const value = rest[++index]
      if (value === undefined) throw new Error(`Missing value for ${argument}`)
      options[name] = value
    }
  }
  return { command, options }
}

async function inputBytes(path) {
  if (!path) throw new Error('--input is required')
  if (path === '-') {
    const chunks = []
    for await (const chunk of process.stdin) chunks.push(chunk)
    return Buffer.concat(chunks)
  }
  return readFile(path)
}

async function* inputChunks(path) {
  if (!path) throw new Error('--input is required')
  const source = path === '-' ? process.stdin : createReadStream(path)
  for await (const chunk of source) yield chunk
}

async function streamDocument(path, mode = 'createDocument') {
  const decoder = createRichTextStreamDecoder()
  let builder
  for await (const chunk of inputChunks(path)) {
    for (const event of decoder.push(chunk)) {
      builder ??= createRichTextStreamBuilder({ streamId: event.streamId, mode })
      builder.append(event)
    }
  }
  decoder.finish()
  if (!builder) throw new Error('Stream contains no events')
  return builder.result()
}

function assetPackaging(options) {
  const packaging = {}
  for (const kind of ['images', 'videos', 'files']) {
    const mode = options[`asset-${kind}`]
    if (mode !== undefined) {
      if (mode !== 'embed' && mode !== 'reference') throw new Error(`--asset-${kind} must be embed or reference`)
      packaging[kind] = mode
    }
  }
  return packaging
}

async function resourceResolver(path) {
  if (!path) return undefined
  const raw = JSON.parse(await readFile(path, 'utf8'))
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Resource map must be an object')
  return {
    async readBytes(ref) {
      const entry = raw[ref.id]
      if (!entry || typeof entry.path !== 'string') throw new Error(`Resource ${ref.id} is not mapped`)
      return { bytes: await readFile(entry.path), mimeType: entry.mimeType, name: entry.name }
    },
  }
}

async function writeNewFile(path, bytes) {
  if (!path) throw new Error('--output is required')
  const file = await open(path, 'wx')
  try {
    await file.writeFile(bytes)
  } catch (error) {
    await file.close()
    throw error
  }
  await file.close()
}

async function main() {
  const { command, options } = argumentsOf(process.argv.slice(2))
  if (command === 'capabilities') {
    const schema = getRichTextDocumentSchema()
    return { schemaVersion: '1', protocolVersion: 1, streamProtocolVersion: 1,
      nodes: Object.keys(schema.nodes), marks: Object.keys(schema.marks), tools: getRichTextToolDefinitions().map(tool => tool.name) }
  }
  if (command === 'validate-document') {
    const bytes = await inputBytes(options.input)
    if (extname(options.input ?? '').toLowerCase() === '.nordox' || bytes[0] === 0x50 && bytes[1] === 0x4b) {
      const unpacked = await unpackNordox(bytes)
      return { valid: true, format: 'nordox', title: unpacked.manifest.title, resources: unpacked.manifest.resources.length }
    }
    const result = validateRichTextDocument(JSON.parse(bytes.toString('utf8')))
    if (!result.valid) throw new Error(JSON.stringify(result.errors))
    return { valid: true, format: 'json', schemaVersion: result.schemaVersion }
  }
  if (command === 'validate-patch') {
    const value = JSON.parse((await inputBytes(options.input)).toString('utf8'))
    const result = validateRichTextPatch(value)
    if (!result.valid) throw new Error(JSON.stringify(result.errors))
    return { valid: true, structuralOnly: true, operations: result.patch.operations.length }
  }
  if (command === 'validate-stream') {
    const result = await streamDocument(options.input, options.mode ?? 'createDocument')
    return { valid: true, mode: result.mode, events: result.seq, nodes: result.nodes.length, operations: result.operations.length }
  }
  if (command === 'create') {
    let document
    if (options.stream) {
      const result = await streamDocument(options.input)
      document = { type: 'doc', content: result.nodes }
    } else {
      document = JSON.parse((await inputBytes(options.input)).toString('utf8'))
    }
    const bytes = await packNordox(document, {
      title: options.title ?? 'Untitled',
      assetPackaging: assetPackaging(options),
      resourceResolver: await resourceResolver(options['resource-map']),
    })
    await writeNewFile(options.output, bytes)
    return { created: true, format: 'nordox', output: options.output, byteLength: bytes.byteLength }
  }
  throw new Error('Usage: rich-text.mjs capabilities | validate-document | validate-patch | validate-stream | create [--input path|-] [--output path] [--stream]')
}

main().then(result => {
  process.stdout.write(`${JSON.stringify(result)}\n`)
}).catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
