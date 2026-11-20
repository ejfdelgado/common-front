import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  Point2D,
} from '@mytypes/BodyTypes';

// Below this hand separation (in normalized-height units) the baseline is too
// unstable to compute a meaningful zoom or angle.
const MIN_HANDS_DISTANCE = 0.05;

// Extra horizontal separation (in normalized-width units) added only for the angle
// computation. It keeps the left -> right vector pointing rightwards even when the
// hands get close or slightly cross in the real world, avoiding a sudden 180° flip.
// Side effect: the measured rotation is smaller than the real angle between the hands.
// It assumes the left cursor is drawn to the left of the right cursor.
const HORIZONTAL_GAP = 0.4;

export interface ZoomRotationData {
  // Ratio between the current hands distance and the distance when the gesture started.
  // 1 = no change, > 1 = hands apart (zoom in), < 1 = hands closer (zoom out).
  zoom: number;
  // Accumulated rotation in degrees of the line left-hand -> right-hand since the
  // gesture started. Not bounded to ±180°: it is unwrapped, so it keeps growing
  // continuously (e.g. 200°). Positive = counterclockwise as seen on screen.
  rotation: number;
}

interface HandsMeasure {
  // Real distance between the cursors (aspect-corrected), used for zoom
  distance: number;
  // Angle in radians of the left -> right vector including HORIZONTAL_GAP
  angle: number;
}

/**
 * Two-hand pinch gesture: when both hands are closed (dragging) at the same time,
 * the segment between the two cursors defines zoom (its length) and rotation (its angle).
 *
 * Emits:
 *  - HANDS_ZOOM_ROTATION_START  data: ZoomRotationData (zoom 1, rotation 0)
 *  - HANDS_ZOOM_ROTATION        data: ZoomRotationData
 *  - HANDS_ZOOM_ROTATION_END    data: last ZoomRotationData
 */
export class HandsZoomRotationController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  rotation: number | null = null;
  zoom: number | null = null;

  // Baseline captured when the second hand closes
  startDistance: number | null = null;
  startAngle: number | null = null;
  // Last raw angle, used to unwrap the angle across the ±180° boundary
  lastAngle: number | null = null;
  accumulatedAngle: number = 0;

  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {
    this.endGesture();
  }
  override async destroy(): Promise<void> {}

  displayZoomRotation() {
    if (this.zoom == null || this.rotation == null) {
      this.setHudValue('top', '');
    } else {
      this.setHudValue('top', `zoom: ${this.zoom.toFixed(2)} rot: ${this.rotation.toFixed(0)}°`);
    }
  }

  getVideoRatio(): number {
    if (!this.videoSize || !this.videoSize.height) {
      return 1;
    }
    return this.videoSize.width / this.videoSize.height;
  }

  // Vector from left cursor to right cursor in an isotropic space
  // (x scaled by aspect ratio so distances and angles are not distorted),
  // with y pointing up so positive angles are counterclockwise on screen.
  getHandsVector(left: Point2D, right: Point2D, horizontalGap?: number): Point2D {
    return {
      x: (right.x - left.x + (!!horizontalGap ? horizontalGap : 0)) * this.getVideoRatio(),
      y: -(right.y - left.y),
    };
  }

  isGestureActive(): boolean {
    return this.startDistance != null;
  }

  // Returns distance and angle between both cursors, or null when a hand is
  // missing or the hands are too close to give a stable measure.
  measureHands(): HandsMeasure | null {
    if (!this.leftDrag || !this.rightDrag) {
      return null;
    }
    const left = this.leftDrag.current;
    const right = this.rightDrag.current;
    const v = this.getHandsVector(left, right);
    const distance = Math.hypot(v.x, v.y);
    if (distance < MIN_HANDS_DISTANCE) {
      return null;
    }
    const vAngle = this.getHandsVector(left, right, HORIZONTAL_GAP);
    return {
      distance,
      angle: Math.atan2(vAngle.y, vAngle.x),
    };
  }

  startGesture() {
    const measure = this.measureHands();
    if (!measure) {
      return;
    }
    this.startDistance = measure.distance;
    this.startAngle = measure.angle;
    this.lastAngle = this.startAngle;
    this.accumulatedAngle = 0;
    this.zoom = 1;
    this.rotation = 0;
    this.events.emit({
      name: 'HANDS_ZOOM_ROTATION_START',
      data: this.getData(),
    });
  }

  updateGesture() {
    if (this.startDistance == null || this.lastAngle == null) {
      return;
    }
    const measure = this.measureHands();
    if (!measure) {
      // Hands overlapping: angle is meaningless, keep last values
      return;
    }
    const { distance, angle } = measure;
    // Unwrap: add the shortest signed step so crossing ±180° does not jump 360°
    let step = angle - this.lastAngle;
    if (step > Math.PI) step -= 2 * Math.PI;
    if (step < -Math.PI) step += 2 * Math.PI;
    this.accumulatedAngle += step;
    this.lastAngle = angle;

    this.zoom = distance / this.startDistance;
    this.rotation = (this.accumulatedAngle * 180) / Math.PI;
    this.events.emit({
      name: 'HANDS_ZOOM_ROTATION',
      data: this.getData(),
    });
  }

  endGesture() {
    if (!this.isGestureActive()) {
      return;
    }
    const last = this.getData();
    this.startDistance = null;
    this.startAngle = null;
    this.lastAngle = null;
    this.accumulatedAngle = 0;
    this.zoom = null;
    this.rotation = null;
    this.events.emit({
      name: 'HANDS_ZOOM_ROTATION_END',
      data: last,
    });
  }

  getData(): ZoomRotationData {
    return {
      zoom: this.zoom ?? 1,
      rotation: this.rotation ?? 0,
    };
  }

  // Called after any drag change of either hand
  evaluate() {
    const bothDragging = !!this.leftDrag && !!this.rightDrag;
    if (bothDragging) {
      if (this.isGestureActive()) {
        this.updateGesture();
      } else {
        this.startGesture();
      }
    } else {
      this.endGesture();
    }
    this.displayZoomRotation();
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'HAND_LEFT_SDRAG' || event.name == 'HAND_LEFT_DRAG') {
      this.leftDrag = event.data;
    } else if (event.name == 'HAND_LEFT_EDRAG') {
      this.leftDrag = null;
    } else if (event.name == 'HAND_RIGHT_SDRAG' || event.name == 'HAND_RIGHT_DRAG') {
      this.rightDrag = event.data;
    } else if (event.name == 'HAND_RIGHT_EDRAG') {
      this.rightDrag = null;
    } else {
      return;
    }
    this.evaluate();
  }
}
