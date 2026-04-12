
export abstract class AbstractControllerExecutor {
    pending = new Map();
    worker!: Worker;
    ready!: Promise<void>;
    isReady: boolean = false;

    constructor() {
        this.warmUp();
    }

    async warmUp() {
        this.worker = new Worker(
            new URL('./controllers.worker', import.meta.url),
            { type: 'module' }
        );
        this.ready = new Promise((resolve, reject) => {
            this.worker.onmessage = async (event) => {
                const { type, payload, id, success } = event.data;
                if (type === 'READY') {
                    this.isReady = true;
                    resolve();
                } else if (type == "RESPONSE_WORKER") {
                    if (success === true) {
                        this.pending.get(id)?.resolve(payload);
                    } else {
                        this.pending.get(id)?.reject(payload);
                    }
                    this.pending.delete(id);
                } else if (type == "CALL_MAIN") {
                    const { funName, argument } = (payload as any);
                    try {
                        const result = await (this as any)[funName](argument);
                        this.worker.postMessage({
                            id,
                            type: 'RESPONSE_MAIN',
                            payload: result,
                            success: true,
                        });
                    } catch (err) {
                        this.worker.postMessage({
                            id,
                            type: 'RESPONSE_MAIN',
                            payload: err,
                            success: false,
                        });
                    }
                }
            };
            this.worker.onerror = (err: any) => {
                this.isReady = false;
                reject(err);
            }
        });
    }

    async callWorker(funName: string, argument: any = {}) {
        return new Promise((resolve, reject) => {
            const id = crypto.randomUUID();
            this.pending.set(id, { resolve, reject });
            const payload = { funName, argument };
            this.worker.postMessage({ id, type: 'CALL_WORKER', payload });
        });
    }
}