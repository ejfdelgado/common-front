
export interface TimedDataType {
    v: number;
    t: number;
}

export class SignalLowPass {

    history: TimedDataType[] = [];

    constructor(private maxMillis: number) {

    }

    addValue(v: number) {
        this.history.push({ v, t: Date.now() });
        this.fix();
    }

    fix() {
        const threshold = Date.now() - this.maxMillis;
        while (this.history.length > 1 && this.history[0].t < threshold) {
            this.history.splice(0, 1);
        }
    }

    compute() {
        this.fix();
        let sum = 0;
        const tam = this.history.length;
        for (let i = 0; i < tam; i++) {
            sum += this.history[i].v;
        }
        if (tam > 0) {
            return sum / tam;
        }
        return 0;
    }
}