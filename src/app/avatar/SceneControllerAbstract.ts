import {
    AvatarBodyEvent,
    ControllerInitDataType,
    ControllerUpdateResponse,
    GenericSizeType,
    ScenePoseAndWalkEventType,
} from "@mytypes/BodyTypes";
import { EventEmitter } from "@angular/core";
import { SceneWithComposer } from "./SceneWithComposer";

export abstract class SceneControllerAbstract {
    now: number = 0;
    scene!: SceneWithComposer;
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