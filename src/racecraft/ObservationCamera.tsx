import { useEffect, useMemo, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { routePoint } from './raceRoute'
import { subscribeReplayState, type ReplayVisualState } from './replayBridge'

function cameraOffset(state: ReplayVisualState | null): Vector3 {
  if (!state) return new Vector3(44, 58, 118)
  if (state.kind === 'blocker') return new Vector3(22, 20, 46)
  if (state.kind === 'wait' || state.kind === 'rest') return new Vector3(48, 32, 62)
  if (state.kind === 'finish') return new Vector3(30, 52, 68)
  if (state.kind === 'verification') return new Vector3(34, 38, 72)
  return new Vector3(40, 42, 82)
}

export function ObservationCamera(): null {
  const { camera } = useThree()
  const [state, setState] = useState<ReplayVisualState | null>(null)

  useEffect(() => subscribeReplayState(setState), [])

  const target = useMemo(() => state ? routePoint(state.progress) : new Vector3(-62, 2, 8), [state])
  const desired = useMemo(() => target.clone().add(cameraOffset(state)), [target, state])

  useFrame(() => {
    camera.position.lerp(desired, 0.055)
    camera.lookAt(target)
  })

  return null
}
