import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";
import * as THREE from 'three';

export class TerrainElevationController extends SceneControllerAbstract {

    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

    override async update(): Promise<ControllerUpdateResponse> {
        const state = this.scene.avatarState;
        const { positionX, positionZ } = state;
        // TODO Given the x,z coordinates, must ray cast vertically the terrain
        let yTerrain = 0;
        // Then get the height of the terrain and set the matrix
        this.transformationMatrix = new THREE.Matrix4().makeTranslation(
            0,
            yTerrain,
            0,
        );
        return {
            avatarTransform: this.transformationMatrix,
        };
    }

    override async stop(): Promise<void> {

    }
    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {

    }
}