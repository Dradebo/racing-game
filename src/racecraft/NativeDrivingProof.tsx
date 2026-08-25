import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Sky } from '@react-three/drei'
import { Euler, Quaternion } from 'three'
import { Cameras } from '../effects'
import { BoundingBox, Heightmap, Ramp, Track, Vehicle } from '../models'
import { angularVelocity, mutation, position, rotation, useStore } from '../store'

type Telemetry = {
  elapsed: number
  distance: number
  speed: number
  headingDelta: number
  verticalDrift: number
}

function ProofDriver({ onTelemetry }: { onTelemetry: (value: Telemetry) => void }) {
  const actions = useStore((state) => state.actions)
  const api = useStore((state) => state.api)
  const physicsPosition = useRef<[number, number, number] | null>(null)
  const physicsQuaternion = useRef<[number, number, number, number] | null>(null)
  const startPosition = useRef<[number, number, number] | null>(null)
  const startYaw = useRef<number | null>(null)
  const startedAt = useRef(performance.now())
  const q = useRef(new Quaternion())
  const e = useRef(new Euler(0, 0, 0, 'YXZ'))

  useEffect(() => {
    if (!api) return
    const unsubscribePosition = api.position.subscribe((value) => {
      physicsPosition.current = [value[0], value[1], value[2]]
    })
    const unsubscribeQuaternion = api.quaternion.subscribe((value) => {
      physicsQuaternion.current = [value[0], value[1], value[2], value[3]]
    })
    return () => {
      unsubscribePosition()
      unsubscribeQuaternion()
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

    q.current.set(quat[0], quat[1], quat[2], quat[3])
    e.current.setFromQuaternion(q.current, 'YXZ')
    const yaw = e.current.y

    if (!startPosition.current) {
      startPosition.current = [...p]
      startYaw.current = yaw
      startedAt.current = performance.now()
    }

    const elapsed = (performance.now() - startedAt.current) / 1000

    actions.forward(elapsed >= 0.5 && elapsed < 5.2)
    actions.left(elapsed >= 2.0 && elapsed < 3.1)
    actions.right(elapsed >= 3.4 && elapsed < 4.2)
    actions.boost(elapsed >= 1.2 && elapsed < 2.1)
    actions.brake(elapsed >= 5.2 && elapsed < 6.3)

    const [sx, sy, sz] = startPosition.current
    const dx = p[0] - sx
    const dz = p[2] - sz
    const distance = Math.sqrt(dx * dx + dz * dz)
    const verticalDrift = Math.abs(p[1] - sy)
    const headingDelta = Math.abs(yaw - (startYaw.current ?? yaw))

    onTelemetry({ elapsed, distance, speed: mutation.speed, headingDelta, verticalDrift })
  })

  return null
}

export function NativeDrivingProof(): JSX.Element {
  const [dpr, shadows] = useStore((state) => [state.dpr, state.shadows])
  const [telemetry, setTelemetry] = useState<Telemetry>({ elapsed: 0, distance: 0, speed: 0, headingDelta: 0, verticalDrift: 0 })
  const verdict = useMemo(() => {
    if (telemetry.elapsed < 6.5) return 'RUNNING'
    if (telemetry.distance >= 6 && telemetry.headingDelta >= 0.05 && telemetry.verticalDrift < 3) return 'PASS'
    return 'FAIL'
  }, [telemetry])

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#05070a', color: 'white' }}>
      <Canvas dpr={[1, dpr]} shadows={shadows} camera={{ position: [0, 5, 15], fov: 50 }}>
        <fog attach="fog" args={['white', 0, 500]} />
        <Sky sunPosition={[100, 10, 100]} distance={1000} />
        <ambientLight intensity={0.1} />
        <directionalLight position={[0, 50, 150]} intensity={1} castShadow />
        <Physics allowSleep broadphase="SAP" defaultContactMaterial={{ contactEquationRelaxation: 4, friction: 1e-3 }}>
          <Vehicle angularVelocity={[...angularVelocity]} position={[...position]} rotation={[...rotation]}>
            <Cameras />
          </Vehicle>
          <Ramp args={[30, 6, 8]} position={[2, -1, 168.55]} rotation={[0, 0.49, Math.PI / 15]} />
          <Heightmap elementSize={0.5085} position={[327 - 66.5, -3.3, -473 + 213]} rotation={[-Math.PI / 2, 0, -Math.PI]} />
          <BoundingBox depth={512} height={100} position={[0, 40, 0]} width={512} />
          <ProofDriver onTelemetry={setTelemetry} />
        </Physics>
        <Track />
        <Environment files="textures/dikhololo_night_1k.hdr" />
      </Canvas>
      <aside style={{ position: 'absolute', left: 12, right: 12, top: 12, zIndex: 20, maxWidth: 420, margin: '0 auto', padding: 14, borderRadius: 14, background: 'rgba(0,0,0,.82)' }}>
        <span style={{ display: 'block', fontSize: 11, letterSpacing: '.12em', opacity: .6 }}>NATIVE BEHAVIOR QUALIFICATION</span>
        <strong style={{ display: 'block', fontSize: 22, marginTop: 3 }}>{verdict}</strong>
        <small style={{ display: 'block', opacity: .7, marginTop: 5 }}>No Racecraft semantics. Telemetry now comes directly from the Cannon physics body.</small>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
          <b>TIME {telemetry.elapsed.toFixed(1)}s</b>
          <b>ROAD DIST {telemetry.distance.toFixed(1)}m</b>
          <b>SPEED {telemetry.speed.toFixed(1)}</b>
          <b>HEADING Δ {telemetry.headingDelta.toFixed(2)}</b>
          <b>VERTICAL Δ {telemetry.verticalDrift.toFixed(2)}m</b>
        </div>
        <small style={{ display: 'block', marginTop: 10, opacity: .62 }}>Pass requires horizontal chassis displacement and heading change without a large vertical fall. Revving or falling cannot pass.</small>
      </aside>
    </main>
  )
}
