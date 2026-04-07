import { AvatarBodyEvent, ControllerInitDataType, ControllerUpdateResponse, GenericSizeType, ScenePoseAndWalkEventType } from "@mytypes/bodyTypes";
import { BasicScene } from "./BasicScene";
import { EventEmitter } from "@angular/core";

export abstract class SceneControllerAbstract {
    now: number = 0;
    scene!: BasicScene;
    lastData!: ScenePoseAndWalkEventType;
    videoSize!: GenericSizeType;

    constructor(public events: EventEmitter<AvatarBodyEvent>) {

    }

    async initialize(data: ControllerInitDataType) {
        this.scene = data.scene;
    }

    async preUpdate(data: ScenePoseAndWalkEventType): Promise<void> {
        this.lastData = data;
        this.videoSize = data.videoSize;
        this.now = new Date().getTime();
    }

    abstract update(): Promise<ControllerUpdateResponse>;

    abstract stop(): Promise<void>;

    abstract destroy(): Promise<void>;

    abstract onEvent(event: AvatarBodyEvent): void;
}