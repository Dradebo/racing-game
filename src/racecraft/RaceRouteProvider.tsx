import { createContext, useContext, useMemo } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'
import { useGLTF } from '@react-three/drei'
import type { BufferGeometry } from 'three'

const startAnchor = new Vector3(-27, 1, 180)
const checkpointAnchor = new Vector3(-50, 1, -5)
const finishAnchor = new Vector3(-104, 1, -189)

const fallbackRoute = new CatmullRomCurve3(
  [startAnchor.clone(), checkpointAnchor.clone(), finishAnchor.clone()],
  false,
  'centripetal',
  0.5,
)

const RaceRouteContext = createContext<CatmullRomCurve3>(fallbackRoute)

function nearestVertex(geometry: BufferGeometry, target: Vector3): number {
  const position = geometry.getAttribute('position')
  let best = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let i = 0; i < position.count; i += 1) {
    const dx = position.getX(i) - target.x
    const dz = position.getZ(i) - target.z
    const distance = dx * dx + dz * dz
    if (distance < bestDistance) {
      bestDistance = distance
      best = i
    }
  }
  return best
}

function buildAdjacency(geometry: BufferGeometry): number[][] {
  const count = geometry.getAttribute('position').count
  const adjacency = Array.from({ length: count }, () => new Set<number>())
  const index = geometry.getIndex()
  const triangles = index ? index.count : count

  const at = (i: number) => index ? index.getX(i) : i
  for (let i = 0; i + 2 < triangles; i += 3) {
    const a = at(i)
    const b = at(i + 1)
    const c = at(i + 2)
    adjacency[a].add(b); adjacency[a].add(c)
    adjacency[b].add(a); adjacency[b].add(c)
    adjacency[c].add(a); adjacency[c].add(b)
  }
  return adjacency.map((set) => Array.from(set))
}

function shortestPath(geometry: BufferGeometry, adjacency: number[][], start: number, goal: number): number[] {
  const position = geometry.getAttribute('position')
  const distance = new Float64Array(position.count)
  const previous = new Int32Array(position.count)
  const visited = new Uint8Array(position.count)
  distance.fill(Number.POSITIVE_INFINITY)
  previous.fill(-1)
  distance[start] = 0

  for (;;) {
    let current = -1
    let best = Number.POSITIVE_INFINITY
    for (let i = 0; i < distance.length; i += 1) {
      if (!visited[i] && distance[i] < best) {
        best = distance[i]
        current = i
      }
    }
    if (current === -1 || current === goal) break
    visited[current] = 1

    const ax = position.getX(current)
    const ay = position.getY(current)
    const az = position.getZ(current)
    for (const next of adjacency[current]) {
      if (visited[next]) continue
      const dx = position.getX(next) - ax
      const dy = position.getY(next) - ay
      const dz = position.getZ(next) - az
      const candidate = best + Math.hypot(dx, dy, dz)
      if (candidate < distance[next]) {
        distance[next] = candidate
        previous[next] = current
      }
    }
  }

  if (!Number.isFinite(distance[goal])) return []
  const path: number[] = []
  for (let cursor = goal; cursor !== -1; cursor = previous[cursor]) {
    path.push(cursor)
    if (cursor === start) break
  }
  return path.reverse()
}

function pointFor(geometry: BufferGeometry, index: number): Vector3 {
  const position = geometry.getAttribute('position')
  return new Vector3(position.getX(index), position.getY(index) + 0.12, position.getZ(index))
}

function deriveRoute(geometry?: BufferGeometry): CatmullRomCurve3 {
  if (!geometry?.getAttribute('position')) return fallbackRoute
  try {
    const adjacency = buildAdjacency(geometry)
    const start = nearestVertex(geometry, startAnchor)
    const checkpoint = nearestVertex(geometry, checkpointAnchor)
    const finish = nearestVertex(geometry, finishAnchor)
    const first = shortestPath(geometry, adjacency, start, checkpoint)
    const second = shortestPath(geometry, adjacency, checkpoint, finish)
    const joined = first.length && second.length ? [...first, ...second.slice(1)] : []
    if (joined.length < 4) return fallbackRoute

    const stride = Math.max(1, Math.floor(joined.length / 72))
    const points = joined
      .filter((_, index) => index === 0 || index === joined.length - 1 || index % stride === 0)
      .map((index) => pointFor(geometry, index))

    return new CatmullRomCurve3(points, false, 'centripetal', 0.5)
  } catch {
    return fallbackRoute
  }
}

export function RaceRouteProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const gltf = useGLTF('/models/track-draco.glb') as any
  const route = useMemo(() => deriveRoute(gltf.nodes?.strip?.geometry), [gltf])
  return <RaceRouteContext.Provider value={route}>{children}</RaceRouteContext.Provider>
}

export function useRaceRoute(): CatmullRomCurve3 {
  return useContext(RaceRouteContext)
}

export function pointOnRoute(route: CatmullRomCurve3, progress: number): Vector3 {
  const t = Math.min(Math.max(progress / 100, 0), 1)
  return route.getPointAt(t)
}

export function tangentOnRoute(route: CatmullRomCurve3, progress: number): Vector3 {
  const t = Math.min(Math.max(progress / 100, 0), 1)
  return route.getTangentAt(t).normalize()
}
