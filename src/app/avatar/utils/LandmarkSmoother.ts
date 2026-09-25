import { Landmark, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface OneEuroConfigType {
  minCutoff: number; // Hz, lower = smoother when still
  beta: number; // speed coefficient, higher = less lag when moving
  dCutoff: number; // Hz, cutoff for the derivative
}

const DEFAULT_CONFIG: OneEuroConfigType = {
  minCutoff: 1.0,
  beta: 1,
  dCutoff: 1.0,
};

// Normalized distance the body centroid may move between frames before
// we assume it is a different person and restart the filters
const IDENTITY_JUMP_THRESHOLD = 0.2;

function smoothingFactor(dt: number, cutoff: number): number {
  const r = 2 * Math.PI * cutoff * dt;
  return r / (r + 1);
}

// One Euro filter: https://gery.casiez.net/1euro/
export class OneEuroFilter {
  private x: number | null = null;
  private dx: number = 0;

  constructor(private config: OneEuroConfigType) {}

  filter(value: number, dt: number): number {
    if (this.x === null || dt <= 0) {
      this.x = value;
      this.dx = 0;
      return value;
    }
    const aD = smoothingFactor(dt, this.config.dCutoff);
    this.dx = aD * ((value - this.x) / dt) + (1 - aD) * this.dx;
    const cutoff = this.config.minCutoff + this.config.beta * Math.abs(this.dx);
    const a = smoothingFactor(dt, cutoff);
    this.x = a * value + (1 - a) * this.x;
    return this.x;
  }
}

class LandmarkListFilter {
  private filters: OneEuroFilter[][] = [];

  constructor(private config: OneEuroConfigType) {}

  apply<T extends Landmark | NormalizedLandmark>(landmarks: T[], dt: number): T[] {
    return landmarks.map((landmark, i) => {
      if (!this.filters[i]) {
        this.filters[i] = [
          new OneEuroFilter(this.config),
          new OneEuroFilter(this.config),
          new OneEuroFilter(this.config),
        ];
      }
      const [fx, fy, fz] = this.filters[i];
      return {
        ...landmark,
        x: fx.filter(landmark.x, dt),
        y: fy.filter(landmark.y, dt),
        z: fz.filter(landmark.z, dt),
      };
    });
  }
}

export class PoseLandmarkSmoother {
  private landmarksFilter!: LandmarkListFilter;
  private worldLandmarksFilter!: LandmarkListFilter;
  private lastTimestamp: number | null = null;
  private lastCentroid: { x: number; y: number } | null = null;

  constructor(private config: OneEuroConfigType = DEFAULT_CONFIG) {
    this.reset();
  }

  reset() {
    this.landmarksFilter = new LandmarkListFilter(this.config);
    this.worldLandmarksFilter = new LandmarkListFilter(this.config);
    this.lastTimestamp = null;
    this.lastCentroid = null;
  }

  // timestamp in milliseconds
  apply(
    landmarks: NormalizedLandmark[] | undefined,
    worldLandmarks: Landmark[] | undefined,
    timestamp: number,
  ): { landmarks: NormalizedLandmark[] | undefined; worldLandmarks: Landmark[] | undefined } {
    if (!landmarks || !worldLandmarks || landmarks.length == 1) {
      this.reset();
      return { landmarks, worldLandmarks };
    }
    const centroid = this.computeCentroid(landmarks);
    if (
      this.lastCentroid &&
      Math.hypot(centroid.x - this.lastCentroid.x, centroid.y - this.lastCentroid.y) >
        IDENTITY_JUMP_THRESHOLD
    ) {
      this.reset();
    }
    const dt = this.lastTimestamp === null ? 0 : (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.lastCentroid = centroid;
    return {
      landmarks: this.landmarksFilter.apply(landmarks, dt),
      worldLandmarks: this.worldLandmarksFilter.apply(worldLandmarks, dt),
    };
  }

  private computeCentroid(landmarks: NormalizedLandmark[]): { x: number; y: number } {
    let x = 0;
    let y = 0;
    for (const landmark of landmarks) {
      x += landmark.x;
      y += landmark.y;
    }
    return { x: x / landmarks.length, y: y / landmarks.length };
  }
}
