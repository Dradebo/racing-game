import { useEffect, useState } from 'react'
import { CANONICAL_LAP_SAVED_EVENT, loadCanonicalLap, type CanonicalLapTrace } from './canonicalLap'

export function RouteDiagnostic(): JSX.Element | null {
  const enabled = new URLSearchParams(window.location.search).get('route-debug') === '1'
  const [trace, setTrace] = useState<CanonicalLapTrace | null>(() => loadCanonicalLap())

  useEffect(() => {
    if (!enabled) return
    const refresh = () => setTrace(loadCanonicalLap())
    window.addEventListener(CANONICAL_LAP_SAVED_EVENT, refresh)
    return () => window.removeEventListener(CANONICAL_LAP_SAVED_EVENT, refresh)
  }, [enabled])

  if (!enabled) return null

  return (
    <aside style={{ position: 'absolute', zIndex: 30, right: 12, top: 12, maxWidth: 260, padding: '9px 11px', borderRadius: 9, background: 'rgba(5,7,10,.82)', color: '#f4f6f8', fontSize: 11, lineHeight: 1.45, pointerEvents: 'none' }}>
      <strong style={{ display: 'block', letterSpacing: '.08em', fontSize: 9 }}>ROUTE AUTHORITY</strong>
      <b>{trace ? 'NATIVE CAPTURE' : 'FALLBACK · UNVERIFIED'}</b>
      {trace ? (
        <small style={{ display: 'block', opacity: .72 }}>
          {trace.samples.length} samples · {(trace.durationMs / 1000).toFixed(1)}s lap
          {trace.checkpointAtMs ? ` · checkpoint ${(trace.checkpointAtMs / 1000).toFixed(1)}s` : ''}
        </small>
      ) : (
        <small style={{ display: 'block', opacity: .72 }}>Capture one legal donor-game lap before judging traversal.</small>
      )}
    </aside>
  )
}
