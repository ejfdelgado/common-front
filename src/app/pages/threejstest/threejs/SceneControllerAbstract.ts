import { AvatarBodyEvent, ControllerInitDataType, GenericSizeType, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { BasicScene } from "./BasicScene";

export abstract class SceneControllerAbstract {
    now: number = 0;
    scene!: BasicScene;
    lastData!: ScenePoseAndWalkEventType;
    videoSize!: GenericSizeType;

    async initialize(data: ControllerInitDataType) {
        this.scene = data.scene;
    }

    async preUpdate(data: ScenePoseAndWalkEventType): Promise<void> {
        this.lastData = data;
        this.videoSize = data.videoSize;
        this.now = new Date().getTime();
    }

    abstract update(): Promise<void>;

    abstract stop(): Promise<void>;

    abstract destroy(): Promise<void>;

    abstract onEvent(event: AvatarBodyEvent): void;
}