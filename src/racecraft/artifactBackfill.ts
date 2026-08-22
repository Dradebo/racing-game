import type { Artifact, Race, StrivingSnapshot } from './types'

const lawrebacComplete: Artifact = {
  id: 'artifact-lawrebac-complete',
  kind: 'commit',
  source: 'github',
  label: 'Mark Lawrebac project complete',
  uri: 'https://github.com/Dradebo/Lawrebac-auto-garage/commit/6c24ff1cd703c7aba496f45e295334bc4c59f8bd',
  observedAt: '2026-05-04T06:09:35Z',
  confidence: 'observed',
  contribution: 'finishes_race',
  seasonId: 'proof',
  raceId: 'lawrebac',
  circuitId: 'ship',
  lapId: 'ship',
}

const lawrebacCopyFix: Artifact = {
  id: 'artifact-lawrebac-copy-fix',
  kind: 'commit',
  source: 'github',
  label: 'Fixed copy',
  uri: 'https://github.com/Dradebo/Lawrebac-auto-garage/commit/a863648643a2301b612badbd3aed6c53ac88181e',
  observedAt: '2026-05-04T07:33:50Z',
  confidence: 'observed',
  contribution: 'advances_lap',
  seasonId: 'proof',
  raceId: 'lawrebac',
  circuitId: 'ship',
  lapId: 'ship',
}

const simpleRecovery: Artifact = {
  id: 'artifact-simple-recovery',
  kind: 'commit',
  source: 'github',
  label: 'Recovered lost progress and resumed Data Entry feature work',
  uri: 'https://github.com/Dradebo/SimpleDataEnt/commit/02e8cb96ec8d3e680f2757a8cf803f2192bcbf60',
  confidence: 'observed',
  contribution: 'changes_race_state',
  seasonId: 'proof',
  raceId: 'simple-data-entry',
  circuitId: 'delivery',
  lapId: 'offline',
}

const simpleCleanup: Artifact = {
  id: 'artifact-simple-cleanup',
  kind: 'commit',
  source: 'github',
  label: 'Recovered build continued into Data Entry stack cleanup',
  uri: 'https://github.com/Dradebo/SimpleDataEnt/commit/81b32de9a5de97040dd6f64b4e835a3bd76acfaf',
  observedAt: '2025-02-26T11:44:38Z',
  confidence: 'observed',
  contribution: 'advances_lap',
  seasonId: 'proof',
  raceId: 'simple-data-entry',
  circuitId: 'delivery',
  lapId: 'offline',
}

const artifacts: Artifact[] = [lawrebacComplete, lawrebacCopyFix, simpleRecovery, simpleCleanup]

function attachToRace(race: Race): Race {
  const raceArtifacts = artifacts.filter((artifact) => artifact.raceId === race.id)
  if (!raceArtifacts.length) return race

  const laps = race.circuit.laps.map((lap) => ({
    ...lap,
    artifacts: raceArtifacts.filter((artifact) => artifact.lapId === lap.id),
  }))

  const history = (race.history ?? []).map((event) => {
    if (race.id === 'lawrebac' && event.kind === 'finish') {
      return { ...event, label: 'Project marked complete', at: lawrebacComplete.observedAt, confidence: 'observed' as const, artifactIds: [lawrebacComplete.id] }
    }
    if (race.id === 'simple-data-entry' && event.kind === 'start') {
      return { ...event, label: 'Recovery after lost progress', detail: 'Repository history records lost progress, recovery, and a return to the Data Entry feature stack.', confidence: 'observed' as const, artifactIds: [simpleRecovery.id, simpleCleanup.id] }
    }
    return event
  })

  return {
    ...race,
    artifacts: raceArtifacts,
    circuit: { ...race.circuit, laps },
    history,
  }
}

export function withArtifactBackfill(snapshot: StrivingSnapshot): StrivingSnapshot {
  return {
    ...snapshot,
    artifacts: [...(snapshot.artifacts ?? []), ...artifacts],
    races: snapshot.races.map(attachToRace),
  }
}
