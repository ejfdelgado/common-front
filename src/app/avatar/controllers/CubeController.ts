import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import { AvatarBoneEnum } from "@mytypes/BodyParts";
import { ControllerUpdateResponse, AvatarBodyEvent, AVATAR_NAME } from "@mytypes/BodyTypes";
import * as THREE from 'three';

const SIDE_SHIFT = 0.8;

export class CubeController extends SceneControllerAbstract {

    cubes: {
        [key: string]: {
            local: THREE.Matrix4,
            sphere: any,
            model: THREE.Object3D<THREE.Object3DEventMap> | null | undefined;
        }
    } = {
            "cube_a": {
                local: new THREE.Matrix4().makeTranslation(SIDE_SHIFT, 0, 0),
                sphere: null,
                model: null,
            },
            "cube_b": {
                local: new THREE.Matrix4().makeTranslation(-1 * SIDE_SHIFT, 0, 0),
                sphere: null,
                model: null,
            },
        };

    override async update(): Promise<ControllerUpdateResponse> {

        const translationMatrix = new THREE.Matrix4().makeTranslation(
            this.scene.avatarStateSmoot.positionX,
            this.lastData.stateBody.height * 0.8 + this.scene.avatarState.positionY,
            this.scene.avatarStateSmoot.positionZ,
        );
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
                }
            });
        });

        // Assign opacity

        return {};
    }

    override async postUpdate() {
        const model = this.scene.getObjectByName(AVATAR_NAME);
        if (!model) { return; }
        const handL = model.getObjectByName(AvatarBoneEnum.target_hand_l);
        const handR = model.getObjectByName(AvatarBoneEnum.target_hand_r);
        if (!handL || !handR) { return; }
        const leftHandPoint = new THREE.Vector3();
        const rightHandPoint = new THREE.Vector3();
        handL.getWorldPosition(leftHandPoint);
        handR.getWorldPosition(rightHandPoint);
        Object.keys(this.cubes).forEach((name: string) => {
            const config = this.cubes[name];
            const { sphere } = config;
            if (!sphere) { return; }
            let isInSphere = sphere.containsPoint(leftHandPoint);
            if (!isInSphere) {
                isInSphere = sphere.containsPoint(rightHandPoint);
            }

            if (isInSphere) {
                if (config.model) {
                    this.scene.highlightOn(config.model);
                }
            } else {
                if (config.model) {
                    this.scene.highlightOff(config.model);
                }
            }
        });
    }

    isPointInsideObject3D(point: THREE.Vector3, object: THREE.Object3D<THREE.Object3DEventMap>) {
        // Ensure world matrix is up to date
        object.updateWorldMatrix(true, true);

        // Collect all meshes within the Object3D (handles Groups, Scenes, etc.)
        const meshes: any[] = [];
        object.traverse((child: any) => {
            if (child.isMesh) {
                meshes.push(child);
            }
        });

        if (meshes.length === 0) return false;

        // Build a world-space bounding sphere that encompasses all child meshes
        const worldBox = new THREE.Box3();

        for (const mesh of meshes) {
            mesh.geometry.computeBoundingBox();
            const meshBox = mesh.geometry.boundingBox.clone();
            meshBox.applyMatrix4(mesh.matrixWorld);   // local → world space
            worldBox.union(meshBox);                  // expand combined box
        }

        // Derive a bounding sphere from the combined world-space box
        const boundingSphere = new THREE.Sphere();
        worldBox.getBoundingSphere(boundingSphere);

        return boundingSphere.containsPoint(point);
    }

    override async stop(): Promise<void> {

    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {

    }
}