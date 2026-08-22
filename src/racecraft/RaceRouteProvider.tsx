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

type HeapItem = { index: number; score: number }

class MinHeap {
  private items: HeapItem[] = []

  push(item: HeapItem) {
    this.items.push(item)
    let child = this.items.length - 1
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2)
      if (this.items[parent].score <= item.score) break
      this.items[child] = this.items[parent]
      child = parent
    }
    this.items[child] = item
  }

  pop(): HeapItem | undefined {
    if (!this.items.length) return undefined
    const root = this.items[0]
    const last = this.items.pop()!
    if (!this.items.length) return root

    let parent = 0
    while (true) {
      const left = parent * 2 + 1
      const right = left + 1
      if (left >= this.items.length) break
      const child = right < this.items.length && this.items[right].score < this.items[left].score ? right : left
      if (this.items[child].score >= last.score) break
      this.items[parent] = this.items[child]
      parent = child
    }
    this.items[parent] = last
    return root
  }

  get size() { return this.items.length }
}

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
    const a = at(i), b = at(i + 1), c = at(i + 2)
    adjacency[a].add(b); adjacency[a].add(c)
    adjacency[b].add(a); adjacency[b].add(c)
    adjacency[c].add(a); adjacency[c].add(b)
  }
  return adjacency.map((set) => Array.from(set))
}

function edgeCost(geometry: BufferGeometry, a: number, b: number): number {
  const p = geometry.getAttribute('position')
  return Math.hypot(p.getX(a) - p.getX(b), p.getY(a) - p.getY(b), p.getZ(a) - p.getZ(b))
}

function heuristic(geometry: BufferGeometry, a: number, b: number): number {
  return edgeCost(geometry, a, b)
}

function shortestPath(geometry: BufferGeometry, adjacency: number[][], start: number, goal: number): number[] {
  const count = geometry.getAttribute('position').count
  const g = new Float64Array(count)
  const previous = new Int32Array(count)
  const closed = new Uint8Array(count)
  g.fill(Number.POSITIVE_INFINITY)
  previous.fill(-1)
  g[start] = 0

  const open = new MinHeap()
  open.push({ index: start, score: heuristic(geometry, start, goal) })

  while (open.size) {
    const current = open.pop()!
    if (closed[current.index]) continue
    if (current.index === goal) break
    closed[current.index] = 1

    for (const next of adjacency[current.index]) {
      if (closed[next]) continue
      const candidate = g[current.index] + edgeCost(geometry, current.index, next)
      if (candidate >= g[next]) continue
      g[next] = candidate
      previous[next] = current.index
      open.push({ index: next, score: candidate + heuristic(geometry, next, goal) })
    }
  }

  if (!Number.isFinite(g[goal])) return []
  const path: number[] = []
  for (let cursor = goal; cursor !== -1; cursor = previous[cursor]) {
    path.push(cursor)
    if (cursor === start) break
  }
  return path.reverse()
}

function pointFor(geometry: BufferGeometry, index: number): Vector3 {
  const position = geometry.getAttribute('position')
  return new Vector3(position.getX(index), position.getY(index) + 0.18, position.getZ(index))
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

    const stride = Math.max(1, Math.floor(joined.length / 64))
    const points = joined
      .filter((_, order) => order === 0 || order === joined.length - 1 || order % stride === 0)
      .map((vertexIndex) => pointFor(geometry, vertexIndex))

    return new CatmullRomCurve3(points, false, 'centripetal', 0.5)
  } catch {
    return fallbackRoute
  }
}

export function RaceRouteProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const gltf = useGLTF('/models/track-draco.glb') as any
  const stripGeometry = gltf.nodes?.strip?.geometry as BufferGeometry | undefined
  const route = useMemo(() => deriveRoute(stripGeometry), [stripGeometry])
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
