import * as React from 'react'
import { DEFAULT_PRESENTATION, browserStorage, readPresentation, writePresentation, type PresentationPreferences } from './preferences.ts'

export type PresentationSnapshot = Readonly<{ value: PresentationPreferences, storageAvailable: boolean, systemReducedMotion: boolean }>

class PresentationStore {
  private snapshot: PresentationSnapshot = { value: DEFAULT_PRESENTATION, storageAvailable: true, systemReducedMotion: false }
  private readonly listeners = new Set<() => void>()
  private initialized = false
  private media: MediaQueryList | undefined

  subscribe = (listener: () => void): (() => void) => {
    this.ensureInitialized()
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): PresentationSnapshot => { this.ensureInitialized(); return this.snapshot }

  set(value: PresentationPreferences): boolean {
    const storageAvailable = writePresentation(browserStorage(), value)
    this.publish({ ...this.snapshot, value, storageAvailable })
    return storageAvailable
  }

  private ensureInitialized(): void {
    if (this.initialized || typeof window === 'undefined') return
    this.initialized = true
    const stored = readPresentation(browserStorage())
    this.media = window.matchMedia('(prefers-reduced-motion: reduce)')
    this.snapshot = { value: stored.value, storageAvailable: stored.available, systemReducedMotion: this.media.matches }
    this.media.addEventListener('change', this.onMotionChange)
  }

  private readonly onMotionChange = (event: MediaQueryListEvent): void => { this.publish({ ...this.snapshot, systemReducedMotion: event.matches }) }

  private publish(snapshot: PresentationSnapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }
}

export const presentationStore = new PresentationStore()
export function usePresentation(): PresentationSnapshot { return React.useSyncExternalStore(presentationStore.subscribe, presentationStore.getSnapshot, presentationStore.getSnapshot) }
