import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import { AvatarBoneEnum } from "@mytypes/BodyParts";
import { ControllerUpdateResponse, AvatarBodyEvent, AVATAR_NAME } from "@mytypes/BodyTypes";
import * as THREE from 'three';

const SIDE_SHIFT = 0.8;

export class CubeController extends SceneControllerAbstract {

    cubes: {
        [key: string]: {
            local: THREE.Matrix4;
            height: number,
            sphere: any;
            model: THREE.Object3D<THREE.Object3DEventMap> | null | undefined;
            material: any;
            selected: boolean;
            eventName: string;
        }
    } = {
            "cube_a": {
                eventName: "CUBE_A_SELECT_",
                local: new THREE.Matrix4().makeTranslation(SIDE_SHIFT, 0, 0),
                height: 0.9,
                sphere: null,
                model: null,
                material: null,
                selected: false,
            },
            "cube_b": {
                eventName: "CUBE_B_SELECT_",
                local: new THREE.Matrix4().makeTranslation(-1 * SIDE_SHIFT, 0, 0),
                height: 0.9,
                sphere: null,
                model: null,
                material: null,
                selected: false,
            },
            "cube_c": {
                eventName: "CUBE_C_SELECT_",
                local: new THREE.Matrix4().makeTranslation(SIDE_SHIFT, 0, 0),
                height: 0.1,
                sphere: null,
                model: null,
                material: null,
                selected: false,
            },
            "cube_d": {
                eventName: "CUBE_D_SELECT_",
                local: new THREE.Matrix4().makeTranslation(-1 * SIDE_SHIFT, 0, 0),
                height: 0.1,
                sphere: null,
                model: null,
                material: null,
                selected: false,
            },
        };

    override async update(): Promise<ControllerUpdateResponse> {

        const rotationMatrix = new THREE.Matrix4()
            .makeRotationY(this.scene.avatarStateSmoot.rotationY);

        Object.keys(this.cubes).forEach((name: string) => {
            const config = this.cubes[name];
            let cubeObject = config.model;
            if (!cubeObject) {
                cubeObject = this.scene.getObjectByName(name);
                config.model = cubeObject;
            }
            if (!cubeObject) { return; }

            const translationMatrix = new THREE.Matrix4().makeTranslation(
                this.scene.avatarStateSmoot.positionX,
                this.lastData.stateBody.height * config.height + this.scene.avatarState.positionY,
                this.scene.avatarStateSmoot.positionZ,
            );

            const cubeAMatrix = new THREE.Matrix4().identity();
            cubeAMatrix.multiply(translationMatrix);
            cubeAMatrix.multiply(rotationMatrix);
            cubeAMatrix.multiply(config.local);
            cubeObject.matrixAutoUpdate = false;
            cubeObject.matrix.copy(cubeAMatrix);

            cubeObject.traverse((mesh: any) => {
                if (mesh.isMesh) {
                    const sphere = mesh.geometry.boundingSphere.clone();
                    sphere.applyMatrix4(mesh.matrixWorld);
                    config.sphere = sphere;
                    if (mesh.material) {
                        config.material = mesh.material;
                    }
                }
            });

            // Assign opacity
            if (config.material) {
                config.material.opacity = 1;
            }
        });


        return {};
    }

    override async postUpdate() {
        const model = this.scene.getObjectByName(AVATAR_NAME);
        if (!model) { return; }
        const handL = model.getObjectByName(AvatarBoneEnum.hand_l);
        const handR = model.getObjectByName(AvatarBoneEnum.hand_r);
        const footL = model.getObjectByName(AvatarBoneEnum.foot_l);
        const footR = model.getObjectByName(AvatarBoneEnum.foot_r);
        if (!handL || !handR || !footL || !footR) { return; }
        const leftHandPoint = new THREE.Vector3();
        const rightHandPoint = new THREE.Vector3();
        const leftFootPoint = new THREE.Vector3();
        const rightFootPoint = new THREE.Vector3();
        handL.getWorldPosition(leftHandPoint);
        handR.getWorldPosition(rightHandPoint);
        footL.getWorldPosition(leftFootPoint);
        footR.getWorldPosition(rightFootPoint);
        Object.keys(this.cubes).forEach((name: string) => {
            const config = this.cubes[name];
            const { sphere } = config;
            if (!sphere) { return; }
            let isInSphere = sphere.containsPoint(leftHandPoint);
            if (!isInSphere) {
                isInSphere = sphere.containsPoint(rightHandPoint);
            }
            if (!isInSphere) {
                isInSphere = sphere.containsPoint(leftFootPoint);
            }
            if (!isInSphere) {
                isInSphere = sphere.containsPoint(rightFootPoint);
            }

            if (isInSphere) {
                if (config.model) {
                    this.scene.highlightOn(config.model);
                }
                if (!config.selected) {
                    config.selected = true;
                    this.events.emit({
                        name: config.eventName + "ON",
                    });
                }
            } else {
                if (config.model) {
                    this.scene.highlightOff(config.model);
                }
                if (config.selected) {
                    config.selected = false;
                    this.events.emit({
                        name: config.eventName + "OFF",
                    });
                }
            }
        });
    }

    override async stop(): Promise<void> {

    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {

    }
}