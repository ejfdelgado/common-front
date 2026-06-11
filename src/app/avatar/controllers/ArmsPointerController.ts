import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse, CursorData, CursorDataSide, DragDataType, Point2D, Point3D } from "@mytypes/BodyTypes";
import { EventEmitter } from "@angular/core";
import { ControlProxy } from "../workers/ControlProxy";
import { P2PService } from "src/app/services/p2p.service";

export class ArmsPointerController extends SceneControllerAbstract {

    leftDrag: DragDataType = {
        current: { x: 0, y: 0 },
        start: null,
        delta: null,
        intentionXY: null,
    };

    rightDrag: DragDataType = {
        current: { x: 0, y: 0 },
        start: null,
        delta: null,
        intentionXY: null,
    };

    usingHands: boolean = false;
    USER_ARE_USING_HANDS_THRESHOLD = 0.9;
    INTENTION_THRESHOLD = 0.075;
    videoRatio: number = 0;

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
    }

    override async update(): Promise<ControllerUpdateResponse> {
        if (this.videoRatio == 0) {
            this.videoRatio = this.videoSize.width / this.videoSize.height;
        }
        // Check shoulder angle, or arm angle
        const comparable = this.lastData?.stateBody.comparable;
        if (!comparable) {
            return {};
        }
        const {
            leftHand,
            rightHand,
        } = comparable;
        // 180° means arms down
        // 90° means arms pointing to the front
        // Also compute ray traicing

        const processHand = (
            type: CursorDataSide,
            point3D: Point3D,
            dragData: DragDataType,
        ): boolean => {
            const pointer = this.computeCursor(point3D);

            const normY = (pointer.y * 2) - 1;
            // pointing upward = -1
            // at center = 0
            // pointing downward = 1
            if (normY >= this.USER_ARE_USING_HANDS_THRESHOLD) {
                // Leave drag and open
                return false;
            }

            dragData.current.x = pointer.x;
            dragData.current.y = pointer.y;
            if (dragData.start && dragData.delta) {
                dragData.delta.x = dragData.start.x - pointer.x;
                dragData.delta.y = dragData.start.y - pointer.y;
                if (dragData.intentionXY == null) {
                    const normalizedX = Math.abs(dragData.delta.x * this.videoRatio);
                    const normalizedY = Math.abs(dragData.delta.y);
                    if (normalizedX > this.INTENTION_THRESHOLD) {
                        dragData.intentionXY = "X";
                    } else if (normalizedY > this.INTENTION_THRESHOLD) {
                        dragData.intentionXY = "Y";
                    }
                }
            }
            if (this.cursorDisplay) {
                this.cursorDisplay.setCursor({
                    type: type,
                    x: pointer.x,
                    y: pointer.y,
                });
            }
            return true;
        };

        const useLeft = processHand("L", leftHand, this.leftDrag);
        const useRight = processHand("R", rightHand, this.rightDrag);

        if (useLeft || useRight) {
            if (!this.usingHands) {
                // Fire event of using hands
                this.usingHands = true;
            }
        } else {
            if (this.usingHands) {
                // Fire event of DONT using hands
                this.usingHands = false;
            }
        }

        return {};
    }

    computeCursor(arrow: Point3D): Point2D {

        return {
            x: ((1 - (1 - arrow.y) * 0.5)),
            y: (((1 - arrow.z) * 0.5)),
        };
    }

    override async stop(): Promise<void> {

    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {
        if (event.name == "Left_HAND_CLOSE") {
            this.leftDrag.start = {
                x: this.leftDrag.current.x,
                y: this.leftDrag.current.y,
            };
            this.leftDrag.delta = { x: 0, y: 0 };
        } else if (event.name == "Right_HAND_CLOSE") {
            this.rightDrag.start = {
                x: this.rightDrag.current.x,
                y: this.rightDrag.current.y,
            };
            this.rightDrag.delta = { x: 0, y: 0 };
        } else if (event.name == "Left_HAND_OPEN") {
            this.leftDrag.start = null;
            this.leftDrag.delta = null;
            this.leftDrag.intentionXY = null;
        } else if (event.name == "Right_HAND_OPEN") {
            this.rightDrag.start = null;
            this.rightDrag.delta = null;
            this.rightDrag.intentionXY = null;
        }
    }
}