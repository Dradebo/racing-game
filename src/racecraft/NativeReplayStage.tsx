import { useCallback, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Sky } from '@react-three/drei'
import { Cameras } from '../effects'
import { BoundingBox, Heightmap, Ramp, Track, Train, Vehicle } from '../models'
import { angularVelocity, position, rotation, setState, useStore } from '../store'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'

function colorFor(kind: string): string {
  if (kind === 'finish') return '#f4f4f4'
  if (kind === 'verification') return '#e8d58a'
  if (kind === 'blocker' || kind === 'wait') return '#8d7a62'
  if (kind === 'mutation') return '#d89b4a'
  return '#f0c050'
}

function NativeReplayDriver() {
  const actions = useStore((state) => state.actions)
  const visualRef = useRef<ReplayVisualState | null>(null)
  const eventStartedAt = useRef(0)

  const stopControls = useCallback(() => {
    actions.forward(false)
    actions.backward(false)
    actions.left(false)
    actions.right(false)
    actions.boost(false)
  }, [actions])

  useEffect(() => subscribeReplayState((visual) => {
    visualRef.current = visual
    eventStartedAt.current = performance.now()
    setState({ color: colorFor(visual.kind) })
  }), [])

  useFrame(() => {
    const visual = visualRef.current
    if (!visual) return

    const age = (performance.now() - eventStartedAt.current) / 1000
    const stopped = !visual.playing || visual.kind === 'blocker' || visual.kind === 'wait' || visual.kind === 'rest'

    if (stopped) {
      stopControls()
      actions.brake(true)
      return
    }

    actions.backward(false)
    actions.right(false)

    if (visual.kind === 'finish') {
      actions.left(false)
      actions.boost(false)
      actions.forward(age < 1.1)
      actions.brake(age >= 1.1)
      return
    }

    const driveWindow = visual.kind === 'verification' ? 1.8 : 1.5
    actions.forward(age < driveWindow)
    actions.brake(age >= driveWindow)
    actions.boost(visual.kind === 'verification' && age > 0.25 && age < 1.0)

    if (visual.kind === 'mutation') {
      actions.left(age > 0.25 && age < 1.15)
    } else {
      actions.left(false)
    }
  })

  useEffect(() => () => {
    stopControls()
    actions.brake(false)
  }, [actions, stopControls])

  return null
}

export function NativeReplayStage({ dpr, shadows }: { dpr: number; shadows: boolean }): JSX.Element {
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas key={`native-replay-${dpr}-${shadows}`} dpr={[1, dpr]} shadows={shadows} camera={{ position: [0, 5, 15], fov: 50 }}>
        <fog attach="fog" args={['white', 0, 500]} />
        <Sky sunPosition={[100, 10, 100]} distance={1000} />
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 50, 150]} intensity={1} castShadow />
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
        <Track />
        <Environment files="textures/dikhololo_night_1k.hdr" />
      </Canvas>
    </div>
  )
}
