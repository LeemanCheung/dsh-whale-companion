import { Service, type Context } from '@deepseek-ai/cordis'
import { describe, expect, it, vi } from 'vitest'
import { WhaleCompanionService } from '../src/index.ts'
import { initialWhaleState, type WhaleState } from '../src/spec.ts'

class TestableWhaleCompanionService extends WhaleCompanionService {
  initialize(): Promise<void> { return this[Service.init]() }
}

const at = Date.UTC(2026, 8, 5, 9)
const session = { id: 'private-session-id', header: { createdAt: at } }
const event = (seq: number, type = 'user/message', time = at) => ({ seq, type, time, message: 'private-event-content' })

async function harness(initial = initialWhaleState()) {
  let state = initial
  let dispose!: () => Promise<void>
  const listeners = new Map<string, (...args: unknown[]) => Promise<void>>()
  const put = vi.fn(async (_key: string, value: WhaleState) => { state = value })
  const close = vi.fn(async () => undefined)
  const warn = vi.fn()
  // Only the external storage and event bus are replaced. Service construction,
  // decorators, serialization, schema checks and the queue run unchanged.
  const ctx = {
    reflect: { provide: vi.fn() },
    storageDomain: { open: async () => ({ table: () => ({ get: () => state, put }), close }) },
    logger: { warn },
    on: (name: string, listener: (...args: unknown[]) => Promise<void>) => { listeners.set(name, listener) },
    effect: (setup: () => () => Promise<void>) => { dispose = setup() },
  } as unknown as Context
  const service = new TestableWhaleCompanionService(ctx)
  await service.initialize()
  const emit = (name: string, ...args: unknown[]) => listeners.get(name)!(...args)
  return { service, put, close, warn, emit, dispose: () => dispose() }
}

describe('durable whale event handling', () => {
  it.each([
    ['session/created', undefined, 'sessions'],
    ['session/event', 'user/message', 'turns'],
    ['session/event', 'tool/result', 'tools'],
  ] as const)('contains %s %s storage failures and accepts later events', async (name, type, counter) => {
    const personalized = { ...initialWhaleState(), name: '星潮', skin: 'aurora' as const, position: { x: 0.8, y: 0.4 } }
    const h = await harness(personalized)
    h.put.mockRejectedValueOnce(new Error('private-event-content at C:/private/storage'))
    await expect(h.emit(name, session, event(1, type))).resolves.toBeUndefined()
    expect(h.warn).toHaveBeenCalledOnce()
    expect(JSON.stringify(h.warn.mock.calls)).not.toMatch(/private|storage|C:\//u)
    expect(await h.service.get()).toEqual(personalized)

    await expect(h.emit(name, session, event(2, type))).resolves.toBeUndefined()
    const recovered = await h.service.get()
    expect(recovered[counter]).toBe(1)
    expect(recovered.name).toBe(personalized.name)
    expect(recovered.skin).toBe(personalized.skin)
    expect(recovered.position).toEqual(personalized.position)
    await h.dispose()
    expect(h.close).toHaveBeenCalledOnce()
  })

  it('contains synchronous metadata conversion errors without logging event data', async () => {
    const h = await harness()
    await expect(h.emit('session/event', session, event(1, 'user/message', Number.NaN))).resolves.toBeUndefined()
    expect(h.put).not.toHaveBeenCalled()
    expect(h.warn).toHaveBeenCalledOnce()
    expect(JSON.stringify(h.warn.mock.calls)).not.toContain(session.id)
    await h.emit('session/event', session, event(2))
    expect((await h.service.get()).turns).toBe(1)
    await h.dispose()
  })

  it('drains accepted writes before closing and refuses mutations arriving during shutdown', async () => {
    const h = await harness()
    const firstWrite = Promise.withResolvers<void>()
    const normalPut = h.put.getMockImplementation()!
    h.put.mockImplementationOnce(async (key, value) => { await firstWrite.promise; await normalPut(key, value) })
    const first = h.emit('session/event', session, event(1))
    const second = h.emit('session/event', session, event(2, 'tool/result'))
    const renamed = h.service.setName('星潮')
    await Promise.resolve()
    expect(h.put).toHaveBeenCalledOnce()

    const closing = h.dispose()
    await Promise.resolve()
    expect(h.close).not.toHaveBeenCalled()
    await expect(h.emit('session/event', session, event(3))).resolves.toBeUndefined()
    await expect(h.service.setName('关闭后的名字')).rejects.toThrow('closing')
    firstWrite.resolve()
    await Promise.all([first, second, renamed, closing])
    expect(h.put).toHaveBeenCalledTimes(3)
    expect(h.close).toHaveBeenCalledOnce()
    expect(h.close.mock.invocationCallOrder[0]).toBeGreaterThan(h.put.mock.invocationCallOrder[2]!)
    expect(await h.service.get()).toMatchObject({ turns: 1, tools: 1, name: '星潮' })
  })

  it('lets session flush await accepted writes without closing the domain', async () => {
    const h = await harness()
    const pending = Promise.withResolvers<void>()
    const normalPut = h.put.getMockImplementation()!
    h.put.mockImplementationOnce(async (key, value) => { await pending.promise; await normalPut(key, value) })
    const recording = h.emit('session/event', session, event(1))
    let flushed = false
    const flushing = h.emit('session/flush', session).then(() => { flushed = true })
    await Promise.resolve()
    expect(flushed).toBe(false)
    pending.resolve()
    await Promise.all([recording, flushing])
    expect(flushed).toBe(true)
    expect(h.close).not.toHaveBeenCalled()
    expect((await h.service.get()).turns).toBe(1)
    await h.dispose()
  })

  it('still reports a failed explicit save to its caller and leaves the queue usable', async () => {
    const h = await harness()
    h.put.mockRejectedValueOnce(new Error('save failed'))
    await expect(h.service.setName('星潮')).rejects.toThrow('save failed')
    expect((await h.service.get()).name).toBe('小蓝')
    await expect(h.service.setName('星潮')).resolves.toMatchObject({ name: '星潮' })
    await h.dispose()
  })
})
