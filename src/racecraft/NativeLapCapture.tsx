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

function TouchButton({ label, onPress, onRelease, wide = false }: { label: string; onPress: () => void; onRelease?: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture?.(event.pointerId); onPress() }}
      onPointerUp={(event) => { event.preventDefault(); onRelease?.() }}
      onPointerCancel={() => onRelease?.()}
      onPointerLeave={(event) => { if (event.buttons) onRelease?.() }}
      style={{
        minWidth: wide ? 112 : 66,
        height: 58,
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,.34)',
        background: 'rgba(5,7,10,.78)',
        color: '#fff',
        fontWeight: 800,
        fontSize: 13,
        letterSpacing: '.05em',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {label}
    </button>
  )
}

function MobileControls() {
  const actions = useStore((state) => state.actions)

  return (
    <div style={{ position: 'absolute', zIndex: 30, left: 0, right: 0, bottom: 'max(16px, env(safe-area-inset-bottom))', padding: '0 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, pointerEvents: 'none' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '66px 66px', gap: 8, pointerEvents: 'auto' }}>
        <TouchButton label="←" onPress={() => actions.left(true)} onRelease={() => actions.left(false)} />
        <TouchButton label="→" onPress={() => actions.right(true)} onRelease={() => actions.right(false)} />
        <TouchButton label="RESET" onPress={actions.reset} wide />
        <TouchButton label="CAM" onPress={actions.camera} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '66px 66px', gap: 8, pointerEvents: 'auto' }}>
        <TouchButton label="BRAKE" onPress={() => actions.brake(true)} onRelease={() => actions.brake(false)} />
        <TouchButton label="BOOST" onPress={() => actions.boost(true)} onRelease={() => actions.boost(false)} />
        <TouchButton label="REV" onPress={() => actions.backward(true)} onRelease={() => actions.backward(false)} />
        <TouchButton label="GO" onPress={() => actions.forward(true)} onRelease={() => actions.forward(false)} />
      </div>
    </div>
  )
}

function returnToRacecraft() {
  const url = new URL(window.location.href)
  url.searchParams.delete('capture-lap')
  url.searchParams.set('route-debug', '1')
  window.location.assign(url.toString())
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
    <main style={{ position: 'fixed', inset: 0, background: '#05070a', color: 'white', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', zIndex: 20, left: 12, right: 12, top: 'max(12px, env(safe-area-inset-top))', maxWidth: 440, margin: '0 auto', background: 'rgba(0,0,0,.78)', padding: 12, borderRadius: 14 }}>
        <strong>CANONICAL LAP CAPTURE</strong>
        <p style={{ margin: '7px 0', fontSize: 12, lineHeight: 1.45 }}>Drive one clean legal lap using the donor game's own physics. Cross the start gate, checkpoint, then finish. The trace saves automatically.</p>
        {saved ? (
          <button type="button" onClick={returnToRacecraft} style={{ width: '100%', minHeight: 42, border: 0, borderRadius: 10, fontWeight: 800 }}>LAP SAVED · RETURN TO RACECRAFT</button>
        ) : (
          <small style={{ opacity: .72 }}>Phone: use the touch controls below. Desktop: keyboard controls still work.</small>
        )}
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
      <MobileControls />
    </main>
  )
}
