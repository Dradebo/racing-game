import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Physics } from '@react-three/cannon'
import { Environment, Sky } from '@react-three/drei'

import { Keyboard } from '../controls'
import { Cameras } from '../effects'
import { BoundingBox, Goal, Heightmap, Ramp, Track, Train, Vehicle } from '../models'
import { angularVelocity, position, rotation, useStore } from '../store'
import { saveCanonicalLap, type LapTraceSample } from './canonicalLap'

function Recorder({ onComplete }: { onComplete: (samples: LapTraceSample[], durationMs: number, checkpointAtMs?: number) => void }) {
  const chassisBody = useStore((state) => state.chassisBody)
  const recording = useRef(false)
  const startAt = useRef<number | null>(null)
  const checkpointAt = useRef<number | undefined>(undefined)
  const samples = useRef<LapTraceSample[]>([])
  const lastSampleAt = useRef(0)

  useEffect(() => {
    const start = () => {
      samples.current = []
      checkpointAt.current = undefined
      startAt.current = performance.now()
      lastSampleAt.current = 0
      recording.current = true
    }
    const checkpoint = () => {
      if (startAt.current !== null) checkpointAt.current = performance.now() - startAt.current
    }
    const finish = () => {
      if (startAt.current === null || !recording.current) return
      const durationMs = performance.now() - startAt.current
      recording.current = false
      onComplete(samples.current, durationMs, checkpointAt.current)
      startAt.current = null
    }
    window.addEventListener('racecraft-capture:start', start)
    window.addEventListener('racecraft-capture:checkpoint', checkpoint)
    window.addEventListener('racecraft-capture:finish', finish)
    return () => {
      window.removeEventListener('racecraft-capture:start', start)
      window.removeEventListener('racecraft-capture:checkpoint', checkpoint)
      window.removeEventListener('racecraft-capture:finish', finish)
    }
  }, [onComplete])

  useFrame(() => {
    if (!recording.current || startAt.current === null || !chassisBody.current) return
    const now = performance.now()
    if (now - lastSampleAt.current < 50) return
    lastSampleAt.current = now
    const p = chassisBody.current.position
    const q = chassisBody.current.quaternion
    samples.current.push({
      t: now - startAt.current,
      position: [p.x, p.y, p.z],
      quaternion: [q.x, q.y, q.z, q.w],
    })
  })

  return null
}

export function NativeLapCapture(): JSX.Element {
  const [dpr, shadows, actions] = useStore((state) => [state.dpr, state.shadows, state.actions])
  const [saved, setSaved] = useState(false)

  function complete(samples: LapTraceSample[], durationMs: number, checkpointAtMs?: number) {
    if (samples.length < 10) return
    saveCanonicalLap({ version: 1, source: 'native_capture', capturedAt: new Date().toISOString(), durationMs, checkpointAtMs, samples })
    setSaved(true)
  }

  return (
    <main style={{ position: 'fixed', inset: 0, background: '#05070a', color: 'white' }}>
      <div style={{ position: 'absolute', zIndex: 20, left: 12, top: 12, maxWidth: 360, background: 'rgba(0,0,0,.72)', padding: 12, borderRadius: 10 }}>
        <strong>CANONICAL LAP CAPTURE</strong>
        <p style={{ margin: '8px 0', fontSize: 12 }}>Drive one clean legal lap using the donor game's own physics and controls. Crossing start begins capture; checkpoint and finish are recorded automatically.</p>
        {saved && <b style={{ fontSize: 12 }}>Lap saved. Remove <code>?capture-lap=1</code> to return to Racecraft.</b>}
      </div>
      <Canvas key={`${dpr}${shadows}`} dpr={[1, dpr]} shadows={shadows} camera={{ position: [0, 5, 15], fov: 50 }}>
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
          <Goal args={[0.001, 10, 18]} onCollideBegin={() => { actions.onStart(); window.dispatchEvent(new Event('racecraft-capture:start')) }} rotation={[0, 0.55, 0]} position={[-27, 1, 180]} />
          <Goal args={[0.001, 10, 18]} onCollideBegin={() => { actions.onFinish(); window.dispatchEvent(new Event('racecraft-capture:finish')) }} rotation={[0, -1.2, 0]} position={[-104, 1, -189]} />
          <Goal args={[0.001, 10, 18]} onCollideBegin={() => { actions.onCheckpoint(); window.dispatchEvent(new Event('racecraft-capture:checkpoint')) }} rotation={[0, -0.5, 0]} position={[-50, 1, -5]} />
          <BoundingBox depth={512} height={100} position={[0, 40, 0]} width={512} />
          <Recorder onComplete={complete} />
        </Physics>
        <Track />
        <Environment files="textures/dikhololo_night_1k.hdr" />
      </Canvas>
      <Keyboard />
    </main>
  )
}
