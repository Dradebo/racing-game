import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const target = new Vector3(-62, 2, 8)
const desired = new Vector3(-18, 70, 188)

export function ObservationCamera(): null {
  const { camera } = useThree()

  useFrame(() => {
    camera.position.lerp(desired, 0.08)
    camera.lookAt(target)
  })

  return null
}
