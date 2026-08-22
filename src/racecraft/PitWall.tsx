import { useMemo, useState } from 'react'
import type { Race, StrivingSnapshot } from './types'
import { clearLocalSnapshot, importSnapshotFile, loadLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import './pitWall.css'

function progress(race: Race): number {
  const laps = race.circuit.laps
  if (!laps.length) return 0
  const done = laps.filter((lap) => lap.status === 'finished').length
  if (race.status === 'finished') return 100
  return Math.round((done / laps.length) * 100)
}

export function PitWall(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => loadLocalSnapshot() ?? demoSnapshot)
  const [selectedRaceId, setSelectedRaceId] = useState(snapshot.races[0]?.id)
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => snapshot.races.find((race) => race.id === selectedRaceId) ?? snapshot.races[0],
    [snapshot, selectedRaceId],
  )

  async function onImport(file?: File) {
    if (!file) return
    try {
      const next = await importSnapshotFile(file)
      setSnapshot(next)
      setSelectedRaceId(next.races[0]?.id)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import snapshot')
    }
  }

  if (!open) {
    return (
      <button className="racecraft-launch" onClick={() => setOpen(true)}>
        PIT WALL
      </button>
    )
  }

  return (
    <aside className="racecraft-shell" aria-label="Striving Observation pit wall">
      <header className="racecraft-header">
        <div>
          <span className="racecraft-kicker">STRIVING OBSERVATION</span>
          <h1>Championship State</h1>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close pit wall">×</button>
      </header>

      <div className="racecraft-actions">
        <label>
          LOAD PRIVATE SNAPSHOT
          <input type="file" accept="application/json,.json" onChange={(event) => onImport(event.target.files?.[0])} />
        </label>
        <button
          onClick={() => {
            clearLocalSnapshot()
            setSnapshot(demoSnapshot)
            setSelectedRaceId(demoSnapshot.races[0]?.id)
          }}
        >
          DEMO STATE
        </button>
      </div>
      {error && <p className="racecraft-error">{error}</p>}

      <div className="racecraft-grid">
        <section className="racecraft-races">
          {snapshot.races.map((race) => (
            <button
              key={race.id}
              className={`racecraft-race ${selected?.id === race.id ? 'selected' : ''}`}
              onClick={() => setSelectedRaceId(race.id)}
            >
              <span className="racecraft-race-topline">
                <strong>{race.name}</strong>
                <em>{race.status.replace('_', ' ')}</em>
              </span>
              <span className="racecraft-track"><i style={{ width: `${progress(race)}%` }} /></span>
              <span className="racecraft-race-meta">{race.circuit.name} · {progress(race)}%</span>
            </button>
          ))}
        </section>

        {selected && (
          <section className="racecraft-detail">
            <span className="racecraft-kicker">{selected.circuit.kind.toUpperCase()} CIRCUIT</span>
            <h2>{selected.name}</h2>
            <p className="racecraft-finish"><b>FINISH LINE</b><br />{selected.finishLine}</p>

            <div className="racecraft-laps">
              {selected.circuit.laps.map((lap, index) => (
                <div key={lap.id} className={`racecraft-lap ${lap.status}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{lap.name}</strong>
                    <small>{lap.status.replace('_', ' ')}</small>
                  </div>
                </div>
              ))}
            </div>

            <div className="racecraft-next">
              <span>NEXT LEGAL LAP</span>
              <strong>{selected.nextLegalLap ?? (selected.status === 'finished' ? 'Race complete' : 'Undeclared')}</strong>
            </div>
          </section>
        )}
      </div>

      <footer className="racecraft-privacy">LOCAL STATE · browser storage only · public renderer</footer>
    </aside>
  )
}
