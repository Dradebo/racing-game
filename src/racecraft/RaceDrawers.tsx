import { useEffect, useMemo, useState } from 'react'
import type { Race, StrivingSnapshot } from './types'
import { loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { attentionForRace, attentionRank } from './attention'
import './drawers.css'

const hydratedDemo = withArtifactBackfill(demoSnapshot)
const SNAPSHOT_EVENT = 'striving-observation:snapshot'

function progress(race: Race): number {
  const laps = race.circuit.laps
  if (!laps.length) return 0
  if (race.status === 'finished') return 100
  const finished = laps.filter((lap) => lap.status === 'finished').length
  return Math.round((finished / laps.length) * 100)
}

function RaceCompartment({ race, attentionReason }: { race: Race; attentionReason?: string }) {
  const [open, setOpen] = useState(race.status === 'racing' || race.status === 'waiting_me')
  const currentLap = race.circuit.laps.find((lap) => lap.id === race.currentLapId)

  return (
    <article className={`race-drawer-race ${attentionReason ? 'needs-attention' : ''}`}>
      <button className="race-drawer-race-head" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div>
          <span>{race.circuit.name}</span>
          <strong>{race.name}</strong>
          <small>{attentionReason ?? currentLap?.name ?? race.status.replace('_', ' ')}</small>
        </div>
        <div className="race-drawer-race-right">
          <b>{progress(race)}%</b>
          <i>{open ? '−' : '+'}</i>
        </div>
      </button>
      {open && (
        <div className="race-drawer-laps">
          {race.circuit.laps.map((lap, index) => (
            <div key={lap.id} className={`race-drawer-lap ${lap.status}`}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div>
                <strong>{lap.name}</strong>
                <small>{lap.status.replace('_', ' ')}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

export function RaceDrawers(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => loadLocalSnapshot() ?? hydratedDemo)

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(next)
    }
    window.addEventListener(SNAPSHOT_EVENT, handler)
    return () => window.removeEventListener(SNAPSHOT_EVENT, handler)
  }, [])

  const racesById = useMemo(() => new Map(snapshot.races.map((race) => [race.id, race])), [snapshot])

  const attention = useMemo(() => snapshot.races
    .map((race) => ({ race, signal: attentionForRace(race) }))
    .filter(({ signal }) => signal.level !== 'none')
    .sort((a, b) => attentionRank(a.signal.level) - attentionRank(b.signal.level)), [snapshot])

  const activeSeasons = useMemo(() => snapshot.seasons
    .map((season) => ({
      season,
      races: season.raceIds.map((id) => racesById.get(id)).filter((race): race is Race => Boolean(race) && race!.status !== 'finished' && race!.status !== 'abandoned'),
    }))
    .filter(({ races }) => races.length > 0), [snapshot, racesById])

  const finishedSeasons = useMemo(() => snapshot.seasons
    .map((season) => ({
      season,
      races: season.raceIds.map((id) => racesById.get(id)).filter((race): race is Race => Boolean(race) && (race!.status === 'finished' || race!.status === 'abandoned')),
      total: season.raceIds.length,
    }))
    .filter(({ races, total }) => races.length > 0 && races.length === total), [snapshot, racesById])

  const finishedRaces = useMemo(() => snapshot.races.filter((race) => race.status === 'finished' || race.status === 'abandoned'), [snapshot])

  return (
    <section className="race-drawers" aria-label="Racecraft drawers">
      <details className="race-drawer attention" open={attention.length > 0}>
        <summary>
          <span>NEEDS ATTENTION</span>
          <b>{attention.length}</b>
        </summary>
        <div className="race-drawer-body">
          {attention.length === 0 ? <p className="race-drawer-empty">No race currently demands intervention.</p> : attention.map(({ race, signal }) => (
            <RaceCompartment key={race.id} race={race} attentionReason={signal.reason} />
          ))}
        </div>
      </details>

      <details className="race-drawer championship" open>
        <summary>
          <span>CHAMPIONSHIP</span>
          <b>{activeSeasons.reduce((sum, item) => sum + item.races.length, 0)}</b>
        </summary>
        <div className="race-drawer-body">
          {activeSeasons.map(({ season, races }) => (
            <section className="race-drawer-season" key={season.id}>
              <header><strong>{season.name}</strong><span>{races.length} active race{races.length === 1 ? '' : 's'}</span></header>
              {races.map((race) => <RaceCompartment key={race.id} race={race} />)}
            </section>
          ))}
        </div>
      </details>

      <details className="race-drawer finished">
        <summary>
          <span>FINISHED</span>
          <b>{finishedRaces.length}</b>
        </summary>
        <div className="race-drawer-body">
          {finishedSeasons.map(({ season, races }) => (
            <section className="race-drawer-season finished-season" key={season.id}>
              <header><strong>{season.name}</strong><span>season complete</span></header>
              {races.map((race) => <RaceCompartment key={race.id} race={race} />)}
            </section>
          ))}
          {finishedSeasons.length === 0 && finishedRaces.map((race) => <RaceCompartment key={race.id} race={race} />)}
        </div>
      </details>
    </section>
  )
}
