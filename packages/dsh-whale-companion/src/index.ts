import { createHmac, randomBytes } from 'node:crypto'
import { Context, Service } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import {
  claimExpedition, equipSpecies, exportCommunitySong, exportVisitorBottle, exportWhale, importCommunitySong, importVisitorBottle,
  importWhale, loadRoomPreset, placeCollectible, postcardView, reduceWhale, removeCommunityPeer, resetWhale, saveRoomPreset,
  setCommunity, startExpedition, type WhaleObservation, type WhalePostcard, type WhaleVisitorBottle,
} from './reducer.ts'
import {
  companionNameSchema, initialWhaleState, skinSchema, whaleAliasIdSchema, whaleCollectibleIdSchema, whaleDomainSpec, whalePositionSchema,
  whaleRoomSlotIdSchema, whaleSpeciesIdSchema, whaleStateSchema, type WhalePosition, type WhaleState,
} from './spec.ts'

export * from './catalog.ts'
export * from './reducer.ts'
export * from './spec.ts'
export * from './species.ts'
export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    whaleCompanion: WhaleCompanionService
  }
}

/**
 * Local whale progression derived from event type, sequence, timestamp, and Session id only.
 * Event contents never enter this service; recent receipt digests are intentionally bounded.
 */
export class WhaleCompanionService extends TypertRemoteService {
  static inject = ['storageDomain', 'sessions']
  private table?: KvTable<string, WhaleState>
  private tail: Promise<void> = Promise.resolve()
  private accepting = true
  private readonly receiptKey = randomBytes(32)

  constructor(ctx: Context) {
    super(ctx, 'whaleCompanion')
  }

  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(whaleDomainSpec)
    this.table = domain.table('state')
    this.ctx.on('session/created', session => {
      const createdAt = session.header.createdAt
      const at = typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : Date.now()
      void this.record({ checkpoint: this.receipt('session-created', session.id, String(createdAt)), kind: 'session', day: dayOf(at), at })
    })
    this.ctx.on('session/event', (session, event) => { void this.recordEvent(session, event) })
    this.ctx.effect(() => async () => {
      this.accepting = false
      await this.tail
      await domain.close()
    }, 'whale-companion: drain and close durable domain')
  }

  @Remote('get')
  async get(): Promise<WhaleState> { await this.tail; return this.state() }

  @Remote('getV5')
  async getV5(): Promise<WhaleState> { return this.get() }

  @Remote('setSkin')
  async setSkin(skin: WhaleState['skin']): Promise<WhaleState> {
    const parsed = skinSchema.parse(skin)
    return this.enqueue(() => this.commit({ ...this.state(), skin: parsed, updatedAt: Date.now() }))
  }

  @Remote('setName')
  async setName(name: string): Promise<WhaleState> {
    const parsed = companionNameSchema.parse(name)
    return this.enqueue(() => this.commit({ ...this.state(), name: parsed, updatedAt: Date.now() }))
  }

  @Remote('setPosition')
  async setPosition(position: WhalePosition): Promise<WhaleState> {
    const parsed = whalePositionSchema.parse(position)
    return this.enqueue(() => this.commit({ ...this.state(), position: parsed, updatedAt: Date.now() }))
  }

  @Remote('setSpeciesV5')
  async setSpecies(species: WhaleState['species']): Promise<WhaleState> {
    const parsed = whaleSpeciesIdSchema.parse(species)
    return this.enqueue(() => this.commit(equipSpecies(this.state(), parsed)))
  }

  @Remote('placeCollectibleV5')
  async placeCollectible(slot: string, collectible: string | null): Promise<WhaleState> {
    const parsedSlot = whaleRoomSlotIdSchema.parse(slot)
    const parsedCollectible = collectible === null ? null : whaleCollectibleIdSchema.parse(collectible)
    return this.enqueue(() => this.commit(placeCollectible(this.state(), parsedSlot, parsedCollectible)))
  }

  @Remote('saveRoomPresetV5')
  async saveRoomPreset(): Promise<WhaleState> { return this.enqueue(() => this.commit(saveRoomPreset(this.state()))) }

  @Remote('loadRoomPresetV5')
  async loadRoomPreset(index: number): Promise<WhaleState> { return this.enqueue(() => this.commit(loadRoomPreset(this.state(), index))) }

  @Remote('startExpeditionV5')
  async startExpedition(expeditionId: string, species: WhaleState['species'], goal: number): Promise<WhaleState> {
    const parsedSpecies = whaleSpeciesIdSchema.parse(species)
    if (!Number.isSafeInteger(goal)) throw new Error('远征目标必须是安全整数')
    return this.enqueue(() => this.commit(startExpedition(this.state(), expeditionId, parsedSpecies, goal)))
  }

  @Remote('claimExpeditionV5')
  async claimExpedition(): Promise<WhaleState> { return this.enqueue(() => this.commit(claimExpedition(this.state()))) }

  @Remote('exportVisitorBottleV5')
  async exportVisitorBottle(): Promise<string> { await this.tail; return exportVisitorBottle(this.state()) }

  @Remote('importVisitorBottleV5')
  async importVisitorBottle(payload: string): Promise<WhaleVisitorBottle> { return importVisitorBottle(payload) }

  @Remote('setCommunityV5')
  async setCommunity(enabled: boolean, aliasId: string): Promise<WhaleState> {
    return this.enqueue(() => this.commit(setCommunity(this.state(), enabled, whaleAliasIdSchema.parse(aliasId))))
  }

  @Remote('exportCommunitySongV5')
  async exportCommunitySong(): Promise<string> { await this.tail; return exportCommunitySong(this.state()) }

  @Remote('importCommunitySongV5')
  async importCommunitySong(payload: string): Promise<WhaleState> { return this.enqueue(() => this.commit(importCommunitySong(this.state(), payload))) }

  @Remote('removeCommunityPeerV5')
  async removeCommunityPeer(aliasId: string): Promise<WhaleState> { return this.enqueue(() => this.commit(removeCommunityPeer(this.state(), whaleAliasIdSchema.parse(aliasId)))) }

  @Remote('postcardV5')
  async postcard(): Promise<WhalePostcard> { await this.tail; return postcardView(this.state()) }

  @Remote('export')
  async export(): Promise<string> { await this.tail; return exportWhale(this.state()) }

  @Remote('import')
  async import(payload: string): Promise<WhaleState> { return this.enqueue(() => this.commit(importWhale(payload))) }

  @Remote('reset')
  async reset(): Promise<WhaleState> { return this.enqueue(() => this.commit(resetWhale())) }

  private recordEvent(session: Session, event: SessionEvent): Promise<void> {
    const kind = event.type === 'tool/result' ? 'tool' : event.type === 'user/message' ? 'turn' : undefined
    if (kind === undefined) return Promise.resolve()
    return this.record({ checkpoint: this.receipt('session-event', session.id, String(event.seq), event.type), kind, day: dayOf(event.time), at: event.time })
  }

  private record(observation: WhaleObservation): Promise<void> {
    if (!this.accepting) return Promise.resolve()
    return this.enqueue(async () => { await this.commit(reduceWhale(this.state(), observation)) })
  }

  private receipt(scope: 'session-created' | 'session-event', ...parts: readonly string[]): string {
    return `v5:${createHmac('sha256', this.receiptKey).update(`${scope}\0${parts.join('\0')}`, 'utf8').digest('base64url')}`
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }

  private state(): WhaleState { return this.table?.get('global') ?? initialWhaleState() }

  private async commit(state: WhaleState): Promise<WhaleState> {
    const next = Object.freeze(whaleStateSchema.parse(state))
    await this.requireTable().put('global', next)
    return next
  }

  private requireTable(): KvTable<string, WhaleState> {
    if (this.table === undefined) throw new Error('whale companion is not initialized')
    return this.table
  }
}

function dayOf(time: number): string { return new Date(time).toISOString().slice(0, 10) }

export default WhaleCompanionService
