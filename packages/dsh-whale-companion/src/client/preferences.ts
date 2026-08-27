export type PresentationMode = 'quiet' | 'standard' | 'lively'
export type PresentationPreferences = Readonly<{ mode: PresentationMode, reduceMotion: boolean }>
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const DEFAULT_PRESENTATION: PresentationPreferences = { mode: 'standard', reduceMotion: false }
export const PRESENTATION_STORAGE_KEY = 'dsh-whale-companion:presentation:v1'

export function parsePresentation(raw: string | null): PresentationPreferences {
  if (raw === null) return DEFAULT_PRESENTATION
  try {
    const value = JSON.parse(raw) as { mode?: unknown, reduceMotion?: unknown }
    if ((value.mode !== 'quiet' && value.mode !== 'standard' && value.mode !== 'lively') || typeof value.reduceMotion !== 'boolean') return DEFAULT_PRESENTATION
    return { mode: value.mode, reduceMotion: value.reduceMotion }
  } catch {
    return DEFAULT_PRESENTATION
  }
}

export function readPresentation(storage: StorageLike | undefined): Readonly<{ value: PresentationPreferences, available: boolean }> {
  if (storage === undefined) return { value: DEFAULT_PRESENTATION, available: false }
  try { return { value: parsePresentation(storage.getItem(PRESENTATION_STORAGE_KEY)), available: true } } catch { return { value: DEFAULT_PRESENTATION, available: false } }
}

export function writePresentation(storage: StorageLike | undefined, value: PresentationPreferences): boolean {
  if (storage === undefined) return false
  try { storage.setItem(PRESENTATION_STORAGE_KEY, JSON.stringify(value)); return true } catch { return false }
}

export function browserStorage(): StorageLike | undefined {
  try { return window.localStorage } catch { return undefined }
}
