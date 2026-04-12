import { AbstractControllerExecutor } from "./AbstractControllerExecutor";

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