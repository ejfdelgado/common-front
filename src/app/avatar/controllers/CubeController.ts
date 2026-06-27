import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBoneEnum } from "@mytypes/BodyParts";
import { ControllerUpdateResponse, AvatarBodyEvent, AVATAR_NAME } from "@mytypes/BodyTypes";
import * as THREE from 'three';

const OPACITY_LOW = 0.5;
const OPACITY_HIGH = 1;

const SIDE_SHIFT = 0.5;
const SIDE_FRONT = 0.3;
const AB_HEIGHT = 0.5;
const VERTICAL_SHIFT = -0.8;//-0.5

export type ENABLE_CUBE_TYPE = "CUBE_A_ON" | "CUBE_B_ON" | "CUBE_C_ON" | "CUBE_D_ON";

export interface CubeConfigType {
    local: THREE.Matrix4;
    height: number,
    sphere: any;
    model: THREE.Object3D<THREE.Object3DEventMap> | null | undefined;
    material: any;
    selected: boolean;
    eventName: string;
};

export class CubeController extends SceneControllerAbstract {
    canListen: boolean = false;
    cubes: {
        [key: string]: CubeConfigType,
    } = {
            "cube_a": {
                eventName: "CUBE_A_SELECT_",
                local: new THREE.Matrix4().makeTranslation(SIDE_SHIFT, 0, SIDE_FRONT),
                height: AB_HEIGHT,
                sphere: null,
                model: null,
                material: null,
                selected: true,
            },
            "cube_b": {
                eventName: "CUBE_B_SELECT_",
                local: new THREE.Matrix4().makeTranslation(-1 * SIDE_SHIFT, 0, SIDE_FRONT),
                height: AB_HEIGHT,
                sphere: null,
                model: null,
                material: null,
                selected: true,
            },
            "cube_c": {
                eventName: "CUBE_C_SELECT_",
                local: new THREE.Matrix4().makeTranslation(SIDE_SHIFT, VERTICAL_SHIFT, 0),
                height: 0.1,
                sphere: null,
                model: null,
                material: null,
                selected: true,
            },
            "cube_d": {
                eventName: "CUBE_D_SELECT_",
                local: new THREE.Matrix4().makeTranslation(-1 * SIDE_SHIFT, VERTICAL_SHIFT, 0),
                height: 0.1,
                sphere: null,
                model: null,
                material: null,
                selected: true,
            },
        };

    override setParams(params: {
        [key: string]: any;
    }) {
        // Dangerous but flexible
        super.setParams(params);
        if (!this.enabled) {
            this.setVisibility(false);
        }
    }

    setVisibility(val: boolean, name?: string) {
        const fun = (name: string) => {
            const config = this.getCubeConfig(name);
            if (!config || !config.model) { return; }
            config.model.visible = val;
        };
        if (name) {
            fun(name);
        } else {
            Object.keys(this.cubes).forEach((name: string) => {
                fun(name);
            });
        }
    }

    setOpacity(val: number, name?: string) {
        const fun = (name: string) => {
            const config = this.getCubeConfig(name);
            if (!config) { return; }
            config.material.opacity = val;
        }
        if (name) {
            fun(name);
        } else {
            Object.keys(this.cubes).forEach((name: string) => {
                fun(name);
            });
        }
    }

    getCubeConfig(name: string): CubeConfigType | null | undefined {
        const config = this.cubes[name];
        let cubeObject = config.model;
        if (!cubeObject) {
            cubeObject = this.scene.getObjectByName(name);
            config.model = cubeObject;
        }
        if (!cubeObject) { return; }
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
        return config;
    }

    override async update(): Promise<ControllerUpdateResponse> {
        if (!this.enabled || !this.lastData) {
            return {};
        }
        const rotationMatrix = new THREE.Matrix4()
            .makeRotationY(this.scene.avatarStateSmoot.rotationY);

        Object.keys(this.cubes).forEach((name: string) => {
            const config = this.getCubeConfig(name);
            if (!config) { return; }
            let cubeObject = config.model;
            if (!cubeObject) { return; }

            const tx = this.scene.avatarStateSmoot.positionX;
            const ty = this.lastData.stateBody.height * config.height + this.scene.avatarState.positionY;
            const tz = this.scene.avatarStateSmoot.positionZ;

            const translationMatrix = new THREE.Matrix4().makeTranslation(tx, ty, tz,);

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
        });

        return {};
    }

    override async postUpdate() {
        if (!this.enabled) {
            return;
        }
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
                    if (this.canListen && config.model?.visible) {
                        config.material.opacity = OPACITY_HIGH;
                        config.selected = true;
                        this.events.emit({
                            name: config.eventName + "ON",
                        });
                    }
                }
            } else {
                if (config.model) {
                    this.scene.highlightOff(config.model);
                }
                if (config.selected) {
                    if (this.canListen && config.model?.visible) {
                        config.material.opacity = OPACITY_LOW;
                        config.selected = false;
                        this.events.emit({
                            name: config.eventName + "OFF",
                        });
                    }
                }
            }
        });
    }

    override async stop(): Promise<void> {

    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "CUBE_CONTROLL_ON") {
            this.setParams({ enabled: true });
        } else if (event.name == "CUBE_CONTROLL_OFF") {
            this.setParams({ enabled: false });
        } else if (event.name == "CUBE_LISTEN_ON") {
            this.setParams({ canListen: true });
        } else if (event.name == "CUBE_LISTEN_OFF") {
            this.setParams({ canListen: false });
        } else if (event.name == "CUBE_A_ON") {
            this.setVisibility(true, "cube_a");
            this.setOpacity(OPACITY_LOW, "cube_a");
        } else if (event.name == "CUBE_B_ON") {
            this.setVisibility(true, "cube_b");
            this.setOpacity(OPACITY_LOW, "cube_b");
        } else if (event.name == "CUBE_C_ON") {
            this.setVisibility(true, "cube_c");
            this.setOpacity(OPACITY_LOW, "cube_c");
        } else if (event.name == "CUBE_D_ON") {
            this.setVisibility(true, "cube_d");
            this.setOpacity(OPACITY_LOW, "cube_d");
        }
    }
}