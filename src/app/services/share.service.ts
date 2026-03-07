import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ShareDataType, SharePayload, truncateString } from '@tools/UrlUtil';
import { environment } from 'environments/environment';
import { ClipboardUtil } from '@tools/Clipboard';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { QrDialogComponent, QrDialogData } from '@components/qr-dialog/qr-dialog';

@Injectable({ providedIn: 'root' })
export class ShareSrv {

    SIMPLIFY_MAP: { [key: string]: number } = {
        "pubknowledge": 1,
    };

    constructor(
        public snackBar: MatSnackBar,
        private dialog: MatDialog,
    ) {

    }

    getSharedURL(data: ShareDataType) {
        const payload: Record<string, any> = {
            col: data.collection,
            id: data.id,
            path: data.path,
        };
        if (data.updated) {
            payload["t"] = `${data.updated}`;
        }
        // Simplify here
        if (payload["col"] in this.SIMPLIFY_MAP) {
            payload["col"] = this.SIMPLIFY_MAP[payload["col"]];
            delete payload["path"];
        }
        const params = new URLSearchParams(payload);
        const url = `${environment.apiUrl}social?${params.toString()}`;
        return url;
    }

    async shareQR(data: ShareDataType | string) {
        let url = "";
        if (typeof data == "string") {
            url = data
        } else {
            url = this.getSharedURL(data);
        }
        const payload: QrDialogData = { url };
        if ((data as ShareDataType).emoji) {
            payload.emoji = (data as ShareDataType).emoji;
        }
        return firstValueFrom(this.dialog
            .open(QrDialogComponent, {
                width: '400px',
                //disableClose: true,
                data: payload,
                panelClass: '',
            })
            .afterClosed());
    }

    async share(data: ShareDataType, type: "link" | "qr") {
        if (type == "link") {
            await this.shareUrl(data);
        } else if (type == "qr") {
            await this.shareQR(data);
        }
    }

    async shareUrl(data: ShareDataType | string) {
        let url: string = "";
        if (typeof data == "string") {
            url = data;
            const shareData: SharePayload = {
                title: "",
                text: "",
                url,
            };
            this.shareOrCopy(shareData);
        } else {
            url = this.getSharedURL(data);
            const shareData: SharePayload = {
                title: truncateString(50, data.title),
                text: truncateString(120, data.description),
                url,
            };
            this.shareOrCopy(shareData);
        }
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