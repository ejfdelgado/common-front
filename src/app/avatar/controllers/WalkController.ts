import {
    AvatarBodyEvent,
    ControllerUpdateResponse,
} from "@mytypes/BodyTypes";
import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from 'three';
import { makeSmootValue, makeSmootVector } from "@avatar/utils/AvatarUtilities";
import { BodyPoseKey } from "@mytypes/BodyParts";

const FRONT_REFERENCE = new THREE.Vector3(0, 0, -1);
const UP_REFERENCE = new THREE.Vector3(0, 1, 0);

export class WalkController extends SceneControllerAbstract {
    // constants 
    PRESITION_TRANSLATION: number = 0.0000001;
    MAX_INACTIVITY_MILLIS: number = 3000;
    SMOOT_RATIO: number = 0.006 * 1.2;
    SMOOT_RATIO_TRANSLATION: number = 0.006 * 1.2;
    CAMERA_HEIGTH_RATIO: number = 4;
    CAMERA_DISTANCE_TO_AVATAR: number = 14;
    ROTATION_AMOUNT: number = 0.25;
    AUTOROTATION_AMOUNT: number = 0.04;
    STEP_AMOUNT: number = 3;// Walked distance on every step
    // variables
    destinationCameraLocation = new THREE.Vector3(0, 0, 0);
    lastCameraSmoot: number = 0;
    lookAtLastT: number = 0;
    destinationLookAt = new THREE.Vector3(0, 0, 0);
    lookAtActual = new THREE.Vector3(0, 0, 0);

    translationX1Last: number = 0;
    translationZ1Last: number = 0;

    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
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
            orbitals.enabled = false;
            this.checkAutoRotation();
            this.computeTransformationMatrix();
            // Affect the scene camera
            this.placeCamera(camera, orbitals);
        }
        this.lastTime = this.now;
        return {
            avatarTransform: this.transformationMatrix,
        };
    }

    checkAutoRotation() {
        const {
            frontData,
        } = this.lastData;
        const offsetAngle = (frontData.angle + Math.PI / 2);
        if (Math.abs(offsetAngle) > THREE.MathUtils.degToRad(20)) {
            const difftime = (this.now - this.lastTime)/25;
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
                    name: "MAKE_STEP_FORWARD",
                });
            } else {
                this.makeStep(-1);
                this.events.emit({
                    name: "MAKE_STEP_BACKWARD",
                });
            }
            this.stepSize = 0;
        }
    }

    override onEvent(event: AvatarBodyEvent): void {

    }

    override async stop(): Promise<void> {
        const { orbitals } = this.scene;
        if (orbitals) {
            orbitals.enabled = true;
            orbitals.update();
        }
    }

    override async destroy(): Promise<void> {

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
        const advanceFront = FRONT_REFERENCE.clone().applyAxisAngle(
            UP_REFERENCE,
            this.scene.avatarStateSmoot.rotationY,
        ).normalize();

        this.destinationCameraLocation.x = this.scene.avatarStateSmoot.positionX - advanceFront.x * this.CAMERA_DISTANCE_TO_AVATAR;
        this.destinationCameraLocation.y = this.lastData.stateBody.height * this.CAMERA_HEIGTH_RATIO + this.scene.avatarStateSmoot.positionY;
        this.destinationCameraLocation.z = this.scene.avatarStateSmoot.positionZ - advanceFront.z * this.CAMERA_DISTANCE_TO_AVATAR;
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

    makeStep(forward: number) {
        const {
            frontData,
        } = this.lastData;

        this.scene.avatarState.rotationY += (frontData.angle + Math.PI / 2) * this.ROTATION_AMOUNT;
        const advanceFront = FRONT_REFERENCE.clone()
            .applyAxisAngle(UP_REFERENCE, this.scene.avatarState.rotationY)
            .normalize();
        this.scene.avatarState.positionX += (advanceFront.x * this.stepSize * this.STEP_AMOUNT) * forward;
        this.scene.avatarState.positionZ += (advanceFront.z * this.stepSize * this.STEP_AMOUNT) * forward;
        this.computeTransformationMatrix();
    }

    computeTransformationMatrix() {
        this.updateValues();

        const translationMatrix = new THREE.Matrix4().makeTranslation(
            this.scene.avatarStateSmoot.positionX,
            0,
            this.scene.avatarStateSmoot.positionZ,
        );
        const rotationMatrix = new THREE.Matrix4().makeRotationY(
            this.scene.avatarStateSmoot.rotationY,
        );
        this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(
            translationMatrix,
            rotationMatrix,
        );
    }
}