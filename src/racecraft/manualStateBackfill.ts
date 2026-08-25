import type { Artifact, Race, StrivingSnapshot } from './types'

const manualArtifacts: Artifact[] = [
  {
    id: 'artifact-pesa-closing-state',
    kind: 'manual_record',
    source: 'manual',
    label: 'Closing work narrowed to full playthrough and defect clearance',
    observedAt: '2026-08-25T00:00:00Z',
    confidence: 'observed',
    contribution: 'changes_race_state',
    seasonId: 'build',
    raceId: 'pesa-smart',
    circuitId: 'closing',
    lapId: 'playthrough',
  },
  {
    id: 'artifact-qcity-operational-prep',
    kind: 'manual_record',
    source: 'manual',
    label: 'Programming and operational preparation reached concrete scheduling state',
    observedAt: '2026-08-25T00:00:00Z',
    confidence: 'observed',
    contribution: 'advances_lap',
    seasonId: 'build',
    raceId: 'q-city',
    circuitId: 'architecture',
  },
  {
    id: 'artifact-pocket-physical-boundary',
    kind: 'manual_record',
    source: 'manual',
    label: 'Physical build constrained to massing until donor hardware is measured',
    observedAt: '2026-08-25T00:00:00Z',
    confidence: 'observed',
    contribution: 'changes_race_state',
    seasonId: 'build',
    raceId: 'pocket-agent',
    circuitId: 'pilot',
    lapId: 'hardware',
  },
]

function appendEvent(race: Race, event: NonNullable<Race['history']>[number]): Race {
  if ((race.history ?? []).some((existing) => existing.id === event.id)) return race
  return { ...race, history: [...(race.history ?? []), event] }
}

function updateRace(race: Race): Race {
  const artifacts = manualArtifacts.filter((artifact) => artifact.raceId === race.id)
  if (!artifacts.length) return race

  let next: Race = {
    ...race,
    artifacts: [...(race.artifacts ?? []), ...artifacts.filter((artifact) => !(race.artifacts ?? []).some((existing) => existing.id === artifact.id))],
  }

  if (race.id === 'pesa-smart') {
    next = appendEvent(next, {
      id: 'ps-closing-narrowed',
      label: 'Closing work narrowed',
      detail: 'The remaining race is primarily a full playthrough, defect capture, and closure pass rather than further feature discovery.',
      kind: 'verification',
      at: '2026-08-25T00:00:00Z',
      lapId: 'playthrough',
      progress: 86,
      confidence: 'observed',
      artifactIds: ['artifact-pesa-closing-state'],
    })
    return { ...next, status: 'racing', health: 'green', currentLapId: 'playthrough', nextLegalLap: 'Full playthrough + defect capture', confidence: 'observed' }
  }

  if (race.id === 'q-city') {
    next = appendEvent(next, {
      id: 'qc-operational-prep',
      label: 'Operational preparation became concrete',
      detail: 'Programming/scheduling moved from concept into a usable operational plan; some asset-level clearance remains a bounded external constraint.',
      kind: 'progress',
      at: '2026-08-25T00:00:00Z',
      progress: 64,
      confidence: 'observed',
      artifactIds: ['artifact-qcity-operational-prep'],
    })
    return next
  }

  if (race.id === 'pocket-agent') {
    const dependencyExists = race.dependencies.some((dependency) => dependency.targetId === 'physical-donor-measurement')
    next = appendEvent(next, {
      id: 'pa-physical-boundary',
      label: 'Physical route gained a hard measurement boundary',
      detail: 'A non-functional massing model may proceed, but final physical machining waits for measurements from the actual donor hardware.',
      kind: 'wait',
      at: '2026-08-25T00:00:00Z',
      lapId: 'hardware',
      progress: 68,
      confidence: 'observed',
      artifactIds: ['artifact-pocket-physical-boundary'],
    })
    return {
      ...next,
      dependencies: dependencyExists ? next.dependencies : [...next.dependencies, {
        type: 'waiting_on',
        targetId: 'physical-donor-measurement',
        label: 'Physical donor hardware measurement before final machining',
        since: '2026-08-25T00:00:00Z',
      }],
    }
  }

  return next
}

export function withManualStateBackfill(snapshot: StrivingSnapshot): StrivingSnapshot {
  const existingArtifactIds = new Set((snapshot.artifacts ?? []).map((artifact) => artifact.id))
  return {
    ...snapshot,
    races: snapshot.races.map(updateRace),
    artifacts: [
      ...(snapshot.artifacts ?? []),
      ...manualArtifacts.filter((artifact) => !existingArtifactIds.has(artifact.id)),
    ],
  }
}
