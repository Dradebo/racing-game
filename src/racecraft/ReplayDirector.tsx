import { useEffect, useMemo, useRef, useState } from 'react'
import type { Race, StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { publishReplayMode, publishReplayState, WATCH_REPLAY_EVENT, type ReplayVisualState } from './replayBridge'
import './replayDirector.css'

const hydratedDemo = enforceDisplayBoundary(withArtifactBackfill(demoSnapshot))
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

function finalStatus(race: Race, kind: string): string {
  if (kind === 'finish') return 'finished'
  if (kind === 'wait') return 'waiting_external'
  if (kind === 'rest') return 'parked'
  if (kind === 'blocker') return 'stale'
  return race.status
}

export function ReplayDirector(): JSX.Element | null {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => enforceDisplayBoundary(loadLocalSnapshot() ?? hydratedDemo))
  const [activeRaceId, setActiveRaceId] = useState<string | null>(null)
  const [eventIndex, setEventIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    const snapshotHandler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(enforceDisplayBoundary(next))
    }
    const replayHandler = (event: Event) => {
      const raceId = (event as CustomEvent<{ raceId?: string }>).detail?.raceId
      if (!raceId) return
      const race = snapshot.races.find((item) => item.id === raceId)
      if (!race || !(race.history?.length)) return
      publishReplayMode(true)
      setActiveRaceId(raceId)
      setEventIndex(0)
      setPlaying(true)
      window.setTimeout(() => document.querySelector('.racecraft-world')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 40)
    }
    window.addEventListener(SNAPSHOT_EVENT, snapshotHandler)
    window.addEventListener(WATCH_REPLAY_EVENT, replayHandler)
    return () => {
      window.removeEventListener(SNAPSHOT_EVENT, snapshotHandler)
      window.removeEventListener(WATCH_REPLAY_EVENT, replayHandler)
      if (timer.current) window.clearTimeout(timer.current)
      publishReplayMode(false)
    }
  }, [snapshot])

  const race = useMemo(() => activeRaceId ? snapshot.races.find((item) => item.id === activeRaceId) : undefined, [snapshot, activeRaceId])
  const events = race?.history ?? []
  const event = events[eventIndex]

  function closeReplay() {
    if (timer.current) window.clearTimeout(timer.current)
    setPlaying(false)
    setActiveRaceId(null)
    publishReplayMode(false)
  }

  useEffect(() => {
    if (!race || !event) return
    const state: ReplayVisualState = {
      raceId: race.id,
      raceName: race.name,
      progress: event.progress,
      kind: event.kind,
      status: finalStatus(race, event.kind),
      eventId: event.id,
      eventLabel: event.label,
      eventDetail: event.detail,
      eventIndex,
      eventTotal: events.length,
      playing,
    }
    publishReplayState(state)

    if (!playing) return
    if (timer.current) window.clearTimeout(timer.current)
    const dwell = event.kind === 'blocker' || event.kind === 'wait' || event.kind === 'finish' ? 2600 : 1900
    timer.current = window.setTimeout(() => {
      if (eventIndex >= events.length - 1) {
        closeReplay()
        return
      }
      setEventIndex((value) => value + 1)
    }, dwell)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [race, event, eventIndex, events.length, playing])

  if (!race || !event) return null

  return (
    <aside className="racecraft-broadcast" aria-live="polite">
      <div>
        <span>{playing ? 'RACE REPLAY' : 'REPLAY PAUSED'}</span>
        <b>{race.name}</b>
      </div>
      <div className="racecraft-broadcast-event">
        <strong>{event.label}</strong>
        <small>{event.kind.replace('_', ' ')} · {eventIndex + 1}/{events.length}</small>
        {event.detail && <p>{event.detail}</p>}
      </div>
      <div className="racecraft-broadcast-controls">
        <button disabled={eventIndex <= 0} onClick={() => { setPlaying(false); setEventIndex((value) => Math.max(0, value - 1)) }}>←</button>
        <button onClick={() => setPlaying((value) => !value)}>{playing ? 'PAUSE' : 'PLAY'}</button>
        <button disabled={eventIndex >= events.length - 1} onClick={() => { setPlaying(false); setEventIndex((value) => Math.min(events.length - 1, value + 1)) }}>→</button>
        <button onClick={closeReplay}>CLOSE</button>
      </div>
    </aside>
  )
}
