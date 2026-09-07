export type DonorQualificationSample = {
  elapsed: number
  progress: number
  roadError: number
  headingError: number
  speed: number
  targetSpeed: number
  turn: 'left' | 'right' | 'straight'
}

export type DonorQualificationResult = {
  verdict: 'RUNNING' | 'PASS' | 'FAIL'
  score: number
  roadBoundPercent: number
  meanRoadError: number
  maxRoadError: number
  meanHeadingError: number
  maxHeadingError: number
  speedRmse: number
  progress: number
  firstDivergence?: DonorQualificationSample
}

export const DONOR_ROAD_CORRIDOR_METRES = 5
export const DONOR_DIVERGENCE_METRES = 7
export const DONOR_DIVERGENCE_HEADING_RADIANS = 0.65

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function rmse(values: number[]): number {
  if (!values.length) return 0
  return Math.sqrt(values.reduce((sum, value) => sum + value * value, 0) / values.length)
}

export function isMeaningfulDivergence(sample: DonorQualificationSample): boolean {
  return sample.roadError >= DONOR_DIVERGENCE_METRES || Math.abs(sample.headingError) >= DONOR_DIVERGENCE_HEADING_RADIANS
}

export function evaluateDonorQualification(samples: DonorQualificationSample[], minimumElapsed = 12): DonorQualificationResult {
  const latest = samples[samples.length - 1]
  if (!latest) {
    return {
      verdict: 'RUNNING',
      score: 0,
      roadBoundPercent: 0,
      meanRoadError: 0,
      maxRoadError: 0,
      meanHeadingError: 0,
      maxHeadingError: 0,
      speedRmse: 0,
      progress: 0,
    }
  }

  const roadErrors = samples.map((sample) => sample.roadError)
  const headingErrors = samples.map((sample) => Math.abs(sample.headingError))
  const speedErrors = samples.map((sample) => sample.speed - sample.targetSpeed)
  const roadBoundPercent = samples.filter((sample) => sample.roadError <= DONOR_ROAD_CORRIDOR_METRES).length / samples.length
  const meanRoadError = mean(roadErrors)
  const maxRoadError = Math.max(...roadErrors)
  const meanHeadingError = mean(headingErrors)
  const maxHeadingError = Math.max(...headingErrors)
  const speedRmse = rmse(speedErrors)
  const firstDivergence = samples.find(isMeaningfulDivergence)

  // Weight route adherence most heavily. Speed matters, but staying on the donor-authored road is the primary competence test.
  const adherenceScore = Math.max(0, Math.min(1, roadBoundPercent))
  const headingScore = Math.max(0, 1 - meanHeadingError / 0.6)
  const speedScore = Math.max(0, 1 - speedRmse / 15)
  const progressScore = Math.max(0, Math.min(1, latest.progress))
  const score = Math.round((adherenceScore * 0.45 + headingScore * 0.25 + speedScore * 0.1 + progressScore * 0.2) * 100)

  let verdict: DonorQualificationResult['verdict'] = 'RUNNING'
  if (latest.elapsed >= minimumElapsed) {
    verdict = roadBoundPercent >= 0.88 && meanRoadError <= 3 && meanHeadingError <= 0.35 && latest.progress >= 0.04 ? 'PASS' : 'FAIL'
  }

  return {
    verdict,
    score,
    roadBoundPercent,
    meanRoadError,
    maxRoadError,
    meanHeadingError,
    maxHeadingError,
    speedRmse,
    progress: latest.progress,
    firstDivergence,
  }
}
