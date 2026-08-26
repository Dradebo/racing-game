import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, PerspectiveCamera, Sky } from '@react-three/drei'
import { Euler, Layers, Quaternion } from 'three'
import type { DirectionalLight } from 'three'
import { Keyboard } from '../controls'
import { Cameras } from '../effects'
import { BoundingBox, Goal, Heightmap, Ramp, Track, Train, Vehicle } from '../models'
import { angularVelocity, levelLayer, mutation, position, rotation, setState, useStore } from '../store'
import { loadCanonicalLap, type CanonicalLapTrace } from './canonicalLap'
import { resolveFollowTarget, type FollowTarget } from './donorFollow'

const layers = new Layers()
layers.enable(levelLayer)

type Vec3 = [number, number, number]
type Quat = [number, number, number, number]
type Telemetry = {
  elapsed: number
  netDistance: number
  pathDistance: number
  speed: number
  headingDelta: number
  maxHeadingDelta: number
  verticalDrift: number
  velocity: Vec3
  angularVelocity: Vec3
  phase: string
  routeProgress: number
  roadError: number
  maxRoadError: number
  headingError: number
  turnCommand: string
  routeAvailable: boolean
  firstDivergence?: string
}

function key(type: 'keydown' | 'keyup', value: string) {
  window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true }))
}

function releaseAllKeys() {
  for (const value of ['w', 'a', 'd', 'shift', ' ']) key('keyup', value)
}

function ScriptedKeyboardDriver({ onTelemetry }: { onTelemetry: (value: Telemetry) => void }) {
  const api = useStore((state) => state.api)
  const physicsPosition = useRef<Vec3 | null>(null)
  const physicsQuaternion = useRef<Quat | null>(null)
  const physicsVelocity = useRef<Vec3>([0, 0, 0])
  const physicsAngularVelocity = useRef<Vec3>([0, 0, 0])
  const startPosition = useRef<Vec3 | null>(null)
  const previousPosition = useRef<Vec3 | null>(null)
  const pathDistance = useRef(0)
  const startYaw = useRef<number | null>(null)
  const maxHeadingDelta = useRef(0)
  const startedAt = useRef(performance.now())
  const phase = useRef('WAITING FOR BODY')
  const previousPhase = useRef('')
  const lastReportAt = useRef(0)
  const q = useRef(new Quaternion())
  const e = useRef(new Euler(0, 0, 0, 'YXZ'))

  useEffect(() => {
    if (!api) return
    const unsubscribePosition = api.position.subscribe((value) => {
      const next: Vec3 = [value[0], value[1], value[2]]
      physicsPosition.current = next
      if (previousPosition.current) {
        const dx = next[0] - previousPosition.current[0]
        const dz = next[2] - previousPosition.current[2]
        const step = Math.sqrt(dx * dx + dz * dz)
        if (step < 3) pathDistance.current += step
      }
      previousPosition.current = next
    })
    const unsubscribeQuaternion = api.quaternion.subscribe((value) => {
      physicsQuaternion.current = [value[0], value[1], value[2], value[3]]
    })
    const unsubscribeVelocity = api.velocity.subscribe((value) => {
      physicsVelocity.current = [value[0], value[1], value[2]]
    })
    const unsubscribeAngularVelocity = api.angularVelocity.subscribe((value) => {
      physicsAngularVelocity.current = [value[0], value[1], value[2]]
    })
    return () => {
      unsubscribePosition()
      unsubscribeQuaternion()
      unsubscribeVelocity()
      unsubscribeAngularVelocity()
    }
  }, [api])

  useEffect(() => {
    releaseAllKeys()
    return releaseAllKeys
  }, [])

  useFrame(() => {
    const p = physicsPosition.current
    const quat = physicsQuaternion.current
    if (!api || !p || !quat) return

    q.current.set(quat[0], quat[1], quat[2], quat[3])
    e.current.setFromQuaternion(q.current, 'YXZ')
    const yaw = e.current.y

    if (!startPosition.current) {
      startPosition.current = [...p]
      previousPosition.current = [...p]
      startYaw.current = yaw
      pathDistance.current = 0
      maxHeadingDelta.current = 0
      startedAt.current = performance.now()
    }

    const elapsed = (performance.now() - startedAt.current) / 1000

    let nextPhase = 'COAST'
    if (elapsed < 0.8) nextPhase = 'SETTLE'
    else if (elapsed < 2.4) nextPhase = 'THROTTLE'
    else if (elapsed < 4.8) nextPhase = 'THROTTLE + LEFT'
    else if (elapsed < 6.0) nextPhase = 'THROTTLE'
    else if (elapsed < 7.0) nextPhase = 'BRAKE'

    phase.current = nextPhase
    if (previousPhase.current !== nextPhase) {
      releaseAllKeys()
      if (nextPhase.includes('THROTTLE')) key('keydown', 'w')
      if (nextPhase.includes('LEFT')) key('keydown', 'a')
      if (nextPhase === 'BRAKE') key('keydown', ' ')
      previousPhase.current = nextPhase
    }

    const [sx, sy, sz] = startPosition.current
    const dx = p[0] - sx
    const dz = p[2] - sz
    const netDistance = Math.sqrt(dx * dx + dz * dz)
    const verticalDrift = Math.abs(p[1] - sy)
    const headingDelta = Math.abs(yaw - (startYaw.current ?? yaw))
    maxHeadingDelta.current = Math.max(maxHeadingDelta.current, headingDelta)

    const now = performance.now()
    if (now - lastReportAt.current > 150) {
      lastReportAt.current = now
      onTelemetry({
        elapsed,
        netDistance,
        pathDistance: pathDistance.current,
        speed: mutation.speed,
        headingDelta,
        maxHeadingDelta: maxHeadingDelta.current,
        verticalDrift,
        velocity: physicsVelocity.current,
        angularVelocity: physicsAngularVelocity.current,
        phase: phase.current,
        routeProgress: 0,
        roadError: 0,
        maxRoadError: 0,
        headingError: 0,
        turnCommand: nextPhase.includes('LEFT') ? 'LEFT' : 'STRAIGHT',
        routeAvailable: false,
      })
    }
  })

  return null
}

function ClosedLoopDonorDriver({ trace, onTelemetry }: { trace: CanonicalLapTrace; onTelemetry: (value: Telemetry) => void }) {
  const [api, actions] = useStore((state) => [state.api, state.actions])
  const physicsPosition = useRef<Vec3 | null>(null)
  const physicsQuaternion = useRef<Quat | null>(null)
  const physicsVelocity = useRef<Vec3>([0, 0, 0])
  const physicsAngularVelocity = useRef<Vec3>([0, 0, 0])
  const previousPosition = useRef<Vec3 | null>(null)
  const startPosition = useRef<Vec3 | null>(null)
  const pathDistance = useRef(0)
  const maxRoadError = useRef(0)
  const startedAt = useRef(performance.now())
  const nearestIndex = useRef(0)
  const lastReportAt = useRef(0)
  const firstDivergence = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!api) return
    const unsubscribePosition = api.position.subscribe((value) => {
      const next: Vec3 = [value[0], value[1], value[2]]
      physicsPosition.current = next
      if (previousPosition.current) {
        const dx = next[0] - previousPosition.current[0]
        const dz = next[2] - previousPosition.current[2]
        const step = Math.sqrt(dx * dx + dz * dz)
        if (step < 3) pathDistance.current += step
      }
      previousPosition.current = next
    })
    const unsubscribeQuaternion = api.quaternion.subscribe((value) => {
      physicsQuaternion.current = [value[0], value[1], value[2], value[3]]
    })
    const unsubscribeVelocity = api.velocity.subscribe((value) => {
      physicsVelocity.current = [value[0], value[1], value[2]]
    })
    const unsubscribeAngularVelocity = api.angularVelocity.subscribe((value) => {
      physicsAngularVelocity.current = [value[0], value[1], value[2]]
    })
    return () => {
      unsubscribePosition()
      unsubscribeQuaternion()
      unsubscribeVelocity()
      unsubscribeAngularVelocity()
    }
  }, [api])

  useEffect(() => {
    actions.forward(false)
    actions.backward(false)
    actions.left(false)
    actions.right(false)
    actions.brake(false)
    actions.boost(false)
    return () => {
      actions.forward(false)
      actions.backward(false)
      actions.left(false)
      actions.right(false)
      actions.brake(false)
      actions.boost(false)
    }
  }, [actions])

  useFrame(() => {
    const p = physicsPosition.current
    const quat = physicsQuaternion.current
    if (!api || !p || !quat) return

    if (!startPosition.current) {
      startPosition.current = [...p]
      previousPosition.current = [...p]
      pathDistance.current = 0
      maxRoadError.current = 0
      nearestIndex.current = 0
      startedAt.current = performance.now()
    }

    const target: FollowTarget = resolveFollowTarget(trace, p, quat, nearestIndex.current)
    nearestIndex.current = Math.max(nearestIndex.current, target.nearestIndex)
    maxRoadError.current = Math.max(maxRoadError.current, target.roadError)

    const speed = mutation.speed
    const severeError = target.roadError > 7 || Math.abs(target.headingError) > 1.15
    const nearingFinish = target.progress > 0.985
    const shouldBrake = severeError || nearingFinish || speed > target.targetSpeed + 4
    const shouldDrive = !nearingFinish && speed < target.targetSpeed + 1

    actions.backward(false)
    actions.boost(false)
    actions.forward(shouldDrive && !severeError)
    actions.brake(shouldBrake)
    actions.left(!severeError && target.turn === 'left')
    actions.right(!severeError && target.turn === 'right')

    if (!firstDivergence.current && target.progress > 0.01 && target.roadError > 5) {
      firstDivergence.current = `${((performance.now() - startedAt.current) / 1000).toFixed(1)}s · road error ${target.roadError.toFixed(1)}m · command ${target.turn.toUpperCase()}`
    }

    const [sx, sy, sz] = startPosition.current
    const dx = p[0] - sx
    const dz = p[2] - sz
    const netDistance = Math.sqrt(dx * dx + dz * dz)
    const verticalDrift = Math.abs(p[1] - sy)
    const elapsed = (performance.now() - startedAt.current) / 1000
    const now = performance.now()

    if (now - lastReportAt.current > 120) {
      lastReportAt.current = now
      onTelemetry({
        elapsed,
        netDistance,
        pathDistance: pathDistance.current,
        speed,
        headingDelta: Math.abs(target.headingError),
        maxHeadingDelta: 0,
        verticalDrift,
        velocity: physicsVelocity.current,
        angularVelocity: physicsAngularVelocity.current,
        phase: severeError ? 'RECOVER / BRAKE' : nearingFinish ? 'FINISH' : 'FOLLOW DONOR ROAD',
        routeProgress: target.progress,
        roadError: target.roadError,
        maxRoadError: maxRoadError.current,
        headingError: target.headingError,
        turnCommand: target.turn.toUpperCase(),
        routeAvailable: true,
        firstDivergence: firstDivergence.current,
      })
    }
  })

  return null
}

export function NativeDrivingProof(): JSX.Element {
  const [dpr, editor, shadows] = useStore((state) => [state.dpr, state.editor, state.shadows])
  const [light, setLight] = useState<DirectionalLight | null>(null)
  const [trace] = useState(() => loadCanonicalLap())
  const [telemetry, setTelemetry] = useState<Telemetry>({
    elapsed: 0,
    netDistance: 0,
    pathDistance: 0,
    speed: 0,
    headingDelta: 0,
    maxHeadingDelta: 0,
    verticalDrift: 0,
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
    phase: 'BOOT',
    routeProgress: 0,
    roadError: 0,
    maxRoadError: 0,
    headingError: 0,
    turnCommand: 'STRAIGHT',
    routeAvailable: Boolean(trace),
  })

  useEffect(() => {
    setState({ ready: true })
    return () => setState({ ready: false })
  }, [])

  const verdict = useMemo(() => {
    if (!trace) {
      if (telemetry.elapsed < 7.5) return 'RUNNING'
      if (telemetry.pathDistance >= 8 && telemetry.netDistance >= 5 && telemetry.maxHeadingDelta >= 0.05 && telemetry.verticalDrift < 3) return 'PASS'
      return 'FAIL'
    }
    if (telemetry.elapsed < 8) return 'RUNNING'
    if (telemetry.routeProgress >= 0.12 && telemetry.maxRoadError <= 7 && telemetry.pathDistance >= 10) return 'PASS'
    return 'FAIL'
  }, [telemetry, trace])

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#05070a', color: 'white' }}>
      <Canvas key={`${dpr}${shadows}`} dpr={[1, dpr]} shadows={shadows} camera={{ position: [0, 5, 15], fov: 50 }}>
        <fog attach="fog" args={['white', 0, 500]} />
        <Sky sunPosition={[100, 10, 100]} distance={1000} />
        <ambientLight layers={layers} intensity={0.1} />
        <directionalLight ref={setLight} layers={layers} position={[0, 50, 150]} intensity={1} shadow-bias={-0.001} shadow-mapSize={[4096, 4096]} shadow-camera-left={-150} shadow-camera-right={150} shadow-camera-top={150} shadow-camera-bottom={-150} castShadow />
        <PerspectiveCamera makeDefault={editor} fov={75} position={[0, 20, 20]} />
        <Physics allowSleep broadphase="SAP" defaultContactMaterial={{ contactEquationRelaxation: 4, friction: 1e-3 }}>
          <Vehicle angularVelocity={[...angularVelocity]} position={[...position]} rotation={[...rotation]}>
            {light && <primitive object={light.target} />}
            <Cameras />
          </Vehicle>
          <Train />
          <Ramp args={[30, 6, 8]} position={[2, -1, 168.55]} rotation={[0, 0.49, Math.PI / 15]} />
          <Heightmap elementSize={0.5085} position={[327 - 66.5, -3.3, -473 + 213]} rotation={[-Math.PI / 2, 0, -Math.PI]} />
          <Goal args={[0.001, 10, 18]} onCollideBegin={() => undefined} rotation={[0, 0.55, 0]} position={[-27, 1, 180]} />
          <Goal args={[0.001, 10, 18]} onCollideBegin={() => undefined} rotation={[0, -1.2, 0]} position={[-104, 1, -189]} />
          <Goal args={[0.001, 10, 18]} onCollideBegin={() => undefined} rotation={[0, -0.5, 0]} position={[-50, 1, -5]} />
          <BoundingBox depth={512} height={100} position={[0, 40, 0]} width={512} />
          {trace ? <ClosedLoopDonorDriver trace={trace} onTelemetry={setTelemetry} /> : <ScriptedKeyboardDriver onTelemetry={setTelemetry} />}
        </Physics>
        <Track />
        <Environment files="textures/dikhololo_night_1k.hdr" />
      </Canvas>
      <Keyboard />
      <aside style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 20, maxWidth: 480, margin: '0 auto', padding: 14, borderRadius: 14, background: 'rgba(0,0,0,.84)' }}>
        <span style={{ display: 'block', fontSize: 11, letterSpacing: '.12em', opacity: .6 }}>{trace ? 'DONOR QUALIFICATION 02 · FOLLOW THE ROAD' : 'DONOR QUALIFICATION 01 · CONTROL CHAIN'}</span>
        <strong style={{ display: 'block', fontSize: 22, marginTop: 3 }}>{verdict}</strong>
        <small style={{ display: 'block', opacity: .7, marginTop: 5 }}>{trace ? 'Closed-loop controller follows the captured legal donor lap using the recipient car’s native control actions.' : 'No canonical lap found. Falling back to the original automated keyboard control-chain probe.'}</small>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
          <b>PHASE {telemetry.phase}</b><b>TIME {telemetry.elapsed.toFixed(1)}s</b>
          <b>PATH {telemetry.pathDistance.toFixed(1)}m</b><b>NET {telemetry.netDistance.toFixed(1)}m</b>
          <b>SPEED {telemetry.speed.toFixed(1)}</b><b>TURN {telemetry.turnCommand}</b>
          {trace ? <><b>ROUTE {(telemetry.routeProgress * 100).toFixed(1)}%</b><b>ROAD ERR {telemetry.roadError.toFixed(1)}m</b><b>HEAD ERR {telemetry.headingError.toFixed(2)}</b><b>MAX ROAD {telemetry.maxRoadError.toFixed(1)}m</b></> : <><b>TURN MAX {telemetry.maxHeadingDelta.toFixed(2)}</b><b>HEADING NOW {telemetry.headingDelta.toFixed(2)}</b></>}
          <b>VEL {telemetry.velocity.map((v) => v.toFixed(1)).join(', ')}</b><b>ANG {telemetry.angularVelocity.map((v) => v.toFixed(2)).join(', ')}</b>
        </div>
        {telemetry.firstDivergence && <small style={{ display: 'block', marginTop: 10, color: '#ffd18a' }}>FIRST DIVERGENCE {telemetry.firstDivergence}</small>}
        <small style={{ display: 'block', marginTop: 10, opacity: .62 }}>{trace ? 'PASS now means the recipient makes measurable progress while remaining inside a donor-relative road corridor. This is behavior following, not timed input playback.' : 'Capture one clean legal lap to unlock terrain-relative closed-loop qualification.'}</small>
      </aside>
    </main>
  )
}
