import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import {
  AvatarBodyEvent,
  ControllerUpdateResponse,
  DragDataType,
  Point2D,
  printPoint2D,
} from '@mytypes/BodyTypes';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as THREE from 'three';
import { makeSmootValue, makeSmootVector } from '@avatar/utils/AvatarUtilities';

const FRONT_REFERENCE = new THREE.Vector3(0, 0, -1);
const UP_REFERENCE = new THREE.Vector3(0, 1, 0);

/**
 * Navigation driven by a closed hand used as a virtual joystick:
 *  - Drag Y (hand up / down from where it closed): walk forward / backward.
 *  - Drag X (hand left / right from where it closed): turn left / right.
 * The speed is proportional to how far the hand moved from the drag start,
 * so holding the hand still at an offset keeps moving at constant speed.
 * Camera placement and smoothing are the same as in WalkController.
 */
export class HandsWalkController extends SceneControllerAbstract {
  // constants (camera / smoothing, same as WalkController)
  PRESITION_TRANSLATION: number = 0.0000001;
  MAX_INACTIVITY_MILLIS: number = 3000;
  SMOOT_RATIO: number = 0.006 * 1.2;
  SMOOT_RATIO_TRANSLATION: number = 0.006 * 1.2;
  CAMERA_HEIGTH_RATIO: number = 4;
  CAMERA_DISTANCE_TO_AVATAR: number = 14;

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

  // variables
  leftDrag: DragDataType | null = null;
  rightDrag: DragDataType | null = null;

  destinationCameraLocation = new THREE.Vector3(0, 0, 0);
  lastCameraSmoot: number = 0;
  lookAtLastT: number = 0;
  destinationLookAt = new THREE.Vector3(0, 0, 0);
  lookAtActual = new THREE.Vector3(0, 0, 0);

  translationX1Last: number = 0;
  translationZ1Last: number = 0;

  transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
  lastTime: number = 0;

  override async update(): Promise<ControllerUpdateResponse> {
    const { camera, orbitals } = this.scene;
    this.handsWalkLogic();
    if (camera && orbitals) {
      orbitals.enabled = false;
      this.computeTransformationMatrix();
      // Affect the scene camera
      this.placeCamera(camera, orbitals);
    }
    this.lastTime = this.now;
    return {
      avatarTransform: this.transformationMatrix,
    };
  }

  override async stop(): Promise<void> {
    this.leftDrag = null;
    this.rightDrag = null;
    const { orbitals } = this.scene;
    if (orbitals) {
      orbitals.enabled = true;
      orbitals.update();
    }
  }

  override async destroy(): Promise<void> {}

  getVideoRatio(): number {
    if (!this.videoSize || !this.videoSize.height) {
      return 1;
    }
    return this.videoSize.width / this.videoSize.height;
  }

  // Maps a raw drag amount to [-1, 1] applying dead zone and saturation
  normalizeAxis(value: number): number {
    const abs = Math.abs(value);
    if (abs < this.DEAD_ZONE) {
      return 0;
    }
    const clamped = Math.min(abs, this.MAX_DELTA);
    return (Math.sign(value) * (clamped - this.DEAD_ZONE)) / (this.MAX_DELTA - this.DEAD_ZONE);
  }

  // Picks the active drag; when both hands are dragging, the one with the biggest displacement
  getActiveDrag(): DragDataType | null {
    const candidates = [this.leftDrag, this.rightDrag].filter(
      (d): d is DragDataType => !!d && !!d.delta,
    );
    if (candidates.length == 0) {
      return null;
    }
    const magnitude = (d: DragDataType) =>
      Math.hypot(d.delta!.x * this.getVideoRatio(), d.delta!.y);
    return candidates.reduce((a, b) => (magnitude(b) > magnitude(a) ? b : a));
  }

  // Returns joystick values in [-1, 1]:
  //  x > 0 hand moved right, y > 0 hand moved up
  getJoystick(): Point2D {
    const drag = this.getActiveDrag();
    if (!drag || !drag.delta) {
      return { x: 0, y: 0 };
    }
    // delta = start - current, in screen coordinates (y grows downward)
    let x = this.normalizeAxis(-drag.delta.x * this.getVideoRatio());
    let y = this.normalizeAxis(drag.delta.y);
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
    const joystick = this.getJoystick();
    if (joystick.x == 0 && joystick.y == 0) {
      return;
    }
    const dt = Math.min(this.now - this.lastTime, this.MAX_FRAME_MILLIS) / 1000;

    // Rotation: hand to the right turns right (negative rotationY around UP)
    this.scene.avatarState.rotationY -= joystick.x * this.MAX_ROTATION_SPEED * dt;

    // Translation along the avatar front: hand up walks forward
    const advanceFront = FRONT_REFERENCE.clone()
      .applyAxisAngle(UP_REFERENCE, this.scene.avatarState.rotationY)
      .normalize();
    const advance = joystick.y * this.MAX_TRANSLATION_SPEED * dt;
    this.scene.avatarState.positionX += advanceFront.x * advance;
    this.scene.avatarState.positionZ += advanceFront.z * advance;
  }

  updateValues() {
    // Translation
    const translationX1Res = makeSmootValue(
      this.scene.avatarStateSmoot.positionX,
      this.scene.avatarState.positionX,
      this.translationX1Last,
      this.SMOOT_RATIO_TRANSLATION,
      this.MAX_INACTIVITY_MILLIS,
      this.PRESITION_TRANSLATION,
    );
    this.scene.avatarStateSmoot.positionX = translationX1Res.v;
    this.translationX1Last = translationX1Res.t;

    const translationZ1Res = makeSmootValue(
      this.scene.avatarStateSmoot.positionZ,
      this.scene.avatarState.positionZ,
      this.translationZ1Last,
      this.SMOOT_RATIO_TRANSLATION,
      this.MAX_INACTIVITY_MILLIS,
      this.PRESITION_TRANSLATION,
    );
    this.scene.avatarStateSmoot.positionZ = translationZ1Res.v;
    this.translationZ1Last = translationZ1Res.t;

    // Rotation
    this.scene.avatarStateSmoot.rotationY = this.scene.avatarState.rotationY;
    this.scene.avatarStateSmoot.positionY = this.scene.avatarState.positionY;
  }

  placeCamera(camera: THREE.PerspectiveCamera, orbitals: OrbitControls) {
    const advanceFront = FRONT_REFERENCE.clone()
      .applyAxisAngle(UP_REFERENCE, this.scene.avatarStateSmoot.rotationY)
      .normalize();

    this.destinationCameraLocation.x =
      this.scene.avatarStateSmoot.positionX - advanceFront.x * this.CAMERA_DISTANCE_TO_AVATAR;
    this.destinationCameraLocation.y =
      this.lastData.stateBody.height * this.CAMERA_HEIGTH_RATIO +
      this.scene.avatarStateSmoot.positionY;
    this.destinationCameraLocation.z =
      this.scene.avatarStateSmoot.positionZ - advanceFront.z * this.CAMERA_DISTANCE_TO_AVATAR;
    this.lastCameraSmoot = makeSmootVector(
      camera.position,
      this.destinationCameraLocation,
      this.lastCameraSmoot,
      this.SMOOT_RATIO,
      this.MAX_INACTIVITY_MILLIS,
    );

    this.destinationLookAt.setX(this.scene.avatarStateSmoot.positionX);
    this.destinationLookAt.setY(this.scene.avatarStateSmoot.positionY);
    this.destinationLookAt.setZ(this.scene.avatarStateSmoot.positionZ);
    this.lookAtLastT = makeSmootVector(
      this.lookAtActual,
      this.destinationLookAt,
      this.lookAtLastT,
      this.SMOOT_RATIO,
      this.MAX_INACTIVITY_MILLIS,
    );
    camera.lookAt(this.lookAtActual);
    orbitals.target.set(this.lookAtActual.x, this.lookAtActual.y, this.lookAtActual.z);
  }

  computeTransformationMatrix() {
    this.updateValues();

    const translationMatrix = new THREE.Matrix4().makeTranslation(
      this.scene.avatarStateSmoot.positionX,
      0,
      this.scene.avatarStateSmoot.positionZ,
    );
    const rotationMatrix = new THREE.Matrix4().makeRotationY(this.scene.avatarStateSmoot.rotationY);
    this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(
      translationMatrix,
      rotationMatrix,
    );
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
