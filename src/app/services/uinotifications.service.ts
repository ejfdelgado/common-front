import { Injectable } from "@angular/core";
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";

@Injectable({ providedIn: 'root' })
export class UINotificationSrv {
    constructor(
        public snackBar: MatSnackBar,
        private dialog: MatDialog,
    ) {

    }
    public show(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: []
        });
    }
}