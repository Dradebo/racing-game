import type { Race } from './types'

export type AttentionLevel = 'critical' | 'high' | 'watch' | 'none'

export type AttentionSignal = {
  level: AttentionLevel
  reason?: string
}

function dueSignal(race: Race, now: number): AttentionSignal | null {
  if (!race.dueAt) return null
  const due = Date.parse(race.dueAt)
  if (Number.isNaN(due)) return null
  const delta = due - now
  if (delta < 0) return { level: 'critical', reason: 'Deadline passed' }
  if (delta <= 24 * 60 * 60 * 1000) return { level: 'critical', reason: 'Deadline within 24 hours' }
  if (delta <= 72 * 60 * 60 * 1000) return { level: 'high', reason: 'Deadline within 3 days' }
  return null
}

export function attentionForRace(race: Race, now = Date.now()): AttentionSignal {
  if (race.status === 'finished' || race.status === 'abandoned' || race.status === 'parked') return { level: 'none' }

  const due = dueSignal(race, now)
  if (due) return due

  const overdueFollowUp = race.dependencies.find((dependency) => dependency.followUpAfter && Date.parse(dependency.followUpAfter) <= now)
  if (overdueFollowUp) return { level: 'high', reason: 'External follow-up due' }

  const currentLap = race.circuit.laps.find((lap) => lap.id === race.currentLapId)
  if (currentLap?.status === 'blocked') return { level: 'critical', reason: 'Current lap blocked' }
  if (race.status === 'stale') return { level: 'critical', reason: 'No meaningful state signal' }
  if (race.health === 'red') return { level: 'critical', reason: 'Red flag' }
  if (race.status === 'waiting_me') return { level: 'high', reason: 'Your baton' }
  if (race.health === 'amber') return { level: 'watch', reason: 'Amber race health' }

  return { level: 'none' }
}

export function attentionRank(level: AttentionLevel): number {
  return level === 'critical' ? 0 : level === 'high' ? 1 : level === 'watch' ? 2 : 3
}
