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

export type EvidenceRef = {
  id: string
  source: 'github' | 'drive' | 'chat' | 'email' | 'deployment' | 'manual' | 'fieldwork' | 'agent'
  label: string
  uri?: string
  observedAt?: string
  confidence: Confidence
}

export type Baton = {
  summary: string
  resultingState: string
  unresolved: string[]
  nextLegalLap?: string
  resumeUrl?: string
  evidence: EvidenceRef[]
  writtenAt?: string
}

export type Lap = {
  id: string
  name: string
  status: 'queued' | 'ready' | 'in_progress' | 'blocked' | 'finished'
  finishCondition: string
  expectedMinutes?: number
  actualMinutes?: number
  evidence: EvidenceRef[]
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
  laps: Lap[]
}

export type Dependency = {
  type: 'blocks' | 'related' | 'parent_child' | 'discovered_from' | 'waiting_on' | 'successor_of'
  targetId: string
  label: string
  since?: string
  followUpAfter?: string
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
  lastMeaningfulEvent?: string
  nextLegalLap?: string
  resumeUrl?: string
  confidence: Confidence
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
}

export type StrivingSnapshot = {
  generatedAt: string
  doctrine: 'Striving Observation'
  seasons: Season[]
  races: Race[]
  recurringTemplates: RaceTemplate[]
}
