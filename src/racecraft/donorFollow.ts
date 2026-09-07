import { Quaternion, Vector3 } from 'three'
import type { CanonicalLapTrace } from './canonicalLap'

export type Vec3Tuple = [number, number, number]
export type QuatTuple = [number, number, number, number]

export type FollowTarget = {
  nearestIndex: number
  lookaheadIndex: number
  progress: number
  roadError: number
  headingError: number
  targetSpeed: number
  turn: 'left' | 'right' | 'straight'
}

const position = new Vector3()
const nearest = new Vector3()
const lookahead = new Vector3()
const tangent = new Vector3()
const donorForward = new Vector3()
const recipientForward = new Vector3()
const targetDirection = new Vector3()
const quaternion = new Quaternion()

function distanceXZ(a: Vec3Tuple, b: Vec3Tuple): number {
  const dx = a[0] - b[0]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dz * dz)
}

function findNearestIndex(trace: CanonicalLapTrace, current: Vec3Tuple, previousIndex: number): number {
  const samples = trace.samples
  const start = Math.max(0, previousIndex - 12)
  const end = Math.min(samples.length - 1, previousIndex + 160)
  let bestIndex = start
  let bestDistance = Number.POSITIVE_INFINITY

  for (let i = start; i <= end; i += 1) {
    const d = distanceXZ(current, samples[i].position)
    if (d < bestDistance) {
      bestDistance = d
      bestIndex = i
    }
  }

  // If the local search has clearly lost the route, recover against the full donor trace.
  if (bestDistance > 18) {
    for (let i = 0; i < samples.length; i += 1) {
      const d = distanceXZ(current, samples[i].position)
      if (d < bestDistance) {
        bestDistance = d
        bestIndex = i
      }
    }
  }

  return bestIndex
}

function findLookaheadIndex(trace: CanonicalLapTrace, startIndex: number, lookaheadMetres: number): number {
  let travelled = 0
  for (let i = startIndex + 1; i < trace.samples.length; i += 1) {
    travelled += distanceXZ(trace.samples[i - 1].position, trace.samples[i].position)
    if (travelled >= lookaheadMetres) return i
  }
  return trace.samples.length - 1
}

function donorForwardSign(trace: CanonicalLapTrace, index: number): number {
  const sample = trace.samples[index]
  const nextIndex = Math.min(trace.samples.length - 1, index + 8)
  const next = trace.samples[nextIndex]

  tangent.set(next.position[0] - sample.position[0], 0, next.position[2] - sample.position[2])
  if (tangent.lengthSq() < 0.0001) return 1
  tangent.normalize()

  quaternion.set(sample.quaternion[0], sample.quaternion[1], sample.quaternion[2], sample.quaternion[3])
  donorForward.set(0, 0, 1).applyQuaternion(quaternion).setY(0)
  if (donorForward.lengthSq() < 0.0001) return 1
  donorForward.normalize()

  return donorForward.dot(tangent) >= 0 ? 1 : -1
}

export function resolveFollowTarget(
  trace: CanonicalLapTrace,
  currentPosition: Vec3Tuple,
  currentQuaternion: QuatTuple,
  previousIndex: number,
): FollowTarget {
  const nearestIndex = findNearestIndex(trace, currentPosition, previousIndex)
  const lookaheadIndex = findLookaheadIndex(trace, nearestIndex, 7.5)
  const nearestSample = trace.samples[nearestIndex]
  const targetSample = trace.samples[lookaheadIndex]

  position.set(currentPosition[0], 0, currentPosition[2])
  nearest.set(nearestSample.position[0], 0, nearestSample.position[2])
  lookahead.set(targetSample.position[0], 0, targetSample.position[2])

  const roadError = position.distanceTo(nearest)
  targetDirection.copy(lookahead).sub(position)
  if (targetDirection.lengthSq() > 0.0001) targetDirection.normalize()

  quaternion.set(currentQuaternion[0], currentQuaternion[1], currentQuaternion[2], currentQuaternion[3])
  const sign = donorForwardSign(trace, nearestIndex)
  recipientForward.set(0, 0, sign).applyQuaternion(quaternion).setY(0)
  if (recipientForward.lengthSq() > 0.0001) recipientForward.normalize()

  // Positive error means the donor trace lies to the recipient's left.
  const crossY = recipientForward.x * targetDirection.z - recipientForward.z * targetDirection.x
  const dot = Math.max(-1, Math.min(1, recipientForward.dot(targetDirection)))
  const headingError = Math.atan2(crossY, dot)
  const deadband = 0.045
  const turn = headingError > deadband ? 'left' : headingError < -deadband ? 'right' : 'straight'
  const targetSpeed = typeof targetSample.speed === 'number' ? Math.max(5, Math.min(24, targetSample.speed)) : 13

  return {
    nearestIndex,
    lookaheadIndex,
    progress: trace.samples.length > 1 ? nearestIndex / (trace.samples.length - 1) : 0,
    roadError,
    headingError,
    targetSpeed,
    turn,
  }
}
