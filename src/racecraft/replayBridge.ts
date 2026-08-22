export type ReplayVisualState = {
  raceId: string
  raceName: string
  progress: number
  kind: string
  status: string
}

const EVENT_NAME = 'striving-observation:replay'

export function publishReplayState(state: ReplayVisualState): void {
  window.dispatchEvent(new CustomEvent<ReplayVisualState>(EVENT_NAME, { detail: state }))
}

export function subscribeReplayState(listener: (state: ReplayVisualState) => void): () => void {
  const handler = (event: Event) => listener((event as CustomEvent<ReplayVisualState>).detail)
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
