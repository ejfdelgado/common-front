import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface AdvanceStateType {
    inUse: boolean;
    percentage?: number;
}

@Injectable({
    providedIn: 'root'
})
export class BooleanStateService {

    // Internal subject that can emit boolean values
    private stateSubject = new BehaviorSubject<AdvanceStateType>({ inUse: false, percentage: 0 });

    // Exposed observable (read-only)
    state$: Observable<AdvanceStateType> = this.stateSubject.asObservable();

    // Method for any component to emit a new value
    setState(value: AdvanceStateType): void {
        this.stateSubject.next(value);
    }

    // Optional getter for current value
    get currentValue(): AdvanceStateType {
        return this.stateSubject.value;
    }
}
