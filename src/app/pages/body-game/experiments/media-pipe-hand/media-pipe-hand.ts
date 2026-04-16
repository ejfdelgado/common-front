import { AfterViewInit, ChangeDetectorRef, Component } from '@angular/core';
import { defaultFirebaseApp } from '@services/firebase';
import {
  ActionReceiver,
  ActionSender,
  DataPayload,
  joinRoom,
  Room
} from '@trystero-p2p/firebase';
import { encode, decode } from "@msgpack/msgpack";
import { CommonModule } from '@angular/common';

const appId = 'ejfexperiments';

@Component({
  selector: 'app-media-pipe-hand',
  standalone: true,
  imports: [
    CommonModule,
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

  constructor(
    public cdr: ChangeDetectorRef,
  ) {

  }

  ngAfterViewInit(): void {

  }

  async disconnectFromRoom() {
    if (this.localStream) {
      if (this.room) {
        this.room.removeStream(this.localStream);
      }
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    for (const audio of this.remoteAudios) {
      audio.pause();
      audio.srcObject = null;
    }
    this.remoteAudios = [];
    this.sendBinaryData = null;
    if (this.room) {
      await this.room.leave();
      this.room = null;
    }
    this.cdr.detectChanges();
  }

  async connectToRoom() {
    this.room = await joinRoom({
      firebaseApp: defaultFirebaseApp,
      appId,
    }, 'room-1');

    const [sendBinaryData, receiveBinaryData] = this.room.makeAction('binary-data');
    this.sendBinaryData = sendBinaryData;
    this.listenBinaryData(receiveBinaryData);

    this.room.onPeerJoin((peerId) => {
      if (this.localStream) {
        this.room!.addStream(this.localStream, peerId);
      }
    });
    this.room.onPeerLeave((peerId) => {
      //
    });
    this.room.onPeerStream((stream) => {
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play();
      this.remoteAudios.push(audio);
    });
    requestAnimationFrame(() => {
      this.startVoiceCall();
    });
  }

  async startVoiceCall() {
    if (!this.room) return;
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.room.addStream(this.localStream);
  }

  async broadcastBinaryData() {
    if (!this.sendBinaryData) return;
    const sample = { t: Date.now() };
    const encoded = encode(sample);
    await this.sendBinaryData(encoded);
  }

  listenBinaryData(receiveBinaryData: ActionReceiver<DataPayload>) {
    receiveBinaryData((data, peerId) => {
      const model = decode(data as Uint8Array);
      this.commonData[peerId] = model;
      this.cdr.detectChanges();
    });
  }
}
