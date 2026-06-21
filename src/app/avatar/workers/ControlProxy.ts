import { BodyData, BodyKeyPointData, FrontComputationType, WorkerData } from "@mytypes/BodyTypes";
import { AbstractControllerExecutor } from "./AbstractControllerExecutor";
import { AvatarScore } from "../utils/AvatarUtilities";

// If need to call worker:
// return await this.callWorker("setValue", arg);

export class ControlProxy extends AbstractControllerExecutor {

    data: WorkerData | null = null;

    async setCurrentData(data: WorkerData) {
        this.data = data;
        await this.callWorker("setCurrentData", data);
    }

    async getHigherAvatarScoredPose(): Promise<{
        pose: BodyData,
        score: AvatarScore,
    }> {
        return await this.callWorker("getHigherAvatarScoredPose") as any;
    }

    async computeComparableBody(pose: BodyData, mirror: boolean): Promise<{
        keypoints3DMap: {
            [key: string]: BodyKeyPointData;
        },
        frontData: FrontComputationType,
        pose: BodyData,
    }> {
        return await this.callWorker("computeComparableBody", { pose, mirror }) as any;
    }
}