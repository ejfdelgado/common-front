import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '@components/confirm-dialog/confirm-dialog';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
    constructor(private dialog: MatDialog) { }

    confirm(data: ConfirmDialogData): Promise<boolean> {
        return firstValueFrom(this.dialog
            .open(ConfirmDialogComponent, {
                width: '400px',
                disableClose: true,
                data,
                panelClass: 'custom-emoji-picker',
            })
            .afterClosed());
    }
}
