import { useEffect, useMemo, useState } from 'react'
import { CatmullRomCurve3, Vector3 } from 'three'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'

const route = new CatmullRomCurve3([
  new Vector3(-108, 2.2, 215),
  new Vector3(-45, 4, 120),
  new Vector3(-18, 3, 15),
  new Vector3(-60, 3.5, -90),
  new Vector3(-103, 2.5, -182),
])

function yOffset(kind: string): number {
  if (kind === 'blocker') return 0.15
  if (kind === 'wait' || kind === 'rest') return -0.35
  if (kind === 'finish') return 1.2
  return 0
}

function scaleFor(kind: string): [number, number, number] {
  if (kind === 'blocker') return [1.1, 0.45, 1.1]
  if (kind === 'wait') return [0.85, 0.85, 0.85]
  if (kind === 'rest') return [0.7, 0.7, 0.7]
  if (kind === 'finish') return [1.25, 1.25, 1.25]
  return [1, 1, 1]
}

export function RaceGhost(): JSX.Element | null {
  const [state, setState] = useState<ReplayVisualState | null>(null)

  useEffect(() => subscribeReplayState(setState), [])

  const position = useMemo(() => {
    if (!state) return null
    const t = Math.min(Math.max(state.progress / 100, 0), 1)
    const point = route.getPointAt(t)
    point.y += yOffset(state.kind)
    return point
  }, [state])

  if (!state || !position) return null

  const scale = scaleFor(state.kind)
  const isStopped = state.kind === 'blocker' || state.kind === 'wait' || state.kind === 'rest'
  const isFinish = state.kind === 'finish'

  return (
    <group position={position} scale={scale}>
      <mesh castShadow rotation={[0, isStopped ? Math.PI / 18 : 0, 0]}>
        <boxGeometry args={[2.2, 0.7, 4]} />
        <meshStandardMaterial emissiveIntensity={isFinish ? 1.4 : isStopped ? 0.15 : 0.45} roughness={0.45} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[isFinish ? 0.55 : 0.35, 12, 12]} />
        <meshStandardMaterial emissiveIntensity={isFinish ? 2.6 : isStopped ? 0.35 : 1.2} />
      </mesh>
      {state.kind === 'blocker' && (
        <mesh position={[0, 0.4, -2.5]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.18, 3.2, 0.18]} />
          <meshStandardMaterial emissiveIntensity={1.2} />
        </mesh>
      )}
      {isFinish && (
        <mesh position={[0, 2.2, 0]}>
          <torusGeometry args={[0.7, 0.12, 10, 24]} />
          <meshStandardMaterial emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  )
}
