import { useEffect, useMemo, useState } from 'react'
import type { StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { projectCorpus, projectCorpusSummary } from './projectCorpus'
import { raceCandidates } from './raceCandidates'
import { REPLAY_MODE_EVENT } from './replayBridge'

const hydratedDemo = enforceDisplayBoundary(withArtifactBackfill(demoSnapshot))
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function raceMatchesRepository(raceName: string, repository: string): boolean {
  const repoName = repository.split('/').pop() ?? repository
  const a = normalized(raceName)
  const b = normalized(repoName)
  return a.includes(b) || b.includes(a)
}

export function KnownField(): JSX.Element | null {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => enforceDisplayBoundary(loadLocalSnapshot() ?? hydratedDemo))
  const [replayActive, setReplayActive] = useState(false)

  useEffect(() => {
    const snapshotHandler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(enforceDisplayBoundary(next))
    }
    const replayHandler = (event: Event) => setReplayActive(Boolean((event as CustomEvent<boolean>).detail))
    window.addEventListener(SNAPSHOT_EVENT, snapshotHandler)
    window.addEventListener(REPLAY_MODE_EVENT, replayHandler)
    return () => {
      window.removeEventListener(SNAPSHOT_EVENT, snapshotHandler)
      window.removeEventListener(REPLAY_MODE_EVENT, replayHandler)
    }
  }, [])

  const field = useMemo(() => {
    const represented = projectCorpus.filter((entry) => snapshot.races.some((race) => raceMatchesRepository(race.name, entry.repository)))
    const representedRepos = new Set(represented.map((entry) => entry.repository))
    const candidateRows = raceCandidates.filter((candidate) => !representedRepos.has(candidate.repository))
    const ready = candidateRows.filter((candidate) => candidate.readiness === 'ready_to_reconstruct')
    const needsEvidence = candidateRows.filter((candidate) => candidate.readiness === 'needs_more_evidence')
    const references = candidateRows.filter((candidate) => candidate.readiness === 'reference_only')
    const ownedOrContributed = projectCorpus.filter((entry) => entry.relationship !== 'Observed')

    return {
      represented,
      ready,
      needsEvidence,
      references,
      ownedOrContributed,
    }
  }, [snapshot])

  if (replayActive) return null

  return (
    <section aria-label="Known project field" style={{ margin: '18px 18px 0', padding: 16, borderRadius: 18, background: '#0c1015', border: '1px solid rgba(255,255,255,.12)', color: '#f4f6f8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', opacity: .55 }}>KNOWN FIELD</span>
          <strong style={{ display: 'block', fontSize: 20, marginTop: 3 }}>{projectCorpusSummary.total} catalogued · {projectCorpusSummary.constellations} areas</strong>
          <small style={{ display: 'block', opacity: .66, marginTop: 5, maxWidth: 560 }}>
            Corpus knowledge is wider than canonical race state. Promotion happens only when the evidence supports a real striving object.
          </small>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
          <b>RACE-REPRESENTED {field.represented.length}</b>
          <b>READY TO RECONSTRUCT {field.ready.length}</b>
          <b>NEEDS EVIDENCE {field.needsEvidence.length}</b>
          <b>REFERENCE ONLY {field.references.length}</b>
        </div>
      </div>

      <div style={{ marginTop: 15, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 7 }}>READY TO RECONSTRUCT</span>
        {field.ready.length ? field.ready.map((candidate) => (
          <div key={candidate.repository} style={{ padding: '9px 0', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <strong style={{ display: 'block', fontSize: 13 }}>{candidate.name}</strong>
            <small style={{ display: 'block', opacity: .65, marginTop: 2 }}>{candidate.relevance}</small>
            <small style={{ display: 'block', opacity: .72, marginTop: 4 }}>Last known next action: {candidate.lastKnownNextAction}</small>
            <small style={{ display: 'block', opacity: .5, marginTop: 3 }}>{candidate.rationale}</small>
          </div>
        )) : <small style={{ opacity: .62 }}>No unrepresented candidates are already strong enough for immediate reconstruction.</small>}
      </div>

      <details open style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <summary style={{ cursor: 'pointer', fontSize: 11, letterSpacing: '.1em', opacity: .68 }}>KNOWN STRIVING · NEEDS MORE EVIDENCE · {field.needsEvidence.length}</summary>
        <div style={{ marginTop: 10, display: 'grid', gap: 7 }}>
          {field.needsEvidence.map((candidate) => (
            <div key={candidate.repository} style={{ padding: '7px 0' }}>
              <strong style={{ display: 'block', fontSize: 12 }}>{candidate.name}</strong>
              <small style={{ display: 'block', opacity: .6 }}>{candidate.relevance}</small>
              <small style={{ display: 'block', opacity: .72, marginTop: 3 }}>{candidate.lastKnownNextAction}</small>
              <small style={{ display: 'block', opacity: .45, marginTop: 2 }}>Current race state not yet adjudicated.</small>
            </div>
          ))}
        </div>
      </details>

      <details style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <summary style={{ cursor: 'pointer', fontSize: 11, letterSpacing: '.1em', opacity: .68 }}>REFERENCE MATERIAL · {field.references.length}</summary>
        <div style={{ marginTop: 10, display: 'grid', gap: 7 }}>
          {field.references.map((candidate) => (
            <div key={candidate.repository}>
              <strong style={{ fontSize: 12 }}>{candidate.name}</strong>
              <small style={{ opacity: .5 }}> · {candidate.constellation}</small>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
