import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse, Point3D } from "@mytypes/BodyTypes";
import { EventEmitter } from "@angular/core";
import { ControlProxy } from "../workers/ControlProxy";
import { P2PService } from "src/app/services/p2p.service";

export class ArmsPointerController extends SceneControllerAbstract {

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
        const leftPointer = this.computeCursor(leftHand);
        const rightPointer = this.computeCursor(rightHand);

        if (this.cursorDisplay) {
            this.cursorDisplay.setCursor({
                type: "L",
                x: leftPointer.x,
                y: leftPointer.y,
            });
            this.cursorDisplay.setCursor({
                type: "R",
                x: rightPointer.x,
                y: rightPointer.y,
            });
        }

        return {};
    }

    computeCursor(arrow: Point3D) {

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

    }
}