import { CurvePath, LineCurve3, Vector3 } from 'three'

export const CANONICAL_LAP_STORAGE_KEY = 'striving-observation.canonical-lap.v1'
export const CANONICAL_LAP_SAVED_EVENT = 'striving-observation:canonical-lap-saved'

export type LapTraceSample = {
  t: number
  position: [number, number, number]
  quaternion: [number, number, number, number]
}

export type CanonicalLapTrace = {
  version: 1
  source: 'native_capture'
  capturedAt: string
  durationMs: number
  checkpointAtMs?: number
  samples: LapTraceSample[]
}

export type CanonicalLapRoute = CurvePath<Vector3>

function isSample(value: unknown): value is LapTraceSample {
  if (!value || typeof value !== 'object') return false
  const sample = value as Partial<LapTraceSample>
  return typeof sample.t === 'number' && Array.isArray(sample.position) && sample.position.length === 3 && Array.isArray(sample.quaternion) && sample.quaternion.length === 4
}

export function isCanonicalLapTrace(value: unknown): value is CanonicalLapTrace {
  if (!value || typeof value !== 'object') return false
  const trace = value as Partial<CanonicalLapTrace>
  return trace.version === 1 && trace.source === 'native_capture' && typeof trace.durationMs === 'number' && Array.isArray(trace.samples) && trace.samples.length > 2 && trace.samples.every(isSample)
}

export function loadCanonicalLap(): CanonicalLapTrace | null {
  try {
    const raw = window.localStorage.getItem(CANONICAL_LAP_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return isCanonicalLapTrace(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveCanonicalLap(trace: CanonicalLapTrace): void {
  window.localStorage.setItem(CANONICAL_LAP_STORAGE_KEY, JSON.stringify(trace))
  window.dispatchEvent(new CustomEvent<CanonicalLapTrace>(CANONICAL_LAP_SAVED_EVENT, { detail: trace }))
}

export function clearCanonicalLap(): void {
  window.localStorage.removeItem(CANONICAL_LAP_STORAGE_KEY)
}

export function canonicalLapToRoute(trace: CanonicalLapTrace): CanonicalLapRoute | null {
  if (trace.samples.length < 3) return null
  const points = trace.samples.map(({ position }) => new Vector3(position[0], position[1] + 0.08, position[2]))
  const route = new CurvePath<Vector3>()
  for (let i = 1; i < points.length; i += 1) {
    if (points[i - 1].distanceToSquared(points[i]) < 0.0004) continue
    route.add(new LineCurve3(points[i - 1], points[i]))
  }
  return route.curves.length ? route : null
}
