import type { Artifact, Race, StrivingSnapshot } from './types'

export const HARAM_BALL_MAX_STARTERS = 4

function active(race: Race): boolean {
  return race.status === 'racing' || race.status === 'waiting_me'
}

export function substituteRace(snapshot: StrivingSnapshot, incomingId: string, outgoingId?: string): StrivingSnapshot {
  const incoming = snapshot.races.find((race) => race.id === incomingId)
  if (!incoming || active(incoming) || !['queued', 'parked'].includes(incoming.status)) return snapshot

  const starters = snapshot.races.filter(active)
  const outgoing = outgoingId ? snapshot.races.find((race) => race.id === outgoingId) : undefined
  if (outgoingId && (!outgoing || !active(outgoing))) return snapshot
  if (starters.length >= HARAM_BALL_MAX_STARTERS && !outgoing) return snapshot

  const now = new Date().toISOString()
  const actionId = `haram-sub-${Date.now()}`
  const label = outgoing
    ? `Substitution: ${incoming.name} on, ${outgoing.name} off`
    : `Promotion: ${incoming.name} enters the Starting XI`

  const artifact: Artifact = {
    id: actionId,
    kind: 'manual_record',
    source: 'manual',
    label,
    observedAt: now,
    confidence: 'observed',
    contribution: 'changes_race_state',
    raceId: incoming.id,
  }

  const races = snapshot.races.map((race) => {
    if (race.id === incoming.id) {
      return {
        ...race,
        status: 'waiting_me' as const,
        health: race.health === 'rest' ? 'green' as const : race.health,
        lastMeaningfulEvent: now,
        artifacts: [...(race.artifacts ?? []), artifact],
        history: [...(race.history ?? []), {
          id: `${actionId}-in`,
          label: `${race.name} promoted to Starting XI`,
          detail: outgoing ? `Entered through substitution for ${outgoing.name}.` : 'Entered an available active lane.',
          kind: 'mutation' as const,
          at: now,
          progress: race.history?.at(-1)?.progress ?? 0,
          confidence: 'observed' as const,
          artifactIds: [artifact.id],
        }],
      }
    }

    if (outgoing && race.id === outgoing.id) {
      return {
        ...race,
        status: 'queued' as const,
        lastMeaningfulEvent: now,
        history: [...(race.history ?? []), {
          id: `${actionId}-out`,
          label: `${race.name} moved to Bench`,
          detail: `Active lane released for ${incoming.name}.`,
          kind: 'relay' as const,
          at: now,
          progress: race.history?.at(-1)?.progress ?? 0,
          confidence: 'observed' as const,
          artifactIds: [artifact.id],
        }],
      }
    }

    return race
  })

  return {
    ...snapshot,
    generatedAt: now,
    races,
    artifacts: [...(snapshot.artifacts ?? []), artifact],
  }
}
