import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Sky } from '@react-three/drei'
import { Cameras } from '../effects'
import { BoundingBox, Heightmap, Ramp, Track, Train, Vehicle } from '../models'
import { angularVelocity, position, rotation, setState, useStore } from '../store'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'

const authoredScenes = [
  { id: 'start', position: [-27, 1.05, 180] as [number, number, number], yaw: 0.55 + Math.PI / 2 },
  { id: 'checkpoint', position: [-50, 1.05, -5] as [number, number, number], yaw: -0.5 + Math.PI / 2 },
  { id: 'finish', position: [-104, 1.05, -189] as [number, number, number], yaw: -1.2 + Math.PI / 2 },
] as const

type AuthoredScene = (typeof authoredScenes)[number]

function sceneFor(state: ReplayVisualState): AuthoredScene {
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

function NativeReplayDriver({ onCut }: { onCut: (active: boolean) => void }) {
  const api = useStore((state) => state.api)
  const actions = useStore((state) => state.actions)
  const visualRef = useRef<ReplayVisualState | null>(null)
  const eventStartedAt = useRef(0)
  const currentScene = useRef<string | null>(null)
  const cutting = useRef(false)
  const timers = useRef<number[]>([])

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

    if (!api) return
    const scene = sceneFor(visual)
    if (currentScene.current === scene.id) return

    currentScene.current = scene.id
    cutting.current = true
    onCut(true)
    stopControls()
    actions.brake(true)

    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []

    const moveTimer = window.setTimeout(() => {
      api.velocity.set(0, 0, 0)
      api.angularVelocity.set(0, 0, 0)
      api.position.set(scene.position[0], scene.position[1], scene.position[2])
      api.rotation.set(0, scene.yaw, 0)
    }, 90)

    const revealTimer = window.setTimeout(() => {
      actions.brake(false)
      cutting.current = false
      onCut(false)
      eventStartedAt.current = performance.now()
    }, 260)

    timers.current.push(moveTimer, revealTimer)
  }), [api, actions, onCut, stopControls])

  useFrame(() => {
    const visual = visualRef.current
    if (!visual || !api || cutting.current) return

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
      actions.forward(age < 0.7)
      actions.brake(age >= 0.7)
      return
    }

    actions.forward(age < 1.35)
    actions.brake(age >= 1.35)
    actions.boost(visual.kind === 'verification' && age > 0.2 && age < 0.85)
    actions.left(visual.kind === 'mutation' && age > 0.3 && age < 0.85)
  })

  useEffect(() => () => {
    stopControls()
    actions.brake(false)
    timers.current.forEach((timer) => window.clearTimeout(timer))
  }, [actions, stopControls])

  return null
}

export function NativeReplayStage({ dpr, shadows }: { dpr: number; shadows: boolean }): JSX.Element {
  const [cutActive, setCutActive] = useState(false)
  const onCut = useCallback((active: boolean) => setCutActive(active), [])

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
          <NativeReplayDriver onCut={onCut} />
        </Physics>
        <Track />
        <Environment files="textures/dikhololo_night_1k.hdr" />
      </Canvas>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: '#05070a',
          opacity: cutActive ? 1 : 0,
          transition: 'opacity 120ms ease',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      />
    </div>
  )
}
