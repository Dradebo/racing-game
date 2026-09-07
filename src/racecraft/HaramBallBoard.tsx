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

function inspectRace(raceId: string) {
  window.dispatchEvent(new CustomEvent(INSPECT_EVENT, { detail: { raceId } }))
}

export function HaramBallBoard(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => loadLocalSnapshot() ?? hydratedDemo)

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

  return (
    <section className="haram-ball" aria-label="Haram Ball squad screen">
      <header className="haram-ball__header">
        <div>
          <span>HARAM BALL · SQUAD</span>
          <h1>Who has the ball?</h1>
          <p>Same Racecraft state. Football-manager projection only.</p>
        </div>
        <aside>
          <b>{starters.length}</b>
          <small>STARTING</small>
        </aside>
      </header>

      <div className="haram-ball__pitch">
        <div className="haram-ball__halfway" />
        <div className="haram-ball__centre-circle" />
        <div className="haram-ball__squad-grid">
          {starters.map((player) => (
            <button className={`haram-player haram-player--${player.form}`} key={player.id} onClick={() => inspectRace(player.id)}>
              <span className="haram-player__status">{player.raceStatus.replace('_', ' ')}</span>
              <strong>{player.name}</strong>
              <small>{player.currentLap}</small>
              <div className="haram-player__meter"><i style={{ width: `${player.progress}%` }} /></div>
              <footer>
                <span>POSSESSION · {player.possession}</span>
                <b>{player.progress}%</b>
              </footer>
            </button>
          ))}
          {starters.length === 0 && <div className="haram-ball__empty">No starting players. Reality has the ball.</div>}
        </div>
      </div>

      <div className="haram-ball__rails">
        <SquadRail title="ON LOAN · EXTERNAL POSSESSION" players={onLoan} />
        <SquadRail title="BENCH" players={bench} />
        <SquadRail title="FROZEN" players={frozen} />
        <SquadRail title="RETIRED / FINISHED" players={retired} />
      </div>
    </section>
  )
}

function SquadRail({ title, players }: { title: string; players: ReturnType<typeof projectHaramBall> }) {
  if (!players.length) return null
  return (
    <section className="haram-rail">
      <h2>{title}</h2>
      <div>
        {players.map((player) => (
          <button key={player.id} onClick={() => inspectRace(player.id)}>
            <span>{player.squadStatus}</span>
            <strong>{player.name}</strong>
            <small>{player.nextMove}</small>
            <footer><em>{player.possession}</em><b>{player.progress}%</b></footer>
          </button>
        ))}
      </div>
    </section>
  )
}
