
// If need to call the main thread
// return await this.callMain("getSome", arg);
import { WorkerData } from "@mytypes/BodyTypes";

export class WorkerControlForked {
    //data: WorkerData | null = null;

    constructor(
        public callMain: Function,
    ) { }
    /*
    async setCurrentData(data: WorkerData) {
        this.data = data;
    }
    */
};