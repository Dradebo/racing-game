import { useEffect, useMemo, useState } from 'react'
import type { Race, StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { requestWatchReplay } from './replayBridge'
import './trophies.css'

const hydratedDemo = enforceDisplayBoundary(withArtifactBackfill(demoSnapshot))
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

type Trophy = { id: string; race: Race; title: string; detail: string; mark: string }

function trophiesFor(race: Race): Trophy[] {
  const history = race.history ?? []
  const trophies: Trophy[] = []
  const blockerIndex = history.findIndex((event) => event.kind === 'blocker')
  const recovered = blockerIndex >= 0 && history.slice(blockerIndex + 1).some((event) => event.kind === 'progress' || event.kind === 'verification' || event.kind === 'finish')
  const relayed = history.some((event) => event.kind === 'relay')
  const verified = history.some((event) => event.kind === 'verification')

  if (race.status === 'finished') trophies.push({ id: `${race.id}-finish`, race, title: 'FINISH TROPHY', detail: race.name, mark: '01' })
  if (recovered) trophies.push({ id: `${race.id}-recovery`, race, title: 'RECOVERY MEDAL', detail: race.name, mark: 'R' })
  if (relayed) trophies.push({ id: `${race.id}-relay`, race, title: 'RELAY MEDAL', detail: race.name, mark: '↔' })
  if (race.status === 'finished' && verified) trophies.push({ id: `${race.id}-verified`, race, title: 'VERIFIED FINISH', detail: race.name, mark: '✓' })
  return trophies
}

export function TrophyShelf(): JSX.Element | null {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => enforceDisplayBoundary(loadLocalSnapshot() ?? hydratedDemo))

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(enforceDisplayBoundary(next))
    }
    window.addEventListener(SNAPSHOT_EVENT, handler)
    return () => window.removeEventListener(SNAPSHOT_EVENT, handler)
  }, [])

  const trophies = useMemo(() => snapshot.races.flatMap(trophiesFor), [snapshot])
  if (!trophies.length) return null

  return (
    <details className="racecraft-trophies">
      <summary><span>TROPHY SHELF</span><b>{trophies.length}</b></summary>
      <div className="racecraft-trophy-grid">
        {trophies.map((trophy) => (
          <button key={trophy.id} className="racecraft-trophy" onClick={() => requestWatchReplay(trophy.race.id)}>
            <span className="racecraft-trophy-mark">{trophy.mark}</span>
            <span><strong>{trophy.title}</strong><small>{trophy.detail}</small></span>
            <i>REPLAY ▶</i>
          </button>
        ))}
      </div>
    </details>
  )
}
