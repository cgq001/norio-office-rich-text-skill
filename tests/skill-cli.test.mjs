import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rmdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

import { unpackNordox } from '@norio-office/rich-text/nordox'

const skill = resolve(dirname(fileURLToPath(import.meta.url)), '../norio-rich-text')
const script = join(skill, 'scripts/rich-text.mjs')

async function run(args, stdin) {
  const child = spawn(process.execPath, [script, ...args], { cwd: skill, stdio: ['pipe', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk })
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk })
  if (stdin !== undefined) child.stdin.end(stdin)
  else child.stdin.end()
  const code = await new Promise(resolve => child.on('close', resolve))
  return { code, stdout, stderr }
}

test('CLI validates fixtures, creates ZIP, and refuses overwrite', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'norio-skill-test-'))
  const output = join(directory, 'result.nordox')
  try {
    assert.equal((await run(['validate-document', '--input', 'examples/basic-document.json'])).code, 0)
    assert.equal((await run(['validate-patch', '--input', 'examples/local-edit.json'])).code, 0)
    assert.equal((await run(['validate-stream', '--input', 'examples/streamed-document.ndjson'])).code, 0)
    const created = await run(['create', '--input', 'examples/basic-document.json', '--output', output])
    assert.equal(created.code, 0, created.stderr)
    const first = await readFile(output)
    assert.equal(first[0], 0x50)
    assert.equal((await run(['validate-document', '--input', output])).code, 0)
    const duplicate = await run(['create', '--input', 'examples/basic-document.json', '--output', output])
    assert.notEqual(duplicate.code, 0)
    assert.deepEqual(await readFile(output), first)
  } finally {
    await unlink(output).catch(() => {})
    await rmdir(directory)
  }
})

test('CLI streams from stdin and embeds mapped attachment bytes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'norio-skill-stream-'))
  const streamOutput = join(directory, 'stream.nordox')
  const assetOutput = join(directory, 'asset.nordox')
  try {
    const stream = await readFile(join(skill, 'examples/streamed-document.ndjson'))
    const result = await run(['create', '--stream', '--input', '-', '--output', streamOutput], stream)
    assert.equal(result.code, 0, result.stderr)
    assert.equal((await unpackNordox(await readFile(streamOutput))).document.content[0].type, 'heading')
    const embedded = await run([
      'create', '--input', 'examples/embedded-file-document.json', '--output', assetOutput,
      '--asset-files', 'embed', '--resource-map', 'examples/resource-map.json',
    ])
    assert.equal(embedded.code, 0, embedded.stderr)
    const unpacked = await unpackNordox(await readFile(assetOutput))
    assert.equal(unpacked.resources.get('file1').resource.storage, 'embedded')
    assert.deepEqual(Array.from(unpacked.resources.get('file1').bytes), Array.from(await readFile(join(skill, 'examples/sample-attachment.txt'))))
  } finally {
    await unlink(streamOutput).catch(() => {})
    await unlink(assetOutput).catch(() => {})
    await rmdir(directory)
  }
})
