import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { AvatarLocationState } from '@mytypes/BodyTypes';
import { makeSmootValue, makeSmootVector } from '@avatar/utils/AvatarUtilities';

export const FRONT_REFERENCE = new THREE.Vector3(0, 0, -1);
export const UP_REFERENCE = new THREE.Vector3(0, 1, 0);

// Unit vector the avatar is facing for the given rotation around the UP axis
export function getAvatarFront(rotationY: number): THREE.Vector3 {
  return FRONT_REFERENCE.clone().applyAxisAngle(UP_REFERENCE, rotationY).normalize();
}

export interface AvatarFollowCameraConfig {
  PRESITION_TRANSLATION: number;
  MAX_INACTIVITY_MILLIS: number;
  // Smoothing of the camera position and look-at point
  SMOOT_RATIO: number;
  // Smoothing of the avatar translation (avatarState -> avatarStateSmoot)
  SMOOT_RATIO_TRANSLATION: number;
  // Camera height = body height * CAMERA_HEIGTH_RATIO + avatar Y
  CAMERA_HEIGTH_RATIO: number;
  // Distance from the camera to the avatar, behind it
  CAMERA_DISTANCE_TO_AVATAR: number;
  // Point the camera looks at = body height * LOOK_AT_HEIGHT_RATIO + avatar Y
  // 0 = feet, ~0.5 = hips, ~0.9 = head
  LOOK_AT_HEIGHT_RATIO: number;
}

export const DEFAULT_FOLLOW_CAMERA_CONFIG: AvatarFollowCameraConfig = {
  PRESITION_TRANSLATION: 0.0000001,
  MAX_INACTIVITY_MILLIS: 3000,
  SMOOT_RATIO: 0.006 * 1.2,
  SMOOT_RATIO_TRANSLATION: 0.006 * 1.2,
  CAMERA_HEIGTH_RATIO: 4,
  CAMERA_DISTANCE_TO_AVATAR: 14,
  LOOK_AT_HEIGHT_RATIO: 0.9,
};

export interface AvatarFollowCameraScene {
  avatarState: AvatarLocationState;
  avatarStateSmoot: AvatarLocationState;
}

/**
 * Shared third-person navigation helper used by walking controllers:
 *  - Smooths avatarState into avatarStateSmoot.
 *  - Builds the avatar transformation matrix from the smoothed state.
 *  - Places the camera behind the avatar and makes it look at it.
 * Each controller owns one instance because it keeps the smoothing state.
 */
export class AvatarFollowCamera {
  config: AvatarFollowCameraConfig;

  destinationCameraLocation = new THREE.Vector3(0, 0, 0);
  lastCameraSmoot: number = 0;
  lookAtLastT: number = 0;
  destinationLookAt = new THREE.Vector3(0, 0, 0);
  lookAtActual = new THREE.Vector3(0, 0, 0);

  translationX1Last: number = 0;
  translationZ1Last: number = 0;

  transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

  constructor(config: Partial<AvatarFollowCameraConfig> = {}) {
    this.config = { ...DEFAULT_FOLLOW_CAMERA_CONFIG, ...config };
  }

  updateValues(scene: AvatarFollowCameraScene) {
    const { avatarState, avatarStateSmoot } = scene;
    // Translation
    const translationX1Res = makeSmootValue(
      avatarStateSmoot.positionX,
      avatarState.positionX,
      this.translationX1Last,
      this.config.SMOOT_RATIO_TRANSLATION,
      this.config.MAX_INACTIVITY_MILLIS,
      this.config.PRESITION_TRANSLATION,
    );
    avatarStateSmoot.positionX = translationX1Res.v;
    this.translationX1Last = translationX1Res.t;

    const translationZ1Res = makeSmootValue(
      avatarStateSmoot.positionZ,
      avatarState.positionZ,
      this.translationZ1Last,
      this.config.SMOOT_RATIO_TRANSLATION,
      this.config.MAX_INACTIVITY_MILLIS,
      this.config.PRESITION_TRANSLATION,
    );
    avatarStateSmoot.positionZ = translationZ1Res.v;
    this.translationZ1Last = translationZ1Res.t;

    // Rotation
    avatarStateSmoot.rotationY = avatarState.rotationY;
    avatarStateSmoot.positionY = avatarState.positionY;
  }

  computeTransformationMatrix(scene: AvatarFollowCameraScene): THREE.Matrix4 {
    this.updateValues(scene);
    const { avatarStateSmoot } = scene;

    const translationMatrix = new THREE.Matrix4().makeTranslation(
      avatarStateSmoot.positionX,
      0,
      avatarStateSmoot.positionZ,
    );
    const rotationMatrix = new THREE.Matrix4().makeRotationY(avatarStateSmoot.rotationY);
    this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(
      translationMatrix,
      rotationMatrix,
    );
    return this.transformationMatrix;
  }

  placeCamera(
    scene: AvatarFollowCameraScene,
    camera: THREE.PerspectiveCamera,
    orbitals: OrbitControls,
    bodyHeight: number,
  ) {
    const { avatarStateSmoot } = scene;
    const advanceFront = getAvatarFront(avatarStateSmoot.rotationY);

    this.destinationCameraLocation.x =
      avatarStateSmoot.positionX - advanceFront.x * this.config.CAMERA_DISTANCE_TO_AVATAR;
    this.destinationCameraLocation.y =
      bodyHeight * this.config.CAMERA_HEIGTH_RATIO + avatarStateSmoot.positionY;
    this.destinationCameraLocation.z =
      avatarStateSmoot.positionZ - advanceFront.z * this.config.CAMERA_DISTANCE_TO_AVATAR;
    this.lastCameraSmoot = makeSmootVector(
      camera.position,
      this.destinationCameraLocation,
      this.lastCameraSmoot,
      this.config.SMOOT_RATIO,
      this.config.MAX_INACTIVITY_MILLIS,
    );

    this.destinationLookAt.set(
      avatarStateSmoot.positionX,
      avatarStateSmoot.positionY + bodyHeight * this.config.LOOK_AT_HEIGHT_RATIO,
      avatarStateSmoot.positionZ,
    );
    this.lookAtLastT = makeSmootVector(
      this.lookAtActual,
      this.destinationLookAt,
      this.lookAtLastT,
      this.config.SMOOT_RATIO,
      this.config.MAX_INACTIVITY_MILLIS,
    );
    camera.lookAt(this.lookAtActual);
    orbitals.target.set(this.lookAtActual.x, this.lookAtActual.y, this.lookAtActual.z);
  }

  // Disables orbit controls, updates smoothing + matrix and places the camera.
  // Returns the avatar transformation matrix.
  follow(
    scene: AvatarFollowCameraScene & {
      camera?: THREE.PerspectiveCamera | null;
      orbitals?: OrbitControls | null;
    },
    bodyHeight: number,
  ): THREE.Matrix4 {
    const { camera, orbitals } = scene;
    if (camera && orbitals) {
      orbitals.enabled = false;
      this.computeTransformationMatrix(scene);
      this.placeCamera(scene, camera, orbitals, bodyHeight);
    }
    return this.transformationMatrix;
  }

  // Gives the camera control back to the orbit controls
  release(orbitals?: OrbitControls | null) {
    if (orbitals) {
      orbitals.enabled = true;
      orbitals.update();
    }
  }
}
