
// If need to call the main thread
// return await this.callMain("getSome", arg);
import { getHigherAvatarScoredPose } from "@avatar/AvatarUtilities";
import { WorkerData } from "@mytypes/BodyTypes";

export class WorkerControlForked {
    data: WorkerData | null = null;

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
};