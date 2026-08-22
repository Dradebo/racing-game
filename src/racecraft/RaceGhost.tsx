import { useEffect, useMemo, useState } from 'react'
import { useGLTF } from '@react-three/drei'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'
import { pointOnRoute, tangentOnRoute, useRaceRoute } from './RaceRouteProvider'

function yOffset(kind: string): number {
  if (kind === 'blocker') return 0.05
  if (kind === 'wait' || kind === 'rest') return -0.15
  if (kind === 'finish') return 0.35
  return 0
}

function scaleFor(kind: string): number {
  if (kind === 'wait') return 0.95
  if (kind === 'rest') return 0.9
  if (kind === 'finish') return 1.08
  return 1
}

export function RaceGhost(): JSX.Element | null {
  const [state, setState] = useState<ReplayVisualState | null>(null)
  const gltf = useGLTF('/models/chassis-draco.glb') as any
  const route = useRaceRoute()

  useEffect(() => subscribeReplayState(setState), [])

  const transform = useMemo(() => {
    if (!state) return null
    const point = pointOnRoute(route, state.progress)
    point.y += yOffset(state.kind)
    const tangent = tangentOnRoute(route, state.progress)
    const yaw = Math.atan2(tangent.x, tangent.z)
    return { point, yaw }
  }, [state, route])

  if (!state || !transform) return null

  const stopped = state.kind === 'blocker' || state.kind === 'wait' || state.kind === 'rest'
  const finish = state.kind === 'finish'
  const verification = state.kind === 'verification'
  const scale = scaleFor(state.kind)
  const n = gltf.nodes
  const m = gltf.materials

  return (
    <group position={transform.point} rotation={[0, transform.yaw + (stopped ? Math.PI / 26 : 0), 0]} scale={scale}>
      <group position={[0, -0.22, -0.2]}>
        <mesh castShadow receiveShadow geometry={n.Chassis_1.geometry} material={m.BodyPaint} material-color={finish ? '#f4f4f4' : verification ? '#e8d58a' : stopped ? '#8d7a62' : '#f0c050'} />
        <mesh castShadow geometry={n.Chassis_2.geometry} material={n.Chassis_2.material} material-color="#353535" />
        <mesh castShadow geometry={n.Glass.geometry} material={m.Glass} material-transparent />
        <mesh geometry={n.BrakeLights.geometry} material={m.BrakeLight} material-transparent material-emissive-intensity={stopped ? 2.2 : 0.45} />
        <mesh geometry={n.HeadLights.geometry} material={m.HeadLight} material-emissive-intensity={state.playing && !stopped ? 1.6 : 0.55} />
        <mesh geometry={n.Cabin_Grilles.geometry} material={m.Black} />
        <mesh geometry={n.Undercarriage.geometry} material={m.Undercarriage} />
        <mesh geometry={n.TurnSignals.geometry} material={m.TurnSignal} />
        <mesh geometry={n.Chrome.geometry} material={n.Chrome.material} />
        <mesh geometry={n.License_1.geometry} material={m.License} />
        <mesh geometry={n.License_2.geometry} material={n.License_2.material} />
      </group>
      <mesh position={[0, 2.05, 0]}>
        <sphereGeometry args={[finish ? 0.42 : 0.24, 12, 12]} />
        <meshStandardMaterial emissiveIntensity={finish ? 3.2 : stopped ? 0.45 : 1.5} />
      </mesh>
      {state.kind === 'blocker' && <mesh position={[0, 0.45, -3.4]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.22, 4.1, 0.22]} /><meshStandardMaterial emissiveIntensity={1.5} /></mesh>}
      {finish && <mesh position={[0, 2.8, 0]}><torusGeometry args={[0.9, 0.11, 10, 28]} /><meshStandardMaterial emissiveIntensity={2.5} /></mesh>}
    </group>
  )
}
