import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import type { CatmullRomCurve3, Group, InstancedMesh } from 'three'
import { Object3D, Vector3 } from 'three'
import type { Race } from './types'
import type { ReplayVisualState } from './replayBridge'
import { pointOnRoute, tangentOnRoute } from './RaceRouteProvider'

const temp = new Object3D()

function frame(route: CatmullRomCurve3, progress: number) {
  const point = pointOnRoute(route, progress)
  const tangent = tangentOnRoute(route, progress)
  const side = new Vector3(-tangent.z, 0, tangent.x).normalize()
  const yaw = Math.atan2(tangent.x, tangent.z)
  return { point, tangent, side, yaw }
}

function TrainBlocker({ route, progress }: { route: CatmullRomCurve3; progress: number }) {
  const gltf = useGLTF('/models/track-draco.glb') as any
  const ref = useRef<Group>(null!)
  const f = useMemo(() => frame(route, Math.min(99, progress + 2)), [route, progress])

  useFrame((state) => {
    if (!ref.current) return
    const crossing = Math.sin(state.clock.getElapsedTime() * 0.45) * 2.5
    ref.current.position.copy(f.point).add(f.side.clone().multiplyScalar(crossing))
  })

  const n = gltf.nodes
  const m = gltf.materials
  if (!n.train_1) return null

  return (
    <group ref={ref} position={f.point} rotation={[0, f.yaw + Math.PI / 2, 0]} scale={0.62}>
      <mesh geometry={n.train_1.geometry} material={m.custom7Clone} castShadow />
      <mesh geometry={n.train_2.geometry} material={m.blueSteelClone} castShadow />
      <mesh geometry={n.train_3.geometry} material={m.custom12Clone} castShadow />
      <mesh geometry={n.train_4.geometry} material={m.custom14Clone} castShadow />
      <mesh geometry={n.train_5.geometry} material={m.defaultMatClone} castShadow />
      <mesh geometry={n.train_6.geometry} material={m.glassClone} castShadow />
      <mesh geometry={n.train_7.geometry} material={m.steelClone} castShadow />
      <mesh geometry={n.train_8.geometry} material={m.lightRedClone} castShadow />
      <mesh geometry={n.train_9.geometry} material={m.darkClone} castShadow />
    </group>
  )
}

function MutationRamp({ route, progress }: { route: CatmullRomCurve3; progress: number }) {
  const f = useMemo(() => frame(route, Math.min(99, progress + 3)), [route, progress])
  return (
    <group position={f.point} rotation={[0, f.yaw, -Math.PI / 18]}>
      <mesh castShadow receiveShadow position={[0, 0.65, 0]}>
        <boxGeometry args={[6.4, 0.7, 8]} />
        <meshStandardMaterial roughness={0.8} />
      </mesh>
    </group>
  )
}

function BoostTrail({ route, progress }: { route: CatmullRomCurve3; progress: number }) {
  const ref = useRef<InstancedMesh>(null!)
  const count = 18

  useFrame((state) => {
    if (!ref.current) return
    for (let i = 0; i < count; i++) {
      const p = Math.max(0, progress - i * 0.32)
      const f = frame(route, p)
      const flutter = Math.sin(state.clock.getElapsedTime() * 8 + i) * 0.28
      temp.position.copy(f.point).add(f.side.multiplyScalar(flutter))
      temp.position.y += 0.18 + (i % 2) * 0.08
      const scale = Math.max(0.05, 0.36 - i * 0.014)
      temp.scale.setScalar(scale)
      temp.rotation.set(0, f.yaw, 0)
      temp.updateMatrix()
      ref.current.setMatrixAt(i, temp.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <boxGeometry args={[0.28, 0.28, 0.75]} />
      <meshBasicMaterial transparent opacity={0.55} depthWrite={false} />
    </instancedMesh>
  )
}

function DustCloud({ route, progress }: { route: CatmullRomCurve3; progress: number }) {
  const ref = useRef<InstancedMesh>(null!)
  const count = 26

  useFrame((state) => {
    if (!ref.current) return
    for (let i = 0; i < count; i++) {
      const age = (state.clock.getElapsedTime() * 0.18 + i / count) % 1
      const p = Math.max(0, progress - age * 3.8)
      const f = frame(route, p)
      const spread = ((i % 7) - 3) * 0.42 * age
      temp.position.copy(f.point).add(f.side.multiplyScalar(spread))
      temp.position.y += 0.15 + age * 1.2
      temp.scale.setScalar((1 - age) * 0.65)
      temp.updateMatrix()
      ref.current.setMatrixAt(i, temp.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.7, 7, 7]} />
      <meshBasicMaterial transparent opacity={0.12} depthWrite={false} />
    </instancedMesh>
  )
}

function RecoverySkids({ race, route }: { race: Race; route: CatmullRomCurve3 }) {
  const recoveries = useMemo(() => {
    const events = race.history ?? []
    const marks: number[] = []
    for (let i = 1; i < events.length; i++) {
      const previous = events[i - 1]
      const current = events[i]
      if (previous.kind === 'blocker' && (current.kind === 'progress' || current.kind === 'verification')) {
        const start = previous.progress
        const end = Math.min(current.progress, start + 7)
        for (let p = start; p <= end; p += 0.65) marks.push(p)
      }
    }
    return marks
  }, [race])

  return (
    <group>
      {recoveries.flatMap((progress, index) => {
        const f = frame(route, progress)
        return [-0.72, 0.72].map((offset) => {
          const p = f.point.clone().add(f.side.clone().multiplyScalar(offset))
          return (
            <mesh key={`${index}-${offset}`} position={[p.x, p.y + 0.025, p.z]} rotation={[-Math.PI / 2, 0, -f.yaw]}>
              <planeGeometry args={[0.24, 1.1]} />
              <meshBasicMaterial transparent opacity={0.42} depthWrite={false} />
            </mesh>
          )
        })
      })}
    </group>
  )
}

export function RaceGimmicks({ race, visual, route }: { race: Race; visual: ReplayVisualState; route: CatmullRomCurve3 }): JSX.Element {
  const history = race.history ?? []
  const currentIndex = history.findIndex((event) => event.id === visual.eventId)
  const previous = currentIndex > 0 ? history[currentIndex - 1] : undefined
  const verifiedMomentum = visual.playing && (visual.kind === 'progress' || visual.kind === 'verification') && Boolean(previous) && visual.progress > (previous?.progress ?? visual.progress)
  const recovering = previous?.kind === 'blocker' && (visual.kind === 'progress' || visual.kind === 'verification')
  const externalBlocker = visual.kind === 'blocker' && race.dependencies.some((dependency) => dependency.type === 'waiting_on')

  return (
    <group>
      <RecoverySkids race={race} route={route} />
      {externalBlocker && <TrainBlocker route={route} progress={visual.progress} />}
      {visual.kind === 'mutation' && <MutationRamp route={route} progress={visual.progress} />}
      {verifiedMomentum && <BoostTrail route={route} progress={visual.progress} />}
      {(visual.kind === 'mutation' || recovering) && <DustCloud route={route} progress={visual.progress} />}
    </group>
  )
}
