import type { Artifact, Race, Season, StrivingSnapshot } from './types'

const retrievalSeason: Season = {
  id: 'retrieval',
  name: 'Retrieval Season',
  theme: 'capture, preservation, retrieval, and resurfacing',
  raceIds: ['wheres-all-my-stuff'],
}

const archiveBox: Artifact = {
  id: 'artifact-retrieval-archivebox',
  kind: 'code',
  source: 'github',
  label: 'ArchiveBox preservation substrate available',
  uri: 'https://github.com/Dradebo/ArchiveBox',
  confidence: 'observed',
  contribution: 'defines_circuit',
  seasonId: 'retrieval',
  raceId: 'wheres-all-my-stuff',
  circuitId: 'retrieval-endurance',
  lapId: 'preserve',
}

const localNotebook: Artifact = {
  id: 'artifact-retrieval-local-notebooklm',
  kind: 'code',
  source: 'github',
  label: 'Local document-to-audio pipeline available',
  uri: 'https://github.com/Dradebo/Local-NotebookLM',
  confidence: 'observed',
  contribution: 'defines_circuit',
  seasonId: 'retrieval',
  raceId: 'wheres-all-my-stuff',
  circuitId: 'retrieval-endurance',
  lapId: 'transform',
}

const youtubeToDoc: Artifact = {
  id: 'artifact-retrieval-youtube-to-doc',
  kind: 'code',
  source: 'github',
  label: 'YouTube-to-document ingestion layer available',
  uri: 'https://github.com/Dradebo/Youtube-to-Doc',
  confidence: 'observed',
  contribution: 'defines_circuit',
  seasonId: 'retrieval',
  raceId: 'wheres-all-my-stuff',
  circuitId: 'retrieval-endurance',
  lapId: 'transform',
}

const videoRag: Artifact = {
  id: 'artifact-retrieval-videorag',
  kind: 'code',
  source: 'github',
  label: 'Long-context video retrieval layer available',
  uri: 'https://github.com/Dradebo/VideoRAG',
  confidence: 'observed',
  contribution: 'defines_circuit',
  seasonId: 'retrieval',
  raceId: 'wheres-all-my-stuff',
  circuitId: 'retrieval-endurance',
  lapId: 'transform',
}

const pawsImplementation: Artifact = {
  id: 'artifact-retrieval-paws-implementation',
  kind: 'commit',
  source: 'github',
  label: 'PAWs widget media actions and preview loading improved',
  uri: 'https://github.com/Dradebo/PAWs/commit/b38efa55d08231d6ff80ddfcfb92a78481355628',
  observedAt: '2026-05-31T13:49:12Z',
  confidence: 'observed',
  contribution: 'advances_lap',
  seasonId: 'retrieval',
  raceId: 'wheres-all-my-stuff',
  circuitId: 'retrieval-endurance',
  lapId: 'surface-media',
}

export const retrievalArtifacts: Artifact[] = [archiveBox, localNotebook, youtubeToDoc, videoRag, pawsImplementation]

const retrievalRace: Race = {
  id: 'wheres-all-my-stuff',
  name: "Where's all my stuff?",
  projectId: 'wheres-all-my-stuff',
  finishLine: 'A coherent retrieval surface that can locate, contextualize, and resume useful material from distributed digital artifacts.',
  status: 'racing',
  health: 'green',
  circuit: {
    id: 'retrieval-endurance',
    name: 'Retrieval Endurance',
    kind: 'endurance',
    mutableSurface: ['source adapters', 'indexing', 'resurfacing rules', 'resume pointers'],
    frozen: ['rebuilding solved archive engines'],
    lapDefinition: 'one source or retrieval layer becomes reliably usable',
    closureEvidence: 'material can be located and reopened with useful context',
    laps: [
      {
        id: 'preserve',
        name: 'Preservation substrate',
        status: 'finished',
        finishCondition: 'durable archive primitive identified',
        artifacts: [archiveBox],
        evidence: [archiveBox],
      },
      {
        id: 'transform',
        name: 'Transformation and retrieval primitives',
        status: 'finished',
        finishCondition: 'document and video transformation/retrieval primitives mapped',
        artifacts: [localNotebook, youtubeToDoc, videoRag],
        evidence: [localNotebook, youtubeToDoc, videoRag],
      },
      {
        id: 'surface-media',
        name: 'Local media resurfacing',
        status: 'finished',
        finishCondition: 'local pictures/audio can be paired, sorted, selected, and surfaced in a widget',
        artifacts: [pawsImplementation],
        evidence: [pawsImplementation],
      },
      {
        id: 'unify',
        name: 'Unify retrieval paths',
        status: 'in_progress',
        finishCondition: 'major sources enter one retrieval model without losing provenance',
        evidence: [],
      },
      {
        id: 'resume',
        name: 'Resume from recovered material',
        status: 'queued',
        finishCondition: 'a recovered artifact can return directly into the correct live race with context',
        evidence: [],
      },
    ],
  },
  currentLapId: 'unify',
  dependencies: [],
  artifacts: retrievalArtifacts,
  nextLegalLap: 'Unify retrieval paths',
  confidence: 'inferred',
  history: [
    {
      id: 'retrieval-1',
      label: 'Preservation substrate identified',
      detail: 'ArchiveBox supplies an existing durable archive layer rather than requiring a new archive engine.',
      kind: 'start',
      progress: 15,
      confidence: 'observed',
      artifactIds: [archiveBox.id],
    },
    {
      id: 'retrieval-2',
      label: 'Document transformation layer available',
      kind: 'progress',
      progress: 32,
      confidence: 'observed',
      artifactIds: [localNotebook.id],
    },
    {
      id: 'retrieval-3',
      label: 'Video ingestion and retrieval layers available',
      kind: 'progress',
      progress: 48,
      confidence: 'observed',
      artifactIds: [youtubeToDoc.id, videoRag.id],
    },
    {
      id: 'retrieval-4',
      label: 'Local media resurfacing implemented',
      detail: 'PAWs implements local image/audio pairing, per-widget source selection, sorting, playback, and widget state.',
      kind: 'verification',
      progress: 70,
      at: pawsImplementation.observedAt,
      confidence: 'observed',
      artifactIds: [pawsImplementation.id],
    },
    {
      id: 'retrieval-5',
      label: 'Separate retrieval efforts recognized as one lineage',
      kind: 'mutation',
      progress: 78,
      confidence: 'inferred',
      artifactIds: retrievalArtifacts.map((artifact) => artifact.id),
    },
  ],
}

export function withRetrievalBackfill(snapshot: StrivingSnapshot): StrivingSnapshot {
  const hasRace = snapshot.races.some((race) => race.id === retrievalRace.id)
  const hasSeason = snapshot.seasons.some((season) => season.id === retrievalSeason.id)
  const existingArtifacts = new Set((snapshot.artifacts ?? []).map((artifact) => artifact.id))

  return {
    ...snapshot,
    seasons: hasSeason ? snapshot.seasons : [...snapshot.seasons, retrievalSeason],
    races: hasRace ? snapshot.races : [...snapshot.races, retrievalRace],
    artifacts: [
      ...(snapshot.artifacts ?? []),
      ...retrievalArtifacts.filter((artifact) => !existingArtifacts.has(artifact.id)),
    ],
  }
}
