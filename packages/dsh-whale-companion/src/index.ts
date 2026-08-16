import { Context, Service } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { KvTable } from '@deepseek-ai/dsh-storage-domain'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { exportWhale, importWhale, reduceWhale, resetWhale, type WhaleObservation } from './reducer.ts'
import {
  initialWhaleState,
  skinSchema,
  whaleDomainSpec,
  whalePositionSchema,
  type WhalePosition,
  type WhaleState,
} from './spec.ts'

export * from './reducer.ts'
export * from './spec.ts'
export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    whaleCompanion: WhaleCompanionService
  }
}

/** Local progress derived only from event type, sequence, timestamp, and Session id. */
export class WhaleCompanionService extends TypertRemoteService {
  static inject = ['storageDomain', 'sessions']
  private table?: KvTable<string, WhaleState>
  private tail: Promise<void> = Promise.resolve()
  private accepting = true

  constructor(ctx: Context) {
    super(ctx, 'whaleCompanion')
  }

  protected async [Service.init](): Promise<void> {
    const domain = await this.ctx.storageDomain.open(whaleDomainSpec)
    this.table = domain.table('state')
    this.ctx.on('session/created', session => {
      const at = Date.now()
      void this.record(session, {
        checkpoint: `session:${session.id}:${session.header.createdAt}`,
        kind: 'session',
        day: dayOf(at),
        at,
      })
    })
    this.ctx.on('session/event', (session, event) => { void this.recordEvent(session, event) })
    this.ctx.effect(() => async () => {
      this.accepting = false
      await this.tail
      await domain.close()
    }, 'whale-companion: drain and close durable domain')
  }

  @Remote('get')
  async get(): Promise<WhaleState> {
    await this.tail
    return this.state()
  }

  @Remote('setSkin')
  async setSkin(skin: WhaleState['skin']): Promise<WhaleState> {
    const parsed = skinSchema.parse(skin)
    return this.enqueue(() => this.commit({ ...this.state(), skin: parsed, updatedAt: Date.now() }))
  }

  @Remote('setPosition')
  async setPosition(position: WhalePosition): Promise<WhaleState> {
    const parsed = whalePositionSchema.parse(position)
    return this.enqueue(() => this.commit({ ...this.state(), position: parsed, updatedAt: Date.now() }))
  }

  @Remote('export')
  async export(): Promise<string> {
    await this.tail
    return exportWhale(this.state())
  }

  @Remote('import')
  async import(payload: string): Promise<WhaleState> {
    const imported = importWhale(payload)
    return this.enqueue(() => this.commit(imported))
  }

  @Remote('reset')
  async reset(): Promise<WhaleState> {
    return this.enqueue(() => this.commit(resetWhale()))
  }

  private recordEvent(session: Session, event: SessionEvent): Promise<void> {
    const kind = event.type === 'tool/result' ? 'tool' : event.type === 'user/message' ? 'turn' : undefined
    if (kind === undefined) return Promise.resolve()
    return this.record(session, {
      checkpoint: `${session.id}:${event.seq}`,
      kind,
      day: dayOf(event.time),
      at: event.time,
    })
  }

  private record(_session: Session, observation: WhaleObservation): Promise<void> {
    if (!this.accepting) return Promise.resolve()
    return this.enqueue(async () => {
      await this.commit(reduceWhale(this.state(), observation))
    })
  }

  private enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = this.tail.then(work)
    this.tail = result.then(() => undefined, () => undefined)
    return result
  }

  private state(): WhaleState {
    return this.table?.get('global') ?? initialWhaleState()
  }

  private async commit(state: WhaleState): Promise<WhaleState> {
    const next = Object.freeze({ ...state })
    await this.requireTable().put('global', next)
    return next
  }

  private requireTable(): KvTable<string, WhaleState> {
    if (this.table === undefined) throw new Error('whale companion is not initialized')
    return this.table
  }
}

function dayOf(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

export default WhaleCompanionService
