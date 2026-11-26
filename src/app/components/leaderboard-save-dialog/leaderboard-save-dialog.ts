import { AsyncPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslatePipe } from 'src/app/pipes/translate.pipe';

export interface LeaderboardSaveDialogData {
  points: number;
  // Shown again after a cancelled or failed sign-in.
  loginFailed?: boolean;
}

// What the anonymous user chose. Closing the dialog any other way (X, Esc)
// returns undefined, which means "don't save".
export type LeaderboardSaveDialogResult =
  | { action: 'login' }
  | { action: 'anonymous'; displayName: string };

export const ANONYMOUS_NAME_MAX_LENGTH = 30;
// Remembered so a returning guest doesn't retype the name after every game.
const LAST_NAME_KEY = 'leaderboard.anonymousName';

@Component({
  selector: 'app-leaderboard-save-dialog',
  imports: [
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIcon,
    MatFormFieldModule,
    MatInputModule,
    TranslatePipe,
    AsyncPipe,
  ],
  templateUrl: './leaderboard-save-dialog.html',
  styleUrl: './leaderboard-save-dialog.scss',
})
export class LeaderboardSaveDialog {
  readonly maxLength = ANONYMOUS_NAME_MAX_LENGTH;
  displayName = '';

  constructor(
    private dialogRef: MatDialogRef<LeaderboardSaveDialog, LeaderboardSaveDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: LeaderboardSaveDialogData,
  ) {
    try {
      this.displayName = localStorage.getItem(LAST_NAME_KEY) ?? '';
    } catch (err) {}
  }

  get trimmedName(): string {
    return this.displayName.trim().slice(0, ANONYMOUS_NAME_MAX_LENGTH);
  }

  login() {
    this.dialogRef.close({ action: 'login' });
  }

  saveAnonymous() {
    const displayName = this.trimmedName;
    if (!displayName) {
      return;
    }
    try {
      localStorage.setItem(LAST_NAME_KEY, displayName);
    } catch (err) {}
    this.dialogRef.close({ action: 'anonymous', displayName });
  }

  cancel() {
    this.dialogRef.close();
  }
}
