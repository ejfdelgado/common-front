import { AvatarBodyEvent, BodyKeyPointData, ControllerUpdateResponse, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from 'three';
import { makeSmootValue, makeSmootVector } from "../AvatarUtilities";

export class WalkController extends SceneControllerAbstract {
    // constants 
    PRESITION_TRANSLATION: number = 0.0000001;
    MAX_INACTIVITY_MILLIS: number = 3000;
    SMOOT_RATIO: number = 0.006 * 0.3;
    SMOOT_RATIO_TRANSLATION: number = 0.006 * 0.3;
    CAMERA_HEIGTH_RATIO: number = 4;
    CAMERA_DISTANCE_TO_AVATAR: number = 14;
    ROTATION_AMOUNT: number = 0.25;
    STEP_AMOUNT: number = 3;// Walked distance on every step
    // variables
    destinationCameraLocation = new THREE.Vector3(0, 0, 0);
    lastCameraSmoot: number = 0;
    lookAtLastT: number = 0;
    destinationLookAt = new THREE.Vector3(0, 0, 0);
    lookAtActual = new THREE.Vector3(0, 0, 0);
    translationX2: number = 0;
    translationY2: number = 0;
    translationZ2: number = 0;
    rotationY2: number = 0;//radians

    translationX1: number = 0;
    translationY1: number = 0;
    translationZ1: number = 0;

    translationX1Last: number = 0;
    translationY1Last: number = 0;
    translationZ1Last: number = 0;

    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
    // KPIs
    stepCount: number = 0;
    kilometers: number = 0;
    calories: number = 0;
    min3DYValue: number = 0;

    override async update(): Promise<ControllerUpdateResponse> {
        const { camera, orbitals } = this.scene;
        if (camera && orbitals) {
            orbitals.enabled = false;
            this.computeMin3DY();
            this.computeTransformationMatrix();
            // Affect the scene camera
            this.placeCamera(camera, orbitals);
        }
        return {
            avatarTransform: this.transformationMatrix,
        };
    }

    override onEvent(event: AvatarBodyEvent): void {
        if ("MAKE_STEP_FORWARD" == event.name) {
            this.makeStep(1);
        } else if ("MAKE_STEP_BACKWARD" == event.name) {
            this.makeStep(-1);
        }
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
            this.translationX1,
            this.translationX2,
            this.translationX1Last,
            this.SMOOT_RATIO_TRANSLATION,
            this.MAX_INACTIVITY_MILLIS,
            this.PRESITION_TRANSLATION,
        );
        this.translationX1 = translationX1Res.v;
        this.translationX1Last = translationX1Res.t;

        const translationY1Res = makeSmootValue(
            this.translationY1,
            this.translationY2,
            this.translationY1Last,
            this.SMOOT_RATIO_TRANSLATION,
            this.MAX_INACTIVITY_MILLIS,
            this.PRESITION_TRANSLATION,
        );
        this.translationY1 = translationY1Res.v;
        this.translationY1Last = translationY1Res.t;

        const translationZ1Res = makeSmootValue(
            this.translationZ1,
            this.translationZ2,
            this.translationZ1Last,
            this.SMOOT_RATIO_TRANSLATION,
            this.MAX_INACTIVITY_MILLIS,
            this.PRESITION_TRANSLATION,
        );
        this.translationZ1 = translationZ1Res.v;
        this.translationZ1Last = translationZ1Res.t;
    }

    placeCamera(camera: THREE.PerspectiveCamera, orbitals: OrbitControls) {
        this.destinationCameraLocation.y = this.lastData.walkBody.height * this.CAMERA_HEIGTH_RATIO;
        const advanceFront = this.lastData.walkBody.FRONT_REFERENCE.clone().applyAxisAngle(
            this.lastData.walkBody.UP_REFERENCE,
            this.rotationY2,
        ).normalize();
        this.destinationCameraLocation.x = this.translationX1 - advanceFront.x * this.CAMERA_DISTANCE_TO_AVATAR;
        this.destinationCameraLocation.z = this.translationZ1 - advanceFront.z * this.CAMERA_DISTANCE_TO_AVATAR;
        this.lastCameraSmoot = makeSmootVector(
            camera.position,
            this.destinationCameraLocation,
            this.lastCameraSmoot,
            this.SMOOT_RATIO,
            this.MAX_INACTIVITY_MILLIS,
        );

        this.destinationLookAt.setX(this.translationX1);
        this.destinationLookAt.setY(0);
        this.destinationLookAt.setZ(this.translationZ1);
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
            walkBody,
        } = this.lastData;

        const {
            FRONT_REFERENCE,
            UP_REFERENCE,
            stepSize,
        } = walkBody;

        this.rotationY2 += (frontData.angle + Math.PI / 2) * this.ROTATION_AMOUNT;
        const advanceFront = FRONT_REFERENCE.clone()
            .applyAxisAngle(UP_REFERENCE, this.rotationY2)
            .normalize();
        this.translationX2 += (advanceFront.x * stepSize * this.STEP_AMOUNT) * forward;
        this.translationZ2 += (advanceFront.z * stepSize * this.STEP_AMOUNT) * forward;
        this.computeTransformationMatrix();
    }

    computeYPosition() {
        this.translationY2 = -1 * this.min3DYValue;
    }

    computeTransformationMatrix() {
        this.computeYPosition();
        this.updateValues();
        const translationMatrix = new THREE.Matrix4().makeTranslation(
            this.translationX1,
            this.translationY1,
            this.translationZ1,
        );
        const rotationMatrix = new THREE.Matrix4().makeRotationY(this.rotationY2);
        this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(
            translationMatrix,
            rotationMatrix,
        );
    }

    computeMin3DY() {
        const { walkBody } = this.lastData;
        const { points } = walkBody;

        const focusPoints: BodyKeyPointData[] = [];

        focusPoints.push(points['left_heel']);
        focusPoints.push(points['right_heel']);

        this.min3DYValue = focusPoints.map(a => a.y).reduce((yVal, minVal, currentIndex, array) => {
            if (yVal < minVal) {
                return yVal;
            }
            return minVal;
        }, 0);
    }
}