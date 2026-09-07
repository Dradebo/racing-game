import { useEffect, useState } from 'react'
import { Layers } from 'three'
import { Canvas } from '@react-three/fiber'
import { Sky, Environment } from '@react-three/drei'

import { Track } from './models'
import { levelLayer, useStore } from './store'
import { PitWall } from './racecraft/PitWall'
import { RaceGhost } from './racecraft/RaceGhost'
import { ObservationCamera } from './racecraft/ObservationCamera'
import { RacecraftHUD } from './racecraft/RacecraftHUD'
import { RaceDrawers } from './racecraft/RaceDrawers'
import { RaceScene } from './racecraft/RaceScene'
import { ReplayDirector } from './racecraft/ReplayDirector'
import { TrophyShelf } from './racecraft/TrophyShelf'
import { RaceRouteProvider } from './racecraft/RaceRouteProvider'
import { NativeLapCapture } from './racecraft/NativeLapCapture'
import { NativeReplayStage } from './racecraft/NativeReplayStage'
import { NativeDrivingProof } from './racecraft/NativeDrivingProof'
import { RouteDiagnostic } from './racecraft/RouteDiagnostic'
import { OrientationBoard } from './racecraft/OrientationBoard'
import { KnownField } from './racecraft/KnownField'
import { HaramBallBoard } from './racecraft/HaramBallBoard'
import { REPLAY_MODE_EVENT } from './racecraft/replayBridge'
import './racecraft/appShell.css'

const layers = new Layers()
layers.enable(levelLayer)

type ObservationMode = 'racecraft' | 'haram-ball'

export function App(): JSX.Element {
  const [dpr, shadows] = useStore((s) => [s.dpr, s.shadows])
  const [replayActive, setReplayActive] = useState(false)
  const [observationMode, setObservationMode] = useState<ObservationMode>(() => {
    const saved = window.localStorage.getItem('striving-observation.mode')
    return saved === 'haram-ball' ? 'haram-ball' : 'racecraft'
  })
  const params = new URLSearchParams(window.location.search)
  const captureLap = params.get('capture-lap') === '1'
  const nativeProof = params.get('native-proof') === '1'

  useEffect(() => {
    const handler = (event: Event) => setReplayActive(Boolean((event as CustomEvent<boolean>).detail))
    window.addEventListener(REPLAY_MODE_EVENT, handler)
    return () => window.removeEventListener(REPLAY_MODE_EVENT, handler)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('striving-observation.mode', observationMode)
  }, [observationMode])

  if (nativeProof) return <NativeDrivingProof />
  if (captureLap) return <NativeLapCapture />

  return (
    <main className="striving-observation-app">
      <nav className="mode-switcher" aria-label="Observation mode">
        <button className={observationMode === 'racecraft' ? 'active' : ''} onClick={() => setObservationMode('racecraft')}>RACECRAFT</button>
        <button className={observationMode === 'haram-ball' ? 'active' : ''} onClick={() => setObservationMode('haram-ball')}>HARAM BALL</button>
      </nav>

      {observationMode === 'racecraft' ? (
        <>
          <section className="racecraft-world" aria-label="Race state world">
            {replayActive ? (
              <NativeReplayStage dpr={dpr} shadows={shadows} />
            ) : (
              <Canvas key={`observation-${dpr}-${shadows}`} dpr={[1, dpr]} shadows={shadows} camera={{ position: [-18, 70, 188], fov: 48 }}>
                <fog attach="fog" args={['white', 0, 500]} />
                <Sky sunPosition={[100, 10, 100]} distance={1000} />
                <ambientLight layers={layers} intensity={0.25} />
                <directionalLight layers={layers} position={[0, 50, 150]} intensity={1.1} castShadow />
                <Track />
                <RaceRouteProvider>
                  <ObservationCamera />
                  <RaceScene />
                  <RaceGhost />
                </RaceRouteProvider>
                <Environment files="textures/dikhololo_night_1k.hdr" />
              </Canvas>
            )}
            <RacecraftHUD />
            <ReplayDirector />
            <RouteDiagnostic />
          </section>
          <OrientationBoard />
          <KnownField />
          <RaceDrawers />
          <TrophyShelf />
        </>
      ) : (
        <HaramBallBoard />
      )}

      <PitWall />
    </main>
  )
}
