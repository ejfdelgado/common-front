import { ControllerInitDataType, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { BasicScene } from "./BasicScene";

export abstract class SceneControllerAbstract {

    scene!: BasicScene;

    async initialize(data: ControllerInitDataType) {
        this.scene = data.scene;
    }

    abstract update(data: ScenePoseAndWalkEventType): Promise<void>;

    abstract stop(): Promise<void>;

    abstract destroy(): Promise<void>;
}