export type ReplayVisualState = {
  raceId: string
  raceName: string
  progress: number
  kind: string
  status: string
  eventLabel?: string
  eventDetail?: string
  eventIndex?: number
  eventTotal?: number
  playing?: boolean
}

const EVENT_NAME = 'striving-observation:replay'
export const WATCH_REPLAY_EVENT = 'striving-observation:watch-replay'
export const REPLAY_MODE_EVENT = 'striving-observation:replay-mode'

export function publishReplayState(state: ReplayVisualState): void {
  window.dispatchEvent(new CustomEvent<ReplayVisualState>(EVENT_NAME, { detail: state }))
}

export function subscribeReplayState(listener: (state: ReplayVisualState) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ReplayVisualState>).detail)
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}

export function requestWatchReplay(raceId: string): void {
  window.dispatchEvent(new CustomEvent(WATCH_REPLAY_EVENT, { detail: { raceId } }))
}

export function publishReplayMode(active: boolean): void {
  window.dispatchEvent(new CustomEvent<boolean>(REPLAY_MODE_EVENT, { detail: active }))
}
