import type { Artifact, Race, Season, StrivingSnapshot } from './types'
import { projectCorpus } from './projectCorpus'

const promotedRepositories = [
  'Dradebo/personal-lore-showcase',
  'Dradebo/sprite-lab',
  'Dradebo/retro-match-renderer',
  'Dradebo/Mindful-Metrics',
  'Dradebo/dhis2Sync',
  'Dradebo/Results-Wizard',
] as const

const evidence: Record<string, { label: string; uri?: string; observedAt?: string }> = {
  'Dradebo/personal-lore-showcase': {
    label: 'Recent owned implementation: dynamic character match pool and lore presentation polish',
    uri: 'https://github.com/Dradebo/personal-lore-showcase/commit/d1fcb837fd47e26986a554847e79239b42894d63',
    observedAt: '2026-06-14T00:24:15Z',
  },
  'Dradebo/dhis2Sync': {
    label: 'Owned implementation history: desktop sync app working state, org-unit picker/completeness work and documented desktop-first direction',
    uri: 'https://github.com/Dradebo/dhis2Sync/commit/e8e333038caae1a328f41fcce319a0abdb2de2ab',
    observedAt: '2025-12-08T06:40:24Z',
  },
  'Dradebo/Results-Wizard': {
    label: 'Owned implementation history: report preview and private result-page polish on the results portal',
    uri: 'https://github.com/Dradebo/Results-Wizard/commit/08ef263271557b2520b3d860677dbacadd2bb0c1',
    observedAt: '2026-06-12T07:37:57Z',
  },
}

function slug(repository: string): string {
  return repository.split('/').pop()!.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function makeArtifact(repository: string): Artifact {
  const entry = projectCorpus.find((item) => item.repository === repository)!
  const direct = evidence[repository]
  return {
    id: `artifact-corpus-${slug(repository)}`,
    kind: direct ? 'commit' : 'manual_record',
    source: direct ? 'github' : 'manual',
    label: direct?.label ?? `Curiosity Atlas review: ${entry.relevance}`,
    uri: direct?.uri,
    observedAt: direct?.observedAt ?? `${entry.lastReviewed}T00:00:00Z`,
    confidence: direct ? 'observed' : 'inferred',
    contribution: 'changes_race_state',
    seasonId: 'known-field',
    raceId: `corpus-${slug(repository)}`,
    circuitId: 'held-state',
    lapId: 'resume-definition',
  }
}

function makeRace(repository: string): Race {
  const entry = projectCorpus.find((item) => item.repository === repository)!
  const artifact = makeArtifact(repository)
  const raceId = `corpus-${slug(repository)}`
  const projectName = repository.split('/').pop()!
  return {
    id: raceId,
    name: projectName,
    projectId: slug(repository),
    finishLine: `Resume only after the current purpose and finish line are deliberately re-declared. Last known direction: ${entry.nextAction}.`,
    status: 'parked',
    health: 'rest',
    confidence: artifact.confidence,
    lastMeaningfulEvent: artifact.observedAt,
    dependencies: [],
    artifacts: [artifact],
    circuit: {
      id: 'held-state',
      name: 'Parked state',
      kind: 'custom',
      mutableSurface: ['purpose', 'finish line', 'scope', 'implementation approach'],
      frozen: ['ownership and attribution record'],
      lapDefinition: 'A parked project remains visible without consuming active attention.',
      closureEvidence: 'Explicit reactivation, successor declaration, abandonment, or completion decision.',
      artifacts: [artifact],
      laps: [
        {
          id: 'resume-definition',
          name: 'Re-declare purpose before resuming',
          status: 'queued',
          finishCondition: `If reactivated, confirm whether the last known next action still applies: ${entry.nextAction}.`,
          artifacts: [artifact],
          baton: {
            summary: entry.relevance,
            resultingState: 'Parked; known and resumable, but not currently demanding attention.',
            unresolved: ['Current priority and finish line have not been freshly adjudicated.'],
            evidence: [artifact],
            writtenAt: artifact.observedAt,
          },
        },
      ],
    },
    history: [
      {
        id: `${raceId}-known-state`,
        label: 'Known project state preserved',
        detail: `${entry.relevance}. Last reviewed direction: ${entry.nextAction}.`,
        kind: 'rest',
        at: artifact.observedAt,
        lapId: 'resume-definition',
        progress: 0,
        confidence: artifact.confidence,
        artifactIds: [artifact.id],
      },
    ],
  }
}

export function withCorpusRaceBackfill(snapshot: StrivingSnapshot): StrivingSnapshot {
  const existingRaceIds = new Set(snapshot.races.map((race) => race.id))
  const races = promotedRepositories.map(makeRace).filter((race) => !existingRaceIds.has(race.id))
  if (!races.length) return snapshot

  const artifacts = races.flatMap((race) => race.artifacts ?? [])
  const existingArtifactIds = new Set((snapshot.artifacts ?? []).map((artifact) => artifact.id))
  const seasonExists = snapshot.seasons.some((season) => season.id === 'known-field')
  const season: Season = {
    id: 'known-field',
    name: 'Known Field',
    theme: 'owned striving preserved outside the active championship',
    raceIds: races.map((race) => race.id),
    artifacts,
  }

  return {
    ...snapshot,
    races: [...snapshot.races, ...races],
    seasons: seasonExists
      ? snapshot.seasons.map((existing) => existing.id === 'known-field'
        ? { ...existing, raceIds: Array.from(new Set([...existing.raceIds, ...races.map((race) => race.id)])) }
        : existing)
      : [...snapshot.seasons, season],
    artifacts: [
      ...(snapshot.artifacts ?? []),
      ...artifacts.filter((artifact) => !existingArtifactIds.has(artifact.id)),
    ],
  }
}
