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
import './racecraft/appShell.css'

const layers = new Layers()
layers.enable(levelLayer)

export function App(): JSX.Element {
  const [dpr, shadows] = useStore((s) => [s.dpr, s.shadows])

  return (
    <main className="striving-observation-app">
      <section className="racecraft-world" aria-label="Race state world">
        <Canvas key={`${dpr}${shadows}`} dpr={[1, dpr]} shadows={shadows} camera={{ position: [-18, 70, 188], fov: 48 }}>
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
        <RacecraftHUD />
        <ReplayDirector />
      </section>
      <RaceDrawers />
      <TrophyShelf />
      <PitWall />
    </main>
  )
}
