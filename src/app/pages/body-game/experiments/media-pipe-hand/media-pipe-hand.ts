import { AfterViewInit, Component } from '@angular/core';
import { defaultFirebaseApp } from '@services/firebase';
import { ActionReceiver, ActionSender, DataPayload, joinRoom, Room } from '@trystero-p2p/firebase';
import { encode, decode } from "@msgpack/msgpack";

const appId = 'ejfexperiments';

@Component({
  selector: 'app-media-pipe-hand',
  imports: [],
  templateUrl: './media-pipe-hand.html',
  styleUrl: './media-pipe-hand.scss',
})
export class MediaPipeHand implements AfterViewInit {
  room: Room | null = null;
  sendBinaryData: ActionSender<DataPayload> | null = null;
  localStream: MediaStream | null = null;

  ngAfterViewInit(): void {
    this.connectToRoom();
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
      console.log('peer joined:', peerId);
      if (this.localStream) {
        this.room!.addStream(this.localStream, peerId);
      }
    });
    this.room.onPeerLeave((peerId) => {
      console.log('peer left:', peerId);
    });
    this.room.onPeerStream((stream, peerId) => {
      console.log('received audio stream from:', peerId);
      const audio = new Audio();
      audio.srcObject = stream;
      audio.play();
    });
  }

  async startVoiceCall() {
    if (!this.room) return;
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.room.addStream(this.localStream);
  }

  async broadcastBinaryData() {
    if (!this.sendBinaryData) return;
    const sample = { key: "some data" };
    const encoded = encode(sample);
    await this.sendBinaryData(encoded);
  }

  listenBinaryData(receiveBinaryData: ActionReceiver<DataPayload>) {
    receiveBinaryData((data, peerId) => {
      const model = decode(data as Uint8Array);
      console.log('received binary data from:', peerId, model);
    });
  }
}
