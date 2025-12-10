import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class BooleanStateService {

    // Internal subject that can emit boolean values
    private stateSubject = new BehaviorSubject<boolean>(false);

    // Exposed observable (read-only)
    state$: Observable<boolean> = this.stateSubject.asObservable();

    // Method for any component to emit a new value
    setState(value: boolean): void {
        this.stateSubject.next(value);
    }

    // Optional getter for current value
    get currentValue(): boolean {
        return this.stateSubject.value;
    }
}
