const assert = require('assert')

process.env.NODE_ENV = process.env.NODE_ENV || 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

// Pure helper tests — no DB, no HTTP, no network.
const agentRouter = require('../routes/agent')
const { fetchWithTimeout, sseSend, sseComment } = agentRouter._internals

function fakeRes() {
  return {
    chunks: [],
    writableEnded: false,
    destroyed: false,
    write(s) { this.chunks.push(s); return true },
    flush() {},
    body() { return this.chunks.join('') },
  }
}

describe('agent streaming helpers', function () {
  describe('SSE wire format', function () {
    it('sseSend writes a JSON data frame terminated by a blank line', function () {
      const res = fakeRes()
      sseSend(res, { type: 'status', text: 'Running actions' })
      assert.strictEqual(res.body(), 'data: {"type":"status","text":"Running actions"}\n\n')
    })

    it('a data frame parses back to the original event (round-trip)', function () {
      const res = fakeRes()
      const event = { type: 'tool', entry: { tool: 'create_template', name: 'VAV-TEMPLATE', success: true } }
      sseSend(res, event)
      const frame = res.body().trimEnd()
      const json = frame.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('\n')
      assert.deepStrictEqual(JSON.parse(json), event)
    })

    it('sseComment writes a heartbeat comment frame (no data line)', function () {
      const res = fakeRes()
      sseComment(res, 'ping')
      assert.strictEqual(res.body(), ': ping\n\n')
      // The client parser must ignore frames with no `data:` line.
      const hasDataLine = res.body().split('\n').some((l) => l.startsWith('data:'))
      assert.strictEqual(hasDataLine, false)
    })

    it('writers no-op once the socket is ended or destroyed', function () {
      const ended = fakeRes(); ended.writableEnded = true
      const destroyed = fakeRes(); destroyed.destroyed = true
      sseSend(ended, { a: 1 }); sseComment(ended, 'x')
      sseSend(destroyed, { a: 1 }); sseComment(destroyed, 'x')
      assert.strictEqual(ended.body(), '')
      assert.strictEqual(destroyed.body(), '')
    })
  })

  describe('fetchWithTimeout', function () {
    it('rejects with a 504-tagged error when the call exceeds the budget', async function () {
      const orig = global.fetch
      // Never resolves on its own; only the abort signal ends it.
      global.fetch = (_url, opts) => new Promise((_resolve, reject) => {
        opts.signal.addEventListener('abort', () => {
          const e = new Error('aborted'); e.name = 'AbortError'; reject(e)
        })
      })
      try {
        await assert.rejects(
          () => fetchWithTimeout('https://example.test', {}, 20),
          (err) => { assert.strictEqual(err.status, 504); return true },
        )
      } finally {
        global.fetch = orig
      }
    })

    it('returns the response when it resolves within the budget', async function () {
      const orig = global.fetch
      global.fetch = async () => ({ ok: true, status: 200 })
      try {
        const r = await fetchWithTimeout('https://example.test', {}, 1000)
        assert.strictEqual(r.status, 200)
      } finally {
        global.fetch = orig
      }
    })
  })
})
