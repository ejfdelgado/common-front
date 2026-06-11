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
    };

    rightDrag: DragDataType = {
        current: { x: 0, y: 0 },
        start: null,
        delta: null,
    };

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
        // Check shoulder angle, or arm angle
        const comparable = this.lastData?.stateBody.comparable;
        if (!comparable) {
            return {};
        }
        const { armL, armR, handL, handR, leftHand, rightHand } = comparable;
        // 180° means arms down
        // 90° means arms pointing to the front
        // Also compute ray traicing

        const processHand = (
            type: CursorDataSide,
            point3D: Point3D,
            dragData: DragDataType,
        ) => {
            const pointer = this.computeCursor(point3D);
            dragData.current.x = pointer.x;
            dragData.current.y = pointer.y;
            if (dragData.start && dragData.delta) {
                dragData.delta.x = dragData.start.x - pointer.x;
                dragData.delta.y = dragData.start.y - pointer.y;
            }
            if (this.cursorDisplay) {
                this.cursorDisplay.setCursor({
                    type: type,
                    x: pointer.x,
                    y: pointer.y,
                });
            }
        };

        processHand("L", leftHand, this.leftDrag);
        processHand("R", rightHand, this.rightDrag);

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
        } else if (event.name == "Right_HAND_OPEN") {
            this.rightDrag.start = null;
            this.rightDrag.delta = null;
        }
    }
}