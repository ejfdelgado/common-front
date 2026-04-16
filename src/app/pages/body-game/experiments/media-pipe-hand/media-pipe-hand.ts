import { AfterViewInit, Component } from '@angular/core';
import { defaultFirebaseApp } from '@services/firebase';
import { joinRoom, Room } from '@trystero-p2p/firebase';
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
  ngAfterViewInit(): void {
    this.connectToRoom();
  }

  async connectToRoom() {
    this.room = await joinRoom({
      firebaseApp: defaultFirebaseApp,
      appId,
    }, 'room-1');
    // Detect peers joining/leaving
    this.room.onPeerJoin((peerId) => {
      console.log('peer joined:', peerId)
    });
    this.room.onPeerLeave((peerId) => {
      console.log('peer left:', peerId)
    });
  }

  async startVoiceCall() {
    // Here the logic
  }

  async broadcastBinaryData() {
    const sample = { key: "some data" };
    const encoded = encode(sample);
    const blob = new Blob([encoded], { type: 'text/plain' });
  }

  async listenBinaryData() {
    // Must listen all except the originator
    // Use: const model = decode(received);
  }
}
