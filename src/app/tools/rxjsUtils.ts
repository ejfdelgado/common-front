import { filter, map, MonoTypeOperatorFunction, scan } from 'rxjs';

export function distinctUntilKeyChangedWithTTL<T>(
    key: keyof T,
    ttlMs: number
): MonoTypeOperatorFunction<T> {
    return source =>
        source.pipe(
            scan((state, value) => {
                const now = Date.now();
                const k = value[key] as any;
                const last = state.map.get(k);

                if (!last || now - last > ttlMs) {
                    state.map.set(k, now);
                    state.emit = value;
                } else {
                    state.emit = null;
                }

                return state;
            }, { map: new Map<any, number>(), emit: null as T | null }),
            filter(s => s.emit !== null),
            map(s => s.emit!)
        );
}