import { projectCorpus } from './projectCorpus'

export type RaceCandidateReadiness = 'ready_to_reconstruct' | 'needs_more_evidence' | 'reference_only'

export type RaceCandidate = {
  id: string
  repository: string
  name: string
  constellationId: string
  constellation: string
  relationship: 'Owned' | 'Contributed' | 'Observed'
  relevance: string
  evidenceStatus: string
  lastKnownNextAction: string
  risk: 'Normal' | 'Attribution-sensitive'
  lastReviewed: string
  readiness: RaceCandidateReadiness
  rationale: string
}

function nameFromRepository(repository: string): string {
  return repository.split('/').pop() ?? repository
}

function readinessFor(relationship: RaceCandidate['relationship'], evidenceStatus: string): Pick<RaceCandidate, 'readiness' | 'rationale'> {
  if (relationship === 'Observed') {
    return {
      readiness: 'reference_only',
      rationale: 'Observed upstream/reference material. Do not create an operator race without separate evidence of personal striving.',
    }
  }

  if (relationship === 'Contributed' || /verified public contribution evidence/i.test(evidenceStatus)) {
    return {
      readiness: 'ready_to_reconstruct',
      rationale: 'Verified contribution evidence exists. Reconstruct the bounded striving object, finish line, history and current closure state.',
    }
  }

  if (/owned repository/i.test(evidenceStatus)) {
    return {
      readiness: 'needs_more_evidence',
      rationale: 'Ownership is known, but ownership alone does not establish current race status. Recover project history and state before promotion.',
    }
  }

  return {
    readiness: 'needs_more_evidence',
    rationale: 'Known striving candidate with incomplete canonical state evidence.',
  }
}

export const raceCandidates: RaceCandidate[] = projectCorpus.map((entry) => {
  const readiness = readinessFor(entry.relationship, entry.evidenceStatus)
  return {
    id: `candidate-${entry.repository.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    repository: entry.repository,
    name: nameFromRepository(entry.repository),
    constellationId: entry.constellationId,
    constellation: entry.constellation,
    relationship: entry.relationship,
    relevance: entry.relevance,
    evidenceStatus: entry.evidenceStatus,
    lastKnownNextAction: entry.nextAction,
    risk: entry.risk,
    lastReviewed: entry.lastReviewed,
    readiness: readiness.readiness,
    rationale: readiness.rationale,
  }
})

export const reconstructableCandidates = raceCandidates.filter((candidate) => candidate.readiness !== 'reference_only')
export const readyToReconstructCandidates = raceCandidates.filter((candidate) => candidate.readiness === 'ready_to_reconstruct')
export const needsEvidenceCandidates = raceCandidates.filter((candidate) => candidate.readiness === 'needs_more_evidence')
export const referenceOnlyCandidates = raceCandidates.filter((candidate) => candidate.readiness === 'reference_only')
