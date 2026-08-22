import { CatmullRomCurve3, Vector3 } from 'three'

export const raceRoute = new CatmullRomCurve3([
  new Vector3(-108, 2.2, 215),
  new Vector3(-45, 4, 120),
  new Vector3(-18, 3, 15),
  new Vector3(-60, 3.5, -90),
  new Vector3(-103, 2.5, -182),
])

export function routePoint(progress: number): Vector3 {
  const t = Math.min(Math.max(progress / 100, 0), 1)
  return raceRoute.getPointAt(t)
}
