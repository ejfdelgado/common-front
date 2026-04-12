import { WorkerData } from "@mytypes/BodyTypes";
import { AbstractControllerExecutor } from "./AbstractControllerExecutor";

// If need to call worker:
// return await this.callWorker("setValue", arg);

export class ControlProxy extends AbstractControllerExecutor {

    data: WorkerData | null = null;

    async setCurrentData(data: WorkerData) {
        this.data = data;
        await this.callWorker("setCurrentData", data);
    }
}