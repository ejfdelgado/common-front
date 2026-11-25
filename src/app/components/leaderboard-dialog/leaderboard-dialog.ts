import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Leaderboard } from '@components/leaderboard/leaderboard';

export interface LeaderboardDialogData {
  roomId: string;
}

@Component({
  selector: 'app-leaderboard-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIcon, Leaderboard],
  templateUrl: './leaderboard-dialog.html',
  styleUrl: './leaderboard-dialog.scss',
})
export class LeaderboardDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: LeaderboardDialogData) {}
}
