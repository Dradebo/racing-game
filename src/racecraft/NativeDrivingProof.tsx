import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Sky } from '@react-three/drei'
import { Cameras } from '../effects'
import { BoundingBox, Heightmap, Ramp, Track, Vehicle } from '../models'
import { angularVelocity, mutation, position, rotation, useStore } from '../store'

function ProofDriver({ onTelemetry }: { onTelemetry: (value: { elapsed: number; distance: number; speed: number; headingDelta: number }) => void }) {
  const actions = useStore((state) => state.actions)
  const chassisBody = useStore((state) => state.chassisBody)
  const startPosition = useRef<[number, number, number] | null>(null)
  const startYaw = useRef<number | null>(null)
  const startedAt = useRef(performance.now())

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
    const body = chassisBody.current
    if (!body) return

    if (!startPosition.current) {
      startPosition.current = [body.position.x, body.position.y, body.position.z]
      startYaw.current = body.rotation.y
      startedAt.current = performance.now()
    }

    const elapsed = (performance.now() - startedAt.current) / 1000

    actions.forward(elapsed >= 0.5 && elapsed < 5.2)
    actions.left(elapsed >= 2.0 && elapsed < 3.1)
    actions.right(elapsed >= 3.4 && elapsed < 4.2)
    actions.boost(elapsed >= 1.2 && elapsed < 2.1)
    actions.brake(elapsed >= 5.2 && elapsed < 6.3)

    const [sx, sy, sz] = startPosition.current
    const dx = body.position.x - sx
    const dy = body.position.y - sy
    const dz = body.position.z - sz
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
    const headingDelta = Math.abs(body.rotation.y - (startYaw.current ?? body.rotation.y))

    onTelemetry({ elapsed, distance, speed: mutation.speed, headingDelta })
  })

  return null
}

export function NativeDrivingProof(): JSX.Element {
  const [dpr, shadows] = useStore((state) => [state.dpr, state.shadows])
  const [telemetry, setTelemetry] = useState({ elapsed: 0, distance: 0, speed: 0, headingDelta: 0 })
  const verdict = useMemo(() => {
    if (telemetry.elapsed < 6.5) return 'RUNNING'
    if (telemetry.distance >= 6 && telemetry.speed >= 0 && telemetry.headingDelta >= 0.05) return 'PASS'
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
        <small style={{ display: 'block', opacity: .7, marginTop: 5 }}>No Racecraft semantics. This test only asks whether the donor vehicle can autonomously move and steer under its own mechanics.</small>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, fontSize: 12 }}>
          <b>TIME {telemetry.elapsed.toFixed(1)}s</b>
          <b>DISTANCE {telemetry.distance.toFixed(1)}m</b>
          <b>SPEED {telemetry.speed.toFixed(1)}</b>
          <b>HEADING Δ {telemetry.headingDelta.toFixed(2)}</b>
        </div>
        <small style={{ display: 'block', marginTop: 10, opacity: .62 }}>Pass requires meaningful chassis displacement and heading change. Engine sound alone cannot pass.</small>
      </aside>
    </main>
  )
}
