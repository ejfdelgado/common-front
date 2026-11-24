import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  Point2D,
} from '@mytypes/BodyTypes';
import { ZoomRotationData } from './HandsZoomRotationController';

// Sensitivity tuning. 1 = map follows the hands 1:1.
// Pan: multiplier of the cursor displacement (screen pixels).
const PAN_SENSITIVITY = 1;
// Zoom: Google zoom levels per doubling of the hands distance.
// (zoom level +1 = map 2x bigger, so 1 means "pinch apart 2x => map 2x")
const ZOOM_SENSITIVITY = 1;
// Rotation: multiplier of the angle between the hands (degrees).
const ROTATION_SENSITIVITY = 1;

type HandSide = 'L' | 'R';

/**
 * Commands emitted with the MAP_GESTURE event. They are applied to the
 * google.maps.Map by the page that owns it (BodyTracker.applyMapGesture).
 *
 *  - pan: incremental displacement in screen pixels since the previous pan command.
 *         Positive dx = content moves right (grab semantics).
 *  - zoom_rotation_start: capture the current zoom / heading as baseline.
 *  - zoom_rotation: zoomDelta (zoom levels) and headingDelta (degrees, clockwise
 *         as the Maps API heading) relative to the baseline.
 *  - zoom_rotation_end: release the baseline.
 */
export type MapGestureData =
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoom_rotation_start' }
  | { type: 'zoom_rotation'; zoomDelta: number; headingDelta: number }
  | { type: 'zoom_rotation_end' };

/**
 * Drives a Google Map with the hands:
 *  - One closed hand dragging: pan.
 *  - Both closed hands (HANDS_ZOOM_ROTATION_*): zoom and rotation (heading).
 *
 * Mirrors HandsBackgroundController, but since a map is controlled imperatively
 * (panBy / setZoom / setHeading) it emits MAP_GESTURE commands instead of HUD values.
 * While zooming the pan is suspended; when going back to one hand the pan is
 * re-anchored at the current cursor so the map never jumps.
 */
export class HandsGoogleMapController extends SceneControllerAbstract {
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;
  logDragValues: boolean = false;

  // Last cursor used for the incremental pan, null = re-anchor on next drag
  panLast: { hand: HandSide; point: Point2D } | null = null;
  zooming: boolean = false;

  override async update(): Promise<ControllerUpdateResponse> {
    return {};
  }
  override async stop(): Promise<void> {
    if (this.zooming) {
      this.emitMap({ type: 'zoom_rotation_end' });
    }
    this.leftDrag = null;
    this.rightDrag = null;
    this.panLast = null;
    this.zooming = false;
  }
  override async destroy(): Promise<void> {}

  emitMap(data: MapGestureData) {
    if (this.logDragValues) {
      console.log('MAP_GESTURE', JSON.stringify(data));
    }
    this.events.emit({ name: 'MAP_GESTURE', data });
  }

  // The map covers the full screen, so normalized cursor units map to window pixels
  getScreenSize(): { width: number; height: number } {
    return { width: window.innerWidth, height: window.innerHeight };
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
  evaluatePan() {
    const single = this.zooming ? null : this.getSingleDraggingHand();
    if (!single) {
      this.panLast = null;
      return;
    }
    const current = single.drag.current;
    if (!this.panLast || this.panLast.hand != single.hand) {
      this.panLast = { hand: single.hand, point: { x: current.x, y: current.y } };
      return;
    }
    const { width, height } = this.getScreenSize();
    const dx = (current.x - this.panLast.point.x) * width * PAN_SENSITIVITY;
    const dy = (current.y - this.panLast.point.y) * height * PAN_SENSITIVITY;
    this.panLast.point = { x: current.x, y: current.y };
    if (dx != 0 || dy != 0) {
      this.emitMap({ type: 'pan', dx, dy });
    }
  }

  emitZoomRotation(data: ZoomRotationData | null) {
    if (!data || !(data.zoom > 0)) {
      return;
    }
    this.emitMap({
      type: 'zoom_rotation',
      zoomDelta: Math.log2(data.zoom) * ZOOM_SENSITIVITY,
      // ZoomRotationData.rotation is counterclockwise-positive. Rotating the hands
      // counterclockwise should rotate the content counterclockwise, which in the
      // Maps API means increasing the heading.
      headingDelta: data.rotation * ROTATION_SENSITIVITY,
    });
  }

  override onEvent(event: AvatarBodyEvent): void {
    switch (event.name) {
      case 'HAND_LEFT_SDRAG':
      case 'HAND_LEFT_DRAG':
        this.leftDrag = event.data;
        this.evaluatePan();
        break;
      case 'HAND_LEFT_EDRAG':
        this.leftDrag = null;
        this.evaluatePan();
        break;
      case 'HAND_RIGHT_SDRAG':
      case 'HAND_RIGHT_DRAG':
        this.rightDrag = event.data;
        this.evaluatePan();
        break;
      case 'HAND_RIGHT_EDRAG':
        this.rightDrag = null;
        this.evaluatePan();
        break;
      case 'HANDS_ZOOM_ROTATION_START':
        this.zooming = true;
        this.panLast = null;
        this.emitMap({ type: 'zoom_rotation_start' });
        this.emitZoomRotation(event.data);
        break;
      case 'HANDS_ZOOM_ROTATION':
        // Ignored if START was missed (data is relative to an unknown baseline)
        if (this.zooming) {
          this.emitZoomRotation(event.data);
        }
        break;
      case 'HANDS_ZOOM_ROTATION_END':
        if (this.zooming) {
          this.emitZoomRotation(event.data);
          this.emitMap({ type: 'zoom_rotation_end' });
        }
        this.zooming = false;
        // If one hand remains closed, the next drag event re-anchors the pan
        this.panLast = null;
        break;
    }
  }
}
