import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import {
  ActionSender,
  DataPayload,
  Room
} from '@trystero-p2p/firebase';
import { CommonModule } from '@angular/common';
import { P2PService, P2PStatus } from '@services/p2p.service';
import { TranslatePipe } from '@pipes/translate.pipe';
import { ModalService } from '@services/modal.service';
import { GenericData } from 'app/modals/generic/generic.component';

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
    public modalSrv: ModalService,
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

  public async alert() {
    this.modalSrv.alert({
      translateFolder: "test",
      title: 'popups.alert.title',
      txt: 'popups.alert.text',
      model: {
        userName: "Pepito",
      },
    });
  }

  public async confirmReal(userName: string) {
    const desition = (await this.modalSrv.confirm({
      title: 'popups.alert.title',
      txt: 'popups.alert.text',
      translateFolder: "test",
      model: {
        userName,
      },
    }));
    console.log(`desition = ${desition}`);
  }

  public async confirmThis(userName: string) {
    const popUpParameter: GenericData = {
      translateFolder: 'test',
      title: 'popups.alert.title',
      txt: 'popups.alert.text',
      model: {
        userName,
      },
      ishtml: true,
      choices: [
        { txt: 'popups.choices.yes', val: 'yes', icon: "check" },
        { txt: 'popups.choices.no', val: 'no', icon: "close", class: "btn-secondary" },
      ],
    };
    const modalResponse = (await this.modalSrv.generic(popUpParameter)) as {
      choice: string;
    };

    console.log(`modalResponse = ${JSON.stringify(modalResponse)}`);

    if (!modalResponse || modalResponse.choice === 'no') {
      return false;
    }
    return true;
  }
}
