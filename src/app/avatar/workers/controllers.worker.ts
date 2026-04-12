/// <reference lib="webworker" />

const pending = new Map();

function callMain(funName: string, argument: any) {
    return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        pending.set(id, { resolve, reject });
        const payload = { funName, argument };
        self.postMessage({ id, type: 'CALL_MAIN', payload });
    });
}

self.onmessage = async (e) => {
    const { type, payload, id, success } = e.data;
    if (type == 'RESPONSE_MAIN') {
        if (success === true) {
            pending.get(id)?.resolve(payload);
        } else {
            pending.get(id)?.reject(payload);
        }
        pending.delete(id);
    } else if (type == 'CALL_WORKER') {
        const { funName, argument } = payload;
        try {
            const result = await (instance as any)[funName](argument);
            self.postMessage({
                id,
                type: 'RESPONSE_WORKER',
                payload: result,
                success: true,
            });
        } catch (err) {
            self.postMessage({
                id,
                type: 'RESPONSE_WORKER',
                payload: err,
                success: false,
            });
        }
    } else if (type === 'ECHO') {
        self.postMessage({ type: 'ECHO_RESULTS', payload: payload });
    }
};

class ControllerWorker {
    val: number = 0;

    constructor() {

    }

    async setValue(val: number) {
        this.val = val;
        return `Ok ${val}`;
    }

    async getSome(arg: number) {
        return await callMain("getSome", arg);
    }

    async getValue() {
        const computed = await this.getSome(this.val);
        return computed;
    }
}

const instance = new ControllerWorker();

self.postMessage({ type: 'READY' });