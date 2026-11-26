/**
 * Time-aware score for a 0..100 "match" signal sampled at an irregular rate
 * (one sample per rendered frame, so 20-60 Hz depending on the device).
 *
 * Points are awarded per second of play, not per sample, so a faster device
 * doesn't score more. The rate comes from the time-weighted average match of
 * the last `windowMs`, which smooths per-frame noise and rewards holding the
 * pose rather than crossing it for one frame. Sustained good matching builds
 * a combo multiplier, which drops back as soon as the match falls.
 */
export interface TimedScoreOptions {
  // Length of the sliding window used to smooth the match signal.
  windowMs: number;
  // Average match (0..100) below which no points are awarded.
  minMatch: number;
  // Points per second at a perfect (100) average match, before the combo.
  maxPointsPerSecond: number;
  // Curve exponent: >1 makes high matches worth disproportionately more.
  exponent: number;
  // Average match (0..100) needed to build the combo.
  comboMatch: number;
  // Seconds of sustained combo needed to reach maxCombo.
  comboRampSeconds: number;
  maxCombo: number;
  // Longest gap between two samples that still counts as play time. Longer
  // gaps (a frame hitch, the tab in the background) only count up to this.
  maxGapMs: number;
}

export const DEFAULT_TIMED_SCORE_OPTIONS: TimedScoreOptions = {
  windowMs: 2000,
  minMatch: 50,
  maxPointsPerSecond: 100,
  exponent: 2,
  comboMatch: 80,
  comboRampSeconds: 5,
  maxCombo: 2,
  maxGapMs: 250,
};

interface Sample {
  t: number;
  match: number;
}

export class TimedScore {
  readonly options: TimedScoreOptions;
  private samples: Sample[] = [];
  private lastT: number | null = null;
  private comboSeconds = 0;
  private points = 0;

  constructor(options: Partial<TimedScoreOptions> = {}) {
    this.options = { ...DEFAULT_TIMED_SCORE_OPTIONS, ...options };
  }

  /** Accumulated points (fractional; round for display). */
  get score(): number {
    return this.points;
  }

  /** Current combo multiplier, 1..maxCombo. */
  get combo(): number {
    const { comboRampSeconds, maxCombo } = this.options;
    const progress = Math.min(1, this.comboSeconds / comboRampSeconds);
    return 1 + (maxCombo - 1) * progress;
  }

  /** Time-weighted average match over the window, or null with no samples. */
  get windowAverage(): number | null {
    const n = this.samples.length;
    if (n == 0) {
      return null;
    }
    if (n == 1) {
      return this.samples[0].match;
    }
    // Each sample holds until the next one (sample-and-hold), counted only
    // from the window start.
    const start = this.samples[n - 1].t - this.options.windowMs;
    let weighted = 0;
    let duration = 0;
    for (let i = 0; i < n - 1; i++) {
      const dt = this.samples[i + 1].t - Math.max(this.samples[i].t, start);
      if (dt <= 0) {
        continue;
      }
      weighted += this.samples[i].match * dt;
      duration += dt;
    }
    return duration > 0 ? weighted / duration : this.samples[n - 1].match;
  }

  /** Clears everything: use when a new game starts. */
  reset() {
    this.samples = [];
    this.lastT = null;
    this.comboSeconds = 0;
    this.points = 0;
  }

  /**
   * Breaks the time line without losing the score: use on pause, so the
   * paused time is neither scored nor averaged into the window on resume.
   */
  pause() {
    this.samples = [];
    this.lastT = null;
  }

  /**
   * Adds a match sample (0..100) taken at time `t` (ms, monotonic, e.g.
   * performance.now()). Returns the points awarded for the elapsed time.
   */
  addSample(match: number, t: number): number {
    const value = Math.max(0, Math.min(100, Number.isFinite(match) ? match : 0));
    const { windowMs, maxGapMs } = this.options;

    const dtMs = this.lastT == null ? 0 : Math.min(Math.max(0, t - this.lastT), maxGapMs);
    this.lastT = t;

    this.samples.push({ t, match: value });
    // Keep one sample at or before the window start so it stays covered.
    while (this.samples.length > 2 && this.samples[1].t <= t - windowMs) {
      this.samples.shift();
    }

    if (dtMs == 0) {
      return 0;
    }
    const dtSeconds = dtMs / 1000;
    const average = this.windowAverage ?? 0;

    if (average >= this.options.comboMatch) {
      this.comboSeconds += dtSeconds;
    } else {
      this.comboSeconds = 0;
    }

    const delta = this.rate(average) * this.combo * dtSeconds;
    this.points += delta;
    return delta;
  }

  /** Points per second for a given average match, before the combo. */
  rate(average: number): number {
    const { minMatch, maxPointsPerSecond, exponent } = this.options;
    if (average <= minMatch) {
      return 0;
    }
    const quality = (average - minMatch) / (100 - minMatch);
    return maxPointsPerSecond * Math.pow(quality, exponent);
  }
}
