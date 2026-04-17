import {
    AvatarBodyEvent,
    ControllerUpdateResponse,
    GenericSizeType,
    ScenePoseAndWalkEventType,
} from "@mytypes/BodyTypes";
import { EventEmitter } from "@angular/core";
import { SceneWithComposer } from "../SceneWithComposer";
import { ControllerInitDataType } from "@mytypes/BodyTypesExtra";
import { ControlProxy } from "../workers/ControlProxy";
import { P2PService } from "@services/p2p.service";

export abstract class SceneControllerAbstract {
    now: number = 0;
    scene!: SceneWithComposer;
    lastData!: ScenePoseAndWalkEventType;
    videoSize!: GenericSizeType;

    constructor(
        public events: EventEmitter<AvatarBodyEvent>,
        public controlProxy: ControlProxy,
        public p2pSrv: P2PService,
    ) {

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

    async postUpdate(): Promise<void> {
        return;
    }

    abstract stop(): Promise<void>;

    abstract destroy(): Promise<void>;

    abstract onEvent(event: AvatarBodyEvent): void;

    setParams(params: {
        [key: string]: any;
    }) {

    }
}