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

function closedRatio(race: Race): number {
  const laps = race.circuit.laps ?? []
  if (!laps.length) return 0
  return laps.filter((lap) => lap.status === 'finished').length / laps.length
}

function currentLapBlocked(race: Race): boolean {
  const current = race.circuit.laps.find((lap) => lap.id === race.currentLapId)
  return current?.status === 'blocked'
}

function needsAttentionNow(race: Race): boolean {
  if (race.status === 'waiting_me') return true
  if (race.health === 'red' && !['finished', 'abandoned', 'parked', 'waiting_external'].includes(race.status)) return true
  if (currentLapBlocked(race)) return true
  if (race.dueAt) {
    const due = Date.parse(race.dueAt)
    if (Number.isFinite(due) && due <= Date.now() + 24 * 60 * 60 * 1000 && !['finished', 'abandoned', 'waiting_external'].includes(race.status)) return true
  }
  return false
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

function statusLabel(race: Race): string {
  if (race.status === 'waiting_external') return 'waiting external'
  if (race.status === 'waiting_me') return 'needs me'
  return race.status.replace('_', ' ')
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
    const active = snapshot.races.filter((race) => race.status === 'racing')
    const needsMe = snapshot.races.filter((race) => race.status === 'waiting_me')
    const external = snapshot.races.filter((race) => race.status === 'waiting_external')
    const stale = snapshot.races.filter((race) => race.status === 'stale')
    const finished = snapshot.races.filter((race) => race.status === 'finished')
      .sort((a, b) => finishTime(b) - finishTime(a))
      .slice(0, 3)
    const almostDone = snapshot.races
      .filter((race) => !['finished', 'abandoned'].includes(race.status) && closedRatio(race) >= 0.67)
      .sort((a, b) => closedRatio(b) - closedRatio(a))
      .slice(0, 4)
    const looseEnds = snapshot.races
      .filter((race) => ['stale', 'parked', 'queued'].includes(race.status) || currentLapBlocked(race))
      .slice(0, 5)
    const abandoned = snapshot.races.filter((race) => race.status === 'abandoned').slice(0, 4)
    const urgent = snapshot.races.filter(needsAttentionNow)
    const unresolved = snapshot.races.filter((race) => race.confidence === 'unresolved')
    const inferred = snapshot.races.filter((race) => race.confidence === 'inferred')
    const coverageComplete = unresolved.length === 0
    const verdict = urgent.length
      ? { label: 'PIT WALL NEEDS YOU', detail: `${urgent.length} known ${urgent.length === 1 ? 'race needs' : 'races need'} attention before you can fully park.` }
      : coverageComplete
        ? { label: 'CLEAR TO PARK', detail: 'No known urgent unfinished work currently needs you.' }
        : { label: 'NO KNOWN URGENT LAP', detail: 'Nothing known is urgent, but some race state remains unresolved.' }

    return {
      active,
      needsMe,
      external,
      stale,
      finished,
      almostDone,
      looseEnds,
      abandoned,
      urgent,
      unresolved,
      inferred,
      verdict,
      next: nextCandidates(snapshot),
    }
  }, [snapshot])

  if (replayActive) return null

  return (
    <section aria-label="Championship orientation" style={{ margin: '18px 18px 0', padding: 16, borderRadius: 18, background: '#0c1015', border: '1px solid rgba(255,255,255,.12)', color: '#f4f6f8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
        <div>
          <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', opacity: .55 }}>STATE OF AFFAIRS</span>
          <strong style={{ display: 'block', fontSize: 22, marginTop: 2 }}>{summary.verdict.label}</strong>
          <small style={{ display: 'block', opacity: .68, marginTop: 5, maxWidth: 520 }}>{summary.verdict.detail}</small>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <b style={{ fontSize: 12 }}>MOVING {summary.active.length}</b>
          <b style={{ fontSize: 12 }}>NEEDS ME {summary.needsMe.length}</b>
          <b style={{ fontSize: 12 }}>WAITING {summary.external.length}</b>
          <b style={{ fontSize: 12 }}>STALE {summary.stale.length}</b>
        </div>
      </div>

      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,.08)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <small style={{ opacity: .62 }}>OBSERVED {snapshot.races.filter((race) => race.confidence === 'observed').length}</small>
        <small style={{ opacity: .62 }}>INFERRED {summary.inferred.length}</small>
        <small style={{ opacity: summary.unresolved.length ? .9 : .62 }}>UNRESOLVED {summary.unresolved.length}</small>
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>NEXT LEGAL LAPS</span>
          {summary.next.length ? summary.next.map((race, index) => (
            <div key={race.id} style={{ padding: '9px 0', borderTop: index ? '1px solid rgba(255,255,255,.08)' : undefined }}>
              <strong style={{ display: 'block', fontSize: 14 }}>{race.nextLegalLap}</strong>
              <small style={{ opacity: .62 }}>{race.name} · {statusLabel(race)}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>No declared legal laps.</small>}
        </div>

        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>ALMOST DONE</span>
          {summary.almostDone.length ? summary.almostDone.map((race) => (
            <div key={race.id} style={{ padding: '7px 0' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{race.name} · {Math.round(closedRatio(race) * 100)}%</strong>
              <small style={{ opacity: .62 }}>{race.nextLegalLap ?? statusLabel(race)}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>No near-finish races identified.</small>}
        </div>

        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>WAITING EXTERNAL</span>
          {summary.external.length ? summary.external.slice(0, 4).map((race) => (
            <div key={race.id} style={{ padding: '7px 0' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{race.name}</strong>
              <small style={{ opacity: .62 }}>{race.dependencies.find((dependency) => dependency.type === 'waiting_on')?.label ?? 'Next move belongs elsewhere.'}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>Nothing currently waiting on an external actor.</small>}
        </div>

        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>LOOSE ENDS</span>
          {summary.looseEnds.length ? summary.looseEnds.map((race) => (
            <div key={race.id} style={{ padding: '7px 0' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{race.name}</strong>
              <small style={{ opacity: .62 }}>{statusLabel(race)} · {race.lastMeaningfulEvent ?? 'No recent state signal recorded.'}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>No known loose ends in the current snapshot.</small>}
        </div>

        <div>
          <span style={{ display: 'block', fontSize: 10, letterSpacing: '.12em', opacity: .5, marginBottom: 6 }}>ABANDONED / ENDED</span>
          {summary.abandoned.length ? summary.abandoned.map((race) => (
            <div key={race.id} style={{ padding: '7px 0' }}>
              <strong style={{ display: 'block', fontSize: 13 }}>{race.name}</strong>
              <small style={{ opacity: .62 }}>{race.lastMeaningfulEvent ?? 'Recorded as abandoned.'}</small>
            </div>
          )) : <small style={{ opacity: .62 }}>No abandoned races are currently represented.</small>}
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
