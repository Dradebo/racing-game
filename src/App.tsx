import { useState } from 'react'
import { Layers } from 'three'
import { Canvas } from '@react-three/fiber'
import { Physics, Debug } from '@react-three/cannon'
import { Sky, Environment, PerspectiveCamera, OrbitControls, Stats } from '@react-three/drei'

import type { DirectionalLight } from 'three'

import { Cameras } from './effects'
import { BoundingBox, Ramp, Track, Vehicle, Goal, Train, Heightmap } from './models'
import { angularVelocity, levelLayer, position, rotation, useStore } from './store'
import { Editor } from './ui'
import { useToggle } from './useToggle'
import { PitWall } from './racecraft/PitWall'
import { RaceGhost } from './racecraft/RaceGhost'

const layers = new Layers()
layers.enable(levelLayer)

export function App(): JSX.Element {
  const [light, setLight] = useState<DirectionalLight | null>(null)
  const [dpr, editor, shadows] = useStore((s) => [s.dpr, s.editor, s.shadows])

  const ToggledDebug = useToggle(Debug, 'debug')
  const ToggledEditor = useToggle(Editor, 'editor')
  const ToggledOrbitControls = useToggle(OrbitControls, 'editor')
  const ToggledStats = useToggle(Stats, 'stats')

  return (
    <main className="striving-observation-app">
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
          <ToggledDebug scale={1.0001} color="white">
            <Vehicle angularVelocity={[...angularVelocity]} position={[...position]} rotation={[...rotation]}>
              {light && <primitive object={light.target} />}
              <Cameras />
            </Vehicle>
            <Train />
            <Ramp args={[30, 6, 8]} position={[2, -1, 168.55]} rotation={[0, 0.49, Math.PI / 15]} />
            <Heightmap elementSize={0.5085} position={[327 - 66.5, -3.3, -473 + 213]} rotation={[-Math.PI / 2, 0, -Math.PI]} />
            <BoundingBox {...{ depth: 512, height: 100, position: [0, 40, 0], width: 512 }} />
          </ToggledDebug>
        </Physics>
        <Track />
        <RaceGhost />
        <Environment files="textures/dikhololo_night_1k.hdr" />
        <ToggledOrbitControls />
      </Canvas>
      <ToggledEditor />
      <ToggledStats />
      <PitWall />
    </main>
  )
}
