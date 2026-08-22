import { useEffect, useMemo, useState } from 'react'
import type { StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { enforceDisplayBoundary } from './displayBoundary'
import { publishReplayState } from './replayBridge'

const hydratedDemo = enforceDisplayBoundary(withArtifactBackfill(demoSnapshot))
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

function chooseRace(snapshot: StrivingSnapshot) {
  return snapshot.races.find((race) => race.status === 'racing')
    ?? snapshot.races.find((race) => race.status === 'waiting_me')
    ?? snapshot.races[0]
}

export function RacecraftHUD(): JSX.Element | null {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => enforceDisplayBoundary(loadLocalSnapshot() ?? hydratedDemo))

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(enforceDisplayBoundary(next))
    }
    window.addEventListener(SNAPSHOT_EVENT, handler)
    return () => window.removeEventListener(SNAPSHOT_EVENT, handler)
  }, [])

  const race = useMemo(() => chooseRace(snapshot), [snapshot])
  const laps = race?.circuit.laps ?? []
  const currentIndex = race ? Math.max(laps.findIndex((lap) => lap.id === race.currentLapId), 0) : 0
  const currentLap = laps[currentIndex]
  const finished = laps.filter((lap) => lap.status === 'finished').length
  const progress = race?.status === 'finished' ? 100 : laps.length ? Math.round((finished / laps.length) * 100) : 0

  useEffect(() => {
    if (!race) return
    const latest = race.history?.[race.history.length - 1]
    publishReplayState({
      raceId: race.id,
      raceName: race.name,
      progress: latest?.progress ?? progress,
      kind: latest?.kind ?? (race.status === 'finished' ? 'finish' : race.status === 'parked' ? 'rest' : race.status === 'waiting_external' ? 'wait' : 'progress'),
      status: race.status,
    })
  }, [race, progress])

  if (!race) return null

  return (
    <div className="racecraft-hud" aria-label="Current race state">
      <div className="racecraft-hud-topline">
        <span>STRIVING OBSERVATION · PREVIEW</span>
        <b>{race.status.replace('_', ' ')}</b>
      </div>
      <h2>{race.name}</h2>
      <div className="racecraft-hud-meta">{race.circuit.name} · Lap {Math.min(currentIndex + 1, Math.max(laps.length, 1))}/{Math.max(laps.length, 1)} · {progress}%</div>
      <div className="racecraft-hud-current">
        <span>CURRENT LAP</span>
        <strong>{currentLap?.name ?? 'Race complete'}</strong>
      </div>
      <div className="racecraft-hud-next">
        <span>NEXT LEGAL LAP</span>
        <strong>{race.nextLegalLap ?? (race.status === 'finished' ? 'Race complete' : 'Undeclared')}</strong>
      </div>
    </div>
  )
}
