import { ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { SceneControllerAbstract } from "../SceneControllerAbstract";

export class WalkController extends SceneControllerAbstract {

    override async update(data: ScenePoseAndWalkEventType): Promise<void> {
        const { camera, orbitals } = this.scene;
        const { walkBody } = data;
        if (camera && orbitals) {
            orbitals.enabled = false;
            walkBody.placeCamera(camera, orbitals);
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

}