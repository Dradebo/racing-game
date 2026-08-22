import type { StrivingSnapshot } from './types'

const EMPTY_SNAPSHOT: StrivingSnapshot = {
  generatedAt: new Date(0).toISOString(),
  doctrine: 'Striving Observation',
  seasons: [],
  races: [],
  recurringTemplates: [],
}

/**
 * The renderer is public; striving state is not.
 *
 * Point VITE_RACECRAFT_SNAPSHOT_URL at the canonical state service when one is
 * configured. Until then the UI can boot safely with an empty championship.
 */
export async function loadStrivingSnapshot(): Promise<StrivingSnapshot> {
  const url = import.meta.env.VITE_RACECRAFT_SNAPSHOT_URL

  if (!url) return EMPTY_SNAPSHOT

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error(`Racecraft state unavailable (${response.status})`)
  }

  return (await response.json()) as StrivingSnapshot
}
