import {
    AvatarBodyEvent,
    ControllerUpdateResponse,
    CursorPositioner,
    GenericSizeType,
    ScenePoseAndWalkEventType,
} from "@mytypes/BodyTypes";
import { EventEmitter } from "@angular/core";
import { SceneWithComposer } from "../SceneWithComposer";
import { ControllerInitDataType } from "@mytypes/BodyTypesExtra";
import { ControlProxy } from "../workers/ControlProxy";
import { P2PService } from "@services/p2p.service";
import { computeAverageByNames, computeDistance } from "@avatar/utils/AvatarUtilities";

export abstract class SceneControllerAbstract {
    enabled: boolean = true;
    now: number = 0;
    scene!: SceneWithComposer;
    lastData!: ScenePoseAndWalkEventType;
    videoSize!: GenericSizeType;
    cursorDisplay: CursorPositioner | null = null;

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

    computeDistanceByName(aName: string, bName: string) {
        const a = this.lastData.keypoints3DMap[aName];
        const b = this.lastData.keypoints3DMap[bName];
        return computeDistance(a, b);
    }

    abstract stop(): Promise<void>;

    abstract destroy(): Promise<void>;

    abstract onEvent(event: AvatarBodyEvent): void;

    setCursorDisplay(cursorDisplay: CursorPositioner) {
        this.cursorDisplay = cursorDisplay;
    }

    setParams(params: {
        [key: string]: any;
    }) {

    }
}