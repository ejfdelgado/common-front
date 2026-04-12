
export class ControllerWorker {
    val: number = 0;

    constructor(
        private callMain: Function,
    ) {

    }

    async setValue(val: number) {
        this.val = val;
        return `Ok ${val}`;
    }

    async getSome(arg: number) {
        return await this.callMain("getSome", arg);
    }

    async getValue() {
        const computed = await this.getSome(this.val);
        return computed;
    }
};