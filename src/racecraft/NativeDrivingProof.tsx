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

const layers = new Layers()
layers.enable(levelLayer)

type Vec3 = [number, number, number]
type Telemetry = {
  elapsed: number
  netDistance: number
  pathDistance: number
  speed: number
  headingDelta: number
  verticalDrift: number
  velocity: Vec3
  angularVelocity: Vec3
  phase: string
}

function key(type: 'keydown' | 'keyup', value: string) {
  window.dispatchEvent(new KeyboardEvent(type, { key: value, bubbles: true }))
}

function releaseAll() {
  for (const value of ['w', 'a', 'd', 'shift', ' ']) key('keyup', value)
}

function ProofDriver({ onTelemetry }: { onTelemetry: (value: Telemetry) => void }) {
  const api = useStore((state) => state.api)
  const physicsPosition = useRef<Vec3 | null>(null)
  const physicsQuaternion = useRef<[number, number, number, number] | null>(null)
  const physicsVelocity = useRef<Vec3>([0, 0, 0])
  const physicsAngularVelocity = useRef<Vec3>([0, 0, 0])
  const startPosition = useRef<Vec3 | null>(null)
  const previousPosition = useRef<Vec3 | null>(null)
  const pathDistance = useRef(0)
  const startYaw = useRef<number | null>(null)
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
    releaseAll()
    return releaseAll
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
      startedAt.current = performance.now()
    }

    const elapsed = (performance.now() - startedAt.current) / 1000

    let nextPhase = 'COAST'
    if (elapsed < 0.8) nextPhase = 'SETTLE'
    else if (elapsed < 2.4) nextPhase = 'THROTTLE'
    else if (elapsed < 3.8) nextPhase = 'THROTTLE + LEFT'
    else if (elapsed < 4.4) nextPhase = 'THROTTLE'
    else if (elapsed < 5.6) nextPhase = 'THROTTLE + RIGHT'
    else if (elapsed < 6.4) nextPhase = 'THROTTLE'
    else if (elapsed < 7.3) nextPhase = 'BRAKE'
    else nextPhase = 'COAST'

    phase.current = nextPhase
    if (previousPhase.current !== nextPhase) {
      releaseAll()
      if (nextPhase.includes('THROTTLE')) key('keydown', 'w')
      if (nextPhase.includes('LEFT')) key('keydown', 'a')
      if (nextPhase.includes('RIGHT')) key('keydown', 'd')
      if (nextPhase === 'BRAKE') key('keydown', ' ')
      previousPhase.current = nextPhase
    }

    const [sx, sy, sz] = startPosition.current
    const dx = p[0] - sx
    const dz = p[2] - sz
    const netDistance = Math.sqrt(dx * dx + dz * dz)
    const verticalDrift = Math.abs(p[1] - sy)
    const headingDelta = Math.abs(yaw - (startYaw.current ?? yaw))

    const now = performance.now()
    if (now - lastReportAt.current > 150) {
      lastReportAt.current = now
      onTelemetry({
        elapsed,
        netDistance,
        pathDistance: pathDistance.current,
        speed: mutation.speed,
        headingDelta,
        verticalDrift,
        velocity: physicsVelocity.current,
        angularVelocity: physicsAngularVelocity.current,
        phase: phase.current,
      })
    }
  })

  return null
}

export function NativeDrivingProof(): JSX.Element {
  const [dpr, editor, shadows] = useStore((state) => [state.dpr, state.editor, state.shadows])
  const [light, setLight] = useState<DirectionalLight | null>(null)
  const [telemetry, setTelemetry] = useState<Telemetry>({
    elapsed: 0,
    netDistance: 0,
    pathDistance: 0,
    speed: 0,
    headingDelta: 0,
    verticalDrift: 0,
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
    phase: 'BOOT',
  })

  useEffect(() => {
    setState({ ready: true })
    return () => setState({ ready: false })
  }, [])

  const verdict = useMemo(() => {
    if (telemetry.elapsed < 7.8) return 'RUNNING'
    if (telemetry.pathDistance >= 8 && telemetry.netDistance >= 5 && telemetry.headingDelta >= 0.05 && telemetry.verticalDrift < 3) return 'PASS'
    return 'FAIL'
  }, [telemetry])

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#05070a', color: 'white' }}>
      <Canvas key={`${dpr}${shadows}`} dpr={[1, dpr]} shadows={shadows} camera={{ position: [0, 5, 15], fov: 50 }}>
        <fog attach="fog" args={['white', 0, 500]} />
        <Sky sunPosition={[100, 10, 100]} distance={1000} />
        <ambientLight layers={layers} intensity={0.1} />
        <directionalLight
          ref={setLight}
          layers={layers}
          position={[0, 50, 150]}
          intensity={1}
          shadow-bias={-0.001}
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-150}
          shadow-camera-right={150}
          shadow-camera-top={150}
          shadow-camera-bottom={-150}
          castShadow
        />
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
          <ProofDriver onTelemetry={setTelemetry} />
        </Physics>
        <Track />
        <Environment files="textures/dikhololo_night_1k.hdr" />
      </Canvas>
      <Keyboard />
      <aside style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 20, maxWidth: 460, margin: '0 auto', padding: 14, borderRadius: 14, background: 'rgba(0,0,0,.84)' }}>
        <span style={{ display: 'block', fontSize: 11, letterSpacing: '.12em', opacity: .6 }}>DONOR-FAITHFUL BEHAVIOR QUALIFICATION</span>
        <strong style={{ display: 'block', fontSize: 22, marginTop: 3 }}>{verdict}</strong>
        <small style={{ display: 'block', opacity: .7, marginTop: 5 }}>Automated keyboard events now travel through the donor game's own Keyboard → store → Vehicle chain.</small>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
          <b>PHASE {telemetry.phase}</b>
          <b>TIME {telemetry.elapsed.toFixed(1)}s</b>
          <b>PATH {telemetry.pathDistance.toFixed(1)}m</b>
          <b>NET {telemetry.netDistance.toFixed(1)}m</b>
          <b>SPEED {telemetry.speed.toFixed(1)}</b>
          <b>HEADING Δ {telemetry.headingDelta.toFixed(2)}</b>
          <b>VERTICAL Δ {telemetry.verticalDrift.toFixed(2)}m</b>
          <b>VEL {telemetry.velocity.map((v) => v.toFixed(1)).join(', ')}</b>
          <b>ANG {telemetry.angularVelocity.map((v) => v.toFixed(2)).join(', ')}</b>
        </div>
        <small style={{ display: 'block', marginTop: 10, opacity: .62 }}>PASS requires useful path travel, net road displacement and chassis heading change. Jitter, wheelspin, revving or falling cannot pass.</small>
      </aside>
    </main>
  )
}
