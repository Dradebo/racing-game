import { createContext, useContext, useMemo } from 'react'
import { CurvePath, LineCurve3, Vector3 } from 'three'
import { useGLTF } from '@react-three/drei'
import type { BufferGeometry } from 'three'

const startAnchor = new Vector3(-27, 1, 180)
const checkpointAnchor = new Vector3(-50, 1, -5)
const finishAnchor = new Vector3(-104, 1, -189)

export type RaceRoute = CurvePath<Vector3>

type HeapItem = { index: number; score: number }
type SurfaceGraph = {
  positions: Vector3[]
  adjacency: number[][]
  boundaryDistance: Float64Array
}

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

function polyline(points: Vector3[]): RaceRoute {
  const route = new CurvePath<Vector3>()
  for (let i = 1; i < points.length; i += 1) route.add(new LineCurve3(points[i - 1], points[i]))
  return route
}

const fallbackRoute = polyline([
  startAnchor.clone().setY(1.18),
  checkpointAnchor.clone().setY(1.18),
  finishAnchor.clone().setY(1.18),
])

const RaceRouteContext = createContext<RaceRoute>(fallbackRoute)

function keyFor(x: number, y: number, z: number): string {
  const precision = 1000
  return `${Math.round(x * precision)}:${Math.round(y * precision)}:${Math.round(z * precision)}`
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function distance(a: Vector3, b: Vector3): number {
  return a.distanceTo(b)
}

function multiSourceBoundaryDistance(positions: Vector3[], adjacency: number[][], boundary: Set<number>): Float64Array {
  const values = new Float64Array(positions.length)
  values.fill(Number.POSITIVE_INFINITY)
  const heap = new MinHeap()

  boundary.forEach((index) => {
    values[index] = 0
    heap.push({ index, score: 0 })
  })

  while (heap.size) {
    const current = heap.pop()!
    if (current.score !== values[current.index]) continue
    for (const next of adjacency[current.index]) {
      const candidate = current.score + distance(positions[current.index], positions[next])
      if (candidate >= values[next]) continue
      values[next] = candidate
      heap.push({ index: next, score: candidate })
    }
  }
  return values
}

function buildSurfaceGraph(geometry: BufferGeometry): SurfaceGraph | null {
  const attribute = geometry.getAttribute('position')
  if (!attribute?.count) return null

  const nodeByKey = new Map<string, number>()
  const positions: Vector3[] = []
  const vertexToNode = new Int32Array(attribute.count)

  for (let i = 0; i < attribute.count; i += 1) {
    const x = attribute.getX(i), y = attribute.getY(i), z = attribute.getZ(i)
    const key = keyFor(x, y, z)
    let node = nodeByKey.get(key)
    if (node === undefined) {
      node = positions.length
      nodeByKey.set(key, node)
      positions.push(new Vector3(x, y + 0.18, z))
    }
    vertexToNode[i] = node
  }

  const adjacencySets = Array.from({ length: positions.length }, () => new Set<number>())
  const edgeCounts = new Map<string, number>()
  const index = geometry.getIndex()
  const itemCount = index ? index.count : attribute.count
  const rawIndex = (i: number) => index ? index.getX(i) : i

  const addEdge = (a: number, b: number) => {
    if (a === b) return
    adjacencySets[a].add(b)
    adjacencySets[b].add(a)
    const key = edgeKey(a, b)
    edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1)
  }

  for (let i = 0; i + 2 < itemCount; i += 3) {
    const a = vertexToNode[rawIndex(i)]
    const b = vertexToNode[rawIndex(i + 1)]
    const c = vertexToNode[rawIndex(i + 2)]
    addEdge(a, b); addEdge(b, c); addEdge(c, a)
  }

  const boundary = new Set<number>()
  edgeCounts.forEach((count, key) => {
    if (count !== 1) return
    const [a, b] = key.split(':').map(Number)
    boundary.add(a); boundary.add(b)
  })

  const adjacency = adjacencySets.map((set) => Array.from(set))
  if (!boundary.size || !adjacency.some((neighbors) => neighbors.length > 1)) return null
  return { positions, adjacency, boundaryDistance: multiSourceBoundaryDistance(positions, adjacency, boundary) }
}

function nearestNode(graph: SurfaceGraph, target: Vector3): number {
  let best = 0
  let bestScore = Number.POSITIVE_INFINITY
  for (let i = 0; i < graph.positions.length; i += 1) {
    const point = graph.positions[i]
    const dx = point.x - target.x
    const dz = point.z - target.z
    const score = dx * dx + dz * dz
    if (score < bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

function centerBiasedPath(graph: SurfaceGraph, start: number, goal: number): number[] {
  const count = graph.positions.length
  const g = new Float64Array(count)
  const previous = new Int32Array(count)
  const closed = new Uint8Array(count)
  g.fill(Number.POSITIVE_INFINITY)
  previous.fill(-1)
  g[start] = 0

  let maxInterior = 0
  for (const value of graph.boundaryDistance) if (Number.isFinite(value)) maxInterior = Math.max(maxInterior, value)
  maxInterior = Math.max(maxInterior, 0.001)

  const heap = new MinHeap()
  heap.push({ index: start, score: graph.positions[start].distanceTo(graph.positions[goal]) })

  while (heap.size) {
    const current = heap.pop()!
    if (closed[current.index]) continue
    if (current.index === goal) break
    closed[current.index] = 1

    for (const next of graph.adjacency[current.index]) {
      if (closed[next]) continue
      const edge = distance(graph.positions[current.index], graph.positions[next])
      const interior = Math.min(graph.boundaryDistance[current.index], graph.boundaryDistance[next]) / maxInterior
      const edgePenalty = 1 + 5 * Math.pow(1 - Math.min(1, interior), 2)
      const candidate = g[current.index] + edge * edgePenalty
      if (candidate >= g[next]) continue
      g[next] = candidate
      previous[next] = current.index
      const heuristic = graph.positions[next].distanceTo(graph.positions[goal])
      heap.push({ index: next, score: candidate + heuristic })
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

function deriveRoute(geometry?: BufferGeometry): RaceRoute {
  if (!geometry) return fallbackRoute
  try {
    const graph = buildSurfaceGraph(geometry)
    if (!graph) return fallbackRoute
    const start = nearestNode(graph, startAnchor)
    const checkpoint = nearestNode(graph, checkpointAnchor)
    const finish = nearestNode(graph, finishAnchor)
    const first = centerBiasedPath(graph, start, checkpoint)
    const second = centerBiasedPath(graph, checkpoint, finish)
    const joined = first.length && second.length ? [...first, ...second.slice(1)] : []
    if (joined.length < 4) return fallbackRoute
    return polyline(joined.map((index) => graph.positions[index]))
  } catch {
    return fallbackRoute
  }
}

export function RaceRouteProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const gltf = useGLTF('/models/track-draco.glb') as any
  const stripGeometry = gltf.nodes?.strip?.geometry as BufferGeometry | undefined
  const trackGeometry = gltf.nodes?.track_1?.geometry as BufferGeometry | undefined
  const route = useMemo(() => deriveRoute(stripGeometry ?? trackGeometry), [stripGeometry, trackGeometry])
  return <RaceRouteContext.Provider value={route}>{children}</RaceRouteContext.Provider>
}

export function useRaceRoute(): RaceRoute {
  return useContext(RaceRouteContext)
}

export function pointOnRoute(route: RaceRoute, progress: number): Vector3 {
  const t = Math.min(Math.max(progress / 100, 0), 1)
  return route.getPointAt(t)
}

export function tangentOnRoute(route: RaceRoute, progress: number): Vector3 {
  const t = Math.min(Math.max(progress / 100, 0), 1)
  const delta = 0.004
  const before = route.getPointAt(Math.max(0, t - delta))
  const after = route.getPointAt(Math.min(1, t + delta))
  return after.sub(before).normalize()
}
