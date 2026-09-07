import type { Race, StrivingSnapshot } from './types'

const replacements: Array<[RegExp, string]> = [
  [/Access pathfinding/gi, 'Lead source mapping'],
  [/portfolio-ready/gi, 'verified'],
  [/proof substrate/gi, 'verified evidence'],
  [/engagement mining/gi, 'response opportunities'],
  [/sales and engagement/gi, 'commercial work'],
  [/Creator-comment access paths added/gi, 'Lead-source routes added'],
]

function clean(text?: string): string | undefined {
  if (!text) return text
  return replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text)
}

function cleanRace(race: Race): Race {
  return {
    ...race,
    name: clean(race.name) ?? race.name,
    finishLine: clean(race.finishLine) ?? race.finishLine,
    nextLegalLap: clean(race.nextLegalLap),
    circuit: {
      ...race.circuit,
      name: clean(race.circuit.name) ?? race.circuit.name,
      lapDefinition: clean(race.circuit.lapDefinition) ?? race.circuit.lapDefinition,
      closureEvidence: clean(race.circuit.closureEvidence) ?? race.circuit.closureEvidence,
      laps: race.circuit.laps.map((lap) => ({
        ...lap,
        name: clean(lap.name) ?? lap.name,
        finishCondition: clean(lap.finishCondition) ?? lap.finishCondition,
      })),
    },
    history: race.history?.map((event) => ({
      ...event,
      label: clean(event.label) ?? event.label,
      detail: clean(event.detail),
    })),
  }
}

export function enforceDisplayBoundary(snapshot: StrivingSnapshot): StrivingSnapshot {
  return {
    ...snapshot,
    seasons: snapshot.seasons.map((season) => ({
      ...season,
      name: clean(season.name) ?? season.name,
      theme: clean(season.theme) ?? season.theme,
    })),
    races: snapshot.races.map(cleanRace),
  }
}
