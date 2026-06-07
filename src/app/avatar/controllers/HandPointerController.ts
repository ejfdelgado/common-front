import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { LandmarkList, NormalizedLandmarkList } from "@mediapipe/pose";
import { HandIdType, HandKey } from "@mytypes/BodyParts";
import { AvatarBodyEvent, ControllerUpdateResponse, Point3D } from "@mytypes/BodyTypes";
import { angleBetweenDegrees } from "../utils/AvatarUtilities";
import { EventEmitter } from "@angular/core";
import { ControlProxy } from "../workers/ControlProxy";
import { P2PService } from "src/app/services/p2p.service";

export class HandPointerController extends SceneControllerAbstract {

    HAND_TRESHOLD = 0.8;
    FINGER_CLOSE_DEG_THRESHOLD_ON = 70;
    FINGER_CLOSE_DEG_THRESHOLD_OFF = 50;

    currentState: Map<HandIdType, boolean> = new Map();

    constructor(
        public override events: EventEmitter<AvatarBodyEvent>,
        public override controlProxy: ControlProxy,
        public override p2pSrv: P2PService,
    ) {
        super(
            events,
            controlProxy,
            p2pSrv,
        );
        this.currentState.set("Left", false);
        this.currentState.set("Right", false);
    }

    override async update(): Promise<ControllerUpdateResponse> {
        const hands = this.lastData.hands;
        hands.forEach((hand, handId) => {
            const {
                score,
                multiHandLandmarks,
                multiHandWorldLandmarks,
            } = hand;
            if (score > this.HAND_TRESHOLD) {
                try {
                    this.processHand(
                        handId,
                        multiHandLandmarks,
                        multiHandWorldLandmarks,
                    );
                } catch (err) {
                    console.error(err);
                }
            }
        });

        return {};
    }

    override async stop(): Promise<void> {

    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {

    }

    getVectorBetween(head: HandKey, tail: HandKey, list: LandmarkList): Point3D {
        const pHead = list[head];
        const pTail = list[tail];
        return {
            x: pHead.x - pTail.x,
            y: pHead.y - pTail.y,
            z: pHead.z - pTail.z,
        }
    }

    isFingerClose(
        f1: HandKey,
        f2: HandKey,
        f3: HandKey,
        list: LandmarkList
    ) {
        const angle = angleBetweenDegrees(
            this.getVectorBetween(f2, f3, list),
            this.getVectorBetween(f1, f2, list),
        );
        return Math.round(angle);
    }

    processHand(
        handId: HandIdType,
        multiHandLandmarks: NormalizedLandmarkList,
        multiHandWorldLandmarks?: LandmarkList,
    ) {
        if (!multiHandWorldLandmarks) {
            return;
        }
        //Use angleBetweenDegrees
        const indexClose = this.isFingerClose(
            HandKey.INDEX_DIP,
            HandKey.INDEX_PIP,
            HandKey.INDEX_MCP,
            multiHandWorldLandmarks,
        );
        const middleClose = this.isFingerClose(
            HandKey.MIDDLE_DIP,
            HandKey.MIDDLE_PIP,
            HandKey.MIDDLE_MCP,
            multiHandWorldLandmarks,
        );
        const ringClose = this.isFingerClose(
            HandKey.RING_DIP,
            HandKey.RING_PIP,
            HandKey.RING_MCP,
            multiHandWorldLandmarks,
        );
        const pinkyClose = this.isFingerClose(
            HandKey.PINKY_DIP,
            HandKey.PINKY_PIP,
            HandKey.PINKY_MCP,
            multiHandWorldLandmarks,
        );

        const angleAvg = (
            indexClose +
            middleClose +
            ringClose +
            pinkyClose
        ) / 4;

        const lastIsClosed = this.currentState.get(handId);
        if (lastIsClosed) {
            if (Math.abs(angleAvg) < this.FINGER_CLOSE_DEG_THRESHOLD_OFF) {
                this.currentState.set(handId, false);
                this.events.emit({
                    name: `${handId}_HAND_CLOSE`,
                });
                if (this.cursorDisplay) {
                    this.cursorDisplay.setCursorState({
                        type: handId == "Left" ? "L" : "R",
                        state: "on"
                    });
                }
            }
        } else {
            if (Math.abs(angleAvg) > this.FINGER_CLOSE_DEG_THRESHOLD_ON) {
                this.currentState.set(handId, true);
                this.events.emit({
                    name: `${handId}_HAND_OPEN`,
                });
                if (this.cursorDisplay) {
                    this.cursorDisplay.setCursorState({
                        type: handId == "Left" ? "L" : "R",
                        state: "off"
                    });
                }
            }
        }
    }
}