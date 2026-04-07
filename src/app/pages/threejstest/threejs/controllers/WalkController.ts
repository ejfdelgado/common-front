import { AvatarBodyEvent, BodyKeyPointData, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from 'three';

export class WalkController extends SceneControllerAbstract {
    // constants 
    SMOOT_RATIO: number = 0.006 * 0.3;
    CAMERA_HEIGTH_RATIO: number = 4;
    CAMERA_DISTANCE_TO_AVATAR: number = 14;
    ROTATION_AMOUNT: number = 0.25;
    STEP_AMOUNT: number = 3;// Walked distance on every step
    // variables
    destinationCameraLocation = new THREE.Vector3(0, 0, 0);
    lastCameraSmoot: number = new Date().getTime();
    destinationLookAt = new THREE.Vector3(0, 0, 0);
    lookAtLastT: number = new Date().getTime();
    lookAtActual = new THREE.Vector3(0, 0, 0);
    translationX: number = 0;
    translationY: number = 0;
    translationZ: number = 0;
    rotationY: number = 0;//radians
    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();
    // KPIs
    stepCount: number = 0;
    kilometers: number = 0;
    calories: number = 0;
    min3DYValue: number = 0;

    override async update(): Promise<void> {
        const { camera, orbitals } = this.scene;
        if (camera && orbitals) {
            orbitals.enabled = false;
            this.computeMin3DY();
            this.computeTransformationMatrix();
            // Affect the scene camera
            this.placeCamera(camera, orbitals);
            // Affect the avatar
            const model = this.scene.getObjectByName("avatar");
            if (model) {
                model.matrixAutoUpdate = false;
                model.matrix.copy(this.transformationMatrix);
            }
        }
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

    makeSmoot(actual: THREE.Vector3, destination: THREE.Vector3, lastTime: number) {
        const actualT = this.now;
        const diffTime = actualT - lastTime;

        const trayectoria = new THREE.Vector3(
            destination.x - actual.x,
            destination.y - actual.y,
            destination.z - actual.z,
        );
        const length = trayectoria.length();
        trayectoria.normalize();
        const thisStep = diffTime * this.SMOOT_RATIO;
        const currentStep = Math.min(thisStep, length);
        if (currentStep >= 0.0001) {
            trayectoria.multiplyScalar(currentStep);
            actual.x += trayectoria.x;
            actual.y += trayectoria.y;
            actual.z += trayectoria.z;
        } else {
            actual.x = destination.x;
            actual.y = destination.y;
            actual.z = destination.z;
        }
        return actualT;
    }

    placeCamera(camera: THREE.PerspectiveCamera, orbitals: OrbitControls) {
        this.destinationCameraLocation.y = this.lastData.walkBody.height * this.CAMERA_HEIGTH_RATIO;
        const advanceFront = this.lastData.walkBody.FRONT_REFERENCE.clone().applyAxisAngle(
            this.lastData.walkBody.UP_REFERENCE,
            this.rotationY,
        ).normalize();
        this.destinationCameraLocation.x = this.translationX - advanceFront.x * this.CAMERA_DISTANCE_TO_AVATAR;
        this.destinationCameraLocation.z = this.translationZ - advanceFront.z * this.CAMERA_DISTANCE_TO_AVATAR;
        this.lastCameraSmoot = this.makeSmoot(camera.position, this.destinationCameraLocation, this.lastCameraSmoot);

        this.destinationLookAt.setX(this.translationX);
        this.destinationLookAt.setY(0);
        this.destinationLookAt.setZ(this.translationZ);
        this.lookAtLastT = this.makeSmoot(this.lookAtActual, this.destinationLookAt, this.lookAtLastT);
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

        this.rotationY += (frontData.angle + Math.PI / 2) * this.ROTATION_AMOUNT;
        const advanceFront = FRONT_REFERENCE.clone().applyAxisAngle(UP_REFERENCE, this.rotationY).normalize();

        this.translationX += (advanceFront.x * stepSize * this.STEP_AMOUNT) * forward;
        this.translationZ += (advanceFront.z * stepSize * this.STEP_AMOUNT) * forward;
        this.computeTransformationMatrix();
    }

    computeYPosition() {
        this.translationY = -1 * this.min3DYValue;
    }

    computeTransformationMatrix() {
        this.computeYPosition();
        const translationMatrix = new THREE.Matrix4().makeTranslation(this.translationX, this.translationY, this.translationZ);
        const rotationMatrix = new THREE.Matrix4().makeRotationY(this.rotationY);
        this.transformationMatrix = new THREE.Matrix4().multiplyMatrices(translationMatrix, rotationMatrix);
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