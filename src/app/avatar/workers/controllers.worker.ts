/// <reference lib="webworker" />

const pending = new Map();

function callMain(funName: string, argument: any) {
    return new Promise((resolve) => {
        const id = crypto.randomUUID();
        pending.set(id, { resolve });
        const payload = { funName, argument };
        self.postMessage({ id, type: 'CALL_MAIN', payload });
    });
}

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;
    if (type == 'RESPONSE_MAIN') {
        pending.get(id)?.resolve(payload);
        pending.delete(id);
    } else if (type == 'CALL_WORKER') {
        const { funName, argument } = payload;
        try {
            const result = await (instance as any)[funName](argument);
            self.postMessage({
                id,
                type: 'RESPONSE_WORKER',
                result,
                success: true,
            });
        } catch (err) {
            self.postMessage({
                id,
                type: 'RESPONSE_WORKER',
                err,
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
}

const instance = new ControllerWorker();

self.postMessage({ type: 'READY' });