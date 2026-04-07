import { AvatarBodyEvent, ControllerInitDataType, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { BasicScene } from "./BasicScene";

export abstract class SceneControllerAbstract {
    now: number = 0;
    scene!: BasicScene;
    lastData!: ScenePoseAndWalkEventType;

    async initialize(data: ControllerInitDataType) {
        this.scene = data.scene;
    }

    async preUpdate(data: ScenePoseAndWalkEventType): Promise<void> {
        this.lastData = data;
        this.now = new Date().getTime();
    }

    abstract update(): Promise<void>;

    abstract stop(): Promise<void>;

    abstract destroy(): Promise<void>;

    abstract onEvent(event: AvatarBodyEvent): void;
}