import type { Race, RaceHealth, RaceStatus, StrivingSnapshot } from './types'

export type SquadStatus = 'Starting' | 'Bench' | 'Loan' | 'Frozen' | 'Retired'
export type Possession = 'Sean' | 'External' | 'System' | 'None'

export type HaramBallPlayer = {
  id: string
  name: string
  squadStatus: SquadStatus
  possession: Possession
  form: RaceHealth
  raceStatus: RaceStatus
  progress: number
  currentLap: string
  nextMove: string
  finishLine: string
  lastMeaningfulEvent?: string
}

function progress(race: Race): number {
  if (race.status === 'finished') return 100
  const laps = race.circuit.laps
  if (!laps.length) return 0
  const completed = laps.filter((lap) => lap.status === 'finished').length
  return Math.round((completed / laps.length) * 100)
}

function squadStatus(race: Race): SquadStatus {
  switch (race.status) {
    case 'racing':
    case 'waiting_me':
      return 'Starting'
    case 'waiting_external':
      return 'Loan'
    case 'queued':
    case 'parked':
      return 'Bench'
    case 'stale':
      return 'Frozen'
    case 'finished':
    case 'abandoned':
      return 'Retired'
  }
}

function possession(race: Race): Possession {
  switch (race.status) {
    case 'racing':
    case 'waiting_me':
      return 'Sean'
    case 'waiting_external':
      return 'External'
    case 'queued':
    case 'parked':
    case 'stale':
      return 'System'
    case 'finished':
    case 'abandoned':
      return 'None'
  }
}

export function projectHaramBall(snapshot: StrivingSnapshot): HaramBallPlayer[] {
  return snapshot.races.map((race) => ({
    id: race.id,
    name: race.name,
    squadStatus: squadStatus(race),
    possession: possession(race),
    form: race.health,
    raceStatus: race.status,
    progress: progress(race),
    currentLap: race.circuit.laps.find((lap) => lap.id === race.currentLapId)?.name ?? 'Race complete',
    nextMove: race.nextLegalLap ?? 'Await evidence before assigning more work',
    finishLine: race.finishLine,
    lastMeaningfulEvent: race.lastMeaningfulEvent,
  }))
}
