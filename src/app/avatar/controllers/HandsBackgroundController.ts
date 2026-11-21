import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  Point2D,
} from '@mytypes/BodyTypes';
import { ZoomRotationData } from './HandsZoomRotationController';

// Sensitivity tuning. 1 = background follows the hands 1:1.
// > 1 amplifies the gesture, < 1 dampens it.
// Pan: multiplier of the cursor displacement (screen pixels).
const PAN_SENSITIVITY = 1;
// Rotation: multiplier of the angle between the hands (degrees).
const ROTATION_SENSITIVITY = 1;
// Scale: exponent applied to the zoom ratio (zoom ^ SCALE_SENSITIVITY),
// so it stays symmetric for zoom in/out and never becomes negative.
const SCALE_SENSITIVITY = 0.6;

type HandSide = 'L' | 'R';

// Reference captured when a single-hand pan starts (or re-starts)
interface PanAnchor {
  hand: HandSide;
  point: Point2D;
  baseDx: number;
  baseDy: number;
}

// Reference captured when the two-hand zoom/rotation gesture starts
interface ZoomAnchor {
  baseScale: number;
  baseRotateDeg: number;
}

/**
 * Moves, scales and rotates the background image with the hands:
 *  - One closed hand dragging: pan (bgDx, bgDy in pixels).
 *  - Both closed hands (HANDS_ZOOM_ROTATION_*): zoom (bgScale) and rotation (bgRotateDeg).
 *
 * Values are accumulated: each gesture starts from the values left by the previous one.
 * When switching between one and two hands, the pan is re-anchored at the current
 * cursor position, so the background never jumps.
 */
export class HandsBackgroundController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  logDragValues: boolean = false;
  zoomRotation: ZoomRotationData | null = null;

  bgDx: number = 0;
  bgDy: number = 0;
  bgScale: number = 1;
  bgRotateDeg: number = 0;

  panAnchor: PanAnchor | null = null;
  zoomAnchor: ZoomAnchor | null = null;

  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {
    this.leftDrag = null;
    this.rightDrag = null;
    this.zoomRotation = null;
    this.panAnchor = null;
    this.zoomAnchor = null;
  }
  override async destroy(): Promise<void> {}

  reset() {
    this.bgDx = 0;
    this.bgDy = 0;
    this.bgScale = 1;
    this.bgRotateDeg = 0;
    this.panAnchor = null;
    this.zoomAnchor = null;
    this.updateTranslationRotationScale();
  }

  updateTranslationRotationScale() {
    this.setHudValue('bgDx', this.bgDx);
    this.setHudValue('bgDy', this.bgDy);
    this.setHudValue('bgScale', this.bgScale);
    this.setHudValue('bgRotateDeg', this.bgRotateDeg);
    if (this.logDragValues) {
      console.log(
        `bg dx: ${this.bgDx.toFixed(0)} dy: ${this.bgDy.toFixed(0)} ` +
          `scale: ${this.bgScale.toFixed(3)} rot: ${this.bgRotateDeg.toFixed(0)}°`,
      );
    }
  }

  // The background covers the full screen, so normalized cursor units map to window pixels
  getScreenSize(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
  }

  isZooming(): boolean {
    return this.zoomAnchor != null;
  }

  // Returns the only hand that is dragging, or null when none or both are
  getSingleDraggingHand(): { hand: HandSide; drag: DragDataType } | null {
    if (this.leftDrag && !this.rightDrag) {
      return { hand: 'L', drag: this.leftDrag };
    }
    if (this.rightDrag && !this.leftDrag) {
      return { hand: 'R', drag: this.rightDrag };
    }
    return null;
  }

  // Single-hand pan, evaluated after any drag change
  evaluatePan(): boolean {
    const single = this.isZooming() ? null : this.getSingleDraggingHand();
    if (!single) {
      // No hand, both hands, or zoom gesture in progress: re-anchor on next single drag
      this.panAnchor = null;
      return false;
    }
    const current = single.drag.current;
    if (!this.panAnchor || this.panAnchor.hand != single.hand) {
      this.panAnchor = {
        hand: single.hand,
        point: { x: current.x, y: current.y },
        baseDx: this.bgDx,
        baseDy: this.bgDy,
      };
      return false;
    }
    const { width, height } = this.getScreenSize();
    this.bgDx = this.panAnchor.baseDx + (current.x - this.panAnchor.point.x) * width * PAN_SENSITIVITY;
    this.bgDy = this.panAnchor.baseDy + (current.y - this.panAnchor.point.y) * height * PAN_SENSITIVITY;
    return true;
  }

  startZoom(data: ZoomRotationData) {
    this.panAnchor = null;
    this.zoomAnchor = {
      baseScale: this.bgScale,
      baseRotateDeg: this.bgRotateDeg,
    };
    this.applyZoom(data);
  }

  applyZoom(data: ZoomRotationData | null) {
    if (!this.zoomAnchor || !data) {
      return;
    }
    this.zoomRotation = data;
    this.bgScale = this.zoomAnchor.baseScale * Math.pow(data.zoom, SCALE_SENSITIVITY);
    // ZoomRotationData.rotation is counterclockwise-positive; CSS rotate() is clockwise-positive
    this.bgRotateDeg = this.zoomAnchor.baseRotateDeg - data.rotation * ROTATION_SENSITIVITY;
  }

  endZoom(data: ZoomRotationData | null) {
    this.applyZoom(data);
    this.zoomAnchor = null;
    this.zoomRotation = null;
    // If one hand remains closed, the next drag event re-anchors the pan
    this.panAnchor = null;
  }

  override onEvent(event: AvatarBodyEvent): void {
    let changed = false;
    switch (event.name) {
      case 'HAND_LEFT_SDRAG':
      case 'HAND_LEFT_DRAG':
        this.leftDrag = event.data;
        changed = this.evaluatePan();
        break;
      case 'HAND_LEFT_EDRAG':
        this.leftDrag = null;
        changed = this.evaluatePan();
        break;
      case 'HAND_RIGHT_SDRAG':
      case 'HAND_RIGHT_DRAG':
        this.rightDrag = event.data;
        changed = this.evaluatePan();
        break;
      case 'HAND_RIGHT_EDRAG':
        this.rightDrag = null;
        changed = this.evaluatePan();
        break;
      case 'HANDS_ZOOM_ROTATION_START':
        this.startZoom(event.data);
        changed = true;
        break;
      case 'HANDS_ZOOM_ROTATION':
        // Ignored if START was missed (e.g. controller enabled mid-gesture),
        // since data is relative to a baseline we never captured
        if (!this.isZooming()) {
          return;
        }
        this.applyZoom(event.data);
        changed = true;
        break;
      case 'HANDS_ZOOM_ROTATION_END':
        this.endZoom(event.data);
        changed = true;
        break;
      default:
        return;
    }
    if (changed) {
      this.updateTranslationRotationScale();
    }
  }
}
