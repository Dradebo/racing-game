import { useEffect, useMemo, useState } from 'react'
import type { Race, StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { REPLAY_MODE_EVENT } from './replayBridge'

const hydratedDemo = enforceDisplayBoundary(withArtifactBackfill(demoSnapshot))
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

function finishTime(race: Race): number {
  const finish = [...(race.history ?? [])].reverse().find((event) => event.kind === 'finish' && event.at)
  const at = finish?.at ?? race.lastMeaningfulEvent
  const parsed = at ? Date.parse(at) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function nextCandidates(snapshot: StrivingSnapshot): Race[] {
  const priority: Record<Race['status'], number> = {
    waiting_me: 0,
    racing: 1,
    queued: 2,
    waiting_external: 3,
    stale: 4,
    parked: 5,
    finished: 6,
    abandoned: 7,
  }
  return snapshot.races
    .filter((race) => race.nextLegalLap && !['finished', 'abandoned', 'waiting_external'].includes(race.status))
    .sort((a, b) => priority[a.status] - priority[b.status])
    .slice(0, 3)
}

export function OrientationBoard(): JSX.Element | null {
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

  const summary = useMemo(() => {
    const active = snapshot.races.filter((race) => race.status === 'racing').length
    const needsMe = snapshot.races.filter((race) => race.status === 'waiting_me').length
    const external = snapshot.races.filter((race) => race.status === 'waiting_external').length
    const stale = snapshot.races.filter((race) => race.status === 'stale').length
    const finished = snapshot.races.filter((race) => race.status === 'finished')
      .sort((a, b) => finishTime(b) - finishTime(a))
      .slice(0, 3)
    return { active, needsMe, external, stale, finished, next: nextCandidates(snapshot) }
  }, [snapshot])

  if (replayActive) return null

  return (
    <section aria-label="Championship orientation" style={{ margin: '18px 18px 0', padding: 16, borderRadius: 18, background: '#0c1015', border: '1px solid rgba(255,255,255,.12)', color: '#f4f6f8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', opacity: .55 }}>ORIENTATION</span>
          <strong style={{ fontSize: 20 }}>What changed, what remains, what comes next.</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 12 }}>MOVING {summary.active}</b>
          <b style={{ fontSize: 12 }}>NEEDS ME {summary.needsMe}</b>
          <b style={{ fontSize: 12 }}>WAITING {summary.external}</b>
          <b style={{ fontSize: 12 }}>STALE {summary.stale}</b>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 12 }}>
        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>NEXT LEGAL LAPS</span>
          {summary.next.length ? summary.next.map((race, index) => (
            <div key={race.id} style={{ padding: '9px 0', borderTop: index ? '1px solid rgba(255,255,255,.08)' : undefined }}>
              <strong style={{ display: 'block', fontSize: 14 }}>{race.nextLegalLap}</strong>
              <small style={{ opacity: .62 }}>{race.name} · {race.status.replace('_', ' ')}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>No declared legal laps.</small>}
        </div>

        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>RECENTLY CLOSED</span>
          {summary.finished.length ? summary.finished.map((race) => (
            <div key={race.id} style={{ padding: '7px 0' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{race.name}</strong>
              <small style={{ opacity: .62 }}>{race.finishLine}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>No finished races recorded yet.</small>}
        </div>
      </div>
    </section>
  )
}
