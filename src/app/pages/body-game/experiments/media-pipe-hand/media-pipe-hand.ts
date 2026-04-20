import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import {
  ActionSender,
  DataPayload,
  Room
} from '@trystero-p2p/firebase';
import { CommonModule } from '@angular/common';
import { P2PService, P2PStatus } from '@services/p2p.service';
import { TranslatePipe } from '@pipes/translate.pipe';

const appId = 'ejfexperiments';

@Component({
  selector: 'app-media-pipe-hand',
  standalone: true,
  imports: [
    CommonModule,
    TranslatePipe,
  ],
  templateUrl: './media-pipe-hand.html',
  styleUrl: './media-pipe-hand.scss',
})
export class MediaPipeHand implements AfterViewInit {
  room: Room | null = null;
  sendBinaryData: ActionSender<DataPayload> | null = null;
  localStream: MediaStream | null = null;
  remoteAudios: HTMLAudioElement[] = [];
  commonData: { [key: string]: any } = {};
  status: P2PStatus = { value: "offline" };

  constructor(
    public p2pSrv: P2PService,
    public cdr: ChangeDetectorRef,
  ) {
    this.p2pSrv.status.subscribe((ev) => {
      this.status = ev;
      this.cdr.detectChanges();
    });
    this.p2pSrv.events.subscribe((ev) => {
      const { peer, payload } = ev;
      this.commonData[peer] = payload;
      this.cdr.detectChanges();
    });
  }

  ngAfterViewInit(): void {

  }

  async disconnectFromRoom() {
    await this.p2pSrv.disconnectFromRoom();
    this.cdr.detectChanges();
  }

  async connectToRoom() {
    await this.p2pSrv.connectToRoom('room-1');
  }

  async broadcastBinaryData() {
    const sample = { t: Date.now() };
    this.p2pSrv.broadcastBinaryData(sample);
  }
}
