import { AbstractControllerExecutor } from "./AbstractControllerExecutor";

// If need to call worker:
// return await this.callWorker("setValue", arg);

export class ControlProxy extends AbstractControllerExecutor {

    async getSome(arg: number) {
        return arg * 100;
    }

    async getOther(arg: number) {
        return await this.callWorker("setValue", arg);
    }

    async getValue() {
        return await this.callWorker("getValue");
    }
}