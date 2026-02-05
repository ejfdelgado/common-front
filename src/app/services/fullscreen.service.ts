import { Injectable } from "@angular/core";
import { enterFullscreen, exitFullscreen } from "@tools/ScreenUtils";
import { Subject } from "rxjs";

@Injectable({
    providedIn: 'root',
})
export class FullscreenService {
    state: Subject<boolean> = new Subject();
    full: boolean = false;

    isFull() {
        return this.full;
    }

    enterFullscreen() {
        this.full = true;
        this.apply();
        this.state.next(true);
    }

    exitFullscreen() {
        this.full = false;
        this.apply();
        this.state.next(false);
    }

    toggleFullscreen() {
        this.full = !this.full;
        this.apply();
        this.state.next(this.full);
    }

    getState() {
        return this.state;
    }

    apply() {
        if (this.full) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    }
}