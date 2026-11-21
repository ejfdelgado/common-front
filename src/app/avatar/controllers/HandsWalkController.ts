import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  Point2D,
  printPoint2D,
} from '@mytypes/BodyTypes';
import { AvatarFollowCamera, getAvatarFront } from '@avatar/utils/AvatarFollowCamera';

/**
 * Navigation driven by a closed hand used as a virtual joystick:
 *  - Drag Y (hand up / down from where it closed): walk forward / backward.
 *  - Drag X (hand left / right from where it closed): turn left / right.
 * With keepMoving = true the speed is proportional to how far the hand moved from the
 * drag start, so holding the hand still at an offset keeps moving at constant speed.
 * With keepMoving = false the displacement follows the hand offset, so moving further
 * requires opening the hand and repeating the gesture.
 * Camera placement and smoothing are shared with WalkController (AvatarFollowCamera).
 */
export class HandsWalkController extends SceneControllerAbstract {
  // Smoothing, avatar transform and camera placement
  followCamera = new AvatarFollowCamera({
    LOOK_AT_HEIGHT_RATIO: 0.85,
    CAMERA_HEIGTH_RATIO: 1.0,
    CAMERA_DISTANCE_TO_AVATAR: 6,
  });

  // constants (hands joystick)
  // Drag below this amount (normalized units) is ignored
  DEAD_ZONE: number = 0.03;
  // Drag beyond this amount does not increase the speed
  MAX_DELTA: number = 0.3;
  // World units per second at MAX_DELTA
  MAX_TRANSLATION_SPEED: number = 6;
  // Radians per second at MAX_DELTA
  MAX_ROTATION_SPEED: number = Math.PI / 2;
  // When true, only the axis detected by ArmsPointerController (intentionXY) is applied
  USE_INTENTION_LOCK: boolean = false;
  // Avoid big jumps after a frame stall
  MAX_FRAME_MILLIS: number = 100;
  // Direction of each axis: 1 = hand right turns right / hand up walks forward, -1 = inverted
  ROTATION_DIRECTION: number = -1;
  // Multiplier applied to every rotation produced by the gesture, in both keepMoving modes.
  // 1 = MAX_ROTATION_SPEED / MAX_ROTATION_PER_GESTURE as configured, < 1 slower, > 1 faster.
  ROTATION_SENSITIVITY: number = 0.15;
  TRANSLATION_DIRECTION: number = -1;
  // Multiplier applied to every front/back displacement produced by the gesture, in both
  // keepMoving modes. 1 = MAX_TRANSLATION_SPEED / MAX_TRANSLATION_PER_GESTURE as configured,
  // < 1 slower, > 1 faster.
  TRANSLATION_SENSITIVITY: number = 0.5;

  // variables
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;

  lastTime: number = 0;

  // true: joystick mode, holding the hand at an offset keeps moving (speed control).
  // false: direct drag mode, the displacement follows the hand offset (position control),
  //        so a still hand does not move; open the hand and repeat the gesture to go further.
  keepMoving: boolean = false;
  // Used when keepMoving is false: world units walked at MAX_DELTA in a single gesture
  MAX_TRANSLATION_PER_GESTURE: number = 6;
  // Used when keepMoving is false: radians turned at MAX_DELTA in a single gesture
  MAX_ROTATION_PER_GESTURE: number = Math.PI / 2;
  // Joystick value already applied in the current gesture (keepMoving false)
  appliedSide: 'L' | 'R' | null = null;
  appliedJoystick: Point2D = { x: 0, y: 0 };

  override async update(): Promise<ControllerUpdateResponse> {
    this.handsWalkLogic();
    const avatarTransform = this.followCamera.follow(this.scene, this.lastData.stateBody.height);
    this.lastTime = this.now;
    return {
      avatarTransform,
    };
  }

  override async stop(): Promise<void> {
    this.leftDrag = null;
    this.rightDrag = null;
    this.resetApplied();
    this.followCamera.release(this.scene.orbitals);
  }

  override async destroy(): Promise<void> {}

  getVideoRatio(): number {
    if (!this.videoSize || !this.videoSize.height) {
      return 1;
    }
    return this.videoSize.width / this.videoSize.height;
  }

  // Maps a raw drag amount applying dead zone. Reaches 1 at MAX_DELTA.
  // When saturate is true the result is clamped to [-1, 1]; otherwise it keeps growing
  // linearly beyond MAX_DELTA.
  normalizeAxis(value: number, saturate: boolean = true): number {
    const abs = Math.abs(value);
    if (abs < this.DEAD_ZONE) {
      return 0;
    }
    const limited = saturate ? Math.min(abs, this.MAX_DELTA) : abs;
    return (Math.sign(value) * (limited - this.DEAD_ZONE)) / (this.MAX_DELTA - this.DEAD_ZONE);
  }

  // Picks the active drag; when both hands are dragging, the one with the biggest displacement
  getActiveDrag(): { side: 'L' | 'R'; drag: DragDataType } | null {
    const candidates: { side: 'L' | 'R'; drag: DragDataType }[] = [];
    if (this.leftDrag?.delta) {
      candidates.push({ side: 'L', drag: this.leftDrag });
    }
    if (this.rightDrag?.delta) {
      candidates.push({ side: 'R', drag: this.rightDrag });
    }
    if (candidates.length == 0) {
      return null;
    }
    const magnitude = (d: DragDataType) =>
      Math.hypot(d.delta!.x * this.getVideoRatio(), d.delta!.y);
    return candidates.reduce((a, b) => (magnitude(b.drag) > magnitude(a.drag) ? b : a));
  }

  // Returns joystick values: y in [-1, 1] (clamped), x unbounded (rotation is not clamped).
  //  x > 0 turn right, y > 0 walk forward (hand direction set by ROTATION_DIRECTION /
  //  TRANSLATION_DIRECTION)
  getJoystick(drag: DragDataType | null): Point2D {
    if (!drag || !drag.delta) {
      return { x: 0, y: 0 };
    }
    // delta = start - current, in screen coordinates (y grows downward)
    let x =
      this.ROTATION_DIRECTION * this.normalizeAxis(-drag.delta.x * this.getVideoRatio(), false);
    let y = this.TRANSLATION_DIRECTION * this.normalizeAxis(drag.delta.y);
    if (this.USE_INTENTION_LOCK) {
      if (drag.intentionXY == 'X') {
        y = 0;
      } else if (drag.intentionXY == 'Y') {
        x = 0;
      } else {
        x = 0;
        y = 0;
      }
    }
    return { x, y };
  }

  handsWalkLogic() {
    if (this.lastTime == 0) {
      return;
    }
    const active = this.getActiveDrag();
    const joystick = this.getJoystick(active?.drag ?? null);

    if (this.keepMoving) {
      // Speed control: offset -> velocity
      if (joystick.x == 0 && joystick.y == 0) {
        return;
      }
      const dt = Math.min(this.now - this.lastTime, this.MAX_FRAME_MILLIS) / 1000;
      this.moveAvatar(
        joystick.x * this.MAX_ROTATION_SPEED * dt,
        joystick.y * this.MAX_TRANSLATION_SPEED * dt,
      );
      return;
    }

    // Position control: only the change of the offset since the last frame is applied
    if (!active) {
      this.resetApplied();
      return;
    }
    if (active.side != this.appliedSide) {
      // New gesture, or the dominant hand switched: start counting from the current offset
      // of this hand so there is no jump.
      this.appliedSide = active.side;
      this.appliedJoystick = { x: joystick.x, y: joystick.y };
      return;
    }
    const stepX = joystick.x - this.appliedJoystick.x;
    const stepY = joystick.y - this.appliedJoystick.y;
    this.appliedJoystick = { x: joystick.x, y: joystick.y };
    if (stepX == 0 && stepY == 0) {
      return;
    }
    this.moveAvatar(
      stepX * this.MAX_ROTATION_PER_GESTURE,
      stepY * this.MAX_TRANSLATION_PER_GESTURE,
    );
  }

  resetApplied() {
    this.appliedSide = null;
    this.appliedJoystick = { x: 0, y: 0 };
  }

  // turn > 0 turns right (radians), advance > 0 walks forward (world units)
  moveAvatar(turn: number, advance: number) {
    // Rotation: hand to the right turns right (negative rotationY around UP)
    this.scene.avatarState.rotationY -= turn * this.ROTATION_SENSITIVITY;

    // Translation along the avatar front: hand up walks forward
    const advanceFront = getAvatarFront(this.scene.avatarState.rotationY);
    const scaledAdvance = advance * this.TRANSLATION_SENSITIVITY;
    this.scene.avatarState.positionX += advanceFront.x * scaledAdvance;
    this.scene.avatarState.positionZ += advanceFront.z * scaledAdvance;
  }

  displayLeftDelta() {
    this.setHudValue('left', this.leftDrag?.delta ? printPoint2D(this.leftDrag.delta) : '');
  }

  displayRightDelta() {
    this.setHudValue('right', this.rightDrag?.delta ? printPoint2D(this.rightDrag.delta) : '');
  }

  override onEvent(event: AvatarBodyEvent): void {
    if (event.name == 'HAND_LEFT_SDRAG' || event.name == 'HAND_LEFT_DRAG') {
      this.leftDrag = event.data;
      this.displayLeftDelta();
    } else if (event.name == 'HAND_LEFT_EDRAG') {
      this.leftDrag = null;
      this.displayLeftDelta();
    } else if (event.name == 'HAND_RIGHT_SDRAG' || event.name == 'HAND_RIGHT_DRAG') {
      this.rightDrag = event.data;
      this.displayRightDelta();
    } else if (event.name == 'HAND_RIGHT_EDRAG') {
      this.rightDrag = null;
      this.displayRightDelta();
    }
  }
}
