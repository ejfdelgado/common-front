import { AvatarBodyEvent, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import * as THREE from 'three';

export class WalkController extends SceneControllerAbstract {

    SMOOT_RATIO: number = 0.006 * 0.3;
    CAMERA_HEIGTH_RATIO: number = 4;
    CAMERA_DISTANCE_TO_AVATAR: number = 14;
    destinationCameraLocation = new THREE.Vector3(0, 0, 0);
    lastCameraSmoot: number = new Date().getTime();
    destinationLookAt = new THREE.Vector3(0, 0, 0);
    lookAtLastT: number = new Date().getTime();
    lookAtActual = new THREE.Vector3(0, 0, 0);

    override async update(): Promise<void> {
        const { camera, orbitals } = this.scene;
        const { walkBody } = this.lastData;
        if (camera && orbitals) {
            orbitals.enabled = false;
            this.placeCamera(camera, orbitals);
            const model = this.scene.getObjectByName("avatar");
            if (model) {
                model.matrixAutoUpdate = false;
                model.matrix.copy(walkBody.transformationMatrix);
            }
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
            this.lastData.walkBody.rotationY,
        ).normalize();
        this.destinationCameraLocation.x = this.lastData.walkBody.translationX - advanceFront.x * this.CAMERA_DISTANCE_TO_AVATAR;
        this.destinationCameraLocation.z = this.lastData.walkBody.translationZ - advanceFront.z * this.CAMERA_DISTANCE_TO_AVATAR;
        this.lastCameraSmoot = this.makeSmoot(camera.position, this.destinationCameraLocation, this.lastCameraSmoot);

        this.destinationLookAt.setX(this.lastData.walkBody.translationX);
        this.destinationLookAt.setY(0);
        this.destinationLookAt.setZ(this.lastData.walkBody.translationZ);
        this.lookAtLastT = this.makeSmoot(this.lookAtActual, this.destinationLookAt, this.lookAtLastT);
        camera.lookAt(this.lookAtActual);
        orbitals.target.set(this.lookAtActual.x, this.lookAtActual.y, this.lookAtActual.z);
    }

    override onEvent(event: AvatarBodyEvent): void {

    }
}