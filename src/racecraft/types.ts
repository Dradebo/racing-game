export type Confidence = 'observed' | 'inferred' | 'unresolved'

export type RaceStatus =
  | 'racing'
  | 'waiting_external'
  | 'waiting_me'
  | 'queued'
  | 'parked'
  | 'stale'
  | 'finished'
  | 'abandoned'

export type RaceHealth = 'green' | 'amber' | 'red' | 'rest'

export type ArtifactContribution =
  | 'starts_lap'
  | 'advances_lap'
  | 'closes_lap'
  | 'blocks_lap'
  | 'defines_circuit'
  | 'changes_circuit'
  | 'starts_race'
  | 'finishes_race'
  | 'changes_race_state'
  | 'affects_season'
  | 'seeds_race'
  | 'handoff'

export type Artifact = {
  id: string
  kind: 'commit' | 'branch' | 'pull_request' | 'deployment' | 'document' | 'spreadsheet' | 'slide' | 'email' | 'message' | 'field_note' | 'report' | 'screenshot' | 'audio' | 'image' | 'video' | 'code' | 'agent_output' | 'manual_record' | 'other'
  source: 'github' | 'drive' | 'chat' | 'email' | 'deployment' | 'manual' | 'fieldwork' | 'agent'
  label: string
  uri?: string
  observedAt?: string
  confidence: Confidence
  contribution: ArtifactContribution
  seasonId?: string
  raceId?: string
  circuitId?: string
  lapId?: string
}

export type EvidenceRef = Artifact

export type Baton = {
  summary: string
  resultingState: string
  unresolved: string[]
  nextLegalLap?: string
  resumeUrl?: string
  evidence: Artifact[]
  writtenAt?: string
}

export type Lap = {
  id: string
  name: string
  status: 'queued' | 'ready' | 'in_progress' | 'blocked' | 'finished'
  finishCondition: string
  expectedMinutes?: number
  actualMinutes?: number
  artifacts?: Artifact[]
  evidence?: Artifact[]
  baton?: Baton
}

export type Circuit = {
  id: string
  name: string
  kind: 'sprint' | 'endurance' | 'rally' | 'street' | 'time_trial' | 'testing' | 'closing' | 'custom'
  mutableSurface: string[]
  frozen: string[]
  lapDefinition: string
  closureEvidence: string
  artifacts?: Artifact[]
  laps: Lap[]
}

export type Dependency = {
  type: 'blocks' | 'related' | 'parent_child' | 'discovered_from' | 'waiting_on' | 'successor_of'
  targetId: string
  label: string
  since?: string
  followUpAfter?: string
}

export type RaceEvent = {
  id: string
  label: string
  detail?: string
  kind: 'start' | 'progress' | 'blocker' | 'relay' | 'mutation' | 'verification' | 'finish' | 'wait' | 'rest'
  at?: string
  lapId?: string
  progress: number
  confidence: Confidence
  artifactIds?: string[]
}

export type Race = {
  id: string
  name: string
  projectId: string
  finishLine: string
  status: RaceStatus
  health: RaceHealth
  circuit: Circuit
  currentLapId?: string
  dependencies: Dependency[]
  artifacts?: Artifact[]
  lastMeaningfulEvent?: string
  nextLegalLap?: string
  resumeUrl?: string
  dueAt?: string
  confidence: Confidence
  history?: RaceEvent[]
}

export type RaceTemplate = {
  id: string
  name: string
  recurrence: string
  circuitKind: Circuit['kind']
  finishLinePattern: string
}

export type Season = {
  id: string
  name: string
  theme: string
  raceIds: string[]
  artifacts?: Artifact[]
}

export type StrivingSnapshot = {
  generatedAt: string
  doctrine: 'Striving Observation'
  seasons: Season[]
  races: Race[]
  artifacts?: Artifact[]
  recurringTemplates: RaceTemplate[]
}
