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

export function RaceGhost(): JSX.Element | null {
  const [state, setState] = useState<ReplayVisualState | null>(null)

  useEffect(() => subscribeReplayState(setState), [])

  const position = useMemo(() => {
    if (!state) return null
    const t = Math.min(Math.max(state.progress / 100, 0), 1)
    return route.getPointAt(t)
  }, [state])

  if (!state || !position) return null

  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.2, 0.7, 4]} />
        <meshStandardMaterial emissiveIntensity={0.35} roughness={0.45} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.25, 0]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshStandardMaterial emissiveIntensity={1.2} />
      </mesh>
    </group>
  )
}
