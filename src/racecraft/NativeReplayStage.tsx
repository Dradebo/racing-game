import { useEffect, useState } from 'react'
import { Physics } from '@react-three/cannon'
import { Cameras } from '../effects'
import { BoundingBox, Heightmap, Ramp, Train, Vehicle } from '../models'
import { angularVelocity, position, rotation, setState, useStore } from '../store'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'

const authoredScenes = [
  { id: 'start', position: [-27, 1.05, 180] as [number, number, number], yaw: 0.55 + Math.PI / 2 },
  { id: 'checkpoint', position: [-50, 1.05, -5] as [number, number, number], yaw: -0.5 + Math.PI / 2 },
  { id: 'finish', position: [-104, 1.05, -189] as [number, number, number], yaw: -1.2 + Math.PI / 2 },
] as const

function sceneFor(state: ReplayVisualState) {
  const total = Math.max(state.eventTotal ?? 1, 1)
  const index = Math.max(state.eventIndex ?? 0, 0)
  const ratio = total <= 1 ? state.progress / 100 : index / Math.max(total - 1, 1)
  if (ratio < 0.34) return authoredScenes[0]
  if (ratio < 0.78) return authoredScenes[1]
  return authoredScenes[2]
}

function colorFor(kind: string): string {
  if (kind === 'finish') return '#f4f4f4'
  if (kind === 'verification') return '#e8d58a'
  if (kind === 'blocker' || kind === 'wait') return '#8d7a62'
  if (kind === 'mutation') return '#d89b4a'
  return '#f0c050'
}

function NativeReplayDriver() {
  const api = useStore((state) => state.api)
  const actions = useStore((state) => state.actions)
  const [visual, setVisual] = useState<ReplayVisualState | null>(null)

  useEffect(() => subscribeReplayState(setVisual), [])

  useEffect(() => {
    if (!api || !visual) return
    const scene = sceneFor(visual)

    actions.forward(false)
    actions.backward(false)
    actions.left(false)
    actions.right(false)
    actions.boost(false)
    actions.brake(visual.kind === 'blocker' || visual.kind === 'wait' || visual.kind === 'rest')

    setState({ color: colorFor(visual.kind) })
    api.velocity.set(0, 0, 0)
    api.angularVelocity.set(0, 0, 0)
    api.position.set(scene.position[0], scene.position[1], scene.position[2])
    api.rotation.set(0, scene.yaw, 0)
  }, [api, visual, actions])

  return null
}

export function NativeReplayStage(): JSX.Element {
  return (
    <Physics allowSleep broadphase="SAP" defaultContactMaterial={{ contactEquationRelaxation: 4, friction: 1e-3 }}>
      <Vehicle angularVelocity={[...angularVelocity]} position={[...position]} rotation={[...rotation]}>
        <Cameras />
      </Vehicle>
      <Train />
      <Ramp args={[30, 6, 8]} position={[2, -1, 168.55]} rotation={[0, 0.49, Math.PI / 15]} />
      <Heightmap elementSize={0.5085} position={[327 - 66.5, -3.3, -473 + 213]} rotation={[-Math.PI / 2, 0, -Math.PI]} />
      <BoundingBox depth={512} height={100} position={[0, 40, 0]} width={512} />
      <NativeReplayDriver />
    </Physics>
  )
}
