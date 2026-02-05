import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({
    providedIn: 'root',
})
export class SideMenuService {
    state: Subject<boolean> = new Subject();
    opened: boolean = false;

    isOpened() {
        return this.opened;
    }

    open() {
        this.state.next(true);
        this.opened = true;
    }

    close() {
        this.state.next(false);
        this.opened = false;
    }

    toggle() {
        this.opened = !this.opened;
        this.state.next(this.opened);
    }

    getState() {
        return this.state;
    }
}