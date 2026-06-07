import { SceneControllerAbstract } from "@avatar/controllers/SceneControllerAbstract";
import { AvatarBodyEvent, ControllerUpdateResponse } from "@mytypes/BodyTypes";
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

        // Check shoulder angle, or arm angle
        // Also compute ray traicing
    }

    override async update(): Promise<ControllerUpdateResponse> {


        return {};
    }

    override async stop(): Promise<void> {

    }

    override async destroy(): Promise<void> {

    }

    override onEvent(event: AvatarBodyEvent): void {

    }
}