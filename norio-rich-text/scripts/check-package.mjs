import { readFile, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  createRichTextStreamBuilder, createRichTextStreamDecoder,
  getRichTextToolDefinitions, validateRichTextDocument, validateRichTextPatch,
} from '@norio-office/rich-text/ai-protocol'
import { packNordox, unpackNordox } from '@norio-office/rich-text/nordox'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(join(root, 'runtime-manifest.json'), 'utf8'))
const listed = new Set(manifest.files)
for (const relative of listed) {
  const path = resolve(root, relative)
  if (!path.startsWith(`${root}\\`) && !path.startsWith(`${root}/`)) throw new Error(`Unsafe listed path: ${relative}`)
  if (!(await stat(path)).isFile()) throw new Error(`Not a file: ${relative}`)
}
for (const name of getRichTextToolDefinitions().map(tool => tool.name)) {
  if (!manifest.tools.includes(name)) throw new Error(`Missing tool in manifest: ${name}`)
}
for (const name of ['basic-document', 'styled-document', 'custom-blocks-document', 'media-reference-document', 'embedded-file-document']) {
  const value = JSON.parse(await readFile(join(root, 'examples', `${name}.json`), 'utf8'))
  const result = validateRichTextDocument(value)
  if (!result.valid) throw new Error(`${name}: ${JSON.stringify(result.errors)}`)
}
for (const name of ['local-edit', 'table-cell-edit']) {
  const value = JSON.parse(await readFile(join(root, 'examples', `${name}.json`), 'utf8'))
  const result = validateRichTextPatch(value)
  if (!result.valid) throw new Error(`${name}: ${JSON.stringify(result.errors)}`)
}
for (const [name, mode] of [['streamed-document', 'createDocument'], ['streamed-selection-edit', 'replaceText']]) {
  const decoder = createRichTextStreamDecoder()
  const source = await readFile(join(root, 'examples', `${name}.ndjson`))
  let builder
  for (const event of decoder.push(source)) {
    builder ??= createRichTextStreamBuilder({ streamId: event.streamId, mode })
    builder.append(event)
  }
  decoder.finish()
  builder?.result()
}
const example = JSON.parse(await readFile(join(root, 'examples/basic-document.json'), 'utf8'))
const archive = await packNordox(example)
await unpackNordox(archive)
const mediaExample = JSON.parse(await readFile(join(root, 'examples/media-reference-document.json'), 'utf8'))
const mediaArchive = await unpackNordox(await packNordox(mediaExample, {
  assetPackaging: { images: 'reference', videos: 'reference', files: 'reference' },
}))
if (mediaArchive.manifest.resources.length !== 3 || mediaArchive.manifest.resources.some(resource => resource.storage !== 'external')) {
  throw new Error('Media reference example did not produce three external resources.')
}
const skill = await readFile(join(root, 'SKILL.md'), 'utf8')
for (const link of skill.matchAll(/\]\((references\/[^)]+)\)/g)) {
  if (!listed.has(link[1])) throw new Error(`Unlisted Skill reference: ${link[1]}`)
}
process.stdout.write(`Skill package verified: ${listed.size} files\n`)
