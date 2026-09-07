import { useEffect, useMemo, useState } from 'react'
import type { StrivingSnapshot } from './types'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { loadLocalSnapshot } from './localState'
import { projectHaramBall } from './haramBallProjection'
import './haramBall.css'

const hydratedDemo = withArtifactBackfill(demoSnapshot)
const SNAPSHOT_EVENT = 'striving-observation:snapshot'
const INSPECT_EVENT = 'striving-observation:inspect-race'

type View = 'overview' | 'squad' | 'lineup' | 'inbox' | 'season'

function inspectRace(raceId: string) {
  window.dispatchEvent(new CustomEvent(INSPECT_EVENT, { detail: { raceId } }))
}

export function HaramBallBoard(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => loadLocalSnapshot() ?? hydratedDemo)
  const [view, setView] = useState<View>('overview')

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(next)
    }
    window.addEventListener(SNAPSHOT_EVENT, handler)
    return () => window.removeEventListener(SNAPSHOT_EVENT, handler)
  }, [])

  const players = useMemo(() => projectHaramBall(snapshot), [snapshot])
  const starters = players.filter((player) => player.squadStatus === 'Starting')
  const onLoan = players.filter((player) => player.squadStatus === 'Loan')
  const bench = players.filter((player) => player.squadStatus === 'Bench')
  const frozen = players.filter((player) => player.squadStatus === 'Frozen')
  const retired = players.filter((player) => player.squadStatus === 'Retired')
  const recentEvents = snapshot.races.flatMap((race) => (race.history ?? []).map((event) => ({ ...event, raceId: race.id, raceName: race.name }))).sort((a, b) => (b.at ?? '').localeCompare(a.at ?? '')).slice(0, 12)

  return (
    <section className="haram-ball" aria-label="Haram Ball manager screen">
      <header className="haram-ball__header">
        <div>
          <span>HARAM BALL · MANAGER MODE</span>
          <h1>Who has the ball?</h1>
          <p>Football-manager shell over canonical Racecraft state.</p>
        </div>
        <aside><b>{starters.length}</b><small>STARTING</small></aside>
      </header>

      <nav className="haram-ball__nav" aria-label="Manager sections">
        {(['overview', 'squad', 'lineup', 'inbox', 'season'] as View[]).map((item) => (
          <button key={item} className={view === item ? 'active' : ''} onClick={() => setView(item)}>{item.toUpperCase()}</button>
        ))}
      </nav>

      {view === 'overview' && <>
        <div className="haram-ball__pitch">
          <div className="haram-ball__halfway" /><div className="haram-ball__centre-circle" />
          <div className="haram-ball__squad-grid">
            {starters.map((player) => <PlayerCard key={player.id} player={player} />)}
            {starters.length === 0 && <div className="haram-ball__empty">No starting players. Reality has the ball.</div>}
          </div>
        </div>
        <div className="haram-ball__rails"><SquadRail title="ON LOAN · EXTERNAL POSSESSION" players={onLoan} /><SquadRail title="BENCH" players={bench} /></div>
      </>}

      {view === 'squad' && <div className="haram-ball__manager-panel">
        <table><thead><tr><th>PROJECT</th><th>STATUS</th><th>POSSESSION</th><th>FORM</th><th>CURRENT LAP</th><th>PROGRESS</th></tr></thead><tbody>
          {players.map((player) => <tr key={player.id} onClick={() => inspectRace(player.id)}><td><strong>{player.name}</strong></td><td>{player.squadStatus}</td><td>{player.possession}</td><td>{player.form}</td><td>{player.currentLap}</td><td>{player.progress}%</td></tr>)}
        </tbody></table>
      </div>}

      {view === 'lineup' && <div className="haram-ball__manager-panel">
        <div className="haram-ball__lineup-summary"><b>{starters.length}/4 active lanes</b><span>{starters.length > 4 ? 'OVER CAPACITY — substitution required' : 'Within Haram Ball WIP law'}</span></div>
        <div className="haram-ball__lineup-list">{starters.map((player, index) => <button key={player.id} onClick={() => inspectRace(player.id)}><span>{index + 1}</span><strong>{player.name}</strong><small>{player.nextMove}</small><b>{player.possession}</b></button>)}</div>
        {bench.length > 0 && <SquadRail title="AVAILABLE SUBSTITUTES" players={bench} />}
      </div>}

      {view === 'inbox' && <div className="haram-ball__manager-panel haram-ball__inbox">
        {recentEvents.length === 0 ? <p>No match events yet.</p> : recentEvents.map((event) => <button key={`${event.raceId}-${event.id}`} onClick={() => inspectRace(event.raceId)}><span>{event.kind.toUpperCase()}</span><strong>{event.raceName}</strong><p>{event.label}</p><small>{event.detail ?? event.confidence}</small></button>)}
      </div>}

      {view === 'season' && <div className="haram-ball__manager-panel">
        {snapshot.seasons.map((season) => <section key={season.id} className="haram-ball__season"><span>SEASON</span><h2>{season.name}</h2><p>{season.theme}</p><div>{season.raceIds.map((raceId) => { const player = players.find((item) => item.id === raceId); return player ? <button key={raceId} onClick={() => inspectRace(raceId)}><strong>{player.name}</strong><span>{player.raceStatus.replace('_', ' ')}</span><b>{player.progress}%</b></button> : null })}</div></section>)}
        {retired.length > 0 && <SquadRail title="FINISHED / RETIRED" players={retired} />}
        {frozen.length > 0 && <SquadRail title="FROZEN" players={frozen} />}
      </div>}
    </section>
  )
}

function PlayerCard({ player }: { player: ReturnType<typeof projectHaramBall>[number] }) {
  return <button className={`haram-player haram-player--${player.form}`} onClick={() => inspectRace(player.id)}><span className="haram-player__status">{player.raceStatus.replace('_', ' ')}</span><strong>{player.name}</strong><small>{player.currentLap}</small><div className="haram-player__meter"><i style={{ width: `${player.progress}%` }} /></div><footer><span>POSSESSION · {player.possession}</span><b>{player.progress}%</b></footer></button>
}

function SquadRail({ title, players }: { title: string; players: ReturnType<typeof projectHaramBall> }) {
  if (!players.length) return null
  return <section className="haram-rail"><h2>{title}</h2><div>{players.map((player) => <button key={player.id} onClick={() => inspectRace(player.id)}><span>{player.squadStatus}</span><strong>{player.name}</strong><small>{player.nextMove}</small><footer><em>{player.possession}</em><b>{player.progress}%</b></footer></button>)}</div></section>
}
