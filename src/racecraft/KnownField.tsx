import { useEffect, useMemo, useState } from 'react'
import type { StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { projectCorpus, projectCorpusSummary } from './projectCorpus'
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
    const ownedOrContributed = projectCorpus.filter((entry) => entry.relationship !== 'Observed')
    const represented = projectCorpus.filter((entry) => snapshot.races.some((race) => raceMatchesRepository(race.name, entry.repository)))
    const representedRepos = new Set(represented.map((entry) => entry.repository))
    const unrepresentedStriving = ownedOrContributed.filter((entry) => !representedRepos.has(entry.repository))
    const observedReferences = projectCorpus.filter((entry) => entry.relationship === 'Observed')

    return {
      represented,
      unrepresentedStriving,
      observedReferences,
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
            The mirror knows about more work than it currently promotes into races. Observed upstream projects remain references, not obligations.
          </small>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
          <b>RACE-REPRESENTED {field.represented.length}</b>
          <b>OWNED / CONTRIBUTED {field.ownedOrContributed.length}</b>
          <b>REFERENCE ONLY {field.observedReferences.length}</b>
        </div>
      </div>

      <div style={{ marginTop: 15, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 7 }}>KNOWN STRIVING NOT YET IN RACE STATE</span>
        {field.unrepresentedStriving.length ? field.unrepresentedStriving.map((entry) => (
          <div key={entry.repository} style={{ padding: '9px 0', borderTop: '1px solid rgba(255,255,255,.06)' }}>
            <strong style={{ display: 'block', fontSize: 13 }}>{entry.repository.split('/').pop()}</strong>
            <small style={{ display: 'block', opacity: .65, marginTop: 2 }}>{entry.relevance}</small>
            <small style={{ display: 'block', opacity: .5, marginTop: 2 }}>{entry.relationship} · {entry.evidenceStatus}</small>
            <small style={{ display: 'block', opacity: .72, marginTop: 4 }}>Last known next action: {entry.nextAction}</small>
          </div>
        )) : <small style={{ opacity: .62 }}>All known owned/contributed corpus entries are represented in race state.</small>}
      </div>

      <details style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)' }}>
        <summary style={{ cursor: 'pointer', fontSize: 11, letterSpacing: '.1em', opacity: .68 }}>REFERENCE MATERIAL · {field.observedReferences.length}</summary>
        <div style={{ marginTop: 10, display: 'grid', gap: 7 }}>
          {field.observedReferences.map((entry) => (
            <div key={entry.repository}>
              <strong style={{ fontSize: 12 }}>{entry.repository.split('/').pop()}</strong>
              <small style={{ opacity: .5 }}> · {entry.constellation}</small>
            </div>
          ))}
        </div>
      </details>
    </section>
  )
}
