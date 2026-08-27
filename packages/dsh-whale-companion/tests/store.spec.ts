import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initialWhaleState } from '../src/spec.ts'
import { WhaleStore, type WhaleApi } from '../src/client/store.ts'

beforeEach(() => {
  vi.stubGlobal('window', { setInterval: vi.fn(() => 1), clearInterval: vi.fn() })
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })
})
afterEach(() => { vi.unstubAllGlobals() })

function api(getV5: WhaleApi['getV5']): WhaleApi { return { getV5 } as WhaleApi }

describe('shared whale polling store', () => {
  it('starts one poll lifecycle for multiple subscribers', async () => {
    const getV5 = vi.fn(async () => initialWhaleState())
    const store = new WhaleStore(api(getV5))
    const first = store.subscribe(() => undefined)
    const second = store.subscribe(() => undefined)
    await Promise.resolve()
    expect(getV5).toHaveBeenCalledTimes(1)
    expect(window.setInterval).toHaveBeenCalledTimes(1)
    first()
    expect(window.clearInterval).not.toHaveBeenCalled()
    second()
    expect(window.clearInterval).toHaveBeenCalledTimes(1)
  })

  it('does not let an older poll response overwrite a mutation result', async () => {
    let resolvePoll!: (state: ReturnType<typeof initialWhaleState>) => void
    const poll = new Promise<ReturnType<typeof initialWhaleState>>(resolve => { resolvePoll = resolve })
    const store = new WhaleStore(api(() => poll))
    const dispose = store.subscribe(() => undefined)
    const newer = { ...initialWhaleState(), xp: 10 }
    await store.mutate(async () => newer)
    resolvePoll(initialWhaleState())
    await poll
    await Promise.resolve()
    expect(store.getSnapshot().state?.xp).toBe(10)
    dispose()
  })

  it('invalidates a poll that starts while a mutation is pending', async () => {
    let resolvePoll!: (state: ReturnType<typeof initialWhaleState>) => void
    let resolveMutation!: (state: ReturnType<typeof initialWhaleState>) => void
    const poll = new Promise<ReturnType<typeof initialWhaleState>>(resolve => { resolvePoll = resolve })
    const mutation = new Promise<ReturnType<typeof initialWhaleState>>(resolve => { resolveMutation = resolve })
    const getV5 = vi.fn<WhaleApi['getV5']>().mockResolvedValueOnce(initialWhaleState()).mockImplementationOnce(() => poll)
    const store = new WhaleStore(api(getV5))
    const dispose = store.subscribe(() => undefined)
    await Promise.resolve(); await Promise.resolve()
    const pendingMutation = store.mutate(() => mutation)
    store.retry()
    await Promise.resolve()
    const newer = { ...initialWhaleState(), xp: 20 }
    resolveMutation(newer)
    await pendingMutation
    resolvePoll(initialWhaleState())
    await poll; await Promise.resolve()
    expect(store.getSnapshot().state?.xp).toBe(20)
    dispose()
  })
})
