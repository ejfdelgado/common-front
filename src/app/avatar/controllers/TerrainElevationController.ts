import { 
    AvatarBodyEvent, 
    ControllerUpdateResponse,
 } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "@avatar/SceneControllerAbstract";
import * as THREE from 'three';

export class TerrainElevationController extends SceneControllerAbstract {

    transformationMatrix: THREE.Matrix4 = new THREE.Matrix4().identity();

    override async update(): Promise<ControllerUpdateResponse> {
        const state = this.scene.avatarState;
        const { positionX, positionZ } = state;
        // Given the x,z coordinates, must ray cast vertically the terrain
        let yTerrain = this.scene.getFirstHitFromTopToDown(positionX, positionZ);
        if (yTerrain === null) {
            state.positionY = 0;
        } else {
            state.positionY = yTerrain;
        }
        // Then get the height of the terrain and set the matrix
        this.transformationMatrix = new THREE.Matrix4().makeTranslation(
            0,
            state.positionY,
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