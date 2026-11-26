import { HttpClient, HttpParams } from '@angular/common/http';
import { IndicatorService } from './indicator.service';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { firstValueFrom, map } from 'rxjs';
import { encode } from '@msgpack/msgpack';
import { Buffer } from 'buffer';
import { ParamsService } from './params.service';
import { ApiResponse } from 'types/file';
import { LeaderEntryType, LeaderboardReadType } from 'types/LeaderBoardTypes';
import { MatDialog } from '@angular/material/dialog';
// Type-only: erased at compile time. The component itself is imported
// dynamically in openDialog() because it depends (via Leaderboard) on this
// service, and a static import would create a circular module dependency.
import type { LeaderboardDialogData } from '@components/leaderboard-dialog/leaderboard-dialog';
import type {
  LeaderboardSaveDialogData,
  LeaderboardSaveDialogResult,
} from '@components/leaderboard-save-dialog/leaderboard-save-dialog';

@Injectable({
  providedIn: 'root',
})
export class LeaderBoardService {
  static tempPass: string = ParamsService.generateKey();

  constructor(
    private http: HttpClient,
    private indicatorSrv: IndicatorService,
    private paramsSrv: ParamsService,
    private dialog: MatDialog,
  ) {}

  /**
   * Opens a dialog with the room's leaderboard.
   * Resolves when the dialog is closed.
   */
  async openDialog(roomId: string): Promise<void> {
    const { LeaderboardDialog } = await import(
      '@components/leaderboard-dialog/leaderboard-dialog'
    );
    const data: LeaderboardDialogData = { roomId };
    const dialogRef = this.dialog.open(LeaderboardDialog, {
      data,
      width: '520px',
      maxWidth: '95vw',
      height: '80vh',
    });
    await firstValueFrom(dialogRef.afterClosed());
  }

  /**
   * Asks an anonymous user how to save their score: sign in, or type a name.
   * Resolves undefined when they choose not to save it.
   */
  async openSaveDialog(
    points: number,
    loginFailed = false,
  ): Promise<LeaderboardSaveDialogResult | undefined> {
    const { LeaderboardSaveDialog } = await import(
      '@components/leaderboard-save-dialog/leaderboard-save-dialog'
    );
    const data: LeaderboardSaveDialogData = { points, loginFailed };
    const dialogRef = this.dialog.open(LeaderboardSaveDialog, {
      data,
      width: '420px',
      maxWidth: '95vw',
    });
    return firstValueFrom(dialogRef.afterClosed());
  }

  /**
   * Submits a score for a room.
   * - Logged user: the AuthInterceptor sends the token; the backend keeps
   *   one entry per (roomId, user) with the best score. displayName is ignored.
   * - Anonymous user: displayName is required; every call creates a new entry.
   */
  async write(roomId: string, points: number, displayName?: string): Promise<void> {
    const indicator = this.indicatorSrv.start();
    try {
      // Same envelope as ChatGeminiService.generateContent: msgpack-encoded
      // JSON with an RSA-encrypted pass; the response comes AES-encrypted.
      const payload: {
        roomId: string;
        points: number;
        displayName?: string;
        pass: string | false;
      } = {
        roomId,
        points,
        pass: await this.paramsSrv.getEncriptedKey(LeaderBoardService.tempPass),
      };
      if (displayName) {
        payload.displayName = displayName;
      }
      const encoded: Uint8Array = encode(JSON.stringify(payload));
      const buffer = Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength);
      const response: ApiResponse = await firstValueFrom(
        this.http
          .post(environment.apiUrl + 'leaderboard/write', buffer, {
            responseType: 'text',
          })
          .pipe(
            map((rawData: string) => {
              const decripted = ParamsService.decryptAES(
                rawData,
                (LeaderBoardService.tempPass + 'a').split('').reverse().join(''),
              );
              return JSON.parse(decripted);
            }),
          ),
      );
      if (!response.success) {
        throw new Error(response.message);
      }
    } finally {
      indicator.done();
    }
  }

  /**
   * Reads one page of a room's leaderboard, best score first.
   * The backend caps limit at 100.
   * type: ALL (default), SIGNED (logged users only) or ANONYMOUS.
   */
  async read(
    roomId: string,
    limit = 10,
    offset = 0,
    type: LeaderboardReadType = 'ALL',
  ): Promise<LeaderEntryType[]> {
    const params = new HttpParams()
      .set('roomId', roomId)
      .set('limit', limit)
      .set('offset', offset)
      .set('type', type);
    const indicator = this.indicatorSrv.start();
    try {
      const response = await firstValueFrom(
        this.http.get<ApiResponse>(environment.apiUrl + 'leaderboard/read', {
          params,
        }),
      );
      if (!response.success) {
        throw new Error(response.message);
      }
      return (response.data ?? []) as LeaderEntryType[];
    } finally {
      indicator.done();
    }
  }
}
