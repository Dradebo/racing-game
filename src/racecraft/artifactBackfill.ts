import type { Artifact, Race, StrivingSnapshot } from './types'
import { withRetrievalBackfill } from './retrievalBackfill'
import { withCorpusRaceBackfill } from './corpusRaceBackfill'

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

const dhis2McpNpmRelease: Artifact = {
  id: 'artifact-dhis2-mcp-npm-v1',
  kind: 'package_release',
  source: 'registry',
  label: 'dhis2-mcp-server v1.0.0 published to npm',
  uri: 'https://www.npmjs.com/package/dhis2-mcp-server',
  observedAt: '2026-08-22T12:00:00Z',
  confidence: 'observed',
  contribution: 'finishes_race',
  seasonId: 'proof',
  raceId: 'dhis2-mcp',
  circuitId: 'publish',
  lapId: 'publish',
}

const artifacts: Artifact[] = [lawrebacComplete, lawrebacCopyFix, simpleRecovery, simpleCleanup, dhis2McpNpmRelease]

function attachToRace(race: Race): Race {
  const raceArtifacts = artifacts.filter((artifact) => artifact.raceId === race.id)
  if (!raceArtifacts.length) return race

  const laps = race.circuit.laps.map((lap) => ({
    ...lap,
    status: race.id === 'dhis2-mcp' && lap.id === 'publish' ? 'finished' as const : lap.status,
    artifacts: raceArtifacts.filter((artifact) => artifact.lapId === lap.id),
  }))

  let history = (race.history ?? []).map((event) => {
    if (race.id === 'lawrebac' && event.kind === 'finish') {
      return { ...event, label: 'Project marked complete', at: lawrebacComplete.observedAt, confidence: 'observed' as const, artifactIds: [lawrebacComplete.id] }
    }
    if (race.id === 'simple-data-entry' && event.kind === 'start') {
      return { ...event, label: 'Recovery after lost progress', detail: 'Repository history records lost progress, recovery, and a return to the Data Entry feature stack.', confidence: 'observed' as const, artifactIds: [simpleRecovery.id, simpleCleanup.id] }
    }
    return event
  })

  if (race.id === 'dhis2-mcp' && !history.some((event) => event.id === 'dm-npm-v1')) {
    history = [
      ...history.filter((event) => event.id !== 'dm-3'),
      {
        id: 'dm-npm-v1',
        label: 'Package published to npm',
        detail: 'dhis2-mcp-server v1.0.0 is publicly installable from npm.',
        kind: 'finish' as const,
        at: dhis2McpNpmRelease.observedAt,
        lapId: 'publish',
        progress: 100,
        confidence: 'observed' as const,
        artifactIds: [dhis2McpNpmRelease.id],
      },
    ]
  }

  if (race.id === 'dhis2-mcp') {
    return {
      ...race,
      status: 'finished',
      health: 'green',
      currentLapId: 'publish',
      nextLegalLap: undefined,
      confidence: 'observed',
      artifacts: raceArtifacts,
      circuit: { ...race.circuit, laps },
      history,
    }
  }

  return {
    ...race,
    artifacts: raceArtifacts,
    circuit: { ...race.circuit, laps },
    history,
  }
}

export function withArtifactBackfill(snapshot: StrivingSnapshot): StrivingSnapshot {
  const existingArtifactIds = new Set((snapshot.artifacts ?? []).map((artifact) => artifact.id))
  const base = {
    ...snapshot,
    artifacts: [
      ...(snapshot.artifacts ?? []),
      ...artifacts.filter((artifact) => !existingArtifactIds.has(artifact.id)),
    ],
    races: snapshot.races.map(attachToRace),
  }
  return withCorpusRaceBackfill(withRetrievalBackfill(base))
}
