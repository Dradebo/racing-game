import { useEffect, useMemo, useState } from 'react'
import type { Artifact, Race, StrivingSnapshot } from './types'
import { clearLocalSnapshot, importSnapshotFile, loadLocalSnapshot, saveLocalSnapshot } from './localState'
import { demoSnapshot } from './demoSnapshot'
import { withArtifactBackfill } from './artifactBackfill'
import { publishReplayState } from './replayBridge'
import './pitWall.css'
import './inspector.css'

const hydratedDemo = withArtifactBackfill(demoSnapshot)
const SNAPSHOT_EVENT = 'striving-observation:snapshot'
const INSPECT_EVENT = 'striving-observation:inspect-race'

function broadcastSnapshot(snapshot: StrivingSnapshot) {
  window.dispatchEvent(new CustomEvent(SNAPSHOT_EVENT, { detail: snapshot }))
}

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
  const pesa = snapshot.races.find((race) => race.id === 'pesa-smart')
  const playthrough = pesa?.circuit.laps.find((lap) => lap.id === 'playthrough')
  if (!pesa || playthrough?.status === 'finished') return snapshot

  const now = new Date().toISOString()
  const artifact: Artifact = {
    id: `artifact-pesa-playthrough-${Date.now()}`,
    kind: 'manual_record', source: 'manual', label: 'Pesa Smart playthrough recorded', observedAt: now,
    confidence: 'observed', contribution: 'closes_lap', seasonId: 'build', raceId: 'pesa-smart', circuitId: 'closing', lapId: 'playthrough',
  }

  const races = snapshot.races.map((race) => {
    if (race.id !== 'pesa-smart') return race
    const laps = race.circuit.laps.map((lap) => {
      if (lap.id === 'playthrough') return { ...lap, status: 'finished' as const, artifacts: [...(lap.artifacts ?? []), artifact] }
      if (lap.id === 'clear-defects') return { ...lap, status: 'in_progress' as const }
      return lap
    })
    const nextProgress = Math.max(progress({ ...race, circuit: { ...race.circuit, laps } }), 92)
    return {
      ...race,
      artifacts: [...(race.artifacts ?? []), artifact],
      circuit: { ...race.circuit, laps }, currentLapId: 'clear-defects', nextLegalLap: 'Clear closing defects', lastMeaningfulEvent: now,
      history: [...(race.history ?? []), { id: `live-${Date.now()}`, label: 'Playthrough lap closed', detail: 'The recorded playthrough closed this lap and opened defect clearing as the next legal lap.', kind: 'verification' as const, progress: nextProgress, confidence: 'observed' as const, artifactIds: [artifact.id] }],
      confidence: 'observed' as const,
    }
  })
  return { ...snapshot, generatedAt: now, races, artifacts: [...(snapshot.artifacts ?? []), artifact] }
}

export function PitWall(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StrivingSnapshot>(() => loadLocalSnapshot() ?? hydratedDemo)
  const [selectedRaceId, setSelectedRaceId] = useState(snapshot.races[0]?.id)
  const [replayIndex, setReplayIndex] = useState(0)
  const [mode, setMode] = useState<'current' | 'replay'>('current')
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = useMemo(() => snapshot.races.find((race) => race.id === selectedRaceId) ?? snapshot.races[0], [snapshot, selectedRaceId])
  const history = selected?.history ?? []
  const currentIndex = Math.max(history.length - 1, 0)
  const effectiveIndex = mode === 'current' ? currentIndex : Math.min(replayIndex, currentIndex)
  const replayEvent = history[effectiveIndex]
  const replayAtEnd = history.length > 0 && effectiveIndex === currentIndex
  const terminal = selected ? terminalCopy(selected) : null
  const selectedArtifacts = useMemo(() => (snapshot.artifacts ?? []).filter((artifact) => artifact.raceId === selected?.id), [snapshot, selected])
  const replayArtifacts = useMemo(() => !replayEvent?.artifactIds?.length ? [] : (snapshot.artifacts ?? []).filter((artifact) => replayEvent.artifactIds?.includes(artifact.id)), [snapshot, replayEvent])
  const pesaPlaythroughClosed = snapshot.races.find((race) => race.id === 'pesa-smart')?.circuit.laps.find((lap) => lap.id === 'playthrough')?.status === 'finished'

  useEffect(() => {
    const snapshotHandler = (event: Event) => {
      const next = (event as CustomEvent<StrivingSnapshot>).detail
      if (next) setSnapshot(next)
    }
    const inspectHandler = (event: Event) => {
      const raceId = (event as CustomEvent<{ raceId?: string }>).detail?.raceId
      if (!raceId) return
      const race = snapshot.races.find((item) => item.id === raceId)
      if (!race) return
      setSelectedRaceId(race.id)
      setReplayIndex(Math.max((race.history?.length ?? 1) - 1, 0))
      setMode('current')
      setOpen(true)
    }
    window.addEventListener(SNAPSHOT_EVENT, snapshotHandler)
    window.addEventListener(INSPECT_EVENT, inspectHandler)
    return () => {
      window.removeEventListener(SNAPSHOT_EVENT, snapshotHandler)
      window.removeEventListener(INSPECT_EVENT, inspectHandler)
    }
  }, [snapshot])

  useEffect(() => {
    if (!selected || !open) return
    publishReplayState({ raceId: selected.id, raceName: selected.name, progress: replayEvent?.progress ?? progress(selected), kind: replayEvent?.kind ?? 'progress', status: selected.status })
  }, [selected, replayEvent, open])

  async function onImport(file?: File) {
    if (!file) return
    try {
      const next = await importSnapshotFile(file)
      setSnapshot(next)
      broadcastSnapshot(next)
      const first = next.races[0]
      setSelectedRaceId(first?.id)
      setReplayIndex(Math.max((first?.history?.length ?? 1) - 1, 0))
      setMode('current')
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not import snapshot')
    }
  }

  if (!open) return <button className="racecraft-launch" onClick={() => setOpen(true)}>RACE INSPECTOR</button>
  if (!selected) return <></>

  return (
    <aside className="racecraft-shell racecraft-inspector" aria-label="Race inspector">
      <header className="racecraft-header">
        <div><span className="racecraft-kicker">RACE INSPECTOR</span><h1>{selected.name}</h1><p className="racecraft-subtitle">Current state, replay, artifacts and lap detail.</p></div>
        <button onClick={() => setOpen(false)} aria-label="Close race inspector">×</button>
      </header>

      <div className="racecraft-actions">
        <label>LOAD PRIVATE STATE<input type="file" accept="application/json,.json" onChange={(event) => onImport(event.target.files?.[0])} /></label>
        <button onClick={() => { clearLocalSnapshot(); setSnapshot(hydratedDemo); broadcastSnapshot(hydratedDemo) }}>RESET DEMO</button>
        {selected.id === 'pesa-smart' && <button className="racecraft-primary" disabled={pesaPlaythroughClosed} onClick={() => {
          const next = advancePesaSmart(snapshot)
          if (next === snapshot) return
          saveLocalSnapshot(next); setSnapshot(next); broadcastSnapshot(next)
        }}>{pesaPlaythroughClosed ? 'PESA PLAYTHROUGH RECORDED' : 'LOG PESA PLAYTHROUGH'}</button>}
      </div>
      {error && <p className="racecraft-error">{error}</p>}

      <section className="racecraft-detail racecraft-inspector-detail">
        <div className="racecraft-detail-head">
          <div><span className="racecraft-kicker">{selected.circuit.kind.toUpperCase()} CIRCUIT</span><h2>{selected.name}</h2></div>
          <span className={`racecraft-status ${selected.status}`}>{selected.status.replace('_', ' ')}</span>
        </div>

        <div className="racecraft-current">
          <span>CURRENT LAP</span>
          <strong>{selected.circuit.laps.find((lap) => lap.id === selected.currentLapId)?.name ?? 'Race complete'}</strong>
          <small>{selected.nextLegalLap ? `Next legal lap: ${selected.nextLegalLap}` : 'No further lap declared.'}</small>
          <small>{selectedArtifacts.length} artifact{selectedArtifacts.length === 1 ? '' : 's'} mapped to this race</small>
        </div>

        <p className="racecraft-finish"><b>FINISH LINE</b><br />{selected.finishLine}</p>

        <div className="racecraft-mode-switch">
          <button className={mode === 'current' ? 'active' : ''} onClick={() => setMode('current')}>CURRENT</button>
          <button className={mode === 'replay' ? 'active' : ''} onClick={() => { setMode('replay'); setReplayIndex(0) }}>REPLAY</button>
        </div>

        {history.length > 0 && <div className="racecraft-replay">
          <div className="racecraft-replay-head"><span>{mode === 'current' ? 'CURRENT STATE' : 'RACE REPLAY'}</span><b>{replayEvent?.progress ?? 0}%</b></div>
          <div className="racecraft-replay-track"><i style={{ left: `${replayEvent?.progress ?? 0}%` }} />{history.map((event) => <span key={event.id} title={event.label} style={{ left: `${event.progress}%` }} />)}</div>
          {mode === 'replay' && <><input type="range" min={0} max={currentIndex} value={Math.min(replayIndex, currentIndex)} onChange={(event) => setReplayIndex(Number(event.target.value))} /><div className="racecraft-replay-nav"><button disabled={replayIndex <= 0} onClick={() => setReplayIndex((value) => Math.max(value - 1, 0))}>← PREV</button><span>{effectiveIndex + 1} / {history.length}</span><button disabled={replayIndex >= currentIndex} onClick={() => setReplayIndex((value) => Math.min(value + 1, currentIndex))}>NEXT →</button></div></>}
          <div className="racecraft-replay-event"><strong>{replayEvent?.label}</strong><small>{replayEvent?.kind.replace('_', ' ')} · {replayEvent?.confidence}</small>{replayEvent?.detail && <p>{replayEvent.detail}</p>}
            {replayArtifacts.length > 0 && <div className="racecraft-artifacts"><span>ARTIFACTS THAT CHANGED THIS STATE</span>{replayArtifacts.map((artifact) => artifact.uri ? <a key={artifact.id} href={artifact.uri} target="_blank" rel="noreferrer"><b>{artifact.kind}</b>{artifact.label}<small>{artifact.contribution.replaceAll('_', ' ')}</small></a> : <div key={artifact.id}><b>{artifact.kind}</b>{artifact.label}<small>{artifact.contribution.replaceAll('_', ' ')}</small></div>)}</div>}
          </div>
          {replayAtEnd && terminal && <div className={`racecraft-terminal ${terminal.tone}`}><span>{terminal.title}</span><strong>{selected.name}</strong><p>{terminal.detail}</p>{selected.status === 'finished' && <div className="racecraft-podium"><i>2</i><b>1</b><i>3</i></div>}</div>}
        </div>}

        <details className="racecraft-lap-drawer" open>
          <summary>ALL LAPS · {selected.circuit.laps.filter((lap) => lap.status === 'finished').length}/{selected.circuit.laps.length} CLOSED</summary>
          <div className="racecraft-laps">{selected.circuit.laps.map((lap, index) => <div key={lap.id} className={`racecraft-lap ${lap.status}`}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{lap.name}</strong><small>{lap.status.replace('_', ' ')}</small>{(lap.artifacts?.length ?? 0) > 0 && <small>{lap.artifacts?.length} artifact{lap.artifacts?.length === 1 ? '' : 's'}</small>}</div></div>)}</div>
        </details>
      </section>

      <footer className="racecraft-privacy">PRIVATE STATE STAYS LOCAL · PUBLIC RENDERER · RACE STATE COMES FROM ARTIFACTS</footer>
    </aside>
  )
}
