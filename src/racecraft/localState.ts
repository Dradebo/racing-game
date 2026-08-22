import type { StrivingSnapshot } from './types'

const STORAGE_KEY = 'striving-observation.snapshot.v0'

export function loadLocalSnapshot(): StrivingSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StrivingSnapshot) : null
  } catch {
    return null
  }
}

export function saveLocalSnapshot(snapshot: StrivingSnapshot): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearLocalSnapshot(): void {
  window.localStorage.removeItem(STORAGE_KEY)
}

export async function importSnapshotFile(file: File): Promise<StrivingSnapshot> {
  const text = await file.text()
  const parsed = JSON.parse(text) as StrivingSnapshot

  if (parsed.doctrine !== 'Striving Observation' || !Array.isArray(parsed.seasons) || !Array.isArray(parsed.races)) {
    throw new Error('Not a valid Striving Observation snapshot')
  }

  saveLocalSnapshot(parsed)
  return parsed
}
