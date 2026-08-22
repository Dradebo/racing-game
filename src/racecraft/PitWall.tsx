import { useEffect, useMemo, useState } from 'react'
import type { Race, StrivingSnapshot } from './types'
import { clearLocalSnapshot, importSnapshotFile, loadLocalSnapshot, saveLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { publishReplayState } from './replayBridge'
import './pitWall.css'

function progress(race: Race): number {
  const laps = race.circuit.laps
  if (!laps.length) return 0
  const done = laps.filter((lap) => lap.status === 'finished').length
  if (race.status === 'finished') return 100
  return Math.round((done / laps.length) * 100)
}

function terminalCopy(race: Race): { title: string; detail: string; tone: string } {
  if (race.status === 'finished') return { title: 'PODIUM', detail: 'Verified finish. Proof banked. Capability remains in the garage.', tone: 'podium' }
  if (race.status === 'waiting_external') return { title: 'PIT HOLD', detail: 'No movement expected until an external dependency returns.', tone: 'waiting' }
  if (race.status === 'stale') return { title: 'NO SIGNAL', detail: 'The race stopped reporting. This is a custody problem, not a moral verdict.', tone: 'stale' }
  if (race.status === 'parked') return { title: 'GARAGE DAY', detail: 'Progress intentionally paused. No anomaly generated.', tone: 'rest' }
  if (race.status === 'waiting_me') return { title: 'YOUR BATON', detail: 'The race is intact and waiting for your next legal move.', tone: 'waiting' }
  return { title: 'LIVE RACE', detail: 'Striving is still in motion.', tone: 'live' }
}

function advancePesaSmart(snapshot: StrivingSnapshot): StrivingSnapshot {
  const races = snapshot.races.map((race) => {
    if (race.id !== 'pesa-smart') return race

    const laps = race.circuit.laps.map((lap, index) => {
      if (index === 0) return { ...lap, status: 'finished' as const }
      if (index === 1) return { ...lap, status: 'in_progress' as const }
      return lap
    })

    const nextProgress = Math.max(progress({ ...race, circuit: { ...race.circuit, laps } }), 50)
    const history = [
      ...(race.history ?? []),
      {
        id: `live-${Date.now()}`,
        label: 'Playthrough evidence captured',
        detail: 'Manual live event for V0: the current lap closed and the next legal lap became active.',
        kind: 'verification' as const,
        progress: nextProgress,
        confidence: 'observed' as const,
      },
    ]

    return {
      ...race,
      circuit: { ...race.circuit, laps },
      currentLapId: laps[1]?.id ?? race.currentLapId,
      nextLegalLap: laps[1]?.name ?? race.nextLegalLap,
      lastMeaningfulEvent: new Date().toISOString(),
      history,
      confidence: 'observed' as const,
    }
  })

  return { ...snapshot, generatedAt: new Date().toISOString(), races }
}

export function PitWall(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => loadLocalSnapshot() ?? demoSnapshot)
  const [selectedRaceId, setSelectedRaceId] = useState(snapshot.races[0]?.id)
  const [replayIndex, setReplayIndex] = useState(0)
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => snapshot.races.find((race) => race.id === selectedRaceId) ?? snapshot.races[0],
    [snapshot, selectedRaceId],
  )

  const history = selected?.history ?? []
  const replayEvent = history[Math.min(replayIndex, Math.max(history.length - 1, 0))]
  const replayAtEnd = history.length > 0 && replayIndex === history.length - 1
  const terminal = selected ? terminalCopy(selected) : null

  useEffect(() => {
    if (!selected) return
    publishReplayState({
      raceId: selected.id,
      raceName: selected.name,
      progress: replayEvent?.progress ?? progress(selected),
      kind: replayEvent?.kind ?? 'progress',
      status: selected.status,
    })
  }, [selected, replayEvent])

  async function onImport(file?: File) {
    if (!file) return
    try {
      const next = await importSnapshotFile(file)
      setSnapshot(next)
      setSelectedRaceId(next.races[0]?.id)
      setReplayIndex(0)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import snapshot')
    }
  }

  if (!open) {
    return <button className="racecraft-launch" onClick={() => setOpen(true)}>PIT WALL</button>
  }

  return (
    <aside className="racecraft-shell" aria-label="Striving Observation pit wall">
      <header className="racecraft-header">
        <div><span className="racecraft-kicker">STRIVING OBSERVATION</span><h1>Championship State</h1></div>
        <button onClick={() => setOpen(false)} aria-label="Close pit wall">×</button>
      </header>

      <div className="racecraft-actions">
        <label>LOAD PRIVATE SNAPSHOT<input type="file" accept="application/json,.json" onChange={(event) => onImport(event.target.files?.[0])} /></label>
        <button onClick={() => { clearLocalSnapshot(); setSnapshot(demoSnapshot); setSelectedRaceId(demoSnapshot.races[0]?.id); setReplayIndex(0) }}>DEMO STATE</button>
        <button onClick={() => {
          const next = advancePesaSmart(snapshot)
          saveLocalSnapshot(next)
          setSnapshot(next)
          const race = next.races.find((item) => item.id === 'pesa-smart')
          setSelectedRaceId('pesa-smart')
          setReplayIndex(Math.max((race?.history?.length ?? 1) - 1, 0))
        }}>INJECT PESA LIVE EVENT</button>
      </div>
      {error && <p className="racecraft-error">{error}</p>}

      <div className="racecraft-grid">
        <section className="racecraft-races">
          {snapshot.races.map((race) => (
            <button key={race.id} className={`racecraft-race ${selected?.id === race.id ? 'selected' : ''}`} onClick={() => { setSelectedRaceId(race.id); setReplayIndex(0) }}>
              <span className="racecraft-race-topline"><strong>{race.name}</strong><em>{race.status.replace('_', ' ')}</em></span>
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

            {history.length > 0 && (
              <div className="racecraft-replay">
                <div className="racecraft-replay-head"><span>RACE REPLAY</span><b>{replayEvent?.progress ?? 0}%</b></div>
                <div className="racecraft-replay-track">
                  <i style={{ left: `${replayEvent?.progress ?? 0}%` }} />
                  {history.map((event) => <span key={event.id} title={event.label} style={{ left: `${event.progress}%` }} />)}
                </div>
                <input type="range" min={0} max={Math.max(history.length - 1, 0)} value={Math.min(replayIndex, Math.max(history.length - 1, 0))} onChange={(event) => setReplayIndex(Number(event.target.value))} />
                <div className="racecraft-replay-event"><strong>{replayEvent?.label}</strong><small>{replayEvent?.kind.replace('_', ' ')} · {replayEvent?.confidence}</small>{replayEvent?.detail && <p>{replayEvent.detail}</p>}</div>

                {replayAtEnd && terminal && (
                  <div className={`racecraft-terminal ${terminal.tone}`}>
                    <span>{terminal.title}</span>
                    <strong>{selected.name}</strong>
                    <p>{terminal.detail}</p>
                    {selected.status === 'finished' && <div className="racecraft-podium"><i>2</i><b>1</b><i>3</i></div>}
                  </div>
                )}
              </div>
            )}

            <div className="racecraft-laps">
              {selected.circuit.laps.map((lap, index) => (
                <div key={lap.id} className={`racecraft-lap ${lap.status}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <div><strong>{lap.name}</strong><small>{lap.status.replace('_', ' ')}</small></div>
                </div>
              ))}
            </div>

            <div className="racecraft-next"><span>NEXT LEGAL LAP</span><strong>{selected.nextLegalLap ?? (selected.status === 'finished' ? 'Race complete' : 'Undeclared')}</strong></div>
          </section>
        )}
      </div>

      <footer className="racecraft-privacy">LOCAL STATE · browser storage only · public renderer</footer>
    </aside>
  )
}
