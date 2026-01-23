import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShareDataType, SharePayload, truncateString } from '@tools/UrlUtil';
import { environment } from 'environments/environment';
import { ClipboardUtil } from '@tools/Clipboard';

@Injectable({ providedIn: 'root' })
export class ShareSrv {

    constructor(
        public snackBar: MatSnackBar,
    ) {

    }

    async share(data: ShareDataType) {
        const payload: Record<string, string> = {
            col: data.collection,
            id: data.id,
            path: data.path,
        };
        if (data.updated) {
            payload["t"] = `${data.updated}`;
        }
        const params = new URLSearchParams(payload);
        const url = `${environment.apiUrl}social?${params.toString()}`;
        const shareData: SharePayload = {
            title: truncateString(50, data.title),
            text: truncateString(120, data.description),
            url,
        };
        this.shareOrCopy(shareData);
    }

    async shareOrCopy(payload: SharePayload): Promise<void> {
        // Mobile / supported browsers
        if (navigator.share && navigator.canShare?.(payload)) {
            try {
                await navigator.share(payload);
                return;
            } catch (err) {
                // User cancelled or share failed → fallback
                console.warn('Share cancelled or failed, falling back to copy', err);
            }
        }

        // Desktop / fallback
        const textToCopy =
            payload.url ?? payload.text ?? payload.title ?? '';

        if (!textToCopy) return;

        await ClipboardUtil.writeText(textToCopy);
        this.show("Enlace copiado!");
    }

    public show(message: string): void {
        this.snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: []
        });
    }
}