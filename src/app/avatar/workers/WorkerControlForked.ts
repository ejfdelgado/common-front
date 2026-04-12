
// If need to call the main thread
// return await this.callMain("getSome", arg);
import { computeComparableBody, getHigherAvatarScoredPose } from "@avatar/AvatarUtilities";
import { BodyData, BodyKeyPointData, FrontComputationType, WorkerData } from "@mytypes/BodyTypes";
import {
    CCDIKSolver,
    CCDIKHelper,
} from 'three/examples/jsm/animation/CCDIKSolver.js';

export class WorkerControlForked {
    data: WorkerData | null = null;
    ikSolver: CCDIKSolver | null = null;

    constructor(
        public callMain: Function,
    ) { }

    async setCurrentData(data: WorkerData) {
        this.data = data;
    }

    async getHigherAvatarScoredPose() {
        if (!this.data) { throw new Error("No data provided"); }
        return getHigherAvatarScoredPose(this.data.poses, this.data.videoSize);
    }

    async computeComparableBody(arg: { pose: BodyData, mirror: boolean }): Promise<{
        keypoints3DMap: {
            [key: string]: BodyKeyPointData;
        },
        frontData: FrontComputationType,
        pose: BodyData,
    }> {
        return computeComparableBody(arg.pose, arg.mirror);
    }
};