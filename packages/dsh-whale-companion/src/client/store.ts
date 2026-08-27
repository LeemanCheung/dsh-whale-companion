import * as React from 'react'
import type { TypertRemoteNamespaceMap } from '@deepseek-ai/dsh-typert-protocol'
import type { WhalePostcard, WhaleVisitorBottle } from '../reducer.ts'
import type { WhalePosition, WhaleState } from '../spec.ts'
import type { WhaleSpeciesId } from '../species.ts'

export type RawWhaleApi = TypertRemoteNamespaceMap['whaleCompanion'] & { setName: (name: string) => Promise<{ ok: true, value: WhaleState } | { ok: false, error: { message: string } }> }
export type WhaleApi = {
  getV5: () => Promise<WhaleState>
  setSkin: (skin: WhaleState['skin']) => Promise<WhaleState>
  setName: (name: string) => Promise<WhaleState>
  setPosition: (position: WhalePosition) => Promise<WhaleState>
  setSpeciesV5: (species: WhaleSpeciesId) => Promise<WhaleState>
  placeCollectibleV5: (slot: string, collectible: string | null) => Promise<WhaleState>
  saveRoomPresetV5: () => Promise<WhaleState>
  loadRoomPresetV5: (index: number) => Promise<WhaleState>
  startExpeditionV5: (id: string, species: WhaleSpeciesId, goal: number) => Promise<WhaleState>
  claimExpeditionV5: () => Promise<WhaleState>
  exportVisitorBottleV5: () => Promise<string>
  importVisitorBottleV5: (payload: string) => Promise<WhaleVisitorBottle>
  setCommunityV5: (enabled: boolean, aliasId: string) => Promise<WhaleState>
  exportCommunitySongV5: () => Promise<string>
  importCommunitySongV5: (payload: string) => Promise<WhaleState>
  removeCommunityPeerV5: (aliasId: string) => Promise<WhaleState>
  postcardV5: () => Promise<WhalePostcard>
  export: () => Promise<string>
  import: (payload: string) => Promise<WhaleState>
  reset: () => Promise<WhaleState>
}
export type WhaleSnapshot = Readonly<{ state?: WhaleState, error?: string, refreshing: boolean }>

async function unwrap<T>(pending: Promise<{ ok: true, value: T } | { ok: false, error: { message: string } }>): Promise<T> {
  const result = await pending
  if (!result.ok) throw new Error(result.error.message)
  return result.value
}

export function apiFrom(raw: RawWhaleApi): WhaleApi {
  return {
    getV5: () => unwrap(raw.getV5()), setSkin: skin => unwrap(raw.setSkin(skin)), setName: name => unwrap(raw.setName(name)), setPosition: position => unwrap(raw.setPosition(position)),
    setSpeciesV5: species => unwrap(raw.setSpeciesV5(species)), placeCollectibleV5: (slot, collectible) => unwrap(raw.placeCollectibleV5(slot, collectible)),
    saveRoomPresetV5: () => unwrap(raw.saveRoomPresetV5()), loadRoomPresetV5: index => unwrap(raw.loadRoomPresetV5(index)),
    startExpeditionV5: (id, species, goal) => unwrap(raw.startExpeditionV5(id, species, goal)), claimExpeditionV5: () => unwrap(raw.claimExpeditionV5()),
    exportVisitorBottleV5: () => unwrap(raw.exportVisitorBottleV5()), importVisitorBottleV5: payload => unwrap(raw.importVisitorBottleV5(payload)),
    setCommunityV5: (enabled, aliasId) => unwrap(raw.setCommunityV5(enabled, aliasId)), exportCommunitySongV5: () => unwrap(raw.exportCommunitySongV5()),
    importCommunitySongV5: payload => unwrap(raw.importCommunitySongV5(payload)), removeCommunityPeerV5: aliasId => unwrap(raw.removeCommunityPeerV5(aliasId)),
    postcardV5: () => unwrap(raw.postcardV5()), export: () => unwrap(raw.export()), import: payload => unwrap(raw.import(payload)), reset: () => unwrap(raw.reset()),
  }
}

export class WhaleStore {
  private snapshot: WhaleSnapshot = { refreshing: false }
  private readonly listeners = new Set<() => void>()
  private timer: number | undefined
  private inFlight: Promise<void> | undefined
  private mutationEpoch = 0

  constructor(private readonly api: WhaleApi) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    if (this.listeners.size === 1) this.start()
    return () => { this.listeners.delete(listener); if (this.listeners.size === 0) this.stop() }
  }

  getSnapshot = (): WhaleSnapshot => this.snapshot

  retry = (): void => { void this.refresh() }

  async mutate(work: () => Promise<WhaleState>): Promise<WhaleState> {
    this.mutationEpoch += 1
    const epoch = this.mutationEpoch
    try {
      const state = await work()
      if (epoch === this.mutationEpoch) { this.mutationEpoch += 1; this.publish({ state, refreshing: false }) }
      return state
    } catch (reason) {
      if (epoch === this.mutationEpoch) { this.mutationEpoch += 1; this.publish({ ...this.snapshot, error: message(reason), refreshing: false }) }
      throw reason
    }
  }

  private start(): void {
    void this.refresh()
    this.timer = window.setInterval(() => { if (!document.hidden) void this.refresh() }, 5_000)
    document.addEventListener('visibilitychange', this.onVisibility)
  }

  private stop(): void {
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.timer = undefined
    document.removeEventListener('visibilitychange', this.onVisibility)
  }

  private readonly onVisibility = (): void => { if (!document.hidden) void this.refresh() }

  private refresh(): Promise<void> {
    if (this.inFlight !== undefined) return this.inFlight
    const mutationAtStart = this.mutationEpoch
    this.publish({ ...this.snapshot, refreshing: true })
    this.inFlight = this.api.getV5().then(state => {
      if (mutationAtStart === this.mutationEpoch) this.publish({ state, refreshing: false })
    }).catch(reason => {
      if (mutationAtStart === this.mutationEpoch) this.publish({ ...this.snapshot, error: message(reason), refreshing: false })
    }).finally(() => { this.inFlight = undefined })
    return this.inFlight
  }

  private publish(snapshot: WhaleSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}

const stores = new WeakMap<WhaleApi, WhaleStore>()
export function storeFor(api: WhaleApi): WhaleStore {
  const current = stores.get(api)
  if (current !== undefined) return current
  const store = new WhaleStore(api)
  stores.set(api, store)
  return store
}

export function useWhale(api: WhaleApi): WhaleSnapshot {
  const store = storeFor(api)
  return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}

function message(reason: unknown): string { return reason instanceof Error ? reason.message : String(reason) }
