import { useEffect, useMemo, useState } from 'react'
import { Vector3 } from 'three'
import type { RaceEvent, StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { raceRoute, routePoint } from './raceRoute'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'

const hydratedDemo = enforceDisplayBoundary(withArtifactBackfill(demoSnapshot))
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

function gateScale(kind: RaceEvent['kind']): number {
  if (kind === 'finish') return 1.4
  if (kind === 'blocker') return 1.15
  if (kind === 'verification') return 1.08
  return 1
}

function Gate({ event, active }: { event: RaceEvent; active: boolean }) {
  const t = Math.min(Math.max(event.progress / 100, 0), 1)
  const point = raceRoute.getPointAt(t)
  const tangent = raceRoute.getTangentAt(t)
  const yaw = Math.atan2(tangent.x, tangent.z)
  const scale = gateScale(event.kind)
  const stopped = event.kind === 'blocker' || event.kind === 'wait' || event.kind === 'rest'
  const finished = event.kind === 'finish'

  return (
    <group position={point} rotation={[0, yaw, 0]} scale={scale}>
      <mesh position={[-3.2, 1.7, 0]} castShadow><boxGeometry args={[0.28, 3.4, 0.28]} /><meshStandardMaterial emissiveIntensity={active ? 1.8 : 0.22} /></mesh>
      <mesh position={[3.2, 1.7, 0]} castShadow><boxGeometry args={[0.28, 3.4, 0.28]} /><meshStandardMaterial emissiveIntensity={active ? 1.8 : 0.22} /></mesh>
      <mesh position={[0, 3.35, 0]} castShadow><boxGeometry args={[6.7, 0.28, 0.28]} /><meshStandardMaterial emissiveIntensity={active ? 1.8 : 0.22} /></mesh>
      <mesh position={[0, 4.05, 0]}><sphereGeometry args={[active ? 0.38 : 0.22, 10, 10]} /><meshStandardMaterial emissiveIntensity={active ? 2.8 : 0.65} /></mesh>
      {stopped && <mesh position={[0, 0.55, -0.7]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.24, 6.1, 0.24]} /><meshStandardMaterial emissiveIntensity={active ? 1.9 : 0.7} /></mesh>}
      {finished && <mesh position={[0, 2.1, -0.55]}><torusGeometry args={[1.25, 0.12, 10, 28]} /><meshStandardMaterial emissiveIntensity={active ? 2.8 : 1.2} /></mesh>}
    </group>
  )
}

function ConditionProps({ state }: { state: ReplayVisualState }) {
  const point = routePoint(state.progress)
  const isBlocked = state.kind === 'blocker'
  const isWaiting = state.kind === 'wait' || state.kind === 'rest'
  const isFinish = state.kind === 'finish'

  if (isBlocked) {
    return <group position={[point.x, point.y + 0.4, point.z - 5]}>{[-2.8, 0, 2.8].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.22, 2.1, 0.22]} /><meshStandardMaterial emissiveIntensity={1.5} /></mesh>)}</group>
  }
  if (isWaiting) {
    return <group position={[point.x + 6, point.y + 0.2, point.z]}><mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.2, 0.18, 10, 32]} /><meshStandardMaterial emissiveIntensity={0.9} /></mesh><mesh position={[0, 0.6, 0]}><boxGeometry args={[3.8, 0.2, 1.3]} /><meshStandardMaterial emissiveIntensity={0.35} /></mesh></group>
  }
  if (isFinish) {
    return <mesh position={[point.x, point.y + 4.8, point.z]}><torusGeometry args={[2.5, 0.18, 12, 36]} /><meshStandardMaterial emissiveIntensity={2.5} /></mesh>
  }
  return null
}

export function RaceScene(): JSX.Element | null {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => enforceDisplayBoundary(loadLocalSnapshot() ?? hydratedDemo))
  const [visual, setVisual] = useState<ReplayVisualState | null>(null)

  useEffect(() => {
    const snapshotHandler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(enforceDisplayBoundary(next))
    }
    window.addEventListener(SNAPSHOT_EVENT, snapshotHandler)
    const unsubscribe = subscribeReplayState(setVisual)
    return () => {
      window.removeEventListener(SNAPSHOT_EVENT, snapshotHandler)
      unsubscribe()
    }
  }, [])

  const race = useMemo(() => visual ? snapshot.races.find((item) => item.id === visual.raceId) : undefined, [snapshot, visual])
  if (!visual || !race) return null

  const events = race.history ?? []
  return (
    <group>
      <mesh>
        <tubeGeometry args={[raceRoute, 96, 0.09, 6, false]} />
        <meshStandardMaterial transparent opacity={0.32} emissiveIntensity={0.35} />
      </mesh>
      {events.map((event) => <Gate key={event.id} event={event} active={Math.abs(event.progress - visual.progress) < 0.5} />)}
      <ConditionProps state={visual} />
    </group>
  )
}
