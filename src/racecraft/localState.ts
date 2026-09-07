import type { StrivingSnapshot } from './types'
import { enforceDisplayBoundary } from './displayBoundary'

const STORAGE_KEY = 'striving-observation.snapshot.v1'
const LEGACY_STORAGE_KEY = 'striving-observation.snapshot.v0'

function isSnapshot(value: unknown): value is StrivingSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<StrivingSnapshot>
  return snapshot.doctrine === 'Striving Observation' && Array.isArray(snapshot.seasons) && Array.isArray(snapshot.races)
}

export function loadLocalSnapshot(): StrivingSnapshot | null {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY)
    if (current) {
      const parsed = JSON.parse(current) as unknown
      return isSnapshot(parsed) ? enforceDisplayBoundary(parsed) : null
    }

    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return null

    const parsed = JSON.parse(legacy) as unknown
    if (!isSnapshot(parsed)) return null

    // Only migrate legacy state that already carries the artifact-aware schema.
    // Older demo snapshots are intentionally ignored so stale demo data cannot
    // mask newer backfill bundled with the renderer.
    if (!Array.isArray(parsed.artifacts)) return null

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    return enforceDisplayBoundary(parsed)
  } catch {
    return null
  }
}

export function saveLocalSnapshot(snapshot: StrivingSnapshot): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function clearLocalSnapshot(): void {
  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem(LEGACY_STORAGE_KEY)
}

export async function importSnapshotFile(file: File): Promise<StrivingSnapshot> {
  const text = await file.text()
  const parsed = JSON.parse(text) as unknown

  if (!isSnapshot(parsed)) {
    throw new Error('Not a valid Striving Observation snapshot')
  }

  saveLocalSnapshot(parsed)
  return enforceDisplayBoundary(parsed)
}
