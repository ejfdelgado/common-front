import { AvatarBodyEvent, ControllerUpdateResponse } from '@mytypes/BodyTypes';
import { SceneControllerAbstract } from '@avatar/controllers/SceneControllerAbstract';
import * as THREE from 'three';
import { BodyPoseKey } from '@mytypes/BodyParts';
import { AvatarFollowCamera, getAvatarFront } from '@avatar/utils/AvatarFollowCamera';

export class WalkController extends SceneControllerAbstract {
  // constants
  ROTATION_AMOUNT: number = 0.25;
  AUTOROTATION_AMOUNT: number = 0.04;
  STEP_AMOUNT: number = 3; // Walked distance on every step
  // Smoothing, avatar transform and camera placement
  followCamera = new AvatarFollowCamera({
    LOOK_AT_HEIGHT_RATIO: 0.85,
    CAMERA_HEIGTH_RATIO: 1.5,
    CAMERA_DISTANCE_TO_AVATAR: 6,
  });

  // KPIs
  stepCount: number = 0;
  kilometers: number = 0;
  calories: number = 0;

  // Walking constants
  MOVEMENT_THRESHOLD = 0.1;
  MIN_MILLIS_BETWEEN_STEPS: number = 1000;
  // Walking detection
  sideState: number = 0;
  stepSize: number = 0;
  maxDifference: number = 0;
  lastStepTime: number = 0;
  lastTime: number = 0;

  override async update(): Promise<ControllerUpdateResponse> {
    const { camera, orbitals } = this.scene;
    this.walkLogic();
    if (camera && orbitals) {
      this.checkAutoRotation();
    }
    const avatarTransform = this.followCamera.follow(this.scene, this.lastData.stateBody.height);
    this.lastTime = this.now;
    return {
      avatarTransform,
    };
  }

  checkAutoRotation() {
    const { frontData } = this.lastData;
    const offsetAngle = frontData.angle + Math.PI / 2;
    if (Math.abs(offsetAngle) > THREE.MathUtils.degToRad(20)) {
      const difftime = (this.now - this.lastTime) / 25;
      this.scene.avatarState.rotationY += difftime * offsetAngle * this.AUTOROTATION_AMOUNT;
    }
  }

  walkLogic() {
    let differenceAbs = 0;
    const leftHeelIx = this.lastData.keypoints3DMap[BodyPoseKey.left_heel];
    const rightHeelIx = this.lastData.keypoints3DMap[BodyPoseKey.right_heel];
    const leftHeight = leftHeelIx.y;
    const rightHeight = rightHeelIx.y;
    const difference = leftHeight - rightHeight;
    differenceAbs = Math.abs(difference);
    let makeStep = false;

    if (differenceAbs > this.MOVEMENT_THRESHOLD) {
      if (difference > 0) {
        // Caused by the left foot
        if (this.sideState !== 1) {
          // Foot switch
          // Foot change, make the step of the previous amount
          this.stepSize = this.maxDifference;
          this.maxDifference = 0;
          if (this.now - this.lastStepTime < this.MIN_MILLIS_BETWEEN_STEPS) {
            makeStep = true;
          }
          this.lastStepTime = this.now;
          this.sideState = 1;
        }
      } else {
        // Caused by the right foot
        if (this.sideState !== 2) {
          this.stepSize = this.maxDifference;
          if (this.now - this.lastStepTime < this.MIN_MILLIS_BETWEEN_STEPS) {
            makeStep = true;
          }
          this.lastStepTime = this.now;
          this.sideState = 2;
        }
      }
      this.maxDifference = Math.max(this.maxDifference, differenceAbs);
    }

    if (makeStep) {
      let forward = 1;

      if (this.lastData.stateBody.isTPose) {
        forward = -1;
      }

      if (forward > 0) {
        this.makeStep(1);
        this.events.emit({
          name: 'MAKE_STEP_FORWARD',
        });
      } else {
        this.makeStep(-1);
        this.events.emit({
          name: 'MAKE_STEP_BACKWARD',
        });
      }
      this.stepSize = 0;
    }
  }

  override onEvent(event: AvatarBodyEvent): void {}

  override async stop(): Promise<void> {
    this.followCamera.release(this.scene.orbitals);
  }

  override async destroy(): Promise<void> {}

  makeStep(forward: number) {
    this.stepCount += 1;
    console.log(`this.stepSize ${this.stepSize}`);
    const { frontData } = this.lastData;

    this.scene.avatarState.rotationY += (frontData.angle + Math.PI / 2) * this.ROTATION_AMOUNT;
    const advanceFront = getAvatarFront(this.scene.avatarState.rotationY);
    this.scene.avatarState.positionX += advanceFront.x * this.stepSize * this.STEP_AMOUNT * forward;
    this.scene.avatarState.positionZ += advanceFront.z * this.stepSize * this.STEP_AMOUNT * forward;
    this.followCamera.computeTransformationMatrix(this.scene);
  }
}
