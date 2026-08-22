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
  if (race.status === 'finished') return { title: 'PODIUM', detail: 'Finish verified. Race complete.', tone: 'podium' }
  if (race.status === 'waiting_external') return { title: 'PIT HOLD', detail: 'No movement expected until the external dependency changes.', tone: 'waiting' }
  if (race.status === 'stale') return { title: 'NO SIGNAL', detail: 'The race is no longer reporting meaningful state.', tone: 'stale' }
  if (race.status === 'parked') return { title: 'PARKED', detail: 'Progress intentionally paused. No movement expected.', tone: 'rest' }
  if (race.status === 'waiting_me') return { title: 'YOUR BATON', detail: 'The race is intact and waiting for the next legal lap.', tone: 'waiting' }
  return { title: 'LIVE RACE', detail: 'The race is still in motion.', tone: 'live' }
}

function advancePesaSmart(snapshot: StrivingSnapshot): StrivingSnapshot {
  const races = snapshot.races.map((race) => {
    if (race.id !== 'pesa-smart') return race
    const laps = race.circuit.laps.map((lap, index) => {
      if (index === 4) return { ...lap, status: 'finished' as const }
      if (index === 5) return { ...lap, status: 'in_progress' as const }
      return lap
    })
    const nextProgress = Math.max(progress({ ...race, circuit: { ...race.circuit, laps } }), 92)
    const history = [
      ...(race.history ?? []),
      {
        id: `live-${Date.now()}`,
        label: 'Playthrough evidence captured',
        detail: 'Observed locally: the playthrough lap closed and defect-clearing became the next legal lap.',
        kind: 'verification' as const,
        progress: nextProgress,
        confidence: 'observed' as const,
      },
    ]
    return {
      ...race,
      circuit: { ...race.circuit, laps },
      currentLapId: 'clear-defects',
      nextLegalLap: 'Clear closing defects',
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
  const [mode, setMode] = useState<'current' | 'replay'>('current')
  const [open, setOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(
    () => snapshot.races.find((race) => race.id === selectedRaceId) ?? snapshot.races[0],
    [snapshot, selectedRaceId],
  )

  const grouped = useMemo(
    () => snapshot.seasons.map((season) => ({
      ...season,
      races: season.raceIds.map((id) => snapshot.races.find((race) => race.id === id)).filter(Boolean) as Race[],
    })),
    [snapshot],
  )

  const history = selected?.history ?? []
  const currentIndex = Math.max(history.length - 1, 0)
  const effectiveIndex = mode === 'current' ? currentIndex : Math.min(replayIndex, currentIndex)
  const replayEvent = history[effectiveIndex]
  const replayAtEnd = history.length > 0 && effectiveIndex === currentIndex
  const terminal = selected ? terminalCopy(selected) : null
  const activeCount = snapshot.races.filter((race) => race.status === 'racing' || race.status === 'waiting_me').length
  const waitingCount = snapshot.races.filter((race) => race.status === 'waiting_external').length
  const podiumCount = snapshot.races.filter((race) => race.status === 'finished').length

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
      const first = next.races[0]
      setSelectedRaceId(first?.id)
      setReplayIndex(Math.max((first?.history?.length ?? 1) - 1, 0))
      setMode('current')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import snapshot')
    }
  }

  function selectRace(race: Race) {
    setSelectedRaceId(race.id)
    setReplayIndex(Math.max((race.history?.length ?? 1) - 1, 0))
    setMode('current')
  }

  if (!open) return <button className="racecraft-launch" onClick={() => setOpen(true)}>PIT WALL</button>

  return (
    <aside className="racecraft-shell" aria-label="Striving Observation pit wall">
      <header className="racecraft-header">
        <div>
          <span className="racecraft-kicker">STRIVING OBSERVATION</span>
          <h1>Championship</h1>
          <p className="racecraft-subtitle">Current state first. Replay when you want the race history.</p>
        </div>
        <button onClick={() => setOpen(false)} aria-label="Close pit wall">×</button>
      </header>

      <div className="racecraft-scoreboard">
        <span><b>{activeCount}</b> live</span><span><b>{waitingCount}</b> pit hold</span><span><b>{podiumCount}</b> podiums</span>
      </div>

      <div className="racecraft-actions">
        <label>LOAD PRIVATE STATE<input type="file" accept="application/json,.json" onChange={(event) => onImport(event.target.files?.[0])} /></label>
        <button onClick={() => { clearLocalSnapshot(); setSnapshot(demoSnapshot); selectRace(demoSnapshot.races[0]) }}>RESET DEMO</button>
        <button className="racecraft-primary" onClick={() => {
          const next = advancePesaSmart(snapshot)
          saveLocalSnapshot(next)
          setSnapshot(next)
          const race = next.races.find((item) => item.id === 'pesa-smart')!
          selectRace(race)
        }}>LOG PESA PLAYTHROUGH</button>
      </div>
      {error && <p className="racecraft-error">{error}</p>}

      <div className="racecraft-grid">
        <nav className="racecraft-races" aria-label="Championship races">
          {grouped.map((season) => (
            <section className="racecraft-season" key={season.id}>
              <div className="racecraft-season-head"><strong>{season.name}</strong><span>{season.theme}</span></div>
              {season.races.map((race) => (
                <button key={race.id} className={`racecraft-race ${selected?.id === race.id ? 'selected' : ''}`} onClick={() => selectRace(race)}>
                  <span className="racecraft-race-topline"><strong>{race.name}</strong><em>{race.status.replace('_', ' ')}</em></span>
                  <span className="racecraft-track"><i style={{ width: `${progress(race)}%` }} /></span>
                  <span className="racecraft-race-meta">{race.circuit.name} · {progress(race)}%</span>
                </button>
              ))}
            </section>
          ))}
        </nav>

        {selected && (
          <section className="racecraft-detail">
            <div className="racecraft-detail-head">
              <div><span className="racecraft-kicker">{selected.circuit.kind.toUpperCase()} CIRCUIT</span><h2>{selected.name}</h2></div>
              <span className={`racecraft-status ${selected.status}`}>{selected.status.replace('_', ' ')}</span>
            </div>

            <div className="racecraft-current">
              <span>CURRENT LAP</span>
              <strong>{selected.circuit.laps.find((lap) => lap.id === selected.currentLapId)?.name ?? 'Race complete'}</strong>
              <small>{selected.nextLegalLap ? `Next legal lap: ${selected.nextLegalLap}` : 'No further lap declared.'}</small>
            </div>

            <p className="racecraft-finish"><b>FINISH LINE</b><br />{selected.finishLine}</p>

            <div className="racecraft-mode-switch">
              <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')}>CURRENT</button>
              <button className={mode === 'replay' ? 'active' : ''} onClick={() => { setMode('replay'); setReplayIndex(0) }}>REPLAY</button>
            </div>

            {history.length > 0 && (
              <div className="racecraft-replay">
                <div className="racecraft-replay-head"><span>{mode === 'current' ? 'CURRENT STATE' : 'RACE REPLAY'}</span><b>{replayEvent?.progress ?? 0}%</b></div>
                <div className="racecraft-replay-track">
                  <i style={{ left: `${replayEvent?.progress ?? 0}%` }} />
                  {history.map((event) => <span key={event.id} title={event.label} style={{ left: `${event.progress}%` }} />)}
                </div>
                {mode === 'replay' && (
                  <>
                    <input type="range" min={0} max={currentIndex} value={Math.min(replayIndex, currentIndex)} onChange={(event) => setReplayIndex(Number(event.target.value))} />
                    <div className="racecraft-replay-nav">
                      <button disabled={replayIndex <= 0} onClick={() => setReplayIndex((value) => Math.max(value - 1, 0))}>← PREV</button>
                      <span>{effectiveIndex + 1} / {history.length}</span>
                      <button disabled={replayIndex >= currentIndex} onClick={() => setReplayIndex((value) => Math.min(value + 1, currentIndex))}>NEXT →</button>
                    </div>
                  </>
                )}
                <div className="racecraft-replay-event"><strong>{replayEvent?.label}</strong><small>{replayEvent?.kind.replace('_', ' ')} · {replayEvent?.confidence}</small>{replayEvent?.detail && <p>{replayEvent.detail}</p>}</div>

                {replayAtEnd && terminal && (
                  <div className={`racecraft-terminal ${terminal.tone}`}>
                    <span>{terminal.title}</span><strong>{selected.name}</strong><p>{terminal.detail}</p>
                    {selected.status === 'finished' && <div className="racecraft-podium"><i>2</i><b>1</b><i>3</i></div>}
                  </div>
                )}
              </div>
            )}

            <details className="racecraft-lap-drawer">
              <summary>VIEW ALL LAPS · {selected.circuit.laps.filter((lap) => lap.status === 'finished').length}/{selected.circuit.laps.length} CLOSED</summary>
              <div className="racecraft-laps">
                {selected.circuit.laps.map((lap, index) => (
                  <div key={lap.id} className={`racecraft-lap ${lap.status}`}>
                    <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{lap.name}</strong><small>{lap.status.replace('_', ' ')}</small></div>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}
      </div>

      <footer className="racecraft-privacy">PRIVATE STATE STAYS LOCAL · PUBLIC RENDERER · RACE STATE COMES FROM EVIDENCE</footer>
    </aside>
  )
}
