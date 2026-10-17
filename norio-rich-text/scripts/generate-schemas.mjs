import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  getRichTextDocumentJsonSchema,
  getRichTextPatchJsonSchema,
  getRichTextStreamEventJsonSchema,
  getRichTextToolDefinitions,
} from '@norio-office/rich-text/ai-protocol'
import { getNordoxManifestJsonSchema } from '@norio-office/rich-text/nordox'

const directory = join(dirname(fileURLToPath(import.meta.url)), '..', 'schemas')
const schemas = {
  'document.schema.json': getRichTextDocumentJsonSchema(),
  'nordox-manifest.schema.json': getNordoxManifestJsonSchema(),
  'patch.schema.json': getRichTextPatchJsonSchema(),
  'stream-event.schema.json': getRichTextStreamEventJsonSchema(),
  'tool-inputs.schema.json': {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://norio-office.github.io/rich-text/tool-inputs.schema.json',
    $defs: Object.fromEntries(getRichTextToolDefinitions().map(tool => [tool.name, tool.inputSchema])),
  },
}

const write = process.argv.includes('--write')
if (!write && !process.argv.includes('--check')) throw new Error('Use --write or --check')
if (write) await mkdir(directory, { recursive: true })
for (const [name, schema] of Object.entries(schemas)) {
  const path = join(directory, name)
  const content = `${JSON.stringify(schema, null, 2)}\n`
  if (write) await writeFile(path, content)
  else if (await readFile(path, 'utf8') !== content) throw new Error(`${name} is out of sync; run --write`)
}
process.stdout.write(`${write ? 'Generated' : 'Checked'} ${Object.keys(schemas).length} schemas\n`)
