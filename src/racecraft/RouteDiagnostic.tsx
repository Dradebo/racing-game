import { useEffect, useState } from 'react'
import { CANONICAL_LAP_SAVED_EVENT, loadCanonicalLap, type CanonicalLapTrace } from './canonicalLap'

function enterCaptureMode() {
  const url = new URL(window.location.href)
  url.searchParams.delete('route-debug')
  url.searchParams.set('capture-lap', '1')
  window.location.assign(url.toString())
}

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
    <aside style={{ position: 'absolute', zIndex: 30, right: 12, top: 12, maxWidth: 300, padding: '12px 14px', borderRadius: 14, background: 'rgba(5,7,10,.86)', color: '#f4f6f8', fontSize: 13, lineHeight: 1.45 }}>
      <strong style={{ display: 'block', letterSpacing: '.08em', fontSize: 11 }}>ROUTE AUTHORITY</strong>
      <b style={{ display: 'block', fontSize: 16 }}>{trace ? 'NATIVE CAPTURE' : 'FALLBACK · UNVERIFIED'}</b>
      {trace ? (
        <small style={{ display: 'block', opacity: .72, marginTop: 4 }}>
          {trace.samples.length} samples · {(trace.durationMs / 1000).toFixed(1)}s lap
          {trace.checkpointAtMs ? ` · checkpoint ${(trace.checkpointAtMs / 1000).toFixed(1)}s` : ''}
        </small>
      ) : (
        <>
          <small style={{ display: 'block', opacity: .72, marginTop: 4 }}>Racecraft is still guessing the route. Capture one legal donor-game lap before judging traversal.</small>
          <button
            type="button"
            onClick={enterCaptureMode}
            style={{ marginTop: 10, width: '100%', minHeight: 42, border: '1px solid rgba(255,255,255,.3)', borderRadius: 10, background: '#f4f6f8', color: '#101317', fontWeight: 800, letterSpacing: '.06em', fontSize: 11 }}
          >
            CALIBRATE TRACK
          </button>
        </>
      )}
    </aside>
  )
}
